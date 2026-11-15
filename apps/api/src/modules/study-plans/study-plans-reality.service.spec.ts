import { PrismaService } from '../prisma/prisma.service';
import { StudyPlansService } from './study-plans.service';

/**
 * EP13A unit spec (mocked PrismaService, no database) — "plan generation
 * counts reality" (TR-E13-01, engine-input half):
 *
 * - AC-E13-01: confirmed study time (COMPLETED sessions, attributed per
 *   assignment) shrinks what the engine places; work done beyond the estimate
 *   removes the assignment from placement entirely — including the spurious
 *   `OVERDUE` warning a finished-but-overdue assignment used to produce.
 * - AC-E13-02 (engine half): minutes held by locked, FUTURE, still-SCHEDULED
 *   sessions are kept commitments — subtracted from the remaining work and
 *   kept busy, so locked time is never scheduled twice and never
 *   double-booked. Past locked rows subtract nothing (the work remains).
 *
 * The save/confirm write-path halves of AC-E13-02 are pinned in
 * `study-plans-recovery-catch-up.service.spec.ts` (the converged selective
 * delete and busy set); the read-payload halves (State-B attribution, the
 * clamped `remainingMinutes: 0` item) in `study-plans.service.spec.ts`.
 *
 * Mock architecture: the shared partial-PrismaService pattern of the sibling
 * specs. The clock is fixed at 2026-10-30T12:00Z with a UTC profile zone, so
 * the 7-day window is 2026-10-30 … 2026-11-05 and wall times render 1:1.
 */
