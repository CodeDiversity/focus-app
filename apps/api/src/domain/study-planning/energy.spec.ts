import { freeIntervals, mergeIntervals, subtractIntervals } from './intervals';
import { isDemanding, schedule } from './scheduler';
import type {
  EnergyLevelValue,
  SchedulableAssignment,
  SchedulerInput,
  StudyPreferences,
  WeeklyWindow,
} from './types';

/**
 * EP13J domain unit spec (pure): energy-aware availability and placement
 * (TR-E13-09; D-J1 demanding rule, D-J2 energy-aware merge, D-J3 preference
 * order, EP13J-AC2/AC3/AC5).
 */
describe('energy-aware placement (domain, EP13J)', () => {
  const FRIDAY = '2026-10-30'; // dayOfWeek 5
  const PREFS: StudyPreferences = {
    sessionLengthMinutes: 60,
    minSessionMinutes: 15,
    maxSessionMinutes: 120,
    dailyCapMinutes: 480,
    breakMinutes: 0,
    densityPercent: 100,
    dailyGoalMinutes: 60,
    weeklyGoalDays: 3,
  };
  const WEEK = [
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
  ];

  const assignment = (overrides: Partial<SchedulableAssignment> = {}): SchedulableAssignment => ({
    id: 'a-1',
    title: 'Assignment 1',
    courseCode: null,
    dueDate: '2026-11-05',
    estimatedMinutes: 60,
    confirmedMinutes: 0,
    remainingMinutes: 60,
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    flagged: null,
    calibration: null,
    ...overrides,
  });

  /** A NORMAL 09:00–11:00 window on every weekday, so nothing is ever critical. */
  const everyMorning: WeeklyWindow[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startMinute: 540,
    endMinute: 660,
  }));
  const friday = (startMinute: number, endMinute: number, energy?: EnergyLevelValue) => ({
    dayOfWeek: 5,
    startMinute,
    endMinute,
    ...(energy ? { energy } : {}),
  });

  const input = (overrides: Partial<SchedulerInput> = {}): SchedulerInput => ({
    days: WEEK,
    assignments: [],
    availability: everyMorning,
    blocked: [],
    classes: [],
    busy: [],
    preferences: PREFS,
    ...overrides,
  });

  const fridaySessions = (out: ReturnType<typeof schedule>) =>
    out.sessions.filter((s) => s.date === FRIDAY);

  describe('the demanding rule (D-J1, refines D13-10)', () => {
    it('PAPER / PROJECT / EXAM or more than 120 remaining minutes is demanding', () => {
      expect(isDemanding({ assignmentType: 'PAPER', remainingMinutes: 30 })).toBe(true);
      expect(isDemanding({ assignmentType: 'PROJECT', remainingMinutes: 30 })).toBe(true);
      expect(isDemanding({ assignmentType: 'EXAM', remainingMinutes: 30 })).toBe(true);
      expect(isDemanding({ assignmentType: 'HOMEWORK', remainingMinutes: 121 })).toBe(true);
      expect(isDemanding({ assignmentType: 'HOMEWORK', remainingMinutes: 120 })).toBe(false);
      expect(isDemanding({ assignmentType: 'QUIZ', remainingMinutes: 60 })).toBe(false);
      expect(isDemanding({ assignmentType: null, remainingMinutes: 60 })).toBe(false);
      expect(isDemanding({ remainingMinutes: 60 })).toBe(false);
    });
  });

  describe('energy survives the interval algebra (EP13J-AC5, D-J2)', () => {
    it('a HIGH 09:00–11:00 window touching a NORMAL 11:00–13:00 window stays two free intervals', () => {
      const free = freeIntervals({
        date: FRIDAY,
        base: {
          kind: 'declared',
          windows: [
            { date: FRIDAY, startMinute: 660, endMinute: 780, energy: 'NORMAL' },
            { date: FRIDAY, startMinute: 540, endMinute: 660, energy: 'HIGH' },
          ],
        },
        blocked: [],
        classes: [],
        busy: [],
        placed: [],
      });
      expect(free).toEqual([
        { date: FRIDAY, startMinute: 540, endMinute: 660, energy: 'HIGH' },
        { date: FRIDAY, startMinute: 660, endMinute: 780, energy: 'NORMAL' },
      ]);
    });

    it('touching windows of the same level still merge', () => {
      expect(
        mergeIntervals([
          { date: FRIDAY, startMinute: 540, endMinute: 660, energy: 'HIGH' },
          { date: FRIDAY, startMinute: 660, endMinute: 780, energy: 'HIGH' },
        ])
      ).toEqual([{ date: FRIDAY, startMinute: 540, endMinute: 780, energy: 'HIGH' }]);
    });

    it('an untagged window is NORMAL: it merges with NORMAL and keeps the pre-EP13J shape', () => {
      expect(
        mergeIntervals([
          { date: FRIDAY, startMinute: 540, endMinute: 660 },
          { date: FRIDAY, startMinute: 600, endMinute: 700 },
        ])
      ).toEqual([{ date: FRIDAY, startMinute: 540, endMinute: 700 }]);
      expect(
        mergeIntervals([
          { date: FRIDAY, startMinute: 540, endMinute: 660 },
          { date: FRIDAY, startMinute: 660, endMinute: 700, energy: 'NORMAL' },
        ])
      ).toHaveLength(1);
    });

    it('overlapping windows of different levels become disjoint — the earlier keeps its span', () => {
      expect(
        mergeIntervals([
          { date: FRIDAY, startMinute: 660, endMinute: 780, energy: 'LOW' },
          { date: FRIDAY, startMinute: 540, endMinute: 700, energy: 'HIGH' },
          { date: FRIDAY, startMinute: 560, endMinute: 600, energy: 'LOW' }, // swallowed
        ])
      ).toEqual([
        { date: FRIDAY, startMinute: 540, endMinute: 700, energy: 'HIGH' },
        { date: FRIDAY, startMinute: 700, endMinute: 780, energy: 'LOW' },
      ]);
    });

    it('subtraction keeps each remainder’s energy', () => {
      expect(
        subtractIntervals(
          [{ date: FRIDAY, startMinute: 540, endMinute: 780, energy: 'HIGH' }],
          [{ date: FRIDAY, startMinute: 600, endMinute: 660 }]
        )
      ).toEqual([
        { date: FRIDAY, startMinute: 540, endMinute: 600, energy: 'HIGH' },
        { date: FRIDAY, startMinute: 660, endMinute: 780, energy: 'HIGH' },
      ]);
    });
  });

  describe('placement preference (EP13J-AC2, D-J3)', () => {
    const tagged = [...everyMorning, friday(1080, 1200, 'HIGH'), friday(1200, 1260, 'LOW')];

    it('demanding work is placed into the HIGH window when a feasible HIGH gap exists', () => {
      const out = schedule(
        input({ availability: tagged, assignments: [assignment({ assignmentType: 'PAPER' })] })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 1080, endMinute: 1140 }]);
    });

    it('light work prefers the LOW window', () => {
      const out = schedule(
        input({ availability: tagged, assignments: [assignment({ assignmentType: 'HOMEWORK' })] })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 1200, endMinute: 1260 }]);
    });

    it('light work with no LOW window prefers NORMAL over HIGH', () => {
      const out = schedule(
        input({
          availability: [...everyMorning, friday(1080, 1200, 'HIGH')],
          assignments: [assignment({ assignmentType: 'QUIZ' })],
        })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 540 }]);
    });

    it('preference, never a constraint: demanding work still uses a LOW window when that is all there is', () => {
      const lowOnly = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startMinute: 540,
        endMinute: 660,
        energy: 'LOW' as const,
      }));
      const out = schedule(
        input({ availability: lowOnly, assignments: [assignment({ assignmentType: 'EXAM' })] })
      );
      expect(out.results[0].placedMinutes).toBe(60);
    });

    it('feasibility override: critical work keeps the earliest-first scan and ignores energy', () => {
      // One day only: nothing can fit after it, so the PAPER is critical.
      const out = schedule(
        input({
          days: [FRIDAY],
          availability: [friday(540, 660), friday(1080, 1200, 'HIGH')],
          assignments: [assignment({ assignmentType: 'PAPER', dueDate: FRIDAY })],
        })
      );
      expect(out.sessions).toMatchObject([{ startMinute: 540, endMinute: 600 }]);
    });

    it('energy moves blocks but never changes minutes placed, deficits or which assignments pin', () => {
      const work = [
        assignment({
          id: 'p',
          assignmentType: 'PAPER',
          remainingMinutes: 180,
          dueDate: '2026-11-01',
        }),
        assignment({ id: 'h', assignmentType: 'HOMEWORK', remainingMinutes: 90 }),
        assignment({ id: 'q', assignmentType: 'QUIZ', remainingMinutes: 30, priority: 'HIGH' }),
      ];
      const prefs = { ...PREFS, breakMinutes: 15, densityPercent: 80, dailyCapMinutes: 240 };
      const plain = schedule(
        input({
          availability: [...everyMorning, friday(1080, 1260)],
          assignments: work,
          preferences: prefs,
        })
      );
      const energised = schedule(
        input({
          availability: [...everyMorning, friday(1080, 1200, 'HIGH'), friday(1200, 1260, 'LOW')],
          assignments: work,
          preferences: prefs,
        })
      );
      expect(energised.results).toEqual(plain.results);
      // Pinning (EP13G) is decided from budgets, never from slots: the same set pins.
      // (Block *count* may differ — a block never straddles an energy boundary.)
      const pinnedIds = (out: ReturnType<typeof schedule>) =>
        [
          ...new Set(out.sessions.filter((s) => s.anchor === 'FIXED').map((s) => s.assignmentId)),
        ].sort();
      expect(pinnedIds(energised)).toEqual(pinnedIds(plain));
      // Rule 4 still holds under energy: every block within [min, max].
      for (const s of energised.sessions) {
        expect(s.durationMinutes).toBeGreaterThanOrEqual(prefs.minSessionMinutes);
        expect(s.durationMinutes).toBeLessThanOrEqual(prefs.maxSessionMinutes);
      }
    });

    it('is deterministic: same input twice, and input order reversed, give identical output', () => {
      const work = [
        assignment({ id: 'p', assignmentType: 'PAPER', remainingMinutes: 150 }),
        assignment({ id: 'h', assignmentType: 'HOMEWORK', remainingMinutes: 90 }),
      ];
      const base = input({ availability: tagged, assignments: work });
      const a = schedule(base);
      expect(JSON.stringify(schedule(base))).toBe(JSON.stringify(a));
      expect(JSON.stringify(schedule({ ...base, assignments: [...work].reverse() }))).toBe(
        JSON.stringify(a)
      );
    });
  });

  describe('all-NORMAL identity (EP13J-AC3)', () => {
    it('every slot NORMAL is byte-identical to untagged input — anchors and window hints included', () => {
      const availability: WeeklyWindow[] = [
        ...everyMorning,
        { dayOfWeek: 5, startMinute: 660, endMinute: 780 }, // touches the morning window
        { dayOfWeek: 1, startMinute: 1080, endMinute: 1260 },
        { dayOfWeek: 3, startMinute: 780, endMinute: 900 },
      ];
      const work = [
        assignment({
          id: 'p',
          assignmentType: 'PAPER',
          remainingMinutes: 600,
          dueDate: '2026-11-02',
        }),
        assignment({ id: 'h', assignmentType: 'HOMEWORK', remainingMinutes: 200 }),
        assignment({ id: 'x', remainingMinutes: 45, dueDate: '2026-10-28' }), // overdue
        assignment({
          id: 'q',
          assignmentType: 'QUIZ',
          remainingMinutes: 500,
          dueDate: '2026-11-09',
        }),
      ];
      const prefs = { ...PREFS, breakMinutes: 15, densityPercent: 80, dailyCapMinutes: 240 };
      const untagged = schedule(input({ availability, assignments: work, preferences: prefs }));
      const allNormal = schedule(
        input({
          availability: availability.map((w) => ({ ...w, energy: 'NORMAL' as const })),
          assignments: work,
          preferences: prefs,
        })
      );
      expect(JSON.stringify(allNormal)).toBe(JSON.stringify(untagged));
      expect(untagged.sessions.some((s) => s.anchor === 'FLEX_DAY' && s.windowHint)).toBe(true);
      expect(untagged.sessions.some((s) => s.anchor === 'FIXED')).toBe(true);
    });
  });
});
