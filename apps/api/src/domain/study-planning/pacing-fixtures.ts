import { schedule } from './scheduler';
import { boundsFromWeeklyWindows } from './legacy-windows';
import { IDENTITY_FIXTURES, type LegacyFixture } from './identity-fixtures';
import type { SchedulableAssignment, SchedulerOutput, WeeklyWindow } from './types';

/**
 * EP17B pacing battery (test support, not shipped behaviour).
 *
 * The battery is the EP15C identity fixtures (every placement shape the
 * engine has a name for — breaks, density, tails, overdue, beyond-window,
 * the FIXED partition, round-robin, empty days) **plus** the four fixtures
 * EP17B's story names: the AC1 spread case, the two R-EP17-01 adversarial
 * cases, and the D17-3 many-small-assignments counterexample.
 *
 * `pacing-baseline.snapshot.json` holds this battery's output from the
 * **pre-EP17B engine** (generated once at `3d10130`, before rule 9 existed).
 * `scheduler.spec.ts` replays the battery at `spreadPercent = 0` and asserts
 * byte-identity against it (EP17B-AC4 / TR-E17-02).
 *
 * Every fixture stays in the pre-EP15 weekly shape and reaches the engine
 * through the weekly→bounds adapter, exactly like the identity battery.
 */

const WEEK = [
  '2026-10-30', // Fri
  '2026-10-31', // Sat
  '2026-11-01', // Sun
  '2026-11-02', // Mon
  '2026-11-03', // Tue
  '2026-11-04', // Wed
  '2026-11-05', // Thu
];

/** Plain preferences: no break, no density discount — pacing shows up alone. */
const PLAIN = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
  breakMinutes: 0,
  densityPercent: 100,
  dailyGoalMinutes: 60,
  weeklyGoalDays: 3,
  spreadPercent: 0, // every fixture is stored "off"; the spec overrides it.
};

const task = (overrides: Partial<SchedulableAssignment> = {}): SchedulableAssignment => ({
  id: 'p-1',
  title: 'Task',
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

const fixture = (overrides: Partial<LegacyFixture>): LegacyFixture => ({
  name: 'unnamed',
  days: WEEK,
  assignments: [],
  availability: allDays(540, 840),
  blocked: [],
  classes: [],
  busy: [],
  preferences: PLAIN,
  ...overrides,
});

/** EP17B-AC1: 300 minutes due in five days, five days of equal availability. */
export const SPREAD_FIXTURE: LegacyFixture = fixture({
  name: 'pacing: one 300-minute assignment, five generous days (EP17B-AC1)',
  days: WEEK.slice(0, 5),
  assignments: [task({ id: 'big', remainingMinutes: 300, dueDate: '2026-11-03' })],
  availability: allDays(540, 840), // 300 free minutes a day; budget 240 (cap)
});

/**
 * EP17B-AC2 / R-EP17-01 counterexample 1: 100 minutes due Tue; Monday holds
 * one usable 100-minute gap; Tuesday's 140 free minutes are fourteen 10-minute
 * slivers, every one of them below `minSessionMinutes` (15). `dayBudgetOf`
 * (and therefore `capacityAfter`) calls Tuesday worth 140 minutes, which is
 * nominal only.
 */
export const FRAGMENTED_FIXTURE: LegacyFixture = fixture({
  name: 'pacing: the fragmentation counterexample (R-EP17-01)',
  days: ['2026-11-02', '2026-11-03'],
  assignments: [task({ id: 'frag', remainingMinutes: 100, dueDate: '2026-11-03' })],
  availability: [
    win(1, 540, 640), // Mon: one 100-minute gap
    // Tue: 14 × 10 free minutes, 10 minutes apart — 140 nominal, 0 usable.
    ...Array.from({ length: 14 }, (_unused, i) => win(2, 540 + i * 20, 550 + i * 20)),
  ],
});

/**
 * EP17B-AC2 / R-EP17-01 counterexample 2: two 60-minute assignments due Tue
 * sharing a 30-minute Tuesday. `capacityAfter` ignores competition, so each
 * assignment believes Tuesday can still absorb it.
 */
export const SHARED_CAPACITY_FIXTURE: LegacyFixture = fixture({
  name: 'pacing: two assignments sharing a tight final day (R-EP17-01)',
  days: ['2026-11-02', '2026-11-03'],
  assignments: [
    task({ id: 's-a', remainingMinutes: 60, dueDate: '2026-11-03' }),
    task({ id: 's-b', remainingMinutes: 60, dueDate: '2026-11-03' }),
  ],
  availability: [win(1, 540, 660), win(2, 540, 570)], // Mon 120, Tue 30
});

/** EP17B-AC5 / D17-3: twelve small assignments, 15–30 minutes each. */
export const MANY_SMALL_FIXTURE: LegacyFixture = fixture({
  name: 'pacing: twelve small assignments (D17-3 counterexample)',
  assignments: Array.from({ length: 12 }, (_unused, i) =>
    task({
      id: `small-${String(i + 1).padStart(2, '0')}`,
      remainingMinutes: 15 + (i % 4) * 5,
      dueDate: WEEK[Math.min(6, 2 + (i % 5))],
      createdAt: new Date(`2026-10-${String(10 + i).padStart(2, '0')}T12:00:00.000Z`),
    })
  ),
  availability: allDays(540, 780),
  preferences: { ...PLAIN, minSessionMinutes: 15, sessionLengthMinutes: 30 },
});

/** The EP17B fixtures on their own (the four the story names). */
export const PACING_FIXTURES: LegacyFixture[] = [
  SPREAD_FIXTURE,
  FRAGMENTED_FIXTURE,
  SHARED_CAPACITY_FIXTURE,
  MANY_SMALL_FIXTURE,
];

/** The whole battery: the identity shapes plus the pacing fixtures. */
export const PACING_BATTERY: LegacyFixture[] = [...IDENTITY_FIXTURES, ...PACING_FIXTURES];

/** Run one battery fixture at an explicit `spreadPercent`. */
export function runFixture(f: LegacyFixture, spreadPercent: number): SchedulerOutput {
  return schedule({
    days: f.days,
    assignments: f.assignments,
    ...boundsFromWeeklyWindows(f.days, f.availability, f.blocked),
    classes: f.classes,
    busy: f.busy,
    preferred: [],
    preferences: { ...f.preferences, spreadPercent },
  });
}
