import { minutesOfTime } from '@/features/day-bounds/lib/midnight';

const toTime = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/**
 * The create sheet's default start (EP15G-AC1). For today: the next whole
 * hour by the clock (the page supplies the profile-zone minute it already
 * tracks for the "now" marker — EP15E D-E9 — so no local getter runs here),
 * clamped into `[wake, sleep − 1 h]`. For any other day: the day's wake time
 * rounded up to the hour. Recorded assumption: an hour default is not zone
 * arithmetic over dates (AC-E15-09).
 */
export function defaultStart(
  dateIsToday: boolean,
  wakeTime: string,
  sleepTime: string,
  nowMinute: number | null
): string {
  const wake = minutesOfTime(wakeTime) ?? 480;
  const sleep = minutesOfTime(sleepTime) ?? 1380;
  const wakeHour = Math.ceil(wake / 60) * 60;
  if (!dateIsToday || nowMinute === null) return toTime(Math.min(wakeHour, 1380));
  const nextHour = (Math.floor(nowMinute / 60) + 1) * 60;
  const latest = Math.max(wake, sleep - 60);
  const clamped = Math.min(Math.max(nextHour, wake), latest);
  return toTime(Math.min(clamped, 1380));
}
