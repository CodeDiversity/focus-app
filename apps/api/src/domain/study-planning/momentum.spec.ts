import { addDays } from '../../common/lib/calendar-date';
import { MOMENTUM_HORIZON_WEEKS, computeMomentum, momentumWindowStart } from './momentum';
import type { MomentumSessionFact } from './momentum';

/**
 * EP13K domain unit spec (pure, no database, no clock, no zone): the
 * momentum math (TR-E13-11; D-K1 study day, D-K2 Monday week, D-K3 run,
 * D-K4 horizon).
 */
describe('momentum (domain, EP13K)', () => {
  // 2026-11-16 is a Monday; 2026-11-22 the Sunday of the same week.
  const MON = '2026-11-16';
  const SUN = '2026-11-22';
  const day = (offset: number) => addDays(MON, offset);
  const s = (civilDate: string, minutes = 25): MomentumSessionFact => ({ civilDate, minutes });
  const run = (today: string, sessions: MomentumSessionFact[], goalDays = 3, goalMinutes = 60) =>
    computeMomentum({ today, sessions, dailyGoalMinutes: goalMinutes, weeklyGoalDays: goalDays });
  /** Three study days in the week that starts `weeksBack` Mondays before MON. */
  const metWeek = (weeksBack: number) => [0, 1, 2].map((d) => s(day(-7 * weeksBack + d)));

  it('buckets minutes today from the civil-day list, COMPLETED-only input assumed', () => {
    const out = run(day(2), [s(day(2), 20), s(day(2), 25), s(day(1), 50)]);
    expect(out.today).toEqual({ confirmedMinutes: 45, goalMinutes: 60, goalMet: false });
    expect(run(day(2), [s(day(2), 60)]).today.goalMet).toBe(true);
  });

  it('a 0-minute session never makes a study day (D-K1)', () => {
    const out = run(day(2), [s(day(1), 0), s(day(2), 0)]);
    expect(out.week.studyDays).toEqual([]);
    expect(out.week.studyDayCount).toBe(0);
    expect(out.hasHistory).toBe(false);
  });

  it('any three distinct days meet a 3-day goal — Mon/Tue/Wed and Mon/Thu/Sun alike (repairability)', () => {
    const a = run(SUN, [s(day(0)), s(day(1)), s(day(2))]);
    const b = run(SUN, [s(day(0)), s(day(3)), s(day(6))]);
    expect(a.week.goalMet).toBe(true);
    expect(b.week.goalMet).toBe(true);
    expect(b.week.studyDays).toEqual([day(0), day(3), day(6)]);
  });

  it('two sessions on one day count that day once', () => {
    expect(run(SUN, [s(day(0)), s(day(0))]).week.studyDayCount).toBe(1);
  });

  it('a missed day mid-week leaves the earlier days counted', () => {
    const out = run(day(4), [s(day(0)), s(day(1))]);
    expect(out.week.studyDays).toEqual([day(0), day(1)]);
    expect(out.week.studyDayCount).toBe(2);
    expect(out.week.goalMet).toBe(false);
  });

  it('the current week counts in the run only once met, and an unmet current week never ends the run', () => {
    const history = [...metWeek(1), ...metWeek(2)];
    const unmet = run(day(1), [...history, s(day(0))]);
    expect(unmet.run).toEqual({ currentWeeks: 2, bestWeeks: 2, currentWeekCounted: false });
    const met = run(day(2), [...history, ...metWeek(0)]);
    expect(met.run).toEqual({ currentWeeks: 3, bestWeeks: 3, currentWeekCounted: true });
  });

  it('a completed week below goal ends the run at that week; best run is preserved', () => {
    // Weeks 5..2 back met (a run of 4), week 1 back quiet, this week met.
    const sessions = [...metWeek(5), ...metWeek(4), ...metWeek(3), ...metWeek(2), ...metWeek(0)];
    expect(run(day(2), sessions).run).toEqual({
      currentWeeks: 1,
      bestWeeks: 4,
      currentWeekCounted: true,
    });
    // Same history mid-week, this week not yet met → the run is 0, best still 4.
    expect(run(day(0), sessions.slice(0, 12)).run).toEqual({
      currentWeeks: 0,
      bestWeeks: 4,
      currentWeekCounted: false,
    });
  });

  it('run and best run are capped at the 52-week horizon (D-K4)', () => {
    const sessions = Array.from({ length: 60 }, (_, w) => metWeek(w)).flat();
    const out = run(day(2), sessions);
    expect(out.run).toEqual({
      currentWeeks: MOMENTUM_HORIZON_WEEKS,
      bestWeeks: MOMENTUM_HORIZON_WEEKS,
      currentWeekCounted: true,
      capped: true,
    });
    // Exactly 52 weeks (current + 51 back) is not capped.
    const exact = run(day(2), Array.from({ length: 52 }, (_, w) => metWeek(w)).flat());
    expect(exact.run.currentWeeks).toBe(52);
    expect(exact.run.capped).toBeUndefined();
  });

  it('ignores sessions before the horizon and after today', () => {
    const out = run(day(2), [s(addDays(momentumWindowStart(day(2)), -1)), s(day(3))]);
    expect(out.hasHistory).toBe(false);
    expect(out.week.studyDays).toEqual([]);
  });

  it('no sessions → zeros, `hasHistory: false`', () => {
    expect(run(day(2), [])).toEqual({
      date: day(2),
      today: { confirmedMinutes: 0, goalMinutes: 60, goalMet: false },
      week: {
        startDate: MON,
        days: [0, 1, 2, 3, 4, 5, 6].map((d) => day(d)),
        studyDays: [],
        studyDayCount: 0,
        goalDays: 3,
        goalMet: false,
      },
      run: { currentWeeks: 0, bestWeeks: 0, currentWeekCounted: false },
      hasHistory: false,
    });
  });

  it('same input twice → deep-equal output (determinism)', () => {
    const sessions = [...metWeek(3), ...metWeek(1), s(day(2), 30)];
    expect(run(day(2), sessions)).toEqual(run(day(2), [...sessions].reverse()));
  });

  it('week start is Monday: a Sunday session belongs to the week that began the previous Monday', () => {
    const out = run(SUN, [s(SUN)]);
    expect(out.week.startDate).toBe(MON);
    expect(out.week.studyDays).toEqual([SUN]);
    // The following Monday starts a fresh week; Sunday's day is last week's.
    const next = run(day(7), [s(SUN)]);
    expect(next.week.startDate).toBe(day(7));
    expect(next.week.studyDays).toEqual([]);
    expect(next.hasHistory).toBe(true);
  });

  it('goal values at the bounds (5 min / 1 day; 480 min / 7 days)', () => {
    const low = run(day(0), [s(day(0), 5)], 1, 5);
    expect(low.today.goalMet).toBe(true);
    expect(low.week.goalMet).toBe(true);
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => s(day(d), 60));
    const high = run(SUN, week, 7, 480);
    expect(high.today.goalMet).toBe(false);
    expect(high.week.goalMet).toBe(true);
    expect(run(SUN, week.slice(1), 7, 480).week.goalMet).toBe(false);
  });

  it('week.days is the seven civil dates Monday-first, across a month boundary (EP14B, D-B4)', () => {
    expect(run('2026-12-02', []).week.days).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ]);
    const out = run(SUN, [s(day(0))]);
    expect(out.week.days[0]).toBe(out.week.startDate);
    expect(out.week.days).toHaveLength(7);
  });
});
