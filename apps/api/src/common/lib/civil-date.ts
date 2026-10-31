/**
 * Civil-date helpers — the single API seam between an **instant** and the
 * civil date (the calendar day) and wall time it falls on in a given IANA
 * time zone.
 *
 * Every date the study-planning surface returns is a civil date in the
 * student's profile zone (D06-24): `Assignment.dueDate` is stored as an
 * instant, and the service reports, compares and places it as a
 * `YYYY-MM-DD` civil date. The conversion happens **once**, in the
 * service, so the domain module stays zone-free (D06-17).
 *
 * Calendar and study-plans both import this module (EP12A). EP06 left the
 * calendar a private copy so it would not edit an EP04 file (D06-18);
 * that note is superseded — one implementation, so the plan and the
 * calendar cannot disagree about the day.
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
 * A corrupted zone must never fail a read, and both surfaces must fall
 * back the same way. Callers that already resolved are unchanged —
 * `resolveTimeZone` is idempotent.
 */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  return typeof timeZone === 'string' && isValidTimeZone(timeZone) ? timeZone : 'UTC';
}

/**
 * The civil date and wall time (`HH:mm`) an instant falls on in a time zone.
 *
 * An unrecognised zone falls back to `UTC` (via `resolveTimeZone`), so the
 * helper never throws. Some engines report midnight as hour `24`; that is
 * normalized to `00` so the quirk never leaves this module.
 */
export function zoneParts(instant: Date, timeZone: string): { date: string; time: string } {
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
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  };
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
  return zoneParts(instant, timeZone).date;
}

/**
 * Offset of `timeZone` at `date`, in milliseconds: local = UTC + offset.
 *
 * The `toLocaleString` difference is the existing correction input. Kept
 * private — neither service used it outside the wall-clock conversion.
 */
function tzOffsetMs(date: Date, timeZone: string): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * The instant for a civil date and wall time (`HH:mm`) in a time zone.
 *
 * Iterative correction, kept verbatim: guess UTC, measure the zone offset,
 * adjust, and stop when the guess is stable (at most three passes). An
 * unreadable zone falls back to `UTC` before the loop, same as
 * `zoneParts` / `toCivilDate`.
 */
export function wallClockToInstant(dateStr: string, timeStr: string, timeZone: string): Date {
  const zone = resolveTimeZone(timeZone);
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  for (let i = 0; i < 3; i++) {
    const offsetMs = tzOffsetMs(new Date(guess), zone);
    const corrected = Date.UTC(y, m - 1, d, hh, mm, 0) - offsetMs;
    if (corrected === guess) break;
    guess = corrected;
  }
  return new Date(guess);
}
