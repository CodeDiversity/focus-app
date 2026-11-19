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
});
