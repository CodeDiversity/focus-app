import { addDays, dayOfWeekOf } from '../../common/lib/calendar-date';
import type {
  DatedInterval,
  DayBound,
  DayBoundsRow,
  DayBoundsView,
  Occurrence,
  ScheduleBlockInput,
} from './types';

/**
 * EP15A recurrence and day-bounds domain (contracts.md → *Recurrence
 * semantics*). Pure (D06-17): no clock, no I/O, nothing from `@nestjs/*` or
 * Prisma; the only import is the civil-date string arithmetic every EP15
 * child shares. Every date is a validated `YYYY-MM-DD`, every time an
 * `HH:mm` — the API validates on write, so `expandBlocks` trusts its rows;
 * `readDayBounds` is the one defensive reader (D15-13, `preferences.ts`
 * precedent).
 */

/** The default wake time when a weekday has no valid row (D15-13). */
export const DEFAULT_WAKE_TIME = '08:00';
/** The default sleep time when a weekday has no valid row (D15-13). */
export const DEFAULT_SLEEP_TIME = '23:00';

/** Minutes in a civil day — the half-open bound `"24:00"` reads as (D-A4). */
export const MINUTES_PER_DAY = 1440;

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/**
 * `HH:mm` → minutes from midnight. `"24:00"` → `1440` (the midnight end,
 * D-A4). Returns `null` for anything that is not `00:00…24:00` with a valid
 * minute, so callers can fall back without a try/catch.
 */
export function timeToMinutes(time: string): number | null {
  if (typeof time !== 'string' || !TIME_PATTERN.test(time)) return null;
  const hours = Number(time.slice(0, 2));
  const minutes = Number(time.slice(3, 5));
  if (minutes > 59) return null;
  if (hours > 24 || (hours === 24 && minutes !== 0)) return null;
  return hours * 60 + minutes;
}

/** Minutes from midnight → `HH:mm`; `1440` → `"24:00"`. */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Weekday bitmask helpers (D-A1: bit n = weekday n, Sunday = bit 0)
// ---------------------------------------------------------------------------

/** Weekday numbers (`0…6`, any order, duplicates ignored) → bitmask. */
export function weekdaysToMask(weekdays: readonly number[]): number {
  let mask = 0;
  for (const day of weekdays) {
    if (Number.isInteger(day) && day >= 0 && day <= 6) mask |= 1 << day;
  }
  return mask;
}

/** Bitmask → ascending weekday numbers (the API's array form). */
export function maskToWeekdays(mask: number): number[] {
  return WEEKDAYS.filter((day) => hasWeekday(mask, day));
}

/** Is weekday `day` (`0…6`) set in `mask`? */
export function hasWeekday(mask: number, day: number): boolean {
  return (mask & (1 << day)) !== 0;
}

// ---------------------------------------------------------------------------
// expandBlocks
// ---------------------------------------------------------------------------

function occurrenceOf(block: ScheduleBlockInput, date: string, recurring: boolean): Occurrence {
  return {
    blockId: block.id,
    kind: block.kind,
    title: block.title,
    courseId: block.courseId,
    energy: block.energy,
    date,
    startMinute: timeToMinutes(block.startTime) ?? 0,
    endMinute: timeToMinutes(block.endTime) ?? MINUTES_PER_DAY,
    recurring,
  };
}

function compareOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
  if (a.blockId !== b.blockId) return a.blockId < b.blockId ? -1 : 1;
  return 0;
}

/**
 * Every occurrence of `blocks` on the civil dates `from…to` (both
 * inclusive, like the calendar's `?from&to`), sorted by `date`,
 * `startMinute`, `blockId` — a total order, so the output is stable across
 * runs (V-15-3).
 *
 * - one-off (`weekdays === null`): on `startDate` only;
 * - weekly: `startDate ≤ d ≤ endDate` (open when `endDate` is null), the
 *   bit for `dayOfWeekOf(d)` set, and `d` not an exception date.
 *
 * Minutes are wall-clock minutes of the civil day: a DST transition date
 * yields exactly the same `startMinute` / `endMinute` as any other date
 * (D404-4 precedent) — the function never touches an instant. An empty or
 * inverted range yields `[]`.
 */
