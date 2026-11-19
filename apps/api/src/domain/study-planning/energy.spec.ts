import { freeIntervals, mergeIntervals, subtractIntervals } from './intervals';
import { byEnergyPreference, isDemanding, schedule } from './scheduler';
import { boundsFromWeeklyWindows, windowsAsPreferred } from './legacy-windows';
import type {
  DatedInterval,
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
    spreadPercent: 0, // EP17A — unread until EP17B; 0 = the pre-EP17 behaviour.
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

  /**
   * EP15C: these EP13J/EP14E pins keep their weekly fixtures and reach the
   * engine through the interim adapter — hull bounds plus every former
   * window as a preferred interval carrying its energy tag. Every window is
   * then one tier, which is exactly the case EP15C-AC3 freezes: *within a
   * tier* `byEnergyPreference` applies unchanged. The new two-tier and
   * course-tie behaviour is pinned in `preferred.spec.ts`.
   */
  type LegacyInput = Omit<SchedulerInput, 'dayBounds' | 'blocked' | 'preferred'> & {
    availability: WeeklyWindow[];
    blocked: WeeklyWindow[];
  };
  const input = (overrides: Partial<LegacyInput> = {}): SchedulerInput => {
    const legacy: LegacyInput = {
      days: WEEK,
      assignments: [],
      availability: everyMorning,
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
      preferred: windowsAsPreferred(legacy.days, availability),
    };
  };

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
    /** The LOW window touches the NORMAL morning (both MORNING), HIGH in the evening. */
    const taggedMorningLow = [...everyMorning, friday(660, 720, 'LOW'), friday(1080, 1200, 'HIGH')];

    it('demanding work is placed into the HIGH window when a feasible HIGH gap exists', () => {
      const out = schedule(
        input({ availability: tagged, assignments: [assignment({ assignmentType: 'PAPER' })] })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 1080, endMinute: 1140 }]);
    });

    it('light work prefers the LOW window', () => {
      // EP14E (D-E3): the LOW window sits in the same part of the day as
      // the morning NORMAL gap, so the preference applies. (The `tagged`
      // fixture's evening LOW is F-EP13J-04's drift — see the guard spec.)
      const out = schedule(
        input({
          availability: taggedMorningLow,
          assignments: [assignment({ assignmentType: 'HOMEWORK' })],
        })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 660, endMinute: 720 }]);
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

    it('all-NORMAL identity holds with flags set (EP14E-AC2)', () => {
      const availability: WeeklyWindow[] = [
        ...everyMorning,
        { dayOfWeek: 5, startMinute: 660, endMinute: 780 },
        { dayOfWeek: 1, startMinute: 1080, endMinute: 1260 },
        { dayOfWeek: 3, startMinute: 780, endMinute: 900 },
      ];
      const prefs = { ...PREFS, breakMinutes: 15, densityPercent: 80, dailyCapMinutes: 240 };
      const plain = [
        assignment({
          id: 'p',
          assignmentType: 'PAPER',
          remainingMinutes: 600,
          dueDate: '2026-11-02',
        }),
        assignment({ id: 'h', assignmentType: 'HOMEWORK', remainingMinutes: 200 }),
        assignment({ id: 'x', remainingMinutes: 45, dueDate: '2026-10-28' }),
        assignment({
          id: 'q',
          assignmentType: 'QUIZ',
          remainingMinutes: 500,
          dueDate: '2026-11-09',
        }),
      ];
      // Flags that flip every D13-10 verdict: the PAPER is "Not hard", the
      // HOMEWORK "Hard", the overdue one Auto, the QUIZ "Hard".
      const flagged = [
        { ...plain[0], hard: false },
        { ...plain[1], hard: true },
        { ...plain[2], hard: null },
        { ...plain[3], hard: true },
      ];
      const untagged = schedule(input({ availability, assignments: flagged, preferences: prefs }));
      const allNormal = schedule(
        input({
          availability: availability.map((w) => ({ ...w, energy: 'NORMAL' as const })),
          assignments: flagged,
          preferences: prefs,
        })
      );
      expect(JSON.stringify(allNormal)).toBe(JSON.stringify(untagged));
      // And with nothing tagged, the flags change nothing at all.
      expect(JSON.stringify(untagged)).toBe(
        JSON.stringify(schedule(input({ availability, assignments: plain, preferences: prefs })))
      );
    });
  });

  describe('effort flag (EP14E-AC2, D-E1)', () => {
    const tagged = [...everyMorning, friday(1080, 1200, 'HIGH'), friday(1200, 1260, 'LOW')];
    /** A LOW gap the D-E3 guard accepts: same part of the day as the NORMAL morning. */
    const taggedMorningLow = [...everyMorning, friday(660, 720, 'LOW'), friday(1080, 1200, 'HIGH')];

    it('isDemanding: the flag overrides type and size; null/absent keeps D13-10', () => {
      expect(isDemanding({ assignmentType: 'HOMEWORK', remainingMinutes: 30, hard: true })).toBe(
        true
      );
      expect(isDemanding({ assignmentType: 'EXAM', remainingMinutes: 60, hard: false })).toBe(
        false
      );
      expect(isDemanding({ assignmentType: 'HOMEWORK', remainingMinutes: 600, hard: false })).toBe(
        false
      );
      expect(isDemanding({ assignmentType: 'HOMEWORK', remainingMinutes: 30, hard: null })).toBe(
        false
      );
      expect(isDemanding({ assignmentType: 'PAPER', remainingMinutes: 30, hard: null })).toBe(true);
      expect(isDemanding({ assignmentType: 'HOMEWORK', remainingMinutes: 121 })).toBe(true);
      expect(isDemanding({ assignmentType: 'HOMEWORK', remainingMinutes: 120 })).toBe(false);
    });

    it('a HOMEWORK marked Hard scans HIGH first', () => {
      const out = schedule(
        input({
          availability: tagged,
          assignments: [assignment({ assignmentType: 'HOMEWORK', hard: true })],
        })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 1080, endMinute: 1140 }]);
    });

    it('an EXAM marked Not hard scans LOW first', () => {
      const out = schedule(
        input({
          availability: taggedMorningLow,
          assignments: [assignment({ assignmentType: 'EXAM', hard: false })],
        })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 660, endMinute: 720 }]);
    });

    it('Auto (null) keeps the D13-10 order', () => {
      for (const assignmentType of ['HOMEWORK', 'PAPER'] as const) {
        const withNull = schedule(
          input({ availability: tagged, assignments: [assignment({ assignmentType, hard: null })] })
        );
        const without = schedule(
          input({ availability: tagged, assignments: [assignment({ assignmentType })] })
        );
        expect(JSON.stringify(withNull)).toBe(JSON.stringify(without));
      }
      expect(
        fridaySessions(
          schedule(
            input({
              availability: tagged,
              assignments: [assignment({ assignmentType: 'PAPER', hard: null })],
            })
          )
        )
      ).toMatchObject([{ startMinute: 1080 }]);
    });

    it('the flag never changes minutes placed, deficits or pinning — only where blocks land', () => {
      const work = [
        assignment({
          id: 'p',
          assignmentType: 'PAPER',
          remainingMinutes: 180,
          dueDate: '2026-11-01',
        }),
        assignment({ id: 'h', assignmentType: 'HOMEWORK', remainingMinutes: 90 }),
      ];
      const flipped = [
        { ...work[0], hard: false },
        { ...work[1], hard: true },
      ];
      const prefs = { ...PREFS, breakMinutes: 15, densityPercent: 80, dailyCapMinutes: 240 };
      const plain = schedule(
        input({ availability: tagged, assignments: work, preferences: prefs })
      );
      const withFlags = schedule(
        input({ availability: tagged, assignments: flipped, preferences: prefs })
      );
      expect(withFlags.results).toEqual(plain.results);
      expect(withFlags.sessions.map((s) => s.startMinute)).not.toEqual(
        plain.sessions.map((s) => s.startMinute)
      );
    });
  });

  describe('light-work timing guard (EP14E-AC3, D-E3)', () => {
    /** The F-EP13J-04 shape: a NORMAL morning and a LOW 22:00–23:00 window on Friday. */
    const lateLow = [...everyMorning, friday(1320, 1380, 'LOW')];
    const exceptFriday = everyMorning.filter((w) => w.dayOfWeek !== 5);
    const light = (overrides: Partial<SchedulableAssignment> = {}) =>
      assignment({ assignmentType: 'HOMEWORK', ...overrides });

    it('F-EP13J-04: 09:00 NORMAL + 22:00 LOW the same day → light work lands 09:00', () => {
      const out = schedule(input({ availability: lateLow, assignments: [light()] }));
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 540, endMinute: 600 }]);
      // Not hard says the same thing explicitly.
      const notHard = schedule(
        input({
          availability: lateLow,
          assignments: [light({ assignmentType: 'EXAM', hard: false })],
        })
      );
      expect(fridaySessions(notHard)).toMatchObject([{ startMinute: 540, endMinute: 600 }]);
    });

    it('a LOW gap in the same part of the day as the earliest NORMAL gap is still preferred', () => {
      const out = schedule(
        input({ availability: [...everyMorning, friday(660, 720, 'LOW')], assignments: [light()] })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 660, endMinute: 720 }]);
    });

    it('cross-day: Monday 22:00 LOW only + Tuesday 09:00 NORMAL → the Monday block still lands Monday 22:00 (day choice untouched, R-EP14-03)', () => {
      const monday = '2026-11-02';
      const tuesday = '2026-11-03';
      const out = schedule(
        input({
          days: [monday, tuesday],
          availability: [
            { dayOfWeek: 1, startMinute: 1320, endMinute: 1380, energy: 'LOW' },
            { dayOfWeek: 2, startMinute: 540, endMinute: 660 },
          ],
          assignments: [light()],
        })
      );
      expect(out.sessions).toMatchObject([{ date: monday, startMinute: 1320, endMinute: 1380 }]);
    });

    it('no NORMAL gap that day → the guard does not apply (LOW still first)', () => {
      const out = schedule(
        input({
          availability: [...exceptFriday, friday(1080, 1200, 'HIGH'), friday(1320, 1380, 'LOW')],
          assignments: [light()],
        })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 1320, endMinute: 1380 }]);
    });

    it('a NORMAL gap shorter than minSessionMinutes does not anchor the guard (D-E7)', () => {
      const out = schedule(
        input({
          availability: [...exceptFriday, friday(540, 550), friday(1320, 1380, 'LOW')],
          assignments: [light()],
        })
      );
      expect(fridaySessions(out)).toMatchObject([{ startMinute: 1320, endMinute: 1380 }]);
    });

    it('an ineligible LOW gap still ranks ahead of HIGH for light work (preference, never constraint)', () => {
      // The scan always finds the NORMAL anchor hostable, so the rank below
      // it is pinned on the ordering itself (D-E7a): NORMAL, then the
      // off-part-of-day LOW, then HIGH — and an eligible LOW stays first.
      const gap = (startMinute: number, endMinute: number, energy?: EnergyLevelValue) =>
        ({ date: FRIDAY, startMinute, endMinute, ...(energy ? { energy } : {}) }) as DatedInterval;
      const free = [gap(540, 660), gap(1080, 1200, 'HIGH'), gap(1320, 1380, 'LOW')];
      expect(byEnergyPreference(free, false, 15).map((g) => g.startMinute)).toEqual([
        540, 1320, 1080,
      ]);
      expect(
        byEnergyPreference([gap(660, 720, 'LOW'), ...free], false, 15).map((g) => g.startMinute)
      ).toEqual([660, 540, 1320, 1080]);
      // Demanding work: untouched by the guard.
      expect(byEnergyPreference(free, true, 15).map((g) => g.startMinute)).toEqual([
        1080, 540, 1320,
      ]);
    });

    it('demanding work is unchanged by the guard', () => {
      const tagged = [...everyMorning, friday(1080, 1200, 'HIGH'), friday(1200, 1260, 'LOW')];
      expect(
        fridaySessions(
          schedule(
            input({ availability: tagged, assignments: [assignment({ assignmentType: 'PAPER' })] })
          )
        )
      ).toMatchObject([{ startMinute: 1080, endMinute: 1140 }]);
      expect(
        fridaySessions(
          schedule(
            input({ availability: lateLow, assignments: [assignment({ assignmentType: 'PAPER' })] })
          )
        )
      ).toMatchObject([{ startMinute: 540, endMinute: 600 }]);
    });

    it('critical work ignores the guard', () => {
      // One day only: nothing can fit after it, so the HOMEWORK is critical
      // and keeps the plain earliest-first scan — NORMAL 09:00 before the
      // same-part-of-day LOW the guard would otherwise prefer.
      const out = schedule(
        input({
          days: [FRIDAY],
          availability: [friday(540, 600), friday(600, 660, 'LOW')],
          assignments: [light({ dueDate: FRIDAY })],
        })
      );
      expect(out.sessions).toMatchObject([{ startMinute: 540, endMinute: 600 }]);
    });

    it('is deterministic: same input twice and input order reversed', () => {
      const work = [
        light({ id: 'h', remainingMinutes: 90 }),
        light({ id: 'q', assignmentType: 'QUIZ', remainingMinutes: 45, hard: false }),
        assignment({ id: 'p', assignmentType: 'PAPER', remainingMinutes: 150, hard: null }),
      ];
      const base = input({
        availability: [...lateLow, friday(660, 720, 'LOW'), friday(1080, 1200, 'HIGH')],
        assignments: work,
      });
      const a = schedule(base);
      expect(JSON.stringify(schedule(base))).toBe(JSON.stringify(a));
      expect(JSON.stringify(schedule({ ...base, assignments: [...work].reverse() }))).toBe(
        JSON.stringify(a)
      );
    });
  });
});
