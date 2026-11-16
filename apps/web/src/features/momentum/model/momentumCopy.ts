import type { MomentumSummary } from '@/entities/study-session/model/types';

/**
 * EP13K (D-K10) — the momentum copy, one source for the dashboard card and
 * the focus-page celebration. Own units only (minutes, days, weeks): never a
 * `%`, never a count of missed days, never "streak lost/broken", and the plan
 * is never the subject (D13-9).
 */

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function dailyLine({ today }: MomentumSummary): string {
  const { confirmedMinutes: n, goalMinutes: goal, goalMet } = today;
  if (goalMet) return `Daily goal met — ${n} min today`;
  if (n === 0) return `0 of ${goal} min today — any session counts.`;
  return `${n} of ${goal} min today`;
}

export function weeklyLine({ week }: MomentumSummary): string {
  const { studyDayCount: d, goalDays: g, goalMet } = week;
  if (goalMet) return `Weekly goal met — ${d} ${plural(d, 'day', 'days')}`;
  return `${d} of ${g} ${plural(g, 'day', 'days')} this week`;
}

/** `null` when there is no run line to show (both counters 0). */
export function runLine({ run }: MomentumSummary): string | null {
  const w = run.currentWeeks;
  const b = run.bestWeeks;
  const cap = run.capped ? '+' : '';
  if (w >= 1) return `Goal met ${w}${cap} ${plural(w, 'week', 'weeks')} in a row`;
  if (b >= 1) {
    return `Best run so far: ${b}${cap} ${plural(b, 'week', 'weeks')}. This week is a fresh start.`;
  }
  return null;
}

/**
 * The seven civil dates of the week, Monday first, as strings. The server
 * owns the dates (D05-6): this is index arithmetic on `startDate`'s day
 * component via the UTC date counter, never a time-zone conversion.
 */
export function weekDates(startDate: string): string[] {
  const base = new Date(`${startDate}T00:00:00.000Z`);
  return WEEKDAY_SHORT.map((_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** The sr-only sentence for the week strip, e.g. "Studied on Monday, Wednesday and Sunday." */
export function studiedOnSentence({ week }: MomentumSummary): string {
  const studied = new Set(week.studyDays);
  const names = weekDates(week.startDate)
    .map((date, i) => (studied.has(date) ? WEEKDAY_FULL[i] : null))
    .filter((name): name is (typeof WEEKDAY_FULL)[number] => name !== null);
  if (names.length === 0) return 'No study days yet this week.';
  if (names.length === 1) return `Studied on ${names[0]}.`;
  return `Studied on ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`;
}
