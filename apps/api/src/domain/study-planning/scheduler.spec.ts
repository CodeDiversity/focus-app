import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { schedule, selectStudyDays } from './scheduler';
import { boundsFromWeeklyWindows } from './legacy-windows';
import { placementOf } from './identity-fixtures';
import type { SchedulerInput, WeeklyWindow } from './types';
import type { SchedulableAssignment } from './types';
import type { StudyPreferences } from './types';
import {
  FRAGMENTED_FIXTURE,
  MANY_SMALL_FIXTURE,
  PACING_BATTERY,
  SHARED_CAPACITY_FIXTURE,
  SPREAD_FIXTURE,
  runFixture,
} from './pacing-fixtures';

/**
 * EP06C domain unit spec (pure, no clock, no zone): the scheduling engine
 * matrix (TR-E06-03).
 */
describe('scheduling engine (domain, EP06C)', () => {
  const PREFS: StudyPreferences = {
    sessionLengthMinutes: 60,
    minSessionMinutes: 15,
    maxSessionMinutes: 120,
    dailyCapMinutes: 240,
    // EP13F placement v2 (D13-5). The pre-v2 cases below opt out of the two
    // new rules with `V1_PREFS` so they keep testing what they were written
    // for; the v2 rules have their own section.
    breakMinutes: 15,
    densityPercent: 80,
    dailyGoalMinutes: 60,
    weeklyGoalDays: 7, // EP17C rule 9b: 7 = every day usable — the pre-EP17C engine (TR-E17-02).
    spreadPercent: 0, // EP17A — unread until EP17B; 0 = the pre-EP17 behaviour.
  };

  /** Placement v2 switched off: no break, the whole day's free time usable. */
  const V1_PREFS: StudyPreferences = { ...PREFS, breakMinutes: 0, densityPercent: 100 };

  const assignment = (overrides: Partial<SchedulableAssignment> = {}): SchedulableAssignment => ({
    id: 'a-1',
    title: 'Assignment 1',
    courseCode: null,
    dueDate: '2026-11-05',
    estimatedMinutes: 120,
    confirmedMinutes: 0,
    remainingMinutes: 120,
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    flagged: null,
    calibration: null,
    ...overrides,
  });

  /**
   * Fixtures stay in the pre-EP15 weekly shape and reach the engine through
   * the EP15C weekly→bounds adapter (hull + gaps, no study blocks) — so every
   * expectation below is also an EP15C-AC4 identity check.
   */
  type LegacyInput = Omit<SchedulerInput, 'dayBounds' | 'blocked' | 'preferred'> & {
    availability: WeeklyWindow[];
    blocked: WeeklyWindow[];
  };
  const input = (overrides: Partial<LegacyInput> = {}): SchedulerInput => {
    const legacy: LegacyInput = {
      days: [
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
      ],
      assignments: [],
      availability: [{ dayOfWeek: 5, startMinute: 540, endMinute: 720 }], // Friday 09:00-12:00
      blocked: [],
      classes: [],
      busy: [],
      preferences: PREFS,
      ...overrides,
    };
    const { availability, blocked, ...rest } = legacy;
    return {
      ...rest,
      ...boundsFromWeeklyWindows(legacy.days, availability, blocked),
      preferred: [],
    };
  };

  // Helper: dayOfWeek for a date string.
  const dow = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

  describe('1. ordering', () => {
    it('orders three assignments with the same due date by priority, createdAt, id', () => {
      const a = assignment({
        id: 'z',
        priority: 'LOW',
        createdAt: new Date('2026-10-01T00:00:00Z'),
      });
      const b = assignment({
        id: 'a',
        priority: 'HIGH',
        createdAt: new Date('2026-10-02T00:00:00Z'),
      });
      const c = assignment({
        id: 'm',
        priority: 'HIGH',
        createdAt: new Date('2026-10-01T00:00:00Z'),
      });
      // all same due date
      const all = [a, b, c];
      const out = schedule(
        input({
          assignments: all,
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      // results order should follow comparator: HIGH first (createdAt asc: m before a? m created 10-01, a 10-02), then LOW
      expect(out.results.map((r) => r.assignmentId)).toEqual(['m', 'a', 'z']);
    });

    it('processes an overdue assignment after every on-time one', () => {
      const onTime = assignment({ id: 'on-time', dueDate: '2026-11-05' });
      const overdue = assignment({ id: 'overdue', dueDate: '2026-10-01' });
      const out = schedule(
        input({
          assignments: [overdue, onTime],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      expect(out.results.map((r) => r.assignmentId)).toEqual(['on-time', 'overdue']);
    });

    it('uses the shared comparator order (matches remaining-work read)', () => {
      // Just sanity: results order is deterministic and total.
      const x = assignment({ id: 'x', dueDate: '2026-11-01' });
      const y = assignment({ id: 'y', dueDate: '2026-11-01' });
      const out1 = schedule(
        input({
          assignments: [x, y],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      const out2 = schedule(
        input({
          assignments: [y, x],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      expect(out1.results.map((r) => r.assignmentId)).toEqual(
        out2.results.map((r) => r.assignmentId)
      );
    });
  });

  describe('2. placement', () => {
    it('lands a session in the earliest free interval of the earliest eligible day', () => {
      const a = assignment({ remainingMinutes: 60 });
      const out = schedule(input({ assignments: [a] }));
      expect(out.sessions).toHaveLength(1);
      expect(out.sessions[0].date).toBe('2026-10-30');
      expect(out.sessions[0].startMinute).toBe(540);
      expect(out.sessions[0].endMinute).toBe(600);
    });
  });

  describe('3. window restriction (conflict avoidance)', () => {
    it('never places inside a blocked window, class window or confirmed session', () => {
      const a = assignment({ remainingMinutes: 60 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
          blocked: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 600 }],
          classes: [{ dayOfWeek: dow('2026-10-30'), startMinute: 600, endMinute: 660 }],
          busy: [{ date: '2026-10-30', startMinute: 660, endMinute: 720 }],
        })
      );
      const s = out.sessions[0];
      // The session must not overlap any hard window.
      expect(s.startMinute >= 720 || s.endMinute <= 540).toBe(true);
      // It lands in the first free interval after the hard windows? Actually
      // 0-540 is free, so it lands at 0. Verify non-overlap with each source.
      const overlaps = (x0: number, x1: number, y0: number, y1: number) => x0 < y1 && y0 < x1;
      expect(overlaps(s.startMinute, s.endMinute, 540, 600)).toBe(false);
      expect(overlaps(s.startMinute, s.endMinute, 600, 660)).toBe(false);
      expect(overlaps(s.startMinute, s.endMinute, 660, 720)).toBe(false);
    });

    it('a session placed after another on the same day does not overlap it', () => {
      const a = assignment({ id: 'a', remainingMinutes: 60 });
      const b = assignment({
        id: 'b',
        remainingMinutes: 60,
        dueDate: '2026-11-05',
        priority: 'HIGH',
      });
      const out = schedule(
        input({
          assignments: [a, b],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 720 }],
        })
      );
      // two sessions on the same day, non-overlapping
      const daySessions = out.sessions.filter((s) => s.date === '2026-10-30');
      expect(daySessions).toHaveLength(2);
      // sorted by start
      daySessions.sort((x, y) => x.startMinute - y.startMinute);
      expect(daySessions[1].startMinute).toBeGreaterThanOrEqual(daySessions[0].endMinute);
    });
  });

  describe('4. splitting across days (D06-2)', () => {
    it('splits an assignment across several sessions/days; total placed equals remaining', () => {
      const a = assignment({ remainingMinutes: 300 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [
            { dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 },
            { dayOfWeek: dow('2026-10-31'), startMinute: 0, endMinute: 1440 },
          ],
        })
      );
      const placed = out.sessions.reduce((t, s) => t + s.durationMinutes, 0);
      expect(placed).toBe(300);
      expect(out.results[0].placedMinutes).toBe(300);
      expect(out.results[0].deferredMinutes).toBe(0);
      expect(out.results[0].deficitMinutes).toBe(0);
    });
  });

  describe('5. session length and daily cap (D06-20)', () => {
    it('uses the default length', () => {
      const a = assignment({ remainingMinutes: 200 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      expect(out.sessions[0].durationMinutes).toBe(60);
    });

    it('merges a sub-minimum tail into the previous block instead of placing it (EP13F rule 4)', () => {
      const a = assignment({ remainingMinutes: 70 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      // v1 placed 60 + a 10-minute tail below `minSessionMinutes` (15).
      // v2 grows the previous block to 70 (<= maxSessionMinutes).
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([70]);
      expect(out.results[0].placedMinutes).toBe(70);
      expect(out.results[0].deficitMinutes).toBe(0);
    });

    it('truncates a session by the remaining daily budget rather than skipping', () => {
      const a = assignment({ remainingMinutes: 200 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 720 }], // 180 min window
          preferences: { ...PREFS, dailyCapMinutes: 100 },
        })
      );
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([60, 40]);
      expect(out.results[0].placedMinutes).toBe(100);
      expect(out.results[0].deficitMinutes).toBe(100);
      expect(out.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
    });

    it('never places a block below minSessionMinutes — an unmergeable tail is a deficit (EP13F rule 4)', () => {
      const a = assignment({ remainingMinutes: 10 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      // v1 placed a 10-minute block below the student's 15-minute minimum.
      // v2 has no previous block to merge into, so nothing is placed and the
      // work is reported rather than silently lost.
      expect(out.sessions).toHaveLength(0);
      expect(out.results[0].placedMinutes).toBe(0);
      expect(out.results[0].deficitMinutes).toBe(10);
      expect(out.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
    });

    it('truncates the last block of a day to the remaining budget (still >= min)', () => {
      const a = assignment({ remainingMinutes: 200 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 720 }],
          preferences: { ...PREFS, dailyCapMinutes: 100, sessionLengthMinutes: 60 },
        })
      );
      // second session truncated to 40 (>= min 15 here, but test the budget path)
      expect(out.sessions[1].durationMinutes).toBe(40);
    });

    it('leaves an interval too short unused', () => {
      // window 09:00-09:10 (10 min), session length 60, min 15 -> tail 120? remaining 120
      // 10-min interval too short for 60; nothing placed on that day -> NO_AVAILABLE_TIME? capacity 10 >0 but can't fit 60
      const a = assignment({ remainingMinutes: 120 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 550 }],
        })
      );
      expect(out.sessions).toHaveLength(0);
      expect(out.results[0].placedMinutes).toBe(0);
      // capacity before = 10 > 0, so INSUFFICIENT (not NO_AVAILABLE_TIME)
      expect(out.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
    });

    it('the worked example: 100 placed, 100 deficit', () => {
      const a = assignment({ remainingMinutes: 200 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 720 }],
          preferences: { ...PREFS, dailyCapMinutes: 100 },
        })
      );
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([60, 40]);
      expect(out.results[0].placedMinutes).toBe(100);
      expect(out.results[0].deficitMinutes).toBe(100);
    });
  });

  describe('6. deadline horizon', () => {
    it('never places a session after its due date', () => {
      const a = assignment({ remainingMinutes: 1000, dueDate: '2026-10-30' });
      const out = schedule(
        input({
          assignments: [a],
          availability: [
            { dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 },
            { dayOfWeek: dow('2026-10-31'), startMinute: 0, endMinute: 1440 },
          ],
        })
      );
      for (const s of out.sessions) {
        expect(s.date <= '2026-10-30').toBe(true);
      }
    });

    it('compares civil dates (an assignment due 2026-11-01T00:30Z is due 31 Oct in NY)', () => {
      // The engine receives the civil date already; ensure a due date of 2026-10-31
      // restricts placement to <= 10-31.
      const a = assignment({ remainingMinutes: 10000, dueDate: '2026-10-31' });
      const out = schedule(
        input({
          assignments: [a],
          availability: [
            { dayOfWeek: 0, startMinute: 0, endMinute: 1440 },
            { dayOfWeek: 1, startMinute: 0, endMinute: 1440 },
            { dayOfWeek: 2, startMinute: 0, endMinute: 1440 },
          ],
          days: ['2026-10-30', '2026-10-31', '2026-11-01'],
        })
      );
      for (const s of out.sessions) {
        expect(s.date <= '2026-10-31').toBe(true);
      }
      expect(out.sessions.some((s) => s.date === '2026-11-01')).toBe(false);
    });
  });

  describe('7. deficits', () => {
    it('reports INSUFFICIENT_TIME_BEFORE_DEADLINE with the right minutes', () => {
      const a = assignment({ remainingMinutes: 200 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 720 }],
          preferences: { ...PREFS, dailyCapMinutes: 100 },
        })
      );
      expect(out.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
      expect(out.results[0].deficitMinutes).toBe(100);
    });

    it('reports NO_AVAILABLE_TIME when the week has no free time', () => {
      const a = assignment({ remainingMinutes: 120 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [],
        })
      );
      expect(out.results[0].deficitCategory).toBe('NO_AVAILABLE_TIME');
      expect(out.results[0].deficitMinutes).toBe(120);
      expect(out.sessions).toHaveLength(0);
    });

    it('reports OVERDUE for a past deadline with full remaining minutes', () => {
      const a = assignment({ remainingMinutes: 120, dueDate: '2026-10-01' });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      expect(out.results[0].deficitCategory).toBe('OVERDUE');
      expect(out.results[0].deficitMinutes).toBe(120);
    });

    it('reports deferred for a deadline beyond the window', () => {
      const a = assignment({ remainingMinutes: 1000, dueDate: '2026-12-01' });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 120 }],
        })
      );
      expect(out.results[0].deferredMinutes).toBeGreaterThan(0);
      expect(out.results[0].deficitCategory).toBeNull();
      expect(out.results[0].deficitMinutes).toBe(0);
    });
  });

  describe('8. flagged work', () => {
    it('the engine receives only schedulable assignments; (no flagged input)', () => {
      // The engine's input type is SchedulableAssignment[]; flagged assignments
      // are never passed in. Verify an empty assignment list yields empty output.
      const out = schedule(input({ assignments: [] }));
      expect(out.sessions).toHaveLength(0);
      expect(out.results).toHaveLength(0);
    });
  });

  describe('9. purity', () => {
    it('produces byte-identical output across repeated calls', () => {
      const a = assignment({ remainingMinutes: 150 });
      const inp = input({ assignments: [a] });
      const out1 = schedule(inp);
      const out2 = schedule(inp);
      expect(JSON.stringify(out1)).toBe(JSON.stringify(out2));
    });

    it('does not mutate the input', () => {
      const a = assignment({ remainingMinutes: 150 });
      const inp = input({ assignments: [a] });
      const snapshot = JSON.stringify(inp);
      schedule(inp);
      expect(JSON.stringify(inp)).toBe(snapshot);
    });

    it('returns an empty result for an empty window', () => {
      const out = schedule(input({ days: [], assignments: [assignment()] }));
      expect(out.sessions).toHaveLength(0);
    });

    it('returns an empty result for an assignment with no remaining work', () => {
      const a = assignment({ remainingMinutes: 0 });
      const out = schedule(input({ assignments: [a] }));
      expect(out.sessions).toHaveLength(0);
      expect(out.results[0].placedMinutes).toBe(0);
    });
  });

  // =========================================================================
  // EP13F — placement v2 (TR-E13-06). Rules 1–5 of the EP13 shared contract.
  // =========================================================================

  describe('10. breaks between consecutive sessions (EP13F rule 1)', () => {
    /** Sessions of one day, sorted by start minute. */
    const dayBlocks = (out: ReturnType<typeof schedule>, date: string) =>
      out.sessions.filter((s) => s.date === date).sort((x, y) => x.startMinute - y.startMinute);

    it('separates two blocks on the same day by at least breakMinutes', () => {
      const a = assignment({ remainingMinutes: 120 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 1020 }],
          preferences: { ...PREFS, breakMinutes: 20 },
        })
      );
      const blocks = dayBlocks(out, '2026-10-30');
      expect(blocks).toHaveLength(2);
      expect(blocks[1].startMinute - blocks[0].endMinute).toBeGreaterThanOrEqual(20);
    });

    it('breaks are consumed free time, never a stored row', () => {
      const a = assignment({ remainingMinutes: 120 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 1020 }],
        })
      );
      // Only study blocks are returned; the gap is implied by their minutes.
      for (const session of out.sessions) {
        expect(session.assignmentId).toBe('a-1');
        expect(session.durationMinutes).toBe(session.endMinute - session.startMinute);
      }
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([60, 60]);
    });

    it('breakMinutes = 0 places back-to-back blocks (the v1 edge)', () => {
      const a = assignment({ remainingMinutes: 120 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 1020 }],
          preferences: { ...V1_PREFS },
        })
      );
      const blocks = dayBlocks(out, '2026-10-30');
      expect(blocks).toHaveLength(2);
      expect(blocks[1].startMinute).toBe(blocks[0].endMinute);
    });

    it('a break is never required against a class or a busy interval', () => {
      // The student may start studying the minute a class ends (rule 1 is
      // about two *placed* sessions, not about hard windows).
      const a = assignment({ remainingMinutes: 60 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 720 }],
          classes: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 600 }],
        })
      );
      expect(out.sessions[0].startMinute).toBe(600);
    });
  });

  describe('11. the day-density cap (EP13F rule 2)', () => {
    it('places at most densityPercent% of the day’s free minutes', () => {
      // 300 free minutes, 60% → 180 placeable.
      const a = assignment({ remainingMinutes: 600 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 840 }],
          preferences: { ...PREFS, densityPercent: 60 },
        })
      );
      const placed = out.sessions
        .filter((s) => s.date === '2026-10-30')
        .reduce((total, s) => total + s.durationMinutes, 0);
      expect(placed).toBeLessThanOrEqual(180);
      expect(placed).toBe(180);
    });

    it('still honours the daily cap when it is the tighter of the two', () => {
      const a = assignment({ remainingMinutes: 600 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
          preferences: { ...PREFS, densityPercent: 100, dailyCapMinutes: 120 },
        })
      );
      const placed = out.sessions
        .filter((s) => s.date === '2026-10-30')
        .reduce((total, s) => total + s.durationMinutes, 0);
      expect(placed).toBe(120);
    });

    it('densityPercent = 100 reproduces the cap-only behaviour', () => {
      const a = assignment({ remainingMinutes: 600 });
      const dense = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 780 }],
          preferences: { ...V1_PREFS, dailyCapMinutes: 240 },
        })
      );
      const placed = dense.sessions.reduce((total, s) => total + s.durationMinutes, 0);
      // 240 free minutes, no break, cap 240 → the whole window is usable.
      expect(placed).toBe(240);
    });

    it('capacity lost to the cap is reported, never silently dropped (AC-2)', () => {
      const a = assignment({ remainingMinutes: 300 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 840 }],
          preferences: { ...PREFS, densityPercent: 50 },
        })
      );
      const placed = out.sessions.reduce((total, s) => total + s.durationMinutes, 0);
      expect(placed).toBe(150);
      expect(out.results[0].placedMinutes).toBe(150);
      expect(out.results[0].deficitMinutes).toBe(150);
      expect(out.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
      // Nothing vanishes: placed + deficit is the whole remaining work.
      expect(out.results[0].placedMinutes + out.results[0].deficitMinutes).toBe(300);
    });
  });

  describe('12. interleaving within a day (EP13F rule 3)', () => {
    it('rotates across assignments instead of finishing one first', () => {
      // Two assignments with the whole week to spare: the day should read as
      // variety, not as one long block of the first one.
      const a = assignment({
        id: 'a-1',
        remainingMinutes: 120,
        dueDate: '2026-11-05',
        createdAt: new Date('2026-10-01T00:00:00Z'),
      });
      const b = assignment({
        id: 'b-1',
        remainingMinutes: 120,
        dueDate: '2026-11-05',
        createdAt: new Date('2026-10-02T00:00:00Z'),
      });
      const out = schedule(
        input({
          assignments: [a, b],
          availability: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            startMinute: 540,
            endMinute: 1020,
          })),
        })
      );
      const firstDay = out.sessions
        .filter((s) => s.date === '2026-10-30')
        .sort((x, y) => x.startMinute - y.startMinute)
        .map((s) => s.assignmentId);
      expect(firstDay.length).toBeGreaterThanOrEqual(2);
      // Consecutive blocks belong to different assignments.
      expect(firstDay[0]).not.toBe(firstDay[1]);
    });

    it('the rotation follows the shared comparator order', () => {
      const urgent = assignment({
        id: 'urgent',
        priority: 'URGENT',
        remainingMinutes: 120,
        dueDate: '2026-11-05',
      });
      const low = assignment({
        id: 'low',
        priority: 'LOW',
        remainingMinutes: 120,
        dueDate: '2026-11-05',
      });
      const out = schedule(
        input({
          assignments: [low, urgent],
          availability: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            startMinute: 540,
            endMinute: 1020,
          })),
        })
      );
      const firstDay = out.sessions
        .filter((s) => s.date === '2026-10-30')
        .sort((x, y) => x.startMinute - y.startMinute)
        .map((s) => s.assignmentId);
      // The comparator puts URGENT first, so it opens the rotation.
      expect(firstDay[0]).toBe('urgent');
      expect(firstDay[1]).toBe('low');
    });

    it('feasibility beats variety: a deadline-critical assignment takes the day', () => {
      // `tight` is due today and needs the whole day; `loose` has all week.
      const tight = assignment({
        id: 'tight',
        remainingMinutes: 180,
        dueDate: '2026-10-30',
      });
      const loose = assignment({
        id: 'loose',
        remainingMinutes: 180,
        dueDate: '2026-11-05',
      });
      const out = schedule(
        input({
          assignments: [loose, tight],
          availability: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            startMinute: 540,
            endMinute: 780, // 240 free minutes/day; 80% → 192 placeable
          })),
        })
      );
      const firstDay = out.sessions
        .filter((s) => s.date === '2026-10-30')
        .map((s) => s.assignmentId);
      // No rotation on the critical day: every block is the due-today work.
      expect(new Set(firstDay)).toEqual(new Set(['tight']));
      // And the work that could not fit is reported rather than dropped.
      const tightResult = out.results.find((r) => r.assignmentId === 'tight');
      expect(tightResult?.placedMinutes).toBe(180);
      expect(tightResult?.deficitMinutes).toBe(0);
    });

    it('reports the shortfall when even deadline order cannot make work fit', () => {
      const tight = assignment({
        id: 'tight',
        remainingMinutes: 600,
        dueDate: '2026-10-30',
      });
      const out = schedule(
        input({
          assignments: [tight],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 780 }],
        })
      );
      const result = out.results[0];
      expect(result.deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
      expect(result.placedMinutes + result.deficitMinutes).toBe(600);
    });
  });

  describe('13. min/max session lengths (EP13F rule 4)', () => {
    it('never places a block longer than maxSessionMinutes', () => {
      const a = assignment({ remainingMinutes: 600 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
          preferences: { ...PREFS, sessionLengthMinutes: 200, maxSessionMinutes: 90 },
        })
      );
      for (const session of out.sessions) {
        expect(session.durationMinutes).toBeLessThanOrEqual(90);
      }
    });

    it('never places a block shorter than minSessionMinutes', () => {
      const a = assignment({ remainingMinutes: 137 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
          preferences: { ...PREFS, minSessionMinutes: 30, sessionLengthMinutes: 60 },
        })
      );
      for (const session of out.sessions) {
        expect(session.durationMinutes).toBeGreaterThanOrEqual(30);
      }
    });

    it('min = max pins every block to exactly that length', () => {
      const a = assignment({ remainingMinutes: 180 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
          preferences: {
            ...PREFS,
            minSessionMinutes: 45,
            sessionLengthMinutes: 45,
            maxSessionMinutes: 45,
          },
        })
      );
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([45, 45, 45, 45]);
    });

    it('the merge boundary: a tail merges only while the block stays within max', () => {
      // 70 minutes of work, max 60: the 10-minute tail cannot be absorbed.
      const a = assignment({ remainingMinutes: 70 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
          preferences: { ...PREFS, sessionLengthMinutes: 60, maxSessionMinutes: 60 },
        })
      );
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([60]);
      expect(out.results[0].deficitMinutes).toBe(10);
    });
  });

  describe('14. determinism and purity under v2 (EP13F rule 5)', () => {
    const busyWeek = () =>
      input({
        assignments: [
          assignment({ id: 'a-1', remainingMinutes: 200, dueDate: '2026-11-02' }),
          assignment({ id: 'b-1', remainingMinutes: 150, dueDate: '2026-11-05' }),
          assignment({ id: 'c-1', remainingMinutes: 90, dueDate: '2026-10-31' }),
        ],
        availability: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startMinute: 480,
          endMinute: 1080,
        })),
        classes: [{ dayOfWeek: dow('2026-10-31'), startMinute: 600, endMinute: 720 }],
        busy: [{ date: '2026-11-01', startMinute: 540, endMinute: 660 }],
      });

    it('produces byte-identical output across repeated runs of a busy week', () => {
      const first = schedule(busyWeek());
      const second = schedule(busyWeek());
      const third = schedule(busyWeek());
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
      expect(JSON.stringify(second)).toBe(JSON.stringify(third));
    });

    it('is independent of the input order of the assignments', () => {
      const base = busyWeek();
      const reversed = { ...base, assignments: [...base.assignments].reverse() };
      expect(JSON.stringify(schedule(base))).toBe(JSON.stringify(schedule(reversed)));
    });

    it('does not mutate its input', () => {
      const inp = busyWeek();
      const snapshot = JSON.stringify(inp);
      schedule(inp);
      expect(JSON.stringify(inp)).toBe(snapshot);
    });

    it('every placed block respects every rule at once', () => {
      const out = schedule(busyWeek());
      const byDate = new Map<string, typeof out.sessions>();
      for (const session of out.sessions) {
        const list = byDate.get(session.date) ?? [];
        list.push(session);
        byDate.set(session.date, list);
      }
      for (const [date, blocks] of byDate) {
        const sorted = [...blocks].sort((x, y) => x.startMinute - y.startMinute);
        // Rule 4 — every block inside [min, max].
        for (const block of sorted) {
          expect(block.durationMinutes).toBeGreaterThanOrEqual(PREFS.minSessionMinutes);
          expect(block.durationMinutes).toBeLessThanOrEqual(PREFS.maxSessionMinutes);
        }
        // Rule 1 — a break between consecutive blocks.
        for (let i = 1; i < sorted.length; i += 1) {
          expect(sorted[i].startMinute - sorted[i - 1].endMinute).toBeGreaterThanOrEqual(
            PREFS.breakMinutes
          );
        }
        // Rule 2 — the day's density cap.
        const placed = sorted.reduce((total, block) => total + block.durationMinutes, 0);
        expect(placed).toBeLessThanOrEqual(PREFS.dailyCapMinutes);
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('imports nothing from Nest or Prisma (the domain boundary, D06-17)', () => {
      const source = readFileSync(join(__dirname, 'scheduler.ts'), 'utf8');
      // Imports only — the module's own prose names `@nestjs/*` to state the
      // boundary, so the check must look at the import graph, not the text.
      expect(source).not.toMatch(/from\s+['"]@nestjs\//);
      expect(source).not.toMatch(/from\s+['"]@prisma\/client['"]/);
      expect(source).not.toMatch(/require\(\s*['"]@(nestjs|prisma)\//);
      expect(source).not.toMatch(/PrismaService/);
      expect(source).not.toMatch(/new Date\(\)/); // no clock
      expect(source).not.toMatch(/Date\.now\(\)/); // no clock
      expect(source).not.toMatch(/Math\.random/); // no randomness
    });
  });

  // =========================================================================
  // EP13G — day-anchored flexible sessions (TR-E13-07, rule 6).
  // =========================================================================

  describe('15. the FLEX_DAY / FIXED partition (EP13G rule 6)', () => {
    /** A week of open evenings: 17:00–22:00 every day (300 free minutes). */
    const openEvenings = () =>
      [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startMinute: 17 * 60,
        endMinute: 22 * 60,
      }));

    it('emits day-anchored sessions by default', () => {
      // 120 minutes due at the end of the week: all the slack in the world.
      const a = assignment({ remainingMinutes: 120, dueDate: '2026-11-05' });
      const out = schedule(input({ assignments: [a], availability: openEvenings() }));

      expect(out.sessions.length).toBeGreaterThan(0);
      for (const session of out.sessions) {
        expect(session.anchor).toBe('FLEX_DAY');
      }
    });

    it('pins every block of an assignment whose deadline leaves no slack', () => {
      // Due tomorrow, and the work needs both days' budgets in full.
      // 300 free minutes/day at 80% → 240 placeable; two days → 480.
      const a = assignment({ remainingMinutes: 480, dueDate: '2026-10-31' });
      const out = schedule(input({ assignments: [a], availability: openEvenings() }));

      expect(out.sessions.length).toBeGreaterThan(0);
      for (const session of out.sessions) {
        expect(session.anchor).toBe('FIXED');
        expect(session.windowHint).toBeNull();
      }
    });

    it('the slack boundary: one minimum session of room is the dividing line', () => {
      // Capacity over today+tomorrow is 480 minutes (see above).
      const pinned = schedule(
        input({
          assignments: [
            assignment({
              remainingMinutes: 480 - PREFS.minSessionMinutes + 1,
              dueDate: '2026-10-31',
            }),
          ],
          availability: openEvenings(),
        })
      );
      expect(pinned.sessions.every((s) => s.anchor === 'FIXED')).toBe(true);

      const loose = schedule(
        input({
          assignments: [
            assignment({ remainingMinutes: 480 - PREFS.minSessionMinutes, dueDate: '2026-10-31' }),
          ],
          availability: openEvenings(),
        })
      );
      expect(loose.sessions.every((s) => s.anchor === 'FLEX_DAY')).toBe(true);
    });

    it('pins work that ends with a deadline deficit', () => {
      const a = assignment({ remainingMinutes: 900, dueDate: '2026-10-31' });
      const out = schedule(input({ assignments: [a], availability: openEvenings() }));

      expect(out.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
      expect(out.sessions.every((s) => s.anchor === 'FIXED')).toBe(true);
    });

    it('never pins overdue work — there is no deadline left to protect', () => {
      const a = assignment({ remainingMinutes: 120, dueDate: '2026-10-01' });
      const out = schedule(input({ assignments: [a], availability: openEvenings() }));

      expect(out.results[0].deficitCategory).toBe('OVERDUE');
      expect(out.sessions.length).toBeGreaterThan(0);
      expect(out.sessions.every((s) => s.anchor === 'FLEX_DAY')).toBe(true);
    });

    it('never pins work due beyond the window — its leftovers are deferred, not late', () => {
      // Far more work than the week can hold, but the deadline is weeks away.
      const a = assignment({ remainingMinutes: 5000, dueDate: '2026-12-01' });
      const out = schedule(input({ assignments: [a], availability: openEvenings() }));

      expect(out.results[0].deferredMinutes).toBeGreaterThan(0);
      expect(out.results[0].deficitCategory).toBeNull();
      expect(out.sessions.every((s) => s.anchor === 'FLEX_DAY')).toBe(true);
    });

    it('partitions per assignment, not per day', () => {
      const tight = assignment({ id: 'tight', remainingMinutes: 480, dueDate: '2026-10-31' });
      const loose = assignment({ id: 'loose', remainingMinutes: 60, dueDate: '2026-11-05' });
      const out = schedule(input({ assignments: [tight, loose], availability: openEvenings() }));

      const anchorsOf = (id: string) =>
        new Set(out.sessions.filter((s) => s.assignmentId === id).map((s) => s.anchor));
      expect(anchorsOf('tight')).toEqual(new Set(['FIXED']));
      expect(anchorsOf('loose')).toEqual(new Set(['FLEX_DAY']));
    });

    it('is deterministic — the partition is identical across runs', () => {
      const build = () =>
        input({
          assignments: [
            assignment({ id: 'tight', remainingMinutes: 480, dueDate: '2026-10-31' }),
            assignment({ id: 'loose', remainingMinutes: 90, dueDate: '2026-11-05' }),
          ],
          availability: openEvenings(),
        });
      expect(JSON.stringify(schedule(build()))).toBe(JSON.stringify(schedule(build())));
    });

    it('derives an honest window hint from the suggested slot', () => {
      const a = assignment({ remainingMinutes: 60, dueDate: '2026-11-05' });

      const morning = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 9 * 60, endMinute: 11 * 60 }],
        })
      );
      expect(morning.sessions[0].windowHint).toBe('MORNING');

      const afternoon = schedule(
        input({
          assignments: [a],
          availability: [
            { dayOfWeek: dow('2026-10-30'), startMinute: 13 * 60, endMinute: 15 * 60 },
          ],
        })
      );
      expect(afternoon.sessions[0].windowHint).toBe('AFTERNOON');

      const evening = schedule(
        input({
          assignments: [a],
          availability: [
            { dayOfWeek: dow('2026-10-30'), startMinute: 19 * 60, endMinute: 21 * 60 },
          ],
        })
      );
      expect(evening.sessions[0].windowHint).toBe('EVENING');
    });

    it('keeps the boundaries 12:00 and 17:00 on the later side', () => {
      const a = assignment({ remainingMinutes: 60, dueDate: '2026-11-05' });
      const noon = schedule(
        input({
          assignments: [a],
          availability: [
            { dayOfWeek: dow('2026-10-30'), startMinute: 12 * 60, endMinute: 14 * 60 },
          ],
        })
      );
      expect(noon.sessions[0].windowHint).toBe('AFTERNOON');

      const five = schedule(
        input({
          assignments: [a],
          availability: [
            { dayOfWeek: dow('2026-10-30'), startMinute: 17 * 60, endMinute: 19 * 60 },
          ],
        })
      );
      expect(five.sessions[0].windowHint).toBe('EVENING');
    });

    it('flex minutes still count towards the day budget (AC-2)', () => {
      // The density cap must not care about the anchor: 300 free minutes at
      // 80% is 240 placeable, flex or not.
      const a = assignment({ remainingMinutes: 600, dueDate: '2026-11-05' });
      const out = schedule(input({ assignments: [a], availability: openEvenings() }));

      const firstDay = out.sessions
        .filter((s) => s.date === '2026-10-30')
        .reduce((total, s) => total + s.durationMinutes, 0);
      expect(firstDay).toBe(240);
      expect(out.sessions.every((s) => s.anchor === 'FLEX_DAY')).toBe(true);
    });
  });

  // =========================================================================
  // EP17B — per-assignment daily pacing (rule 9; TR-E17-01, TR-E17-02,
  // TR-E17-07). Every case above runs at `spreadPercent: 0`, the documented
  // "off" value (D17-6), so rule 9 changed **no existing expectation** —
  // see `artifacts/EP17B/implementation.md`. The cases below own rule 9.
  // =========================================================================

  describe('16. daily pacing (EP17B rule 9)', () => {
    /** date → placed minutes, in date order. */
    const perDay = (out: ReturnType<typeof schedule>): Record<string, number> => {
      const totals: Record<string, number> = {};
      for (const s of [...out.sessions].sort((x, y) => x.date.localeCompare(y.date))) {
        totals[s.date] = (totals[s.date] ?? 0) + s.durationMinutes;
      }
      return totals;
    };

    describe('EP17B-AC1 — an assignment with slack is spread across its horizon', () => {
      it('spreads one large assignment across its horizon', () => {
        // 300 minutes due in five days; five days of 300 free minutes each
        // (budget 240 after the 240-minute cap). evenShare = 300/5 = 60.
        const out = runFixture(SPREAD_FIXTURE, 100);
        expect(perDay(out)).toEqual({
          '2026-10-30': 60,
          '2026-10-31': 60,
          '2026-11-01': 60,
          '2026-11-02': 60,
          '2026-11-03': 60,
        });
        expect(out.results[0].placedMinutes).toBe(300);
        expect(out.results[0].deficitMinutes).toBe(0);
      });

      it('front-loads the same fixture with pacing off — the pre-EP17 shape', () => {
        // The behaviour EP17B exists to replace: two days, then a hollow week.
        expect(perDay(runFixture(SPREAD_FIXTURE, 0))).toEqual({
          '2026-10-30': 240,
          '2026-10-31': 60,
        });
      });

      it('is a continuous lever: 70 paces partially, never above the target', () => {
        // paceTarget = 240 - (240 - 60) * 70/100 = 114 minutes a day.
        const out = runFixture(SPREAD_FIXTURE, 70);
        const days = perDay(out);
        expect(Object.keys(days).length).toBeGreaterThan(2);
        for (const minutes of Object.values(days)) {
          expect(minutes).toBeLessThanOrEqual(114);
        }
        expect(out.results[0].placedMinutes).toBe(300);
      });
    });

    describe('EP17B-AC2 — feasibility still wins', () => {
      it('does not spread a tight-deadline assignment', () => {
        // 480 minutes due tomorrow over two 240-minute budgets: rule 3 calls
        // it critical on both days, so pacing never sees it. The placement
        // must match the pre-EP17 expectation byte for byte.
        const tight = () =>
          input({
            assignments: [assignment({ remainingMinutes: 480, dueDate: '2026-10-31' })],
            availability: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
              dayOfWeek,
              startMinute: 17 * 60,
              endMinute: 22 * 60,
            })),
          });
        const off = schedule({ ...tight(), preferences: { ...PREFS, spreadPercent: 0 } });
        const paced = schedule({ ...tight(), preferences: { ...PREFS, spreadPercent: 100 } });
        expect(JSON.stringify(paced)).toBe(JSON.stringify(off));
        expect(perDay(paced)).toEqual({ '2026-10-30': 240, '2026-10-31': 240 });
      });

      it('never introduces a deadline miss across the fixture battery', () => {
        // Every battery fixture except the two adversarial ones below, at
        // `spreadPercent` 0 and 100: no assignment gains a deficit category
        // it did not already have, and none loses placed minutes it already
        // had, purely because the week was spread.
        for (const fixture of PACING_BATTERY) {
          if (fixture === FRAGMENTED_FIXTURE || fixture === SHARED_CAPACITY_FIXTURE) continue;
          const off = runFixture(fixture, 0);
          const paced = runFixture(fixture, 100);
          for (let i = 0; i < off.results.length; i += 1) {
            expect({ name: fixture.name, ...paced.results[i] }).toEqual({
              name: fixture.name,
              ...off.results[i],
            });
          }
        }
      });

      it('never defers below what the later horizon days can nominally absorb', () => {
        // 200 minutes due in two days; today's budget is 240 and tomorrow's
        // is 60. The unfloored pace target would be 100, leaving 100 minutes
        // for a day that can hold 60. Two mechanisms forbid that, and they
        // fire on the same test (`remaining > capacityAfter`): rule 3's
        // critical pass, which ignores pacing outright (D-B2), and rule 9's
        // feasibility floor `max(paceTarget, remaining - capacityAfter)`.
        // See F-EP17B-02 — the floor is implemented per contracts §3 and is
        // currently subsumed by the critical test; it is the belt to that
        // pair of braces, not an independent mechanism. EP17C re-checked
        // this once the budgets became pass-aware and it is **still**
        // subsumed: both readings of `capacityAfter` are narrowed the same
        // way, so the two predicates stay identical (F-EP17C-01).
        const out = schedule(
          input({
            days: ['2026-10-30', '2026-10-31'],
            assignments: [assignment({ remainingMinutes: 200, dueDate: '2026-10-31' })],
            availability: [
              { dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 780 }, // 240
              { dayOfWeek: dow('2026-10-31'), startMinute: 540, endMinute: 600 }, // 60
            ],
            preferences: { ...V1_PREFS, spreadPercent: 100, maxSessionMinutes: 240 },
          })
        );
        expect(perDay(out)).toEqual({ '2026-10-30': 200 });
        expect(out.results[0].deficitMinutes).toBe(0);
        // …and pacing did not change it: the pre-EP17 placement is identical.
        expect(JSON.stringify(out)).toBe(
          JSON.stringify(
            schedule({
              ...input({
                days: ['2026-10-30', '2026-10-31'],
                assignments: [assignment({ remainingMinutes: 200, dueDate: '2026-10-31' })],
                availability: [
                  { dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 780 },
                  { dayOfWeek: dow('2026-10-31'), startMinute: 540, endMinute: 600 },
                ],
              }),
              preferences: { ...V1_PREFS, spreadPercent: 0, maxSessionMinutes: 240 },
            })
          )
        );
      });

      it('pacing under optimistic capacity — the fragmentation counterexample (R-EP17-01)', () => {
        // Plan-review pass 1, counterexample 1: 100 minutes due Tue; Monday
        // holds one usable 100-minute gap; Tuesday's 140 free minutes are
        // ten-minute slivers, all below `minSessionMinutes` (15).
        // `dayBudgetOf(Tue)` — and therefore `capacityAfter` — reads 140, so
        // the feasibility floor does **not** fire: this is exactly the
        // residual optimism the bounded claim names. The engine paces to one
        // sitting on Monday and reports the rest; it is not silently lost.
        const off = runFixture(FRAGMENTED_FIXTURE, 0);
        expect(perDay(off)).toEqual({ '2026-11-02': 100 });
        expect(off.results[0].deficitCategory).toBeNull();

        const paced = runFixture(FRAGMENTED_FIXTURE, 100);
        expect(perDay(paced)).toEqual({ '2026-11-02': 60 });
        expect(paced.results[0]).toEqual({
          assignmentId: 'frag',
          placedMinutes: 60,
          deferredMinutes: 0,
          deficitMinutes: 40,
          deficitCategory: 'INSUFFICIENT_TIME_BEFORE_DEADLINE',
        });
      });

      it('shared capacity on a tight final day stays lossless (R-EP17-01, counterexample 2)', () => {
        // Counterexample 2: two 60-minute assignments due Tue share a
        // 30-minute Tuesday, and `capacityAfter` ignores the competition.
        // Rule 3 sees both as critical on Monday (60 > 30), so the critical
        // pass — which ignores pacing (D-B2) — serves both in full. Pacing
        // is no worse than the rule 3 guarantee the engine already makes.
        const off = runFixture(SHARED_CAPACITY_FIXTURE, 0);
        const paced = runFixture(SHARED_CAPACITY_FIXTURE, 100);
        expect(JSON.stringify(paced)).toBe(JSON.stringify(off));
        expect(paced.results.map((r) => r.placedMinutes)).toEqual([60, 60]);
        expect(paced.results.every((r) => r.deficitCategory === null)).toBe(true);
      });
    });

    describe('EP17B-AC3 — every minute is accounted for, per deficit category', () => {
      it.each([0, 70, 100])('accounts for every minute at spreadPercent %i', (spread) => {
        for (const fixture of PACING_BATTERY) {
          const out = runFixture(fixture, spread);
          const byId = new Map(fixture.assignments.map((a) => [a.id, a]));
          const today = fixture.days[0];
          for (const result of out.results) {
            const source = byId.get(result.assignmentId);
            expect(source).toBeDefined();
            const remaining = source?.remainingMinutes ?? 0;
            const label = `${fixture.name} / ${result.assignmentId} @ ${spread}`;
            if (result.deficitCategory === 'OVERDUE') {
              // R-EP17-02: the overdue branch reports the full remaining as
              // the deficit whatever was placed (scheduler.ts:594-596), with
              // `placedMinutes` reported alongside.
              expect([label, result.deficitMinutes]).toEqual([label, remaining]);
              expect((source?.dueDate ?? '') < today).toBe(true);
              expect(result.placedMinutes).toBeLessThanOrEqual(remaining);
              expect(result.deferredMinutes).toBe(0);
            } else {
              expect([
                label,
                result.placedMinutes + result.deficitMinutes + result.deferredMinutes,
              ]).toEqual([label, remaining]);
            }
            // The category set is exactly the pre-EP17 set.
            expect([
              null,
              'OVERDUE',
              'NO_AVAILABLE_TIME',
              'INSUFFICIENT_TIME_BEFORE_DEADLINE',
            ]).toContain(result.deficitCategory);
          }
        }
      });

      it('reports the minutes a pacing target declines as INSUFFICIENT_TIME_BEFORE_DEADLINE', () => {
        const paced = runFixture(FRAGMENTED_FIXTURE, 100);
        expect(paced.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
        expect(paced.results[0].placedMinutes + paced.results[0].deficitMinutes).toBe(100);
      });
    });

    describe('EP17B-AC4 — purity, determinism and the compatibility gate', () => {
      const baseline = JSON.parse(
        readFileSync(join(__dirname, 'pacing-baseline.snapshot.json'), 'utf8')
      ) as Record<string, unknown>;

      it('the frozen baseline covers every battery fixture', () => {
        expect(Object.keys(baseline).sort()).toEqual(PACING_BATTERY.map((f) => f.name).sort());
      });

      it.each(PACING_BATTERY.map((f) => [f.name, f] as const))(
        'is byte-identical to the pre-EP17 baseline at spreadPercent 0: %s',
        (name, fixture) => {
          // EP17D: the frozen baseline is the pre-EP17 **placement**;
          // `studyDays` is an additive reporting key (contracts §5).
          expect(JSON.stringify(placementOf(runFixture(fixture, 0)))).toBe(
            JSON.stringify(baseline[name])
          );
        }
      );

      it.each([70, 100])(
        'is byte-identical across two runs of the same input at spreadPercent %i',
        (spread) => {
          for (const fixture of PACING_BATTERY) {
            const first = JSON.stringify(runFixture(fixture, spread));
            expect(JSON.stringify(runFixture(fixture, spread))).toBe(first);
          }
        }
      );

      it('does not mutate its input while pacing', () => {
        const inp = {
          ...input({ assignments: [assignment({ remainingMinutes: 300 })] }),
          preferences: { ...PREFS, spreadPercent: 100 },
        };
        const snapshot = JSON.stringify(inp);
        schedule(inp);
        expect(JSON.stringify(inp)).toBe(snapshot);
      });
    });

    describe('EP17B-AC5 — pacing never throttles many small assignments (D17-3)', () => {
      it('places the same minutes in the same number of sessions as the pre-EP17 engine', () => {
        const off = runFixture(MANY_SMALL_FIXTURE, 0);
        const paced = runFixture(MANY_SMALL_FIXTURE, 100);
        const total = (out: ReturnType<typeof schedule>) =>
          out.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
        expect(total(paced)).toBe(total(off));
        expect(paced.sessions).toHaveLength(off.sessions.length);
        expect(paced.results).toEqual(off.results);
      });

      it('throttles a large assignment on the same day it leaves the small ones alone', () => {
        // One 300-minute assignment and three 20-minute ones, all due at the
        // end of the week: the big one is paced, the small ones are not.
        const out = schedule(
          input({
            assignments: [
              assignment({ id: 'big', remainingMinutes: 300, priority: 'LOW' }),
              assignment({ id: 's1', remainingMinutes: 20, priority: 'HIGH' }),
              assignment({ id: 's2', remainingMinutes: 20, priority: 'HIGH' }),
              assignment({ id: 's3', remainingMinutes: 20, priority: 'HIGH' }),
            ],
            availability: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
              dayOfWeek,
              startMinute: 540,
              endMinute: 840,
            })),
            preferences: { ...V1_PREFS, spreadPercent: 100 },
          })
        );
        const firstDay = out.sessions.filter((s) => s.date === '2026-10-30');
        // Each small assignment is finished in one sitting on day one.
        for (const id of ['s1', 's2', 's3']) {
          expect(
            firstDay.filter((s) => s.assignmentId === id).reduce((t, s) => t + s.durationMinutes, 0)
          ).toBe(20);
        }
        // The big one takes its even share — 300 over 7 days is 43, raised
        // to one sitting (60) by rule 9's `oneSitting` floor — not the rest
        // of the day's 240-minute budget.
        expect(
          firstDay
            .filter((s) => s.assignmentId === 'big')
            .reduce((t, s) => t + s.durationMinutes, 0)
        ).toBe(60);
        expect(out.results.every((r) => r.deficitCategory === null)).toBe(true);
      });
    });

    describe('EP17B — unchanged-behaviour guards', () => {
      it('overdue work still uses the whole window', () => {
        const out = schedule(
          input({
            assignments: [assignment({ remainingMinutes: 300, dueDate: '2026-10-01' })],
            availability: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
              dayOfWeek,
              startMinute: 540,
              endMinute: 840,
            })),
            preferences: { ...V1_PREFS, spreadPercent: 100 },
          })
        );
        // The horizon is the whole window (scheduler.ts:306), so the even
        // share is 300/7 → 43, and the work still lands inside the week.
        expect(out.results[0].placedMinutes).toBe(300);
        expect(out.results[0].deficitCategory).toBe('OVERDUE');
        expect(out.results[0].deficitMinutes).toBe(300);
        expect(new Set(out.sessions.map((s) => s.date)).size).toBeGreaterThan(1);
      });

      it('work due after the window is still deferred, never a deficit', () => {
        const out = schedule(
          input({
            assignments: [assignment({ remainingMinutes: 5000, dueDate: '2026-12-01' })],
            availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 660 }],
            preferences: { ...V1_PREFS, spreadPercent: 100 },
          })
        );
        expect(out.results[0].deficitCategory).toBeNull();
        expect(out.results[0].deficitMinutes).toBe(0);
        expect(out.results[0].placedMinutes + out.results[0].deferredMinutes).toBe(5000);
      });
    });
  });

  // =========================================================================
  // EP17C — study-day selection (rule 9b; ▲ D17-2 (a), D-C1, ▲ D-C2 (a);
  // contracts §4). Every case above runs at `weeklyGoalDays: 7`, the
  // compatibility value (TR-E17-02), so rule 9b changed **no existing
  // expectation**; the cases below own rule 9b.
  // =========================================================================

  describe('17. study-day selection (EP17C rule 9b)', () => {
    /** date → placed minutes. */
    const perDay = (out: ReturnType<typeof schedule>): Record<string, number> => {
      const totals: Record<string, number> = {};
      for (const s of [...out.sessions].sort((x, y) => x.date.localeCompare(y.date))) {
        totals[s.date] = (totals[s.date] ?? 0) + s.durationMinutes;
      }
      return totals;
    };
    const datesOf = (out: ReturnType<typeof schedule>): string[] =>
      [...new Set(out.sessions.map((s) => s.date))].sort();

    /**
     * A week with deliberately uneven availability, one window per date (the
     * seven dates of the fixture window fall on seven distinct weekdays, so a
     * weekly window addresses exactly one date).
     *
     *   Fri 10-30  60 │ Sat 10-31 300 │ Sun 11-01 120 │ Mon 11-02 240
     *   Tue 11-03  30 │ Wed 11-04 210 │ Thu 11-05  90
     *
     * The three richest days are **10-31, 11-02, 11-04** (300, 240, 210):
     * enough later capacity, day by day, that rule 3 never takes over — the
     * placement below is rule 9b's normal pass alone.
     */
    const UNEVEN_MINUTES: Record<string, number> = {
      '2026-10-30': 60,
      '2026-10-31': 300,
      '2026-11-01': 120,
      '2026-11-02': 240,
      '2026-11-03': 30,
      '2026-11-04': 210,
      '2026-11-05': 90,
    };
    const windowsFrom = (minutes: Record<string, number>): WeeklyWindow[] =>
      Object.entries(minutes)
        .filter(([, free]) => free > 0)
        .map(([date, free]) => ({ dayOfWeek: dow(date), startMinute: 540, endMinute: 540 + free }));

    describe('EP17C-AC1 — only the chosen number of days', () => {
      it('uses only the chosen number of days, and they are the richest ones', () => {
        const out = schedule(
          input({
            assignments: [assignment({ remainingMinutes: 300, dueDate: '2026-11-05' })],
            availability: windowsFrom(UNEVEN_MINUTES),
            preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 3 },
          })
        );
        expect(datesOf(out)).toEqual(['2026-10-31', '2026-11-02', '2026-11-04']);
        // …and rule 9 spread the work *within* them: the share is 300/3.
        expect(perDay(out)).toEqual({
          '2026-10-31': 100,
          '2026-11-02': 100,
          '2026-11-04': 100,
        });
        expect(out.results[0]).toEqual({
          assignmentId: 'a-1',
          placedMinutes: 300,
          deferredMinutes: 0,
          deficitMinutes: 0,
          deficitCategory: null,
        });
      });

      it('divides the even share over the **selected** days, not every day with free time', () => {
        // The binding check on contracts §3's `|usableDays(A)|` once §4
        // exists: the fixture has seven days of positive run-start budget but
        // only three selected days, so the two readings differ visibly.
        // Narrowed (correct): 300/3 = 100 minutes a day. Unnarrowed: 300/7 =
        // 43, floored to one sitting (60) — thin, under-filled days.
        const out = schedule(
          input({
            assignments: [assignment({ remainingMinutes: 300, dueDate: '2026-11-05' })],
            availability: windowsFrom(UNEVEN_MINUTES),
            preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 3 },
          })
        );
        expect(perDay(out)['2026-10-31']).toBe(100);
        expect(perDay(out)['2026-10-31']).not.toBe(60);
        // Every day of the window really does carry free time — it is the
        // selection, not the availability, that narrows the divisor.
        expect(Object.values(UNEVEN_MINUTES).every((free) => free > 0)).toBe(true);
      });

      it('breaks ties by the earlier date', () => {
        // 10-30 and 10-31 are tied at 120; 11-01 is richer. With N = 2 the
        // selection is {11-01, 10-30} — the later tied day is never used.
        const tied: Record<string, number> = {
          '2026-10-30': 120,
          '2026-10-31': 120,
          '2026-11-01': 180,
          '2026-11-02': 0,
          '2026-11-03': 0,
          '2026-11-04': 0,
          '2026-11-05': 0,
        };
        const out = schedule(
          input({
            assignments: [assignment({ remainingMinutes: 120, dueDate: '2026-11-05' })],
            availability: windowsFrom(tied),
            preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 2 },
          })
        );
        expect(datesOf(out)).toEqual(['2026-10-30', '2026-11-01']);
        expect(perDay(out)['2026-10-31']).toBeUndefined();
      });

      it('selectStudyDays is a total, deterministic ranking (free minutes, then date)', () => {
        const days = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];
        const free: Record<string, number> = {
          '2026-10-30': 100,
          '2026-10-31': 100,
          '2026-11-01': 200,
          '2026-11-02': 0,
        };
        expect([...selectStudyDays(days, (d) => free[d], 2)].sort()).toEqual([
          '2026-10-30',
          '2026-11-01',
        ]);
        expect([...selectStudyDays(days, (d) => free[d], 1)]).toEqual(['2026-11-01']);
        // A count that covers the window selects all of it, in window order.
        expect([...selectStudyDays(days, (d) => free[d], 7)]).toEqual(days);
      });
    });

    describe('EP17C-AC2 — `weeklyGoalDays = 7` is a no-op', () => {
      it.each(PACING_BATTERY.map((f) => [f.name, f] as const))(
        'is byte-identical at 7 and with the key absent: %s',
        (_name, fixture) => {
          for (const spread of [0, 70, 100]) {
            expect(JSON.stringify(runFixture(fixture, spread, 7))).toBe(
              JSON.stringify(runFixture(fixture, spread))
            );
          }
        }
      );

      it('a window shorter than the count is fully selected', () => {
        const short = () =>
          input({
            days: ['2026-10-30', '2026-10-31'],
            assignments: [assignment({ remainingMinutes: 240, dueDate: '2026-10-31' })],
            availability: [
              { dayOfWeek: dow('2026-10-30'), startMinute: 540, endMinute: 780 },
              { dayOfWeek: dow('2026-10-31'), startMinute: 540, endMinute: 780 },
            ],
          });
        const seven = schedule({
          ...short(),
          preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 7 },
        });
        const two = schedule({
          ...short(),
          preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 2 },
        });
        expect(JSON.stringify(two)).toBe(JSON.stringify(seven));
      });

      it('falls back to every day when the key is missing or unusable', () => {
        const base = input({
          assignments: [assignment({ remainingMinutes: 300, dueDate: '2026-11-05' })],
          availability: windowsFrom(UNEVEN_MINUTES),
        });
        const prefs = { ...V1_PREFS, spreadPercent: 100 };
        const seven = JSON.stringify(
          schedule({ ...base, preferences: { ...prefs, weeklyGoalDays: 7 } })
        );
        const missing = { ...prefs } as Partial<StudyPreferences>;
        delete missing.weeklyGoalDays;
        expect(
          JSON.stringify(schedule({ ...base, preferences: missing as StudyPreferences }))
        ).toBe(seven);
        expect(
          JSON.stringify(
            schedule({
              ...base,
              preferences: { ...prefs, weeklyGoalDays: Number.NaN },
            })
          )
        ).toBe(seven);
      });
    });

    describe('EP17C-AC3 — a deadline always beats the preference', () => {
      it('meets a deadline that needs a day the selection dropped (critical carve-out)', () => {
        // N = 1 selects 10-30 (240). The assignment needs 300 minutes by
        // 10-31, which the selected day alone cannot hold, so rule 3 calls it
        // critical and the critical pass spends the **real** budget of the
        // unselected 10-31. A naive zeroing of `dayBudgetOf` would report a
        // 60-minute deficit here (R-EP17-03).
        const minutes: Record<string, number> = {
          '2026-10-30': 240,
          '2026-10-31': 180,
          '2026-11-01': 120,
          '2026-11-02': 0,
          '2026-11-03': 0,
          '2026-11-04': 0,
          '2026-11-05': 0,
        };
        const out = schedule(
          input({
            assignments: [assignment({ remainingMinutes: 300, dueDate: '2026-10-31' })],
            availability: windowsFrom(minutes),
            preferences: {
              ...V1_PREFS,
              spreadPercent: 100,
              weeklyGoalDays: 1,
              maxSessionMinutes: 240,
            },
          })
        );
        expect([...selectStudyDays(Object.keys(minutes), (d) => minutes[d], 1)]).toEqual([
          '2026-10-30',
        ]);
        expect(perDay(out)).toEqual({ '2026-10-30': 240, '2026-10-31': 60 });
        expect(out.results[0].deficitMinutes).toBe(0);
        expect(out.results[0].deficitCategory).toBeNull();
      });

      it('falls back to the full horizon when no selected day precedes the deadline', () => {
        // N = 1 selects 11-01 (180). The assignment is due 10-31, so its
        // horizon {10-30, 10-31} holds no selected day at all: its normal
        // pass keeps the whole horizon (contracts §4), which is why it is
        // still paced across both days and still `FLEX_DAY` rather than
        // being rescued — pinned and bunched — by the critical pass.
        const minutes: Record<string, number> = {
          '2026-10-30': 120,
          '2026-10-31': 120,
          '2026-11-01': 180,
          '2026-11-02': 0,
          '2026-11-03': 0,
          '2026-11-04': 0,
          '2026-11-05': 0,
        };
        const out = schedule(
          input({
            assignments: [assignment({ remainingMinutes: 120, dueDate: '2026-10-31' })],
            availability: windowsFrom(minutes),
            preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 1 },
          })
        );
        expect(perDay(out)).toEqual({ '2026-10-30': 60, '2026-10-31': 60 });
        expect(out.results[0].deficitMinutes).toBe(0);
        expect(out.sessions.every((s) => s.anchor === 'FLEX_DAY')).toBe(true);
      });

      it('no battery fixture gains a deficit category from the selection alone', () => {
        // EP17C-AC3's negative, over the whole battery at N = 3 and N = 1:
        // the category each assignment ends with is the one it already had
        // at N = 7 — including the two adversarial EP17B fixtures, which
        // need no exception here.
        for (const fixture of PACING_BATTERY) {
          const seven = runFixture(fixture, 100, 7);
          for (const count of [3, 1]) {
            const narrowed = runFixture(fixture, 100, count);
            expect({
              name: `${fixture.name}@${count}`,
              categories: narrowed.results.map((r) => r.deficitCategory),
            }).toEqual({
              name: `${fixture.name}@${count}`,
              categories: seven.results.map((r) => r.deficitCategory),
            });
          }
        }
      });

      it('reports the deficit honestly at N = 1 with a week of work (boundary)', () => {
        const out = schedule(
          input({
            assignments: [
              assignment({ id: 'a', remainingMinutes: 300, dueDate: '2026-11-05' }),
              assignment({ id: 'b', remainingMinutes: 300, dueDate: '2026-11-05' }),
            ],
            availability: windowsFrom(UNEVEN_MINUTES),
            preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 1 },
          })
        );
        for (const result of out.results) {
          // No minutes vanish, and no new category appears.
          expect(result.placedMinutes + result.deficitMinutes + result.deferredMinutes).toBe(300);
          expect([null, 'INSUFFICIENT_TIME_BEFORE_DEADLINE']).toContain(result.deficitCategory);
        }
        const placed = out.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
        expect(placed).toBe(out.results.reduce((sum, r) => sum + r.placedMinutes, 0));
      });
    });

    describe('EP17C-AC4 — determinism and purity', () => {
      it('is byte-identical across two runs of the same input', () => {
        for (const fixture of PACING_BATTERY) {
          for (const count of [1, 3, 5]) {
            const first = JSON.stringify(runFixture(fixture, 100, count));
            expect(JSON.stringify(runFixture(fixture, 100, count))).toBe(first);
          }
        }
      });

      it('does not depend on the order the assignments are handed in', () => {
        const a = assignment({ id: 'a', remainingMinutes: 180, dueDate: '2026-11-05' });
        const b = assignment({ id: 'b', remainingMinutes: 180, dueDate: '2026-11-05' });
        const run = (assignments: SchedulableAssignment[]) =>
          JSON.stringify(
            schedule(
              input({
                assignments,
                availability: windowsFrom(UNEVEN_MINUTES),
                preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 3 },
              })
            )
          );
        expect(run([b, a])).toBe(run([a, b]));
      });

      it('does not mutate its input while selecting', () => {
        const inp = {
          ...input({
            assignments: [assignment({ remainingMinutes: 300 })],
            availability: windowsFrom(UNEVEN_MINUTES),
          }),
          preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays: 3 },
        };
        const snapshot = JSON.stringify(inp);
        schedule(inp);
        expect(JSON.stringify(inp)).toBe(snapshot);
      });
    });

    describe('EP17C — the ▲ D-C2 (a) anchor coupling, pinned as intended', () => {
      it('a narrower week may pin an assignment FIXED that was FLEX_DAY at N = 7', () => {
        // A flat week of 120-minute days, so the selection changes the
        // horizon capacity and nothing else.
        const minutes: Record<string, number> = {
          '2026-10-30': 120,
          '2026-10-31': 120,
          '2026-11-01': 120,
          '2026-11-02': 120,
          '2026-11-03': 120,
          '2026-11-04': 120,
          '2026-11-05': 120,
        };
        const run = (weeklyGoalDays: number) =>
          schedule(
            input({
              assignments: [assignment({ remainingMinutes: 350, dueDate: '2026-11-05' })],
              availability: windowsFrom(minutes),
              preferences: { ...V1_PREFS, spreadPercent: 100, weeklyGoalDays },
            })
          );
        // N = 7: 840 budgeted minutes of horizon — 350 + 15 fits with slack.
        expect(run(7).sessions.every((s) => s.anchor === 'FLEX_DAY')).toBe(true);
        // N = 3: 360 budgeted minutes — 350 + 15 does not fit, so every
        // block is load-bearing and pins (▲ D-C2 (a), intended).
        const narrowed = run(3);
        expect(narrowed.sessions.every((s) => s.anchor === 'FIXED')).toBe(true);
        expect(narrowed.sessions.every((s) => s.windowHint === null)).toBe(true);
      });
    });
  });
});
