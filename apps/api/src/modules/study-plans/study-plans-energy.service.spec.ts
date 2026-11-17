import { PrismaService } from '../prisma/prisma.service';
import { StudyPlansService } from './study-plans.service';
import { ScheduleInputsService } from '../schedule/schedule-inputs.service';

/**
 * EP13J unit spec (mocked PrismaService): availability energy reaches the
 * engine through the plan service (only non-NORMAL available windows are
 * tagged, D-J4), and an all-NORMAL student is unchanged (EP13J-AC3).
 */
describe('StudyPlansService EP13J energy-tagged study blocks (unit, mocked PrismaService; EP15D fixture)', () => {
  const userId = 'user-1';

  const userFindUnique = jest.fn();
  const assignmentFindMany = jest.fn();
  const assignmentUpdate = jest.fn();
  const assignmentUpdateMany = jest.fn();
  const dayBoundsFindMany = jest.fn();
  const scheduleBlockFindMany = jest.fn();
  const courseFindMany = jest.fn();
  const studySessionFindMany = jest.fn();
  const studySessionGroupBy = jest.fn();
  const plannedSessionFindMany = jest.fn();
  const plannedSessionUpdateMany = jest.fn();

  const prisma = {
    user: { findUnique: userFindUnique },
    // EP13L: `update`/`updateMany` exist only so the spec can assert they are
    // never called — calibration must never write an `Assignment` row.
    assignment: {
      findMany: assignmentFindMany,
      update: assignmentUpdate,
      updateMany: assignmentUpdateMany,
    },
    dayBounds: { findMany: dayBoundsFindMany },
    scheduleBlock: { findMany: scheduleBlockFindMany },
    course: { findMany: courseFindMany },
    studySession: { findMany: studySessionFindMany, groupBy: studySessionGroupBy },
    // `updateMany` is EP13C's read-time reconciliation — a no-op here (no
    // past SCHEDULED fixtures) but part of every planning read's call set.
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
    // Open availability every day, 09:00–17:00 (480 free minutes; the default
    // daily cap is 240), so placement never fails for lack of declared time.
    // EP15D: default day bounds (08:00–23:00); every test sets its study blocks.
    dayBoundsFindMany.mockResolvedValue([]);
    scheduleBlockFindMany.mockResolvedValue([]);
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

  /** A weekly STUDY block row as the seam reads it (EP15D). */
  const studyBlock = (
    id: string,
    weekdays: number,
    startTime: string,
    endTime: string,
    energy: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'
  ) => ({
    id,
    userId,
    kind: 'STUDY',
    title: null,
    courseId: null,
    energy,
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: null,
    weekdays,
    startTime,
    endTime,
    exceptions: [],
    course: null,
  });

  /**
   * EP15D translation of the EP13J fixture: the former available windows are
   * study blocks — a NORMAL 09:00–10:00 block every day and a Friday
   * 18:00–20:00 block with the energy under test — inside the default
   * 08:00–23:00 bounds. Study blocks form the preferred tier (EP15C), so
   * the energy order plays out among them exactly as it did among windows.
   */
  const slots = (energyFriday: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL') => [
    studyBlock('blk-morning', 0b1111111, '09:00', '10:00'),
    studyBlock('blk-friday', 1 << 5, '18:00', '20:00', energyFriday), // Friday 2026-10-30
  ];

  const fridayStarts = (preview: {
    days: Array<{ date: string; sessions: Array<{ startTime: string }> }>;
  }) => (preview.days.find((d) => d.date === '2026-10-30')?.sessions ?? []).map((s) => s.startTime);

  it('a PAPER lands in the HIGH evening window instead of the earlier NORMAL morning (EP13J-AC2)', async () => {
    assignmentFindMany.mockResolvedValue([assignmentRow({ type: 'PAPER', estimatedHours: 1 })]);
    scheduleBlockFindMany.mockResolvedValue(slots('HIGH'));

    const preview = await service.preview(userId);

    expect(fridayStarts(preview)).toEqual(['18:00']);
  });

  it('untagged rows and all-NORMAL rows give the same preview (EP13J-AC3, D-J4 blocked rows ignored)', async () => {
    assignmentFindMany.mockResolvedValue([
      assignmentRow({ type: 'PAPER', estimatedHours: 3 }),
      assignmentRow({ id: 'a-2', type: 'HOMEWORK', estimatedHours: 1 }),
    ]);
    scheduleBlockFindMany.mockResolvedValue(slots());
    const untagged = await service.preview(userId);
    scheduleBlockFindMany.mockResolvedValue([
      ...slots('NORMAL'),
      // A BUSY block's energy carries no meaning (contracts.md: never read).
      { ...studyBlock('blk-busy', 1 << 2, '12:00', '13:00', 'HIGH'), kind: 'BUSY' },
    ]);
    const tagged = await service.preview(userId);
    // The busy block sits where nothing was placed, so it changes nothing.
    expect({ ...tagged, generatedAt: '' }).toEqual({ ...untagged, generatedAt: '' });
  });

  it('gatherPlanData maps Assignment.hard into the engine input: a HOMEWORK marked hard lands in the HIGH evening (EP14E-AC2)', async () => {
    scheduleBlockFindMany.mockResolvedValue(slots('HIGH'));
    assignmentFindMany.mockResolvedValue([
      assignmentRow({ type: 'HOMEWORK', estimatedHours: 1, hard: true }),
    ]);
    const flagged = await service.preview(userId);
    expect(fridayStarts(flagged)).toEqual(['18:00']);
    expect(assignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ hard: true }) })
    );
    // Auto (null / absent) keeps the D13-10 verdict: light work, NORMAL morning first.
    for (const hard of [null, undefined]) {
      assignmentFindMany.mockResolvedValue([
        assignmentRow({ type: 'HOMEWORK', estimatedHours: 1, ...(hard === null ? { hard } : {}) }),
      ]);
      expect(fridayStarts(await service.preview(userId))).toEqual(['09:00']);
    }
    // Not hard on a PAPER: light work, so the HIGH window is no longer first.
    assignmentFindMany.mockResolvedValue([
      assignmentRow({ type: 'PAPER', estimatedHours: 1, hard: false }),
    ]);
    expect(fridayStarts(await service.preview(userId))).toEqual(['09:00']);
  });
});
