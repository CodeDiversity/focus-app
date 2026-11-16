import { describe, it, expect } from 'vitest';
import type { MomentumSummary } from '@/entities/study-session/model/types';
import * as momentumCopy from './momentumCopy';
import { dailyLine, runLine, studiedOnSentence, weeklyLine } from './momentumCopy';

const base: MomentumSummary = {
  date: '2026-11-18',
  timeZone: 'UTC',
  today: { confirmedMinutes: 45, goalMinutes: 60, goalMet: false },
  week: {
    startDate: '2026-11-16',
    days: [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ],
    studyDays: ['2026-11-16', '2026-11-18'],
    studyDayCount: 2,
    goalDays: 3,
    goalMet: false,
  },
  run: { currentWeeks: 0, bestWeeks: 0, currentWeekCounted: false },
  hasHistory: true,
};
const m = (patch: Partial<MomentumSummary>): MomentumSummary => ({ ...base, ...patch });

const BLAME = /missed|behind|failed|lazy|should|broke|lost/i;

describe('momentumCopy (EP13K, D-K10)', () => {
  it('daily line in own units — zero, partial, met', () => {
    expect(dailyLine(m({ today: { confirmedMinutes: 0, goalMinutes: 60, goalMet: false } }))).toBe(
      '0 of 60 min today — any session counts.'
    );
    expect(dailyLine(base)).toBe('45 of 60 min today');
    expect(dailyLine(m({ today: { confirmedMinutes: 75, goalMinutes: 60, goalMet: true } }))).toBe(
      'Daily goal met — 75 min today'
    );
  });

  it('weekly line — progress and met', () => {
    expect(weeklyLine(base)).toBe('2 of 3 days this week');
    expect(weeklyLine(m({ week: { ...base.week, studyDayCount: 4, goalMet: true } }))).toBe(
      'Weekly goal met — 4 days'
    );
    expect(weeklyLine(m({ week: { ...base.week, studyDayCount: 0, goalDays: 1 } }))).toBe(
      '0 of 1 day this week'
    );
  });

  it('run line — in a row, fresh start with best run, or none', () => {
    expect(runLine(m({ run: { currentWeeks: 2, bestWeeks: 4, currentWeekCounted: true } }))).toBe(
      'Goal met 2 weeks in a row'
    );
    expect(runLine(m({ run: { currentWeeks: 1, bestWeeks: 1, currentWeekCounted: true } }))).toBe(
      'Goal met 1 week in a row'
    );
    expect(runLine(m({ run: { currentWeeks: 0, bestWeeks: 4, currentWeekCounted: false } }))).toBe(
      'Best run so far: 4 weeks. This week is a fresh start.'
    );
    expect(runLine(base)).toBeNull();
    expect(
      runLine(
        m({ run: { currentWeeks: 52, bestWeeks: 52, currentWeekCounted: true, capped: true } })
      )
    ).toBe('Goal met 52+ weeks in a row');
  });

  it('derives nothing: the module exports no date arithmetic (EP14B, D-B4)', () => {
    // The server owns the week's dates (week.days); this module only maps them.
    expect(Object.keys(momentumCopy)).not.toContain('weekDates');
  });

  it('the sr-only sentence names full weekdays', () => {
    expect(studiedOnSentence(base)).toBe('Studied on Monday and Wednesday.');
    expect(
      studiedOnSentence(
        m({ week: { ...base.week, studyDays: ['2026-11-16', '2026-11-18', '2026-11-22'] } })
      )
    ).toBe('Studied on Monday, Wednesday and Sunday.');
    expect(studiedOnSentence(m({ week: { ...base.week, studyDays: [] } }))).toBe(
      'No study days yet this week.'
    );
  });

  it('no line ever carries a percent or a blame term (D13-9)', () => {
    const variants = [
      base,
      m({ today: { confirmedMinutes: 0, goalMinutes: 60, goalMet: false } }),
      m({ today: { confirmedMinutes: 90, goalMinutes: 60, goalMet: true } }),
      m({ run: { currentWeeks: 0, bestWeeks: 3, currentWeekCounted: false } }),
      m({ run: { currentWeeks: 3, bestWeeks: 3, currentWeekCounted: true } }),
    ];
    for (const v of variants) {
      for (const line of [dailyLine(v), weeklyLine(v), runLine(v) ?? '', studiedOnSentence(v)]) {
        expect(line).not.toMatch(/%/);
        expect(line).not.toMatch(BLAME);
      }
    }
  });
});