export function expandBlocks(
  blocks: readonly ScheduleBlockInput[],
  from: string,
  to: string
): Occurrence[] {
  const out: Occurrence[] = [];
  if (from > to) return out;

  for (const block of blocks) {
    if (block.weekdays === null) {
      if (block.startDate >= from && block.startDate <= to) {
        out.push(occurrenceOf(block, block.startDate, false));
      }
      continue;
    }

    const first = block.startDate > from ? block.startDate : from;
    const last = block.endDate !== null && block.endDate < to ? block.endDate : to;
    if (first > last) continue;

    const skipped = new Set(block.exceptionDates);
    for (let date = first; date <= last; date = addDays(date, 1)) {
      if (!hasWeekday(block.weekdays, dayOfWeekOf(date))) continue;
      if (skipped.has(date)) continue;
      out.push(occurrenceOf(block, date, true));
    }
  }

  return out.sort(compareOccurrences);
}

// ---------------------------------------------------------------------------
// Day bounds
// ---------------------------------------------------------------------------

/**
 * Is this stored pair usable? `wakeTime` must be `00:00…23:59`, `sleepTime`
 * `00:01…24:00`, and `sleepTime` strictly after `wakeTime` (D15-4 / D-A4).
 */
function isValidPair(wakeTime: string, sleepTime: string): boolean {
  const wake = timeToMinutes(wakeTime);
  const sleep = timeToMinutes(sleepTime);
  return wake !== null && sleep !== null && wake < MINUTES_PER_DAY && sleep > wake;
}

/**
 * The defensive reader (D15-13, `preferences.ts` precedent): the stored
 * `day_bounds` rows (any subset, any order) in, seven `DayBound`s out in
 * weekday order. A weekday with no row, a row whose `dayOfWeek` is not
 * `0…6`, or a row whose pair is invalid (malformed time, `sleepTime ≤
 * wakeTime`, `wakeTime ≥ 24:00`, `sleepTime > 24:00`) reads as the default
 * `08:00`–`23:00`. `configured` is `true` only when a valid row exists for
 * all seven weekdays — so a brand-new student reads `configured: false`
 * and the EP15F prompt knows to show itself (AC-E15-01).
 */
export function readDayBounds(rows: readonly DayBoundsRow[]): DayBoundsView {
  const byDay = new Map<number, DayBoundsRow>();
  for (const row of rows) {
    if (!Number.isInteger(row.dayOfWeek) || row.dayOfWeek < 0 || row.dayOfWeek > 6) continue;
    if (!byDay.has(row.dayOfWeek)) byDay.set(row.dayOfWeek, row);
  }

  let configured = true;
  const days: DayBound[] = WEEKDAYS.map((dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    if (row && isValidPair(row.wakeTime, row.sleepTime)) {
      return { dayOfWeek, wakeTime: row.wakeTime, sleepTime: row.sleepTime };
    }
    configured = false;
    return { dayOfWeek, wakeTime: DEFAULT_WAKE_TIME, sleepTime: DEFAULT_SLEEP_TIME };
  });

  return { configured, days };
}

/**
 * The half-open `[wakeMinute, sleepMinute)` interval of a civil date, read
 * from the seven-entry `days` of `readDayBounds` (the entry whose
 * `dayOfWeek` is the date's weekday; the default pair when `days` is
 * missing it). `"24:00"` → `1440`.
 */
export function dayBoundsFor(days: readonly DayBound[], date: string): DatedInterval {
  const dayOfWeek = dayOfWeekOf(date);
  const bound = days.find((day) => day.dayOfWeek === dayOfWeek);
  const wakeTime = bound?.wakeTime ?? DEFAULT_WAKE_TIME;
  const sleepTime = bound?.sleepTime ?? DEFAULT_SLEEP_TIME;
  const valid = isValidPair(wakeTime, sleepTime);
  return {
    date,
    startMinute: valid
      ? (timeToMinutes(wakeTime) as number)
      : (timeToMinutes(DEFAULT_WAKE_TIME) as number),
    endMinute: valid
      ? (timeToMinutes(sleepTime) as number)
      : (timeToMinutes(DEFAULT_SLEEP_TIME) as number),
  };
}
