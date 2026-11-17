import type { DatedInterval, EnergyLevelValue } from '../study-planning/types';

/**
 * EP15A schedule domain types (pure, D06-17 boundary): the shape the
 * recurrence module reads and writes. Dates are civil `YYYY-MM-DD` strings
 * and times are `HH:mm` wall-clock strings — the service converts `@db.Date`
 * columns with `formatCalendarDate` before calling in, so this module knows
 * no instant, no zone and no Prisma type.
 */

/** The schema's `ScheduleBlockKind` enum as a literal union. */
export type ScheduleBlockKindValue = 'BUSY' | 'STUDY';

/**
 * One stored block as the recurrence module reads it (contracts.md → *Data
 * model*): one-off when `weekdays` is `null`, weekly otherwise (D15-5).
 * `exceptionDates` are the block's cancelled occurrences (`schedule_block_exceptions.date`).
 */
export type ScheduleBlockInput = {
  id: string;
  kind: ScheduleBlockKindValue;
  title: string | null;
  courseId: string | null;
  energy: EnergyLevelValue;
  /** One-off: the date; weekly: the first date of the series. */
  startDate: string;
  /** Weekly only; `null` = open-ended. */
  endDate: string | null;
  /** Bitmask, bit n = weekday n (Sunday = bit 0); `null` = one-off (D-A1). */
  weekdays: number | null;
  /** `HH:mm`, `< 24:00`. */
  startTime: string;
  /** `HH:mm`, strictly after `startTime`; `"24:00"` allowed (D-A4). */
  endTime: string;
  /** Cancelled occurrence dates (`YYYY-MM-DD`). */
  exceptionDates: readonly string[];
};

/**
 * One dated occurrence of a block (contracts.md → *Recurrence semantics*).
 * `startMinute` / `endMinute` are wall-clock minutes of the civil day,
 * half-open `[start, end)`; `"24:00"` reads as `1440`.
 */
export type Occurrence = {
  blockId: string;
  kind: ScheduleBlockKindValue;
  title: string | null;
  courseId: string | null;
  energy: EnergyLevelValue;
  date: string;
  startMinute: number;
  endMinute: number;
  /** `true` for an occurrence of a weekly block, `false` for a one-off. */
  recurring: boolean;
};

/** A stored `day_bounds` row as the reader sees it. */
export type DayBoundsRow = {
  dayOfWeek: number;
  wakeTime: string;
  sleepTime: string;
};

/**
 * The effective wake/sleep pair of one weekday (`0…6`, Sunday = 0): the
 * stored pair when valid, the default `08:00`–`23:00` otherwise (D15-13).
 */
export type DayBound = {
  dayOfWeek: number;
  wakeTime: string;
  sleepTime: string;
};

/** `readDayBounds` result: seven entries in weekday order, `0…6`. */
export type DayBoundsView = {
  /** `true` only when a valid row exists for all seven weekdays. */
  configured: boolean;
  days: DayBound[];
};

export type { DatedInterval, EnergyLevelValue };
