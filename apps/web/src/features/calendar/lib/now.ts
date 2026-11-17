/**
 * EP15E (D-E9, user ruling 2026-11-17): the "now" marker's minute of the day
 * in the student's **profile** zone, read through `Intl` — never a
 * browser-local getter (AC-E15-09). Returns `null` when the zone is unknown
 * to the runtime, so the marker simply does not render.
 */
export function nowMinutesIn(timeZone: string, now: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
    let hour = get('hour');
    const minute = get('minute');
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (hour === 24) hour = 0;
    return hour * 60 + minute;
  } catch {
    return null;
  }
}
