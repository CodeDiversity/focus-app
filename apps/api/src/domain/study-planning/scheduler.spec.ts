import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { schedule } from './scheduler';
import type { SchedulerInput } from './types';
import type { SchedulableAssignment } from './types';
import type { StudyPreferences } from './types';

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
    weeklyGoalDays: 3,
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

  const input = (overrides: Partial<SchedulerInput> = {}): SchedulerInput => ({
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
  });

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
});