describe('StudyPlansService EP13A reality inputs (unit, mocked PrismaService)', () => {
  const userId = 'user-1';

  const userFindUnique = jest.fn();
  const assignmentFindMany = jest.fn();
  const availabilitySlotFindMany = jest.fn();
  const courseFindMany = jest.fn();
  const studySessionFindMany = jest.fn();
  const studySessionGroupBy = jest.fn();
  const plannedSessionFindMany = jest.fn();

  const prisma = {
    user: { findUnique: userFindUnique },
    assignment: { findMany: assignmentFindMany },
    availabilitySlot: { findMany: availabilitySlotFindMany },
    course: { findMany: courseFindMany },
    studySession: { findMany: studySessionFindMany, groupBy: studySessionGroupBy },
    plannedSession: { findMany: plannedSessionFindMany },
  } as unknown as PrismaService;

  let service: StudyPlansService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));

    service = new StudyPlansService(prisma);

    userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences: null });
    assignmentFindMany.mockResolvedValue([]);
    courseFindMany.mockResolvedValue([]);
    studySessionFindMany.mockResolvedValue([]);
    studySessionGroupBy.mockResolvedValue([]);
    plannedSessionFindMany.mockResolvedValue([]);
    // Open availability every day, 09:00–17:00 (480 free minutes; the default
    // daily cap is 240), so placement never fails for lack of declared time.
    availabilitySlotFindMany.mockResolvedValue(
      [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      }))
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** An unfinished 2-hour assignment due inside the window. */
  const assignmentRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'a-1',
    title: 'Problem set 3',
    course: { code: 'CS101' },
    dueDate: new Date('2026-11-03T12:00:00.000Z'),
    estimatedHours: 2,
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  });

  /** A planned-session row with the include `gatherPlanData` uses. */
  const plannedRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'ps-1',
    assignmentId: 'a-1',
    studyPlan: { date: new Date('2026-10-31T00:00:00.000Z') },
    startTime: new Date('2026-10-31T09:00:00.000Z'),
    endTime: new Date('2026-10-31T10:00:00.000Z'),
    durationMinutes: 60,
    status: 'SCHEDULED',
    locked: false,
    ...overrides,
  });

  /** Total proposed minutes for one assignment across the preview. */
  const placedMinutes = (
    preview: {
      days: Array<{ sessions: Array<{ assignmentId: string; durationMinutes: number }> }>;
    },
    assignmentId: string
  ) =>
    preview.days
      .flatMap((d) => d.sessions)
      .filter((s) => s.assignmentId === assignmentId)
      .reduce((sum, s) => sum + s.durationMinutes, 0);

  it('subtracts confirmed study time from what the engine places (AC-E13-01)', async () => {
    assignmentFindMany.mockResolvedValue([assignmentRow()]);
    studySessionGroupBy.mockResolvedValue([{ assignmentId: 'a-1', _sum: { durationMinutes: 45 } }]);

    const preview = await service.preview(userId);

    // 120-minute estimate − 45 confirmed = 75 minutes to place.
    expect(placedMinutes(preview, 'a-1')).toBe(75);
    expect(preview.warnings).toEqual([]);
  });

  it('an assignment studied to (or past) its estimate is not scheduled and produces no warning — even overdue (AC-E13-01, AC-E13-05)', async () => {
    assignmentFindMany.mockResolvedValue([
      // Overdue: due before the fixed "today". Without the EP13A zero-
      // remaining filter the engine marks every overdue assignment OVERDUE,
      // surfacing a spurious warning for finished work.
      assignmentRow({ dueDate: new Date('2026-10-01T12:00:00.000Z'), estimatedHours: 1 }),
    ]);
    studySessionGroupBy.mockResolvedValue([{ assignmentId: 'a-1', _sum: { durationMinutes: 90 } }]);

    const preview = await service.preview(userId);

    expect(placedMinutes(preview, 'a-1')).toBe(0);
    expect(preview.warnings).toEqual([]);
    expect(preview.deferred).toEqual([]);
  });

  it('subtracts locked FUTURE SCHEDULED minutes from the engine input (AC-E13-02)', async () => {
    assignmentFindMany.mockResolvedValue([assignmentRow()]);
    plannedSessionFindMany.mockResolvedValue([
      plannedRow({ locked: true }), // 60 locked minutes on 2026-10-31 (future)
    ]);

    const preview = await service.preview(userId);

    // 120-minute estimate − 60 locked-and-kept = 60 minutes to place; the
    // locked hour itself is never re-proposed (no double count).
    expect(placedMinutes(preview, 'a-1')).toBe(60);
    expect(preview.warnings).toEqual([]);
  });

  it('locked minutes covering the whole estimate remove the assignment from placement (AC-E13-02)', async () => {
    assignmentFindMany.mockResolvedValue([assignmentRow()]);
    plannedSessionFindMany.mockResolvedValue([
      plannedRow({ id: 'ps-l1', locked: true, durationMinutes: 60 }),
      plannedRow({
        id: 'ps-l2',
        locked: true,
        durationMinutes: 90,
        studyPlan: { date: new Date('2026-11-01T00:00:00.000Z') },
        startTime: new Date('2026-11-01T09:00:00.000Z'),
        endTime: new Date('2026-11-01T10:30:00.000Z'),
      }),
    ]);

    const preview = await service.preview(userId);

    expect(placedMinutes(preview, 'a-1')).toBe(0);
    expect(preview.warnings).toEqual([]);
  });

  it('past locked rows subtract nothing — a missed commitment is not kept work (AC-E13-02)', async () => {
    assignmentFindMany.mockResolvedValue([assignmentRow()]);
    plannedSessionFindMany.mockResolvedValue([
      plannedRow({
        locked: true,
        studyPlan: { date: new Date('2026-10-28T00:00:00.000Z') }, // past
        startTime: new Date('2026-10-28T09:00:00.000Z'),
        endTime: new Date('2026-10-28T10:00:00.000Z'),
      }),
    ]);

    const preview = await service.preview(userId);

    expect(placedMinutes(preview, 'a-1')).toBe(120);
  });

  it('locked and completed sessions are busy for the plain preview — the engine places around them (AC-E13-02)', async () => {
    // Availability narrowed to one hour a day, so the locked hour on the
    // first window day forces the proposal onto the next day.
    availabilitySlotFindMany.mockResolvedValue(
      [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
      }))
    );
    assignmentFindMany.mockResolvedValue([assignmentRow({ estimatedHours: 2 })]);
    plannedSessionFindMany.mockResolvedValue([
      plannedRow({
        locked: true,
        studyPlan: { date: new Date('2026-10-30T00:00:00.000Z') }, // today
        startTime: new Date('2026-10-30T09:00:00.000Z'),
        endTime: new Date('2026-10-30T10:00:00.000Z'),
      }),
    ]);

    const preview = await service.preview(userId);

    const proposed = preview.days.flatMap((d) =>
      d.sessions.map((s) => ({ date: d.date, startTime: s.startTime }))
    );
    // 120 − 60 locked = 60 minutes, and NOT into the locked 10-30 09:00 slot.
    expect(proposed).toEqual([{ date: '2026-10-31', startTime: '09:00' }]);
  });

  it('only COMPLETED sessions count: the aggregation is scoped and status-filtered (AC-E13-01)', async () => {
    assignmentFindMany.mockResolvedValue([assignmentRow()]);

    await service.preview(userId);

    const aggregation = studySessionGroupBy.mock.calls[0][0];
    expect(aggregation.where).toEqual({ userId, status: 'COMPLETED' });
    expect(aggregation.by).toEqual(['assignmentId']);
  });
});
