import type { CalendarEvent } from '@/entities/calendar/model/types';

/**
 * EP05A — the dashboard's request window and day selection (D05-6).
 *
 * The server owns the student's civil date: `GET /calendar/events` echoes
 * `today` — the **profile zone's** civil date — and buckets every event's
 * `date` in that same zone. The client therefore performs **no** profile-zone
 * arithmetic. It only needs a request window that is guaranteed to contain the
 * profile zone's "today", and a selection keyed on the server-echoed `today`.
 */

/** The window's half-width, in days: the browser-local civil date ± 2 days. */
export const DASHBOARD_RANGE_RADIUS_DAYS = 2;

/** The window's inclusive day count (from … to) — 5 days, within the API's 31-day cap. */
export const DASHBOARD_RANGE_DAYS = DASHBOARD_RANGE_RADIUS_DAYS * 2 + 1;

/**
 * The inclusive span `GET /calendar/events` accepts (the endpoint's own
 * check). The dashboard's 5-day window is far inside it — recorded so the
 * window's size is not mistaken for a limit the client may approach.
 */
export const CALENDAR_RANGE_MAX_INCLUSIVE_DAYS = 31;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** An inclusive civil-date range, `YYYY-MM-DD` on both ends. */
export interface DashboardRange {
  from: string;
  to: string;
}

export interface DashboardTodayRangeOptions {
  /** The instant the window is anchored to. Defaults to "now". */
  instant?: Date;
  /**
   * The IANA zone whose civil date centres the window — the **browser's own**
   * zone in production. It is injectable so a test can pin a browser zone
   * (for example `Etc/GMT+12`) instead of depending on the machine's zone.
   */
  timeZone?: string;
}

/**
 * The civil date (`YYYY-MM-DD`) of `instant` in `timeZone`, or in the runtime's
 * own local zone when no zone is given.
 */
function civilDateInZone(instant: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    ...(timeZone ? { timeZone } : {}),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const read = (type: 'year' | 'month' | 'day'): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

/**
 * Shifts a civil date by whole days. The arithmetic runs on the UTC calendar
 * so a daylight-saving transition in the browser's zone cannot shift the
 * result by an hour and, with it, the date.
 */
function shiftCivilDate(civilDate: string, days: number): string {
  const [year, month, day] = civilDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);
  const monthText = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dayText = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${monthText}-${dayText}`;
}

/** The browser-local civil date of `instant` (`YYYY-MM-DD`). */
export function browserLocalCivilDate(instant: Date = new Date()): string {
  return civilDateInZone(instant);
}

/**
 * The dashboard's request window: the browser-local civil date **± 2 days**
 * (5 days inclusive).
 *
 * **Why ± 2 and not ± 1.** The two civil dates that can differ are the
 * browser's and the profile zone's. The widest UTC-offset spread in the IANA
 * database is **26 hours** (`Etc/GMT+12` −12 ↔ `Pacific/Kiritimati` +14), and
 * the browser's zone is an operating-system setting, so that pair is
 * realizable. Any spread wider than 24 hours can place the two civil dates
 * **two calendar days apart**, and a ±1-day window would then miss the profile
 * zone's "today" entirely. Because |Δ| ≤ 26 h < 48 h, the civil-date
 * difference is at most 2 days, so ± 2 days provably contains the profile
 * zone's civil date for every legal offset pair.
 *
 * The window's **endpoints** stay browser-local: the client cannot compute the
 * profile zone's date at all. The **selection** is always made with the
 * server-echoed `today`.
 */
export function dashboardTodayRange(options: DashboardTodayRangeOptions = {}): DashboardRange {
  const { instant = new Date(), timeZone } = options;
  const centre = civilDateInZone(instant, timeZone);
  return {
    from: shiftCivilDate(centre, -DASHBOARD_RANGE_RADIUS_DAYS),
    to: shiftCivilDate(centre, DASHBOARD_RANGE_RADIUS_DAYS),
  };
}

/**
 * The events that fall on `today` — the server-echoed profile-zone date.
 * Neighbouring days are excluded, so a profile zone whose civil date differs
 * from the browser's still selects exactly its own day.
 */
export function selectTodayEvents(events: CalendarEvent[], today: string): CalendarEvent[] {
  return events.filter((event) => event.date === today);
}
