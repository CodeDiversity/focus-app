import type { DatedInterval, EnergyLevelValue, FreeIntervalBase } from './types';

/** EP13J (D-J2) — a window without a level is NORMAL. */
export function energyOf(interval: { energy?: EnergyLevelValue }): EnergyLevelValue {
  return interval.energy ?? 'NORMAL';
}

const ENERGY_TIE_ORDER: Record<EnergyLevelValue, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

/** Copy an interval's span, keeping its energy only when it has one (pre-EP13J shapes stay byte-identical). */
function piece(
  source: { energy?: EnergyLevelValue },
  date: string,
  startMinute: number,
  endMinute: number
): DatedInterval {
  return source.energy !== undefined
    ? { date, startMinute, endMinute, energy: source.energy }
    : { date, startMinute, endMinute };
}

/**
 * The interval algebra and the **one** shared free-interval helper (EP06C).
 *
 * This file is the single implementation of "when is a student free?" — the
 * placement (EP06C) and EP06D's save-time re-check both call
 * `freeIntervals(...)`, so the two cannot drift. It is a pure domain module
 * (D06-17): it imports nothing from `@nestjs/*`, nothing from Prisma, reads
 * no clock and knows no time zone.
 *
 * All intervals are half-open `[startMinute, endMinute)` on one civil date.
 */

/** Merge overlapping and touching intervals. The input may be unsorted and
 * may span several dates; intervals on different dates are never merged
 * together. The result is sorted by date then start minute, and disjoint
 * (touching intervals are merged).
 *
 * EP13J (D-J2, EP13J-AC5): only intervals of the **same energy** merge. A
 * touching pair of different levels stays two intervals; an overlapping pair
 * of different levels is made disjoint — the earlier-starting interval keeps
 * its span and the later one is clipped to begin where it ends. With every
 * interval at the default level this is exactly the pre-EP13J behaviour. */
export function mergeIntervals(intervals: DatedInterval[]): DatedInterval[] {
  // Group by date so intervals on different days never merge.
  const byDate = new Map<string, DatedInterval[]>();
  for (const interval of intervals) {
    const list = byDate.get(interval.date);
    if (list) {
      list.push(interval);
    } else {
      byDate.set(interval.date, [interval]);
    }
  }

  const result: DatedInterval[] = [];
  for (const [date, list] of byDate) {
    const sorted = [...list].sort(
      (a, b) =>
        a.startMinute - b.startMinute ||
        ENERGY_TIE_ORDER[energyOf(a)] - ENERGY_TIE_ORDER[energyOf(b)]
    );
    for (const interval of sorted) {
      const last = result.length > 0 ? result[result.length - 1] : null;
      // Only merge into the last result entry when it is on the same date.
      if (last && last.date === date && interval.startMinute <= last.endMinute) {
        if (energyOf(interval) === energyOf(last)) {
          if (interval.endMinute > last.endMinute) {
            last.endMinute = interval.endMinute;
          }
        } else if (interval.endMinute > last.endMinute) {
          // Different level: keep the two apart; clip any overlap off the later one.
          result.push(piece(interval, date, last.endMinute, interval.endMinute));
        }
      } else {
        result.push(piece(interval, date, interval.startMinute, interval.endMinute));
      }
    }
  }
  // Re-sort the merged result by date then start minute (the per-date
  // grouping above does not guarantee global order).
  result.sort((a, b) =>
    a.date === b.date ? a.startMinute - b.startMinute : a.date < b.date ? -1 : 1
  );
  return result;
}

/** Subtract `toSubtract` from `base`. Each interval in `toSubtract` removes
 * its span from any base interval on the **same date**. The result is sorted
 * and disjoint. */
export function subtractIntervals(
  base: DatedInterval[],
  toSubtract: DatedInterval[]
): DatedInterval[] {
  // Keep only the subtractors that matter per date.
  const result: DatedInterval[] = [];
  for (const baseInterval of base) {
    let current: DatedInterval[] = [
      piece(baseInterval, baseInterval.date, baseInterval.startMinute, baseInterval.endMinute),
    ];
    const subtractors = toSubtract.filter((s) => s.date === baseInterval.date);
    for (const sub of subtractors) {
      const next: DatedInterval[] = [];
      for (const part of current) {
        // No overlap (half-open): keep the whole piece.
        if (sub.endMinute <= part.startMinute || sub.startMinute >= part.endMinute) {
          next.push(part);
          continue;
        }
        // Left remainder.
        if (sub.startMinute > part.startMinute) {
          next.push(
            piece(part, part.date, part.startMinute, Math.min(sub.startMinute, part.endMinute))
          );
        }
        // Right remainder.
        if (sub.endMinute < part.endMinute) {
          next.push(
            piece(part, part.date, Math.max(sub.endMinute, part.startMinute), part.endMinute)
          );
        }
      }
      current = next;
    }
    result.push(...current);
  }
  // Merge in case the subtraction left touching pieces.
  return mergeIntervals(result);
}

/** Half-open overlap: touching intervals do **not** overlap. Intervals on
 * different dates never overlap. */
export function overlaps(a: DatedInterval, b: DatedInterval): boolean {
  if (a.date !== b.date) {
    return false;
  }
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/** The number of minutes in a same-day range. Accepts either two minute
 * offsets or a single interval. */
export function minutesBetween(
  startOrInterval: number | { startMinute: number; endMinute: number },
  endMinute?: number
): number {
  if (typeof startOrInterval === 'number') {
    return (endMinute ?? 0) - startOrInterval;
  }
  return startOrInterval.endMinute - startOrInterval.startMinute;
}

/** The one shared free-interval helper: `base − blocked − classes − busy −
 * placed`, for a single civil date. Every input is filtered by `date`, so a
 * caller can hand in a whole week without leaking another day's windows.
 * The result is sorted, disjoint and merged (touching intervals merge). */
export function freeIntervals(input: {
  date: string;
  base: FreeIntervalBase;
  blocked: DatedInterval[];
  classes: DatedInterval[];
  busy: DatedInterval[];
  placed: DatedInterval[];
}): DatedInterval[] {
  const { date } = input;

  // Filter every input by date.
  const blocked = input.blocked.filter((i) => i.date === date);
  const classes = input.classes.filter((i) => i.date === date);
  const busy = input.busy.filter((i) => i.date === date);
  const placed = input.placed.filter((i) => i.date === date);

  // The base.
  let base: DatedInterval[];
  if (input.base.kind === 'whole-day') {
    base = [{ date, startMinute: 0, endMinute: 1440 }];
  } else {
    base = mergeIntervals(input.base.windows.filter((w) => w.date === date));
  }

  // Subtractions in order: blocked → classes → busy → placed.
  let free = base;
  free = subtractIntervals(free, blocked);
  free = subtractIntervals(free, classes);
  free = subtractIntervals(free, busy);
  free = subtractIntervals(free, placed);

  // Ensure sorted, disjoint, merged (subtractIntervals already merges, but
  // be explicit and re-merge for safety).
  return mergeIntervals(free);
}
