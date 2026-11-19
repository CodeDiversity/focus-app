import type { DatedInterval, SchedulableAssignment, StudyPreferences, WeeklyWindow } from './types';

/**
 * EP15C-AC4 identity battery (test support, not shipped behaviour). Every
 * fixture is in the **pre-EP15 shape** (`availability` / `blocked` as
 * weekly windows). `identity.snapshot.json` holds the EP14E engine's output
 * for each — generated once from the engine at `b2fed52` before EP15C
 * touched it — and `identity.spec.ts` replays the battery through the
 * weekly→bounds adapter and the EP15C engine, asserting byte-identity.
 *
 * Coverage: single and multiple windows per weekday (touching and apart),
 * recurring blocked time, classes, dated busy time, `hard` flags set and
 * unset, overdue and beyond-window work, tails below the minimum, density
 * and break settings, the FLEX_DAY / FIXED partition, round-robin over
 * several assignments, `24:00` edges and an empty-availability day.
 */
export type LegacyFixture = {
  name: string;
  days: string[];
  assignments: SchedulableAssignment[];
  availability: WeeklyWindow[];
  blocked: WeeklyWindow[];
  classes: WeeklyWindow[];
  busy: DatedInterval[];
  preferences: StudyPreferences;
};

const PREFS: StudyPreferences = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
  breakMinutes: 15,
  densityPercent: 80,
  dailyGoalMinutes: 60,
  weeklyGoalDays: 7, // EP17C rule 9b: 7 = every day usable — the pre-EP17C engine (TR-E17-02).
  spreadPercent: 0, // EP17A — unread until EP17B; 0 = the pre-EP17 behaviour (D17-6).
};

const WEEK = [
  '2026-10-30', // Fri
  '2026-10-31', // Sat
  '2026-11-01', // Sun
  '2026-11-02', // Mon
  '2026-11-03', // Tue
  '2026-11-04', // Wed
  '2026-11-05', // Thu
];

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

const win = (dayOfWeek: number, startMinute: number, endMinute: number): WeeklyWindow => ({
  dayOfWeek,
  startMinute,
  endMinute,
});

const allDays = (startMinute: number, endMinute: number): WeeklyWindow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((d) => win(d, startMinute, endMinute));

const base = (overrides: Partial<LegacyFixture>): LegacyFixture => ({
  name: 'unnamed',
  days: WEEK,
  assignments: [],
  availability: allDays(540, 720),
  blocked: [],
  classes: [],
  busy: [],
  preferences: PREFS,
  ...overrides,
});

export const IDENTITY_FIXTURES: LegacyFixture[] = [
  base({ name: 'one window, one assignment', assignments: [assignment()] }),
  base({
    name: 'three assignments, round-robin, mixed priority',
    assignments: [
      assignment({ id: 'a', remainingMinutes: 180, priority: 'HIGH' }),
      assignment({ id: 'b', remainingMinutes: 90, priority: 'LOW', dueDate: '2026-11-03' }),
      assignment({ id: 'c', remainingMinutes: 240, priority: 'URGENT', dueDate: '2026-11-04' }),
    ],
    availability: allDays(480, 1020),
  }),
  base({
    name: 'two windows per weekday apart (morning + evening)',
    assignments: [assignment({ remainingMinutes: 300 }), assignment({ id: 'a-2' })],
    availability: [...allDays(540, 660), ...allDays(1080, 1260)],
  }),
  base({
    name: 'two touching windows per weekday',
    assignments: [assignment({ remainingMinutes: 200 })],
    availability: [...allDays(540, 600), ...allDays(600, 720)],
  }),
  base({
    name: 'three windows one weekday only, others empty',
    assignments: [assignment({ remainingMinutes: 400 })],
    availability: [win(1, 480, 600), win(1, 720, 840), win(1, 1020, 1200)],
  }),
  base({
    name: 'recurring blocked time inside the window',
    assignments: [assignment({ remainingMinutes: 150 })],
    availability: allDays(480, 1020),
    blocked: [win(5, 600, 720), win(1, 480, 1020)],
  }),
  base({
    name: 'classes and dated busy time',
    assignments: [
      assignment({ remainingMinutes: 180 }),
      assignment({ id: 'a-2', remainingMinutes: 60 }),
    ],
    availability: allDays(480, 1020),
    classes: [win(5, 540, 630), win(2, 600, 700)],
    busy: [
      { date: '2026-10-30', startMinute: 660, endMinute: 720 },
      { date: '2026-11-02', startMinute: 480, endMinute: 900 },
    ],
  }),
  base({
    name: 'hard flags true / false / null with types',
    assignments: [
      assignment({ id: 'h-true', hard: true, assignmentType: 'HOMEWORK', remainingMinutes: 60 }),
      assignment({ id: 'h-false', hard: false, assignmentType: 'PAPER', remainingMinutes: 60 }),
      assignment({ id: 'h-null', hard: null, assignmentType: 'EXAM', remainingMinutes: 60 }),
      assignment({ id: 'h-none', assignmentType: 'QUIZ', remainingMinutes: 150 }),
    ],
    availability: allDays(540, 780),
  }),
  base({
    name: 'overdue, beyond-window and tight deadline (FIXED partition)',
    assignments: [
      assignment({ id: 'overdue', dueDate: '2026-10-20', remainingMinutes: 90 }),
      assignment({ id: 'later', dueDate: '2026-12-01', remainingMinutes: 600 }),
      assignment({ id: 'tight', dueDate: '2026-10-31', remainingMinutes: 230 }),
    ],
    availability: allDays(540, 720),
  }),
  base({
    name: 'tail below minimum and max block growth',
    assignments: [assignment({ remainingMinutes: 125 })],
    availability: allDays(540, 1020),
    preferences: { ...PREFS, sessionLengthMinutes: 120, minSessionMinutes: 30, breakMinutes: 0 },
  }),
  base({
    name: 'density 50 with breaks 30, cap 180',
    assignments: [
      assignment({ remainingMinutes: 480 }),
      assignment({ id: 'a-2', remainingMinutes: 240 }),
    ],
    availability: allDays(480, 1200),
    preferences: { ...PREFS, densityPercent: 50, breakMinutes: 30, dailyCapMinutes: 180 },
  }),
  base({
    name: 'v1 prefs (no break, density 100), whole-day windows',
    assignments: [
      assignment({ remainingMinutes: 300 }),
      assignment({ id: 'a-2', remainingMinutes: 45 }),
    ],
    availability: allDays(0, 1440),
    preferences: { ...PREFS, breakMinutes: 0, densityPercent: 100 },
  }),
  base({
    name: '24:00 window end and a zero-availability weekday',
    assignments: [assignment({ remainingMinutes: 200 })],
    availability: [win(5, 1320, 1440), win(6, 1200, 1440), win(1, 540, 720)],
  }),
  base({
    name: 'no availability at all → NO_AVAILABLE_TIME',
    assignments: [assignment()],
    availability: [],
  }),
  base({
    name: 'window fully blocked → NO_AVAILABLE_TIME, busy covering another',
    assignments: [assignment()],
    availability: [win(5, 540, 720), win(1, 540, 720)],
    blocked: [win(5, 540, 720)],
    busy: [{ date: '2026-11-02', startMinute: 540, endMinute: 720 }],
  }),
];
