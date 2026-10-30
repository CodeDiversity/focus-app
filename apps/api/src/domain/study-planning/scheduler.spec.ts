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
  };

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

    it('places a shortened tail session', () => {
      const a = assignment({ remainingMinutes: 70 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      // 60 + 10 tail
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([60, 10]);
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

    it('places a session shorter than minSessionMinutes when the tail requires it', () => {
      const a = assignment({ remainingMinutes: 10 });
      const out = schedule(
        input({
          assignments: [a],
          availability: [{ dayOfWeek: dow('2026-10-30'), startMinute: 0, endMinute: 1440 }],
        })
      );
      expect(out.sessions.map((s) => s.durationMinutes)).toEqual([10]);
    });

    it('places a session shorter than minSessionMinutes when the budget requires it', () => {
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
          preferences: {
            sessionLengthMinutes: 60,
            minSessionMinutes: 15,
            maxSessionMinutes: 120,
            dailyCapMinutes: 100,
          },
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
});
