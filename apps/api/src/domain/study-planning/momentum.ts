import { addDays, startOfMondayWeek } from '../../common/lib/calendar-date';
import type { MomentumSummary } from './types';

/**
 * Momentum — daily goal and repairable weekly run (EP13K — AC-E13-12,
 * D13-11 refined by D-K1/D-K2/D-K3).
 *
 * Rewards showing up, never plan compliance. Pure (D06-17, D-K12): no
 * clock, no I/O, no zone — the caller passes `today` and each session's
 * profile-zone civil date. The only imports are `YYYY-MM-DD` string helpers.
 *
 * - **Study day** (D-K1): a civil day with at least one session of
 *   `minutes ≥ 1`. The caller passes `COMPLETED` sessions only.
 * - **Week** (D-K2): Monday-start, on civil date strings.
 * - **Run** (D-K3): consecutive goal-met weeks counted back from the
 *   current week. The current week counts only once met; an unmet current
 *   week never ends the run (it is still in progress); a completed week
 *   below goal does. Any `weeklyGoalDays` distinct days meet the goal —
 *   there is no consecutive-day concept anywhere, so a missed day can never
 *   reset anything (repairability by construction).
 * - **Horizon** (D-K4): 52 completed weeks plus the current one; run and
 *   best run are capped at 52 and `capped: true` is set only when hit.
 *
 * Goals are applied with today's values to every week in the horizon (the
 * bag stores no goal history).
 */

/** Completed weeks the run may look back over (D-K4). */
export const MOMENTUM_HORIZON_WEEKS = 52;

/** One confirmed session, already bucketed to its profile-zone civil day. */
export type MomentumSessionFact = {
  civilDate: string;
  minutes: number;
};

export type MomentumInput = {
  /** Today's civil date in the profile zone (`YYYY-MM-DD`). */
  today: string;
  sessions: readonly MomentumSessionFact[];
  dailyGoalMinutes: number;
  weeklyGoalDays: number;
  horizonWeeks?: number;
};

/** The earliest civil date the momentum read needs (start of the oldest week in the horizon). */
export function momentumWindowStart(today: string, horizonWeeks = MOMENTUM_HORIZON_WEEKS): string {
  return addDays(startOfMondayWeek(today), -7 * horizonWeeks);
}

export function computeMomentum(input: MomentumInput): Omit<MomentumSummary, 'timeZone'> {
  const { today, sessions, dailyGoalMinutes, weeklyGoalDays } = input;
  const horizonWeeks = input.horizonWeeks ?? MOMENTUM_HORIZON_WEEKS;
  const weekStart = startOfMondayWeek(today);
  const windowStart = momentumWindowStart(today, horizonWeeks);

  let confirmedMinutes = 0;
  const studyDays = new Set<string>();
  for (const session of sessions) {
    if (session.civilDate < windowStart || session.civilDate > today) {
      continue; // Outside the horizon, or a future-dated row — never counted.
    }
    if (session.civilDate === today) {
      confirmedMinutes += Math.max(0, session.minutes);
    }
    if (session.minutes >= 1) {
      studyDays.add(session.civilDate);
    }
  }

  // Distinct study days per week, keyed by the week's Monday.
  const daysPerWeek = new Map<string, number>();
  for (const day of studyDays) {
    const monday = startOfMondayWeek(day);
    daysPerWeek.set(monday, (daysPerWeek.get(monday) ?? 0) + 1);
  }
  const weekMet = (offset: number): boolean =>
    (daysPerWeek.get(addDays(weekStart, -7 * offset)) ?? 0) >= weeklyGoalDays;

  const currentWeekCounted = weekMet(0);

  // Current run: completed weeks back from last week, plus this week once met.
  let previousRun = 0;
  for (let offset = 1; offset <= horizonWeeks && weekMet(offset); offset += 1) {
    previousRun += 1;
  }
  const uncappedCurrent = previousRun + (currentWeekCounted ? 1 : 0);

  // Best run over the whole horizon. An unmet current week is skipped, not a break.
  let best = 0;
  let streak = 0;
  for (let offset = horizonWeeks; offset >= 0; offset -= 1) {
    if (weekMet(offset)) {
      streak += 1;
      best = Math.max(best, streak);
    } else if (offset > 0) {
      streak = 0;
    }
  }

  const capped = uncappedCurrent > horizonWeeks || best > horizonWeeks;
  const currentWeeks = Math.min(uncappedCurrent, horizonWeeks);
  const bestWeeks = Math.min(best, horizonWeeks);

  const thisWeekDays = [...studyDays].filter((day) => day >= weekStart).sort();

  return {
    date: today,
    today: {
      confirmedMinutes,
      goalMinutes: dailyGoalMinutes,
      goalMet: confirmedMinutes >= dailyGoalMinutes,
    },
    week: {
      startDate: weekStart,
      studyDays: thisWeekDays,
      studyDayCount: thisWeekDays.length,
      goalDays: weeklyGoalDays,
      goalMet: currentWeekCounted,
    },
    run: {
      currentWeeks,
      bestWeeks: Math.max(bestWeeks, currentWeeks),
      currentWeekCounted,
      ...(capped ? { capped: true as const } : {}),
    },
    hasHistory: studyDays.size > 0,
  };
}
