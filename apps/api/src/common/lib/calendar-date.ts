/**
 * Calendar-date helpers (SP-107B, D107-7).
 *
 * Calendar dates (a semester's `startDate`/`endDate`) have no instant or
 * time-zone ambiguity. The API accepts and returns them as strict
 * `yyyy-MM-dd` strings; the database stores them in `@db.Date` columns
 * (Postgres `DATE`). Internally a calendar date is represented as a
 * UTC-midnight `Date` — the only representation Prisma's `@db.Date`
 * columns accept — and is never exposed as an instant.
 *
 * `addDays` and `dayOfWeekOf` are `YYYY-MM-DD` string arithmetic for a
 * date the caller has already validated. They use UTC midnight only as a
 * date counter — they are not time-zone conversions.
 */

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a strict `yyyy-MM-dd` calendar date string into a UTC-midnight
 * `Date` for a `@db.Date` column.
 *
 * Returns `null` when the value is not a valid calendar date: a malformed
 * string (wrong shape, non-string input) or an impossible date such as
 * `2026-02-30` (the UTC round-trip rejects the rollover to `03-02`).
 */
export function parseCalendarDate(value: string): Date | null {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  // The round-trip is the impossible-date check: 2026-02-30 rolls over to
  // 2026-03-02 and fails the equality, 2026-02-28 round-trips and passes.
  return date.toISOString().slice(0, 10) === value ? date : null;
}

/**
 * Format a `Date` as its `yyyy-MM-dd` date part (UTC). Use for values read
 * from `@db.Date` columns — never expose the full instant.
 */
export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Add `n` days to a valid `YYYY-MM-DD` string. `n` may be negative or zero.
 * Month and year boundaries roll in UTC; the result is `YYYY-MM-DD`.
 */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Weekday of a valid `YYYY-MM-DD` string: Sunday = `0` … Saturday = `6`.
 * `getUTCDay()` on the date's UTC midnight — the same counter the
 * zone-free scheduler uses inline.
 */
export function dayOfWeekOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
}
