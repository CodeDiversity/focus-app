import { HttpStatus, NotFoundException } from '@nestjs/common';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { PrismaService } from '../prisma/prisma.service';
import { StudyPlansService } from './study-plans.service';
import { ScheduleInputsService } from '../schedule/schedule-inputs.service';

/**
 * The service-boundary half of EP17's pacing: what the preview paths hand
 * the engine, and (from EP17D) what the proposal payload reports back.
 *
 * This file opens with the **planning read of `weeklyGoalDays`** (user
 * ruling, 2026-11-19 — finding F-EP17C-02). Since ▲ D17-2's ruling (a) the
 * key means two things at once: EP13K's momentum yardstick *and* EP17C's
 * planning instruction. A student who has never chosen a number must be
 * planned across the **whole week**, while the motivational goal keeps its
 * ADHD-friendly default of 3 — so `gatherPlanData` reads the bag through
 * `readPlanningStudyPreferences` for the engine and through
 * `readStudyPreferences` for everything a student sees or stores.
 *
 * Mock architecture: the shared partial-PrismaService pattern of the sibling
 * specs. The clock is fixed at 2026-10-30T12:00Z with a UTC profile zone, so
 * the 7-day window is 2026-10-30 … 2026-11-05 and wall times render 1:1.
 */
