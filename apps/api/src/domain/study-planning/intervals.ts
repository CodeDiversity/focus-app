import type { DatedInterval, FreeIntervalBase } from './types';

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
 * (touching intervals are merged). */
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
    const sorted = [...list].sort((a, b) => a.startMinute - b.startMinute);
    for (const interval of sorted) {
      const last = result.length > 0 ? result[result.length - 1] : null;
      // Only merge into the last result entry when it is on the same date.
      if (last && last.date === date && interval.startMinute <= last.endMinute) {
        if (interval.endMinute > last.endMinute) {
          last.endMinute = interval.endMinute;
        }
      } else {
        result.push({ date, startMinute: interval.startMinute, endMinute: interval.endMinute });
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
      {
        date: baseInterval.date,
        startMinute: baseInterval.startMinute,
        endMinute: baseInterval.endMinute,
      },
    ];
    const subtractors = toSubtract.filter((s) => s.date === baseInterval.date);
    for (const sub of subtractors) {
      const next: DatedInterval[] = [];
      for (const piece of current) {
        // No overlap (half-open): keep the whole piece.
        if (sub.endMinute <= piece.startMinute || sub.startMinute >= piece.endMinute) {
          next.push(piece);
          continue;
        }
        // Left remainder.
        if (sub.startMinute > piece.startMinute) {
          next.push({
            date: piece.date,
            startMinute: piece.startMinute,
            endMinute: Math.min(sub.startMinute, piece.endMinute),
          });
        }
        // Right remainder.
        if (sub.endMinute < piece.endMinute) {
          next.push({
            date: piece.date,
            startMinute: Math.max(sub.endMinute, piece.startMinute),
            endMinute: piece.endMinute,
          });
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
