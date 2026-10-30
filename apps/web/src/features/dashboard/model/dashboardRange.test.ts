import { describe, it, expect } from 'vitest';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import {
  CALENDAR_RANGE_MAX_INCLUSIVE_DAYS,
  DASHBOARD_RANGE_DAYS,
  browserLocalCivilDate,
  dashboardTodayRange,
  selectTodayEvents,
} from './dashboardRange';

/**
 * The test's independent oracle for the **server's** rule: the civil date of
 * an instant in a zone. It mirrors the API's `formatToday(timeZone)`
 * (`apps/api/src/modules/calendar/calendar.service.ts`) — the client never
 * computes the profile zone's date in production, so the test computes it
 * here to check the dashboard's window against it.
 */
function civilDateInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const read = (type: 'year' | 'month' | 'day'): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

/**
 * A zone's UTC offset at `instant`, in minutes — **computed** from the real
 * zone, never read off a quoted label, so the test cannot encode a stale
 * offset claim.
 */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const read = (type: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'): number =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second')
  );
  return (asUtc - instant.getTime()) / 60000;
}

/** Whole days between two civil dates (`to` − `from`). */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000);
}

/** The inclusive day count of a civil-date range. */
function inclusiveDays(from: string, to: string): number {
  return daysBetween(from, to) + 1;
}