describe('StudyPlansService EP17 pacing wiring (unit, mocked PrismaService)', () => {
  const userId = 'user-1';

  const userFindUnique = jest.fn();
  const assignmentFindMany = jest.fn();
  const dayBoundsFindMany = jest.fn();
  const scheduleBlockFindMany = jest.fn();
  const courseFindMany = jest.fn();
  const studySessionFindMany = jest.fn();
  const studySessionGroupBy = jest.fn();
  const plannedSessionFindMany = jest.fn();
  const plannedSessionUpdateMany = jest.fn();

  const prisma = {
    user: { findUnique: userFindUnique },
    assignment: { findMany: assignmentFindMany },
    dayBounds: { findMany: dayBoundsFindMany },
    scheduleBlock: { findMany: scheduleBlockFindMany },
    course: { findMany: courseFindMany },
    studySession: { findMany: studySessionFindMany, groupBy: studySessionGroupBy },
    plannedSession: { findMany: plannedSessionFindMany, updateMany: plannedSessionUpdateMany },
  } as unknown as PrismaService;

  let service: StudyPlansService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));

    service = new StudyPlansService(prisma, new ScheduleInputsService(prisma));

    userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences: null });
    assignmentFindMany.mockResolvedValue([]);
    courseFindMany.mockResolvedValue([]);
    studySessionFindMany.mockResolvedValue([]);
    studySessionGroupBy.mockResolvedValue([]);
    plannedSessionFindMany.mockResolvedValue([]);
    plannedSessionUpdateMany.mockResolvedValue({ count: 0 });
    // Open availability every day, 09:00–17:00 (480 free minutes; the
    // default daily cap is 240), identical on every day of the window — so
    // the study-day selection's tie-break (earlier date) is the only thing
    // that distinguishes the days.
    dayBoundsFindMany.mockResolvedValue(
      [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        wakeTime: '09:00',
        sleepTime: '17:00',
      }))
    );
    scheduleBlockFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** A 10-hour assignment due on the last day of the window. */
  const bigAssignment = (overrides: Record<string, unknown> = {}) => ({
    id: 'a-1',
    title: 'Term paper',
    course: { code: 'CS101' },
    dueDate: new Date('2026-11-05T12:00:00.000Z'),
    estimatedHours: 10,
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  });

  /** The distinct dates the preview placed anything on, in date order. */
  const placedDates = (preview: { days: Array<{ date: string; sessions: unknown[] }> }) =>
    preview.days.filter((d) => d.sessions.length > 0).map((d) => d.date);

  // =========================================================================
  // F-EP17C-02 — an unset `weeklyGoalDays` must not constrain the planner.
  // =========================================================================

  describe('the planning read of `weeklyGoalDays` (F-EP17C-02, user ruling 2026-11-19)', () => {
    it('plans a student who never chose a number across the whole week, not 3 days', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      // Unconstrained: the pacing rule spreads the 600 minutes over more
      // than the momentum default of 3 days.
      expect(placedDates(preview).length).toBeGreaterThan(3);
    });

    it('still reports the momentum yardstick 3 on the payload — the stored meaning is untouched', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      // The projection is the *stored/defaulted* read (EP13K), not the
      // planning read: a student's motivational goal stays "3 days a week".
      expect(preview.preferences.weeklyGoalDays).toBe(3);
    });

    it('honours an explicitly stored 3 — the planner is then constrained to 3 days', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);
      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { weeklyGoalDays: 3 } },
      });

      const preview = await service.preview(userId);

      expect(placedDates(preview).length).toBeLessThanOrEqual(3);
      expect(preview.preferences.weeklyGoalDays).toBe(3);
    });

    it('treats an out-of-bounds stored value as unchosen — unconstrained, not 3', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);
      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { weeklyGoalDays: 0 } },
      });

      const preview = await service.preview(userId);

      expect(placedDates(preview).length).toBeGreaterThan(3);
      // The defensive reader still repairs it to the yardstick default.
      expect(preview.preferences.weeklyGoalDays).toBe(3);
    });

    it('the catch-up preview reads the same planning value', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.catchUpPreview(userId);

      expect(placedDates(preview).length).toBeGreaterThan(3);
      expect(preview.preferences.weeklyGoalDays).toBe(3);
    });
  });
  // =========================================================================
  // EP17D — the service wiring and the `pacing` payload block (contracts §5).
  // =========================================================================

  describe('EP17D-AC1 — the spread levers reach the engine', () => {
    it("a student's stored `spreadPercent` changes the week they are proposed", async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { spreadPercent: 0 } },
      });
      const off = await service.preview(userId);

      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { spreadPercent: 100 } },
      });
      const full = await service.preview(userId);

      // `0` is the pre-EP17 engine: fill the earliest days. `100` paces.
      expect(placedDates(off).length).toBeLessThan(placedDates(full).length);
      expect(off.pacing.spreadPercent).toBe(0);
      expect(full.pacing.spreadPercent).toBe(100);
      // No minutes are lost by pacing (AC-E17-03).
      const total = (p: { pacing: { perDayMinutes: Record<string, number> } }) =>
        Object.values(p.pacing.perDayMinutes).reduce((a, b) => a + b, 0);
      expect(total(off)).toBe(total(full));
    });

    it('a student with no stored preference gets the default lever (70)', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      expect(preview.pacing.spreadPercent).toBe(70);
      expect(preview.preferences.spreadPercent).toBe(70);
    });

    it('the catch-up preview reads the same lever', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);
      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { spreadPercent: 0 } },
      });

      const preview = await service.catchUpPreview(userId);

      expect(preview.pacing.spreadPercent).toBe(0);
    });
  });

  describe('EP17D-AC2 — the payload is additive and backward-compatible', () => {
    /** The pre-EP17D `PlanPreview` key set, frozen (EP17D-AC2). */
    const PRE_EP17D_PREVIEW_KEYS = [
      'calibration',
      'days',
      'deferred',
      'from',
      'generatedAt',
      'preferences',
      'timeZone',
      'to',
      'warnings',
    ];

    it('`preview` keeps every pre-EP17 key and adds exactly `pacing`', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      expect(Object.keys(preview).sort()).toEqual([...PRE_EP17D_PREVIEW_KEYS, 'pacing'].sort());
      expect(Object.keys(preview.pacing).sort()).toEqual([
        'perDayMinutes',
        'spreadPercent',
        'studyDays',
      ]);
    });

    it('`catchUpPreview` keeps every pre-EP17 key, its three catch-up keys, and adds `pacing`', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.catchUpPreview(userId);

      expect(Object.keys(preview).sort()).toEqual(
        [
          ...PRE_EP17D_PREVIEW_KEYS,
          'completedPreserved',
          'lockedPreserved',
          'missedSessions',
          'pacing',
        ].sort()
      );
    });

    it('`pacing.spreadPercent` equals `preferences.spreadPercent` (D-D2)', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);
      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { spreadPercent: 35 } },
      });

      const preview = await service.preview(userId);

      expect(preview.pacing.spreadPercent).toBe(preview.preferences.spreadPercent);
      expect(preview.pacing.spreadPercent).toBe(35);
    });

    it('the day shape and the session shape are untouched', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      expect(Object.keys(preview.days[0]).sort()).toEqual(['date', 'sessions', 'targetMinutes']);
      const session = preview.days.flatMap((d) => d.sessions)[0];
      expect(Object.keys(session).sort()).toEqual([
        'anchor',
        'assignmentId',
        'assignmentTitle',
        'durationMinutes',
        'endTime',
        'startTime',
        'windowHint',
      ]);
    });
  });

  describe('EP17D-AC2 — `studyDays` is the selected set, not the placed set (R-EP17-05)', () => {
    it('lists every selected day in date order, including the ones nothing was placed on', async () => {
      // One small assignment: the selection still picks three days, but only
      // the first can hold a 60-minute piece.
      assignmentFindMany.mockResolvedValue([
        bigAssignment({ estimatedHours: 1, dueDate: new Date('2026-11-05T12:00:00.000Z') }),
      ]);
      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { weeklyGoalDays: 3, spreadPercent: 0 } },
      });

      const preview = await service.preview(userId);

      // Every day is equally free, so the tie-break (earlier date) picks the
      // first three dates of the window.
      expect(preview.pacing.studyDays).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
      expect(placedDates(preview)).toEqual(['2026-10-30']);
      // The selected-but-empty days are listed and carry a zero.
      expect(preview.pacing.perDayMinutes['2026-10-31']).toBe(0);
      expect(preview.pacing.perDayMinutes['2026-11-01']).toBe(0);
    });

    it('a day reached only by the rule 3 critical pass is in `perDayMinutes` but not in `studyDays`', async () => {
      // Friday 2026-10-30 is far the freest day, so `weeklyGoalDays: 1`
      // selects it; the deadline on Saturday forces the critical pass onto a
      // day outside the selection (contracts §4).
      dayBoundsFindMany.mockResolvedValue(
        [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          wakeTime: '09:00',
          sleepTime: dayOfWeek === 5 ? '17:00' : '11:00',
        }))
      );
      assignmentFindMany.mockResolvedValue([
        bigAssignment({ estimatedHours: 5, dueDate: new Date('2026-10-31T12:00:00.000Z') }),
      ]);
      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { weeklyGoalDays: 1 } },
      });

      const preview = await service.preview(userId);

      expect(preview.pacing.studyDays).toEqual(['2026-10-30']);
      expect(preview.pacing.perDayMinutes['2026-10-31']).toBeGreaterThan(0);
      expect(preview.pacing.studyDays).not.toContain('2026-10-31');
    });

    it('the catch-up payload carries the same selected set', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);
      userFindUnique.mockResolvedValue({
        timeZone: 'UTC',
        preferences: { studyDefaults: { weeklyGoalDays: 2 } },
      });

      const preview = await service.catchUpPreview(userId);

      expect(preview.pacing.studyDays).toEqual(['2026-10-30', '2026-10-31']);
    });
  });

  describe('EP17D-AC4 — `perDayMinutes` agrees with the sessions in the same payload', () => {
    const expectConsistent = (preview: {
      days: Array<{ date: string; sessions: Array<{ durationMinutes: number }> }>;
      pacing: { perDayMinutes: Record<string, number> };
    }) => {
      const recomputed: Record<string, number> = {};
      for (const day of preview.days) {
        recomputed[day.date] = day.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      }
      expect(preview.pacing.perDayMinutes).toEqual(recomputed);
    };

    it('holds on a week with an empty day and a multi-session day', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      // The fixture really does exercise both shapes.
      expect(preview.days.some((d) => d.sessions.length === 0)).toBe(true);
      expect(preview.days.some((d) => d.sessions.length > 1)).toBe(true);
      expectConsistent(preview);
      // And it is the same number the day already reports (no second source).
      for (const day of preview.days) {
        expect(preview.pacing.perDayMinutes[day.date]).toBe(day.targetMinutes);
      }
    });

    it('holds on the catch-up payload too', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.catchUpPreview(userId);

      expectConsistent(preview);
    });

    it('covers every date of the window, in order', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      expect(Object.keys(preview.pacing.perDayMinutes)).toEqual(preview.days.map((d) => d.date));
    });
  });

  describe('EP17D — the empty run still returns a well-formed block', () => {
    it('a run that places nothing returns zeroed `perDayMinutes`, never `null`', async () => {
      assignmentFindMany.mockResolvedValue([]); // nothing to plan

      const preview = await service.preview(userId);

      expect(preview.pacing).not.toBeNull();
      expect(preview.pacing.spreadPercent).toBe(70);
      expect(Object.values(preview.pacing.perDayMinutes)).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(Array.isArray(preview.pacing.studyDays)).toBe(true);
    });

    it('a student who has declared no day bounds still gets a well-formed block', async () => {
      dayBoundsFindMany.mockResolvedValue([]);
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      const preview = await service.preview(userId);

      expect(preview.pacing.spreadPercent).toBe(70);
      expect(Object.keys(preview.pacing.perDayMinutes)).toEqual(preview.days.map((d) => d.date));
      for (const day of preview.days) {
        expect(preview.pacing.perDayMinutes[day.date]).toBe(
          day.sessions.reduce((sum, session) => sum + session.durationMinutes, 0)
        );
      }
    });
  });

  describe('EP17D-AC3 — both reads stay scoped to the authenticated student (DoD-3)', () => {
    it('every academic-data read carries the caller`s `userId`', async () => {
      assignmentFindMany.mockResolvedValue([bigAssignment()]);

      await service.preview(userId);

      expect(userFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId } })
      );
      expect(assignmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId }) })
      );
      expect(plannedSessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studyPlan: expect.objectContaining({ userId }) }),
        })
      );
    });

    it('another student`s data never reaches the block: B sees only B`s own run', async () => {
      // A has a full week of work; B has none. The same mocked Prisma answers
      // per `userId`, so a leak would show up as A's minutes in B's payload.
      assignmentFindMany.mockImplementation(({ where }: { where: { userId: string } }) =>
        Promise.resolve(where.userId === 'user-A' ? [bigAssignment()] : [])
      );

      const a = await service.preview('user-A');
      const b = await service.preview('user-B');

      expect(Object.values(a.pacing.perDayMinutes).some((m) => m > 0)).toBe(true);
      expect(Object.values(b.pacing.perDayMinutes).every((m) => m === 0)).toBe(true);
      expect(b.days.flatMap((d) => d.sessions)).toEqual([]);
    });

    it('a missing/not-owned user returns the uniform 404 from both reads, with no block', async () => {
      userFindUnique.mockResolvedValue(null);

      for (const call of [() => service.preview(userId), () => service.catchUpPreview(userId)]) {
        const error = await call().then(
          () => {
            throw new Error('expected a 404');
          },
          (failure: unknown) => failure
        );
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      }
    });
  });
});
