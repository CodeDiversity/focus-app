/**
 * Civil-date helpers — the conversion between an **instant** and the civil
 * date (the calendar day) it falls on in a given IANA time zone.
 *
 * EP06 needs it because **every date it returns is a civil date in the
 * student's profile zone** (D06-24): `Assignment.dueDate` is stored as an
 * instant, and the study-planning surface reports, compares and places it as
 * a `YYYY-MM-DD` civil date. The conversion happens **once**, in the
 * service, so the domain module stays zone-free (D06-17).
 *
 * The arithmetic is the same `Intl.DateTimeFormat` conversion the calendar
 * service uses (`apps/api/src/modules/calendar/calendar.service.ts:47-66`), so
 * the plan and the calendar the student sees never disagree about the day.
 * The calendar keeps its own private copy: that file belongs to EP04 and
 * EP06 does not change it (D06-18).
 */

/** Is this a time zone `Intl` understands? */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The zone to use for a student's dates: their stored profile zone, or
 * `UTC` when it is missing or unreadable.
 *
 * The fallback is the calendar service's own rule
 * (`calendar.service.ts:186`): a corrupted zone must never fail a read, and
 * both surfaces must fall back the same way.
 */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  return typeof timeZone === 'string' && isValidTimeZone(timeZone) ? timeZone : 'UTC';
}

/**
 * The **civil date** (`YYYY-MM-DD`) an instant falls on in a time zone.
 *
 * An unrecognised zone falls back to `UTC` (via `resolveTimeZone`), so the
 * helper never throws. `YYYY-MM-DD` is the wire format of every date EP06
 * returns, and it sorts chronologically as a string — which is what the
 * horizon, the overdue test and the shared comparator rely on.
 */
export function toCivilDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