/** Shifts a civil date by whole days (UTC calendar arithmetic). */
function shiftDays(civilDate: string, days: number): string {
  const [year, month, day] = civilDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000);
  const monthText = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dayText = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${monthText}-${dayText}`;
}

function event(date: string, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: `event:${date}:${overrides.type ?? 'CLASS'}`,
    type: 'CLASS',
    title: 'Event',
    subtitle: null,
    date,
    startTime: '09:00',
    endTime: '10:00',
    courseId: null,
    courseName: null,
    courseColor: null,
    assignmentId: null,
    completed: false,
    focus: false,
    link: null,
    ...overrides,
  };
}

describe('dashboardTodayRange — the request window', () => {
  const INSTANT = new Date('2026-01-15T10:00:00Z');

  it('spans five days with the browser-local civil date in the middle', () => {
    const range = dashboardTodayRange({ instant: INSTANT, timeZone: 'UTC' });

    expect(range).toEqual({ from: '2026-01-13', to: '2026-01-17' });
    expect(inclusiveDays(range.from, range.to)).toBe(DASHBOARD_RANGE_DAYS);
    expect(inclusiveDays(range.from, range.to)).toBe(5);
  });

  it('stays inside the calendar endpoint’s inclusive span cap', () => {
    const range = dashboardTodayRange({ instant: INSTANT, timeZone: 'UTC' });

    expect(inclusiveDays(range.from, range.to)).toBeLessThanOrEqual(
      CALENDAR_RANGE_MAX_INCLUSIVE_DAYS
    );
  });

  it('defaults to the browser’s own local zone', () => {
    const localToday = browserLocalCivilDate(INSTANT);
    const range = dashboardTodayRange({ instant: INSTANT });

    expect(inclusiveDays(range.from, range.to)).toBe(DASHBOARD_RANGE_DAYS);
    expect(range.from <= localToday).toBe(true);
    expect(localToday <= range.to).toBe(true);
    expect(range.from).toBe(shiftDays(localToday, -2));
    expect(range.to).toBe(shiftDays(localToday, 2));
  });

  it('crosses a month boundary without losing or gaining a day', () => {
    const range = dashboardTodayRange({
      instant: new Date('2026-03-01T10:00:00Z'),
      timeZone: 'UTC',
    });

    expect(range).toEqual({ from: '2026-02-27', to: '2026-03-03' });
    expect(inclusiveDays(range.from, range.to)).toBe(5);
  });
});

describe('dashboardTodayRange — the widest realizable offset spread', () => {
  const INSTANT = new Date('2026-01-15T10:00:00Z');

  it('computes the browser-zone ↔ profile-zone offset spread from the real zones', () => {
    // The browser zone is an OS setting (it may be `Etc/GMT+12`); the profile
    // zone is picker-selectable (`Pacific/Kiritimati`).
    const browserOffset = zoneOffsetMinutes(INSTANT, 'Etc/GMT+12');
    const profileOffset = zoneOffsetMinutes(INSTANT, 'Pacific/Kiritimati');
    const spreadHours = Math.abs(profileOffset - browserOffset) / 60;

    expect(spreadHours).toBeGreaterThan(24);
    expect(spreadHours).toBeLessThanOrEqual(26);
  });

  it('contains the profile zone’s civil date when the profile zone is ahead of the browser', () => {
    const browserZone = 'Etc/GMT+12';
    const profileZone = 'Pacific/Kiritimati';

    const browserToday = civilDateInZone(INSTANT, browserZone);
    // What the server echoes back as `today`: the profile zone's civil date.
    const profileToday = civilDateInZone(INSTANT, profileZone);

    // The case really is the two-day one.
    expect(daysBetween(browserToday, profileToday)).toBe(2);

    const { from, to } = dashboardTodayRange({ instant: INSTANT, timeZone: browserZone });
    expect(inclusiveDays(from, to)).toBe(5);
    // The containment property: the server-echoed `today` lies inside [from, to].
    expect(profileToday >= from).toBe(true);
    expect(profileToday <= to).toBe(true);

    // …and a ±1-day window would have missed it, which is why the window is ±2.
    const narrowFrom = shiftDays(browserToday, -1);
    const narrowTo = shiftDays(browserToday, 1);
    expect(profileToday >= narrowFrom && profileToday <= narrowTo).toBe(false);
  });

  it('contains the profile zone’s civil date when the profile zone is behind the browser', () => {
    const browserZone = 'Pacific/Kiritimati';
    const profileZone = 'Etc/GMT+12';

    const browserToday = civilDateInZone(INSTANT, browserZone);
    const profileToday = civilDateInZone(INSTANT, profileZone);

    expect(daysBetween(browserToday, profileToday)).toBe(-2);

    const { from, to } = dashboardTodayRange({ instant: INSTANT, timeZone: browserZone });
    expect(inclusiveDays(from, to)).toBe(5);
    expect(profileToday >= from).toBe(true);
    expect(profileToday <= to).toBe(true);

    const narrowFrom = shiftDays(browserToday, -1);
    const narrowTo = shiftDays(browserToday, 1);
    expect(profileToday >= narrowFrom && profileToday <= narrowTo).toBe(false);
  });

  it('contains the profile zone’s civil date for the worst picker-to-picker pair too', () => {
    // `Pacific/Midway` (−11) ↔ `Pacific/Kiritimati` (+14) — the widest spread
    // between two zones the profile-zone picker offers.
    const browserZone = 'Pacific/Midway';
    const profileZone = 'Pacific/Kiritimati';

    const spreadHours =
      Math.abs(zoneOffsetMinutes(INSTANT, profileZone) - zoneOffsetMinutes(INSTANT, browserZone)) /
      60;
    expect(spreadHours).toBeGreaterThan(24);

    const browserToday = civilDateInZone(INSTANT, browserZone);
    const profileToday = civilDateInZone(INSTANT, profileZone);
    expect(Math.abs(daysBetween(browserToday, profileToday))).toBe(2);

    const { from, to } = dashboardTodayRange({ instant: INSTANT, timeZone: browserZone });
    expect(profileToday >= from).toBe(true);
    expect(profileToday <= to).toBe(true);
  });
});

describe('selectTodayEvents — the selection key is the server’s `today`', () => {
  it('returns only the events dated the given day', () => {
    const events = [
      event('2026-01-15', { id: 'a' }),
      event('2026-01-16', { id: 'b' }),
      event('2026-01-15', { id: 'c' }),
    ];

    const selected = selectTodayEvents(events, '2026-01-15');

    expect(selected.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('excludes the days either side of today', () => {
    const events = [
      event('2026-01-14', { id: 'before' }),
      event('2026-01-15', { id: 'today' }),
      event('2026-01-16', { id: 'after' }),
    ];

    const selected = selectTodayEvents(events, '2026-01-15');

    expect(selected.map((e) => e.id)).toEqual(['today']);
  });

  it('selects the profile zone’s day when it differs by one day from the browser’s', () => {
    // A `Pacific/Auckland` profile zone with a `UTC` browser.
    const instant = new Date('2026-01-15T23:00:00Z');
    const browserToday = civilDateInZone(instant, 'UTC');
    const profileToday = civilDateInZone(instant, 'Pacific/Auckland');

    expect(daysBetween(browserToday, profileToday)).toBe(1);

    const events = [
      event(browserToday, { id: 'browser-day' }),
      event(profileToday, { id: 'profile-day' }),
    ];

    const selected = selectTodayEvents(events, profileToday);

    expect(selected.map((e) => e.id)).toEqual(['profile-day']);
  });

  it('selects the profile zone’s day in the two-day-spread case', () => {
    // A `Pacific/Kiritimati` profile zone with an `Etc/GMT+12` browser.
    const instant = new Date('2026-01-15T10:00:00Z');
    const browserToday = civilDateInZone(instant, 'Etc/GMT+12');
    const profileToday = civilDateInZone(instant, 'Pacific/Kiritimati');
    const { from, to } = dashboardTodayRange({ instant, timeZone: 'Etc/GMT+12' });

    expect(daysBetween(browserToday, profileToday)).toBe(2);
    expect(profileToday >= from && profileToday <= to).toBe(true);

    const events = [
      event(browserToday, { id: 'browser-day' }),
      event(profileToday, { id: 'profile-day' }),
      event(shiftDays(profileToday, 1), { id: 'next-day' }),
    ];

    const selected = selectTodayEvents(events, profileToday);

    expect(selected.map((e) => e.id)).toEqual(['profile-day']);
  });
});
