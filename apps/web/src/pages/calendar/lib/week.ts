/**
 * Civil-date helpers for the calendar page (EP15E, AC-E15-09 / FU-EP04-01,
 * D-E5). Every function works on `YYYY-MM-DD` strings with integer
 * arithmetic only — no browser-local `Date` getters, so the visible week
 * can never drift with the device clock or zone. The one Date construction
 * in this module is `utcTodayGuess`, the zone-free bootstrap guess that the
 * server's `today` corrects (D-E5).
 */

const DAY_MS = 86_400_000;

/** Days since 1970-01-01 for a valid civil date (`Date.UTC` is pure arithmetic). */
function daysSinceEpoch(civil: string): number {
  const year = Number(civil.slice(0, 4));
  const month = Number(civil.slice(5, 7));
  const day = Number(civil.slice(8, 10));
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** Civil date from days since 1970-01-01 (Howard Hinnant's `civil_from_days`). */
function civilFromDays(days: number): string {
  const z = days + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const year = m <= 2 ? y + 1 : y;
  return `${String(year).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Add `n` civil days (negative allowed) to a `YYYY-MM-DD` string. */
export function addDays(civil: string, n: number): string {
  return civilFromDays(daysSinceEpoch(civil) + n);
}

/** Weekday of a civil date, Sunday = 0 … Saturday = 6 (1970-01-01 was a Thursday). */
export function weekdayOf(civil: string): number {
  return (((daysSinceEpoch(civil) + 4) % 7) + 7) % 7;
}

/** The Monday that starts the week of `civil`; Sunday belongs to the previous Monday. */
export function mondayOf(civil: string): string {
  return addDays(civil, -((weekdayOf(civil) + 6) % 7));
}

/**
 * The bootstrap guess for "today": the UTC civil date, read zone-free from
 * the ISO string. The first response's server `today` replaces it (D-E5).
 */
export function utcTodayGuess(): string {
  return new Date().toISOString().slice(0, 10);
}
