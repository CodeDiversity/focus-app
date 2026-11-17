/**
 * The midnight mapping (EP15F D-G6 / R-EP15-11, shared with EP15G): a native
 * `type="time"` input cannot enter `24:00`, so an end value of `00:00` means
 * midnight. It is sent to the API as `24:00` and shown back as `00:00`.
 */
export const MIDNIGHT_HELPER = '00:00 means midnight';

/** Input value → API value for an **end** time (`00:00` → `24:00`). */
export function toApiEndTime(value: string): string {
  return value === '00:00' ? '24:00' : value;
}

/** API value → input value for an **end** time (`24:00` → `00:00`). */
export function toInputEndTime(value: string): string {
  return value === '24:00' ? '00:00' : value;
}

/** `HH:mm` → minutes, `24:00` → 1440; `null` when malformed. */
export function minutesOfTime(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const h = Number(value.slice(0, 2));
  const m = Number(value.slice(3, 5));
  if (m > 59 || h > 24 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}
