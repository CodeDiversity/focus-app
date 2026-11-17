import type { DatedInterval, PreferredInterval, WeeklyWindow } from './types';

/**
 * EP15C — the weekly-windows → day-bounds adapter (contracts.md engine rule
 * 5, R-EP15-07). It exists for two callers only: the planning service's
 * interim path until EP15D wires the real gathering seam, and the
 * EP15C-AC4 identity test. Pure: string-date arithmetic, no clock.
 *
 * Rule: for each date, the weekday's former available windows become one
 * `dayBounds` interval — their hull `[min start, max end)` — and the gaps
 * between them are appended to `blocked`, which reproduces the old free
 * intervals exactly. Former `blocked` windows are dated as before. A
 * weekday with no window yields no bound (a day with no free time).
 */
export function boundsFromWeeklyWindows(
  days: readonly string[],
  availability: readonly WeeklyWindow[],
  blocked: readonly WeeklyWindow[]
): { dayBounds: DatedInterval[]; blocked: DatedInterval[] } {
  const dayBounds: DatedInterval[] = [];
  const blockedDated: DatedInterval[] = [];
  for (const date of days) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const windows = availability
      .filter((w) => w.dayOfWeek === weekday && w.endMinute > w.startMinute)
      .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
    if (windows.length > 0) {
      const hullStart = windows[0].startMinute;
      let hullEnd = windows[0].endMinute;
      let reach = windows[0].endMinute;
      for (let i = 1; i < windows.length; i += 1) {
        const w = windows[i];
        if (w.startMinute > reach) {
          blockedDated.push({ date, startMinute: reach, endMinute: w.startMinute });
        }
        reach = Math.max(reach, w.endMinute);
        hullEnd = Math.max(hullEnd, w.endMinute);
      }
      dayBounds.push({ date, startMinute: hullStart, endMinute: hullEnd });
    }
    for (const w of blocked) {
      if (w.dayOfWeek === weekday) {
        blockedDated.push({ date, startMinute: w.startMinute, endMinute: w.endMinute });
      }
    }
  }
  return { dayBounds, blocked: blockedDated };
}

/**
 * EP15C interim only — every former **available** window as a preferred
 * interval carrying its energy tag (key `window:<weekday>:<start>-<end>`).
 * In the pre-EP15 model an `isAvailable` slot *was* the student's declared
 * study window, so mapping all of them (not just the tagged ones) keeps one
 * tier and reproduces EP13J/EP14E's energy ranking exactly until EP15D
 * replaces the adapter with real study blocks (F-EP15C-01).
 */
export function windowsAsPreferred(
  days: readonly string[],
  availability: readonly WeeklyWindow[]
): PreferredInterval[] {
  const out: PreferredInterval[] = [];
  for (const date of days) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    for (const w of availability) {
      if (w.dayOfWeek !== weekday || w.endMinute <= w.startMinute) continue;
      const item: PreferredInterval = {
        date,
        startMinute: w.startMinute,
        endMinute: w.endMinute,
        preferredKey: `window:${w.dayOfWeek}:${w.startMinute}-${w.endMinute}`,
      };
      if (w.energy !== undefined) item.energy = w.energy;
      out.push(item);
    }
  }
  return out;
}
