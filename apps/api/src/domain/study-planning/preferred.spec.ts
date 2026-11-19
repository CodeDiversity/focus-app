import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { schedule } from './scheduler';
import { preferredPieces } from './intervals';
import type {
  DatedInterval,
  PreferredInterval,
  SchedulableAssignment,
  SchedulerInput,
  StudyPreferences,
} from './types';

/**
 * EP15C domain unit spec (pure): the day-bounds base, dated blocked time and
 * the preferred (study-block) tier — contracts.md § Engine input rules 1–6
 * (TR-E15-03; EP15C-AC2, EP15C-AC3). Identity with EP14E is `identity.spec.ts`;
 * the within-tier energy rules are the unchanged `energy.spec.ts`.
 */
describe('day bounds and preferred study blocks (domain, EP15C)', () => {
  const PREFS: StudyPreferences = {
    sessionLengthMinutes: 60,
    minSessionMinutes: 15,
    maxSessionMinutes: 120,
    dailyCapMinutes: 480,
    breakMinutes: 0,
    densityPercent: 100,
    dailyGoalMinutes: 60,
    weeklyGoalDays: 7, // EP17C rule 9b: 7 = every day usable — the pre-EP17C engine (TR-E17-02).
    spreadPercent: 0, // EP17A — unread until EP17B; 0 = the pre-EP17 behaviour.
  };
  const MON = '2026-11-02';
  const TUE = '2026-11-03';
  const WEEK = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];

  const assignment = (overrides: Partial<SchedulableAssignment> = {}): SchedulableAssignment => ({
    id: 'a-1',
    title: 'Assignment 1',
    courseCode: null,
    dueDate: '2026-11-06',
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

  /** 08:00–23:00 on every day of `days`. */
  const bounds = (days: string[], start = 480, end = 1380): DatedInterval[] =>
    days.map((date) => ({ date, startMinute: start, endMinute: end }));

  const block = (
    date: string,
    startMinute: number,
    endMinute: number,
    key: string,
    extra: Partial<PreferredInterval> = {}
  ): PreferredInterval => ({ date, startMinute, endMinute, preferredKey: key, ...extra });

  const input = (overrides: Partial<SchedulerInput> = {}): SchedulerInput => ({
    days: WEEK,
    assignments: [],
    dayBounds: bounds(WEEK),
    blocked: [],
    classes: [],
    busy: [],
    preferred: [],
    preferences: PREFS,
    ...overrides,
  });

  const starts = (out: ReturnType<typeof schedule>, date: string) =>
    out.sessions.filter((s) => s.date === date).map((s) => s.startMinute);

  describe('rule 1 — the base is the day’s bounds (EP15C-AC2)', () => {
    it('never places outside the bounds, and a day without a bound has no free time', () => {
      const out = schedule(
        input({
          assignments: [assignment({ remainingMinutes: 600 })],
          dayBounds: [
            { date: MON, startMinute: 540, endMinute: 660 },
            { date: TUE, startMinute: 1200, endMinute: 1320 },
          ],
        })
      );
      expect(out.sessions.length).toBeGreaterThan(0);
      for (const s of out.sessions) {
        expect([MON, TUE]).toContain(s.date);
        const bound = s.date === MON ? [540, 660] : [1200, 1320];
        expect(s.startMinute).toBeGreaterThanOrEqual(bound[0]);
        expect(s.endMinute).toBeLessThanOrEqual(bound[1]);
      }
    });

    it('a zero-minute day yields NO_AVAILABLE_TIME', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ dueDate: MON })],
          dayBounds: [{ date: MON, startMinute: 600, endMinute: 600 }],
        })
      );
      expect(out.sessions).toEqual([]);
      expect(out.results[0].deficitCategory).toBe('NO_AVAILABLE_TIME');
    });

    it('a 24:00 bound end is a legal 1440 edge', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ remainingMinutes: 120 })],
          dayBounds: [{ date: MON, startMinute: 1320, endMinute: 1440 }],
          preferences: { ...PREFS, sessionLengthMinutes: 120 },
        })
      );
      expect(out.sessions.map((s) => [s.startMinute, s.endMinute])).toEqual([[1320, 1440]]);
    });

    it('a one-off blocked interval blocks only its date (AC-E15-05)', () => {
      const out = schedule(
        input({
          days: [MON, TUE],
          assignments: [assignment({ remainingMinutes: 120 })],
          blocked: [{ date: MON, startMinute: 480, endMinute: 1380 }],
        })
      );
      expect(starts(out, MON)).toEqual([]);
      expect(starts(out, TUE)).toEqual([480, 540]);
    });

    it('classes and busy time are still subtracted', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ remainingMinutes: 60 })],
          classes: [{ dayOfWeek: 1, startMinute: 480, endMinute: 600 }],
          busy: [{ date: MON, startMinute: 600, endMinute: 700 }],
        })
      );
      expect(starts(out, MON)).toEqual([700]);
    });
  });

  describe('rules 2–3 — the preferred tier (EP15C-AC3, D-C2)', () => {
    it('a preferred evening piece is tried before an earlier non-preferred morning gap', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment()],
          preferred: [block(MON, 1200, 1320, 'b1', { energy: 'LOW' })],
        })
      );
      expect(starts(out, MON)).toEqual([1200]);
    });

    it('R-EP15-01: light work, LOW study block 20:00–22:00 vs free NORMAL 09:00–12:00 → the block wins', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ assignmentType: 'HOMEWORK', remainingMinutes: 60 })],
          dayBounds: [{ date: MON, startMinute: 540, endMinute: 1380 }],
          blocked: [{ date: MON, startMinute: 720, endMinute: 1200 }], // free 09–12 and 20–23
          preferred: [block(MON, 1200, 1320, 'low-evening', { energy: 'LOW' })],
        })
      );
      expect(starts(out, MON)).toEqual([1200]);
    });

    it('within the preferred tier EP14E’s guard still applies: NORMAL 09–11 + LOW 22–23 blocks → light work lands 09:00', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ assignmentType: 'HOMEWORK', remainingMinutes: 60 })],
          preferred: [
            block(MON, 1320, 1380, 'late', { energy: 'LOW' }),
            block(MON, 540, 660, 'morning', { energy: 'NORMAL' }),
          ],
        })
      );
      expect(starts(out, MON)).toEqual([540]);
    });

    it('the block’s energy applies inside, NORMAL outside: demanding work takes a HIGH block over the earlier free morning', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ assignmentType: 'PAPER' })],
          preferred: [block(MON, 1080, 1200, 'high', { energy: 'HIGH' })],
        })
      );
      expect(starts(out, MON)).toEqual([1080]);
    });

    it('preferred beats energy (D-C2): demanding work still fills a LOW study block before free NORMAL time', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ assignmentType: 'PAPER' })],
          preferred: [block(MON, 1200, 1320, 'low', { energy: 'LOW' })],
        })
      );
      expect(starts(out, MON)).toEqual([1200]);
    });

    it('a block is a preference, never a constraint: work overflows into free time once blocks are full', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [assignment({ remainingMinutes: 180 })],
          preferred: [block(MON, 1200, 1260, 'one-hour')],
        })
      );
      expect(starts(out, MON)).toEqual([1200, 480, 540]);
    });

    it('critical work ignores energy but still fills the preferred tier first', () => {
      const out = schedule(
        input({
          days: [MON],
          assignments: [
            assignment({ dueDate: MON, remainingMinutes: 600, assignmentType: 'PAPER' }),
          ],
          preferred: [block(MON, 1200, 1320, 'low', { energy: 'LOW' })],
        })
      );
      // Both halves of the block first (LOW, ignored), then earliest-first.
      expect(starts(out, MON)).toEqual([1200, 1260, 480, 540, 600, 660, 720, 780]);
    });

    it('a study block never changes a day’s free minutes: placed, deficits and pinning are identical (AC-E15-07)', () => {
      const tight = assignment({ dueDate: MON, remainingMinutes: 1000 });
      const without = schedule(input({ days: [MON], assignments: [tight] }));
      const withBlock = schedule(
        input({
          days: [MON],
          assignments: [tight],
          preferred: [block(MON, 600, 720, 'b', { energy: 'HIGH' })],
        })
      );
      expect(withBlock.results).toEqual(without.results);
      expect(withBlock.sessions.map((s) => s.anchor)).toEqual(
        without.sessions.map((s) => s.anchor)
      );
      const minutes = (o: ReturnType<typeof schedule>) =>
        o.sessions.reduce((t, s) => t + s.durationMinutes, 0);
      expect(minutes(withBlock)).toBe(minutes(without));
    });

    it('a block on another date does not pull work off a free earlier day (day-centric, R-EP15-16)', () => {
      const out = schedule(
        input({
          days: [MON, TUE],
          assignments: [assignment({ remainingMinutes: 60 })],
          preferred: [block(TUE, 1200, 1320, 'tue', { energy: 'HIGH' })],
        })
      );
      expect(out.sessions.map((s) => s.date)).toEqual([MON]);
    });
  });

  describe('rule 4 — the course tie (D-C3)', () => {
    const forB = assignment({ id: 'x-course-b', courseId: 'course-b', priority: 'URGENT' });
    const forA = assignment({ id: 'y-course-a', courseId: 'course-a', priority: 'LOW' });
    const tiedToA = block(MON, 540, 660, 'tied-a', { courseId: 'course-a' });

    // A five-day window with deadlines at its end: nothing is critical, so
    // the rotation (not the feasibility override) decides the turn order.
    const monday = (out: ReturnType<typeof schedule>) =>
      out.sessions.filter((s) => s.date === MON).map((s) => `${s.startMinute}:${s.assignmentId}`);

    it('inside a course-tied piece that course’s assignment goes first, even when the rotation favours another', () => {
      const out = schedule(input({ assignments: [forB, forA], preferred: [tiedToA] }));
      expect(monday(out)).toEqual(['540:y-course-a', '600:x-course-b']);
    });

    it('without a tie the rotation order stands', () => {
      const untied = block(MON, 540, 660, 'untied');
      const out = schedule(input({ assignments: [forB, forA], preferred: [untied] }));
      expect(monday(out)).toEqual(['540:x-course-b', '600:y-course-a']);
    });

    it('a tied piece is not a reservation: with no work for that course another assignment uses it', () => {
      const out = schedule(input({ assignments: [forB], preferred: [tiedToA] }));
      expect(monday(out)).toEqual(['540:x-course-b']);
    });

    it('the tie reorders only inside the piece — outside it the comparator order is untouched', () => {
      const out = schedule(
        input({
          assignments: [forB, { ...forA, remainingMinutes: 180 }],
          preferred: [block(MON, 1200, 1260, 'tied-a-evening', { courseId: 'course-a' })],
        })
      );
      // The tied evening piece goes to A first; B then takes its own turn on
      // free time; A's remaining work follows in rotation.
      expect(monday(out).slice(0, 3)).toEqual([
        '1200:y-course-a',
        '480:x-course-b',
        '540:y-course-a',
      ]);
    });

    it('critical work is served first regardless of a tie (feasibility wins)', () => {
      const critical = assignment({
        id: 'critical-b',
        courseId: 'course-b',
        dueDate: MON,
        remainingMinutes: 600,
      });
      const out = schedule(
        input({ days: [MON], assignments: [critical, forA], preferred: [tiedToA] })
      );
      expect(out.sessions[0]).toMatchObject({ assignmentId: 'critical-b', startMinute: 540 });
    });
  });

  describe('overlapping study blocks (R-EP15-04, D-J2)', () => {
    const a = block(MON, 540, 720, 'a', { energy: 'HIGH', courseId: 'course-a' });
    const b = block(MON, 600, 660, 'b', { energy: 'NORMAL', courseId: 'course-b' });
    const free = [{ date: MON, startMinute: 480, endMinute: 1380 }];

    it('the earlier-starting block keeps its whole span; input order does not matter', () => {
      const first = preferredPieces(free, [a, b], MON);
      const second = preferredPieces(free, [b, a], MON);
      expect(first).toEqual([
        { date: MON, startMinute: 480, endMinute: 540 },
        {
          date: MON,
          startMinute: 540,
          endMinute: 720,
          energy: 'HIGH',
          preferredKey: 'a',
          courseId: 'course-a',
        },
        { date: MON, startMinute: 720, endMinute: 1380 },
      ]);
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });

    it('a same-start tie goes to the lexically smaller key (not the higher energy); the later block’s remainder keeps its own key', () => {
      const lowA = block(MON, 540, 660, 'a', { energy: 'LOW' });
      const highB = block(MON, 540, 780, 'b', { energy: 'HIGH' });
      const pieces = preferredPieces(free, [highB, lowA], MON);
      expect(pieces.map((p) => [p.startMinute, p.endMinute, p.preferredKey])).toEqual([
        [480, 540, undefined],
        [540, 660, 'a'],
        [660, 780, 'b'],
        [780, 1380, undefined],
      ]);
      const m = block(MON, 540, 780, 'm', { energy: 'HIGH' });
      const tail = block(MON, 600, 900, 'tail', { energy: 'LOW' });
      const pieces2 = preferredPieces(free, [tail, m], MON);
      expect(pieces2.map((p) => [p.startMinute, p.endMinute, p.preferredKey])).toEqual([
        [480, 540, undefined],
        [540, 780, 'm'],
        [780, 900, 'tail'],
        [900, 1380, undefined],
      ]);
    });

    it('schedule output is byte-identical whichever order the blocks arrive in (V-15-3)', () => {
      const run = (preferred: PreferredInterval[]) =>
        JSON.stringify(
          schedule(
            input({
              days: [MON],
              assignments: [forCourse('course-a', 'p'), forCourse('course-b', 'q')],
              preferred,
            })
          )
        );
      expect(run([a, b])).toBe(run([b, a]));
      expect(run([a, b])).toBe(run([a, b]));
    });

    const forCourse = (courseId: string, id: string) =>
      assignment({ id, courseId, remainingMinutes: 120, assignmentType: 'PAPER' });
  });

  describe('purity (the domain boundary, D06-17)', () => {
    it('scheduler, intervals and the adapter import nothing from Nest or Prisma and read no clock', () => {
      for (const file of ['scheduler.ts', 'intervals.ts', 'legacy-windows.ts']) {
        const source = readFileSync(join(__dirname, file), 'utf8');
        expect(source).not.toMatch(/from\s+['"]@nestjs\//);
        expect(source).not.toMatch(/from\s+['"]@prisma\//);
        expect(source).not.toMatch(/generated\/prisma/);
        expect(source).not.toMatch(/PrismaService/);
        expect(source).not.toMatch(/new Date\(\)/);
        expect(source).not.toMatch(/Date\.now\(\)/);
        expect(source).not.toMatch(/Math\.random/);
      }
    });
  });
});
