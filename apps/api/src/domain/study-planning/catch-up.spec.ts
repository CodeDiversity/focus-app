import { replan } from './catch-up';
import { boundsFromWeeklyWindows } from './legacy-windows';
import { schedule } from './scheduler';
import { classifyAssignments } from './remaining-work';
import type { ReplanInput, ReplanBusyInterval, MissedSession } from './catch-up';
import type { AssignmentFacts, StudyPreferences, WeeklyWindow } from './types';

/**
 * EP08B domain unit spec (pure, no clock, no zone, no DB): deterministic
 * workload rescheduling reusing EP06's engine.
 */
describe('deterministic workload rescheduling (domain, EP08B)', () => {
  const PREFS: StudyPreferences = {
    sessionLengthMinutes: 60,
    minSessionMinutes: 15,
    maxSessionMinutes: 120,
    dailyCapMinutes: 240,
    // EP13F's placement levers (D13-5). `replan` passes preferences straight
    // through to `schedule(...)`, so EP08's pass-through guarantees are
    // asserted against the real v2 defaults.
    breakMinutes: 15,
    densityPercent: 80,
    dailyGoalMinutes: 60,
    weeklyGoalDays: 3,
  };

  const DAYS = [
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
  ];

  const facts = (overrides: Partial<AssignmentFacts> = {}): AssignmentFacts => ({
    id: 'assignment-1',
    title: 'Problem set 3',
    courseCode: 'CS101',
    dueDate: '2026-11-05',
    estimatedHours: 2,
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  });

  /** Weekly fixtures reach `replan` through the EP15C weekly→bounds adapter (no study blocks). */
  type LegacyReplanInput = Omit<ReplanInput, 'dayBounds' | 'blocked' | 'preferred'> & {
    availability: WeeklyWindow[];
    blocked: WeeklyWindow[];
  };
  const baseInput = (overrides: Partial<LegacyReplanInput> = {}): ReplanInput => {
    const legacy: LegacyReplanInput = {
      days: DAYS,
      assignments: [],
      availability: [{ dayOfWeek: 5, startMinute: 540, endMinute: 720 }], // Friday
      blocked: [],
      classes: [],
      busy: [],
      missedSessions: [],
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

  describe('reuse of EP06 schedule()', () => {
    it('produces the same sessions as calling schedule() directly with the same inputs', () => {
      const assignments = [facts()];
      const input = baseInput({ assignments });
      const replanOut = replan(input);
      const { schedulable } = classifyAssignments(assignments, new Map());
      const direct = schedule({
        days: input.days,
        assignments: schedulable,
        dayBounds: input.dayBounds,
        blocked: input.blocked,
        classes: input.classes,
        busy: input.busy,
        preferred: input.preferred,
        preferences: input.preferences,
      });
      expect(replanOut.sessions).toEqual(direct.sessions);
      expect(replanOut.results).toEqual(direct.results);
    });
  });

  describe('completed-assignment exclusion', () => {
    it('excludes COMPLETED assignments from proposed sessions', () => {
      const completed = facts({ id: 'done', status: 'COMPLETED' });
      const pending = facts({ id: 'open', status: 'PENDING' });
      const out = replan(baseInput({ assignments: [completed, pending] }));
      const ids = out.sessions.map((s) => s.assignmentId);
      expect(ids).not.toContain('done');
      // pending may or may not be placed depending on availability; at least no completed.
      expect(out.results.map((r) => r.assignmentId)).not.toContain('done');
    });

    it('excludes SUBMITTED and GRADED assignments', () => {
      const submitted = facts({ id: 'sub', status: 'SUBMITTED' });
      const graded = facts({ id: 'graded', status: 'GRADED' });
      const out = replan(baseInput({ assignments: [submitted, graded] }));
      expect(out.sessions).toHaveLength(0);
      expect(out.results).toHaveLength(0);
    });
  });

  describe('locked-session preservation', () => {
    it('does not propose a session overlapping a locked interval, and counts it', () => {
      const locked: ReplanBusyInterval = {
        date: '2026-10-30',
        startMinute: 540,
        endMinute: 600,
        locked: true,
      };
      const assignment = facts({ estimatedHours: 1 });
      const out = replan(
        baseInput({
          assignments: [assignment],
          busy: [locked],
          availability: [{ dayOfWeek: 5, startMinute: 540, endMinute: 720 }],
        })
      );
      // locked interval blocks 09:00-10:00; remaining free 10:00-12:00 may fit.
      for (const s of out.sessions) {
        // no session overlaps locked
        const overlaps =
          s.date === locked.date &&
          s.startMinute < locked.endMinute &&
          locked.startMinute < s.endMinute;
        expect(overlaps).toBe(false);
      }
      expect(out.lockedPreserved).toBe(1);
    });

    it('a locked session is never in the proposed set', () => {
      const locked: ReplanBusyInterval = {
        date: '2026-10-30',
        startMinute: 540,
        endMinute: 600,
        locked: true,
      };
      const out = replan(baseInput({ busy: [locked] }));
      const proposedIds = out.sessions.map((s) => `${s.date}-${s.startMinute}`);
      expect(proposedIds).not.toContain(`${locked.date}-${locked.startMinute}`);
    });
  });

  describe('completed-session preservation', () => {
    it('blocks placement on completed intervals and counts them', () => {
      const completed: ReplanBusyInterval = {
        date: '2026-10-30',
        startMinute: 540,
        endMinute: 600,
        completed: true,
      };
      const assignment = facts({ estimatedHours: 1 });
      const out = replan(
        baseInput({
          assignments: [assignment],
          busy: [completed],
          availability: [{ dayOfWeek: 5, startMinute: 540, endMinute: 720 }],
        })
      );
      for (const s of out.sessions) {
        const overlaps =
          s.date === completed.date &&
          s.startMinute < completed.endMinute &&
          completed.startMinute < s.endMinute;
        expect(overlaps).toBe(false);
      }
      expect(out.completedPreserved).toBe(1);
    });
  });

  describe('deficit / feasibility categories', () => {
    it('surfaces NO_AVAILABLE_TIME when no free time exists', () => {
      // availability empty → no free time
      const out = replan(
        baseInput({
          assignments: [facts({ estimatedHours: 1, dueDate: '2026-10-30' })],
          availability: [],
        })
      );
      expect(out.results).toHaveLength(1);
      expect(out.results[0].deficitCategory).toBe('NO_AVAILABLE_TIME');
    });

    it('surfaces OVERDUE for assignments past due', () => {
      const out = replan(
        baseInput({
          days: DAYS,
          assignments: [facts({ estimatedHours: 1, dueDate: '2026-10-20' })],
          availability: [{ dayOfWeek: 5, startMinute: 540, endMinute: 720 }],
        })
      );
      expect(out.results).toHaveLength(1);
      expect(out.results[0].deficitCategory).toBe('OVERDUE');
    });
  });

  describe('determinism', () => {
    it('produces byte-identical output across runs', () => {
      const input = baseInput({
        assignments: [facts(), facts({ id: 'assignment-2', title: 'Essay' })],
        busy: [{ date: '2026-10-30', startMinute: 600, endMinute: 660, locked: true }],
      });
      const a = replan(input);
      const b = replan(input);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });

  describe('missed sessions passthrough', () => {
    it('returns the missedSessions supplied by the caller unchanged', () => {
      const ms = [
        {
          id: 'p-1',
          assignmentId: 'assignment-1',
          assignmentTitle: 'Problem set 3',
          date: '2026-10-20',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          locked: false,
        },
      ];
      const out = replan(baseInput({ missedSessions: ms as MissedSession[] }));
      expect(out.missedSessions).toEqual(ms);
    });
  });

  describe('purity', () => {
    it('does not mutate the input', () => {
      const input = baseInput({ assignments: [facts()] });
      const snapshot = JSON.stringify(input);
      replan(input);
      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });
});
