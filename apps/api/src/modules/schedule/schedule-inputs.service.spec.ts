import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleInputsService } from './schedule-inputs.service';
import { StudyPlansService } from '../study-plans/study-plans.service';
import * as scheduler from '../../domain/study-planning/scheduler';

/**
 * EP15D unit spec (mocked PrismaService): the one gathering seam — what it
 * reads, how it scopes, and what intervals it hands out (EP15D-AC1,
 * EP15D-AC4, TR-E15-04); plus the proof that `gatherPlanData` feeds the
 * engine exactly the seam's intervals and that neither service reads
 * `availability_slots` any more.
 */
describe('ScheduleInputsService (unit, mocked PrismaService)', () => {
  const userId = 'user-1';
  const userFindUnique = jest.fn();
  const dayBoundsFindMany = jest.fn();
  const scheduleBlockFindMany = jest.fn();
  const courseFindMany = jest.fn();
  const studySessionFindMany = jest.fn();
  const plannedSessionFindMany = jest.fn();
  const prisma = {
    user: { findUnique: userFindUnique },
    dayBounds: { findMany: dayBoundsFindMany },
    scheduleBlock: { findMany: scheduleBlockFindMany },
    course: { findMany: courseFindMany },
    studySession: { findMany: studySessionFindMany, groupBy: jest.fn().mockResolvedValue([]) },
    plannedSession: {
      findMany: plannedSessionFindMany,
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    assignment: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;

  let service: ScheduleInputsService;

  const MON = '2026-11-02';
  const SUN = '2026-11-08';

  const block = (overrides: Record<string, unknown> = {}) => ({
    id: 'blk-1',
    userId,
    kind: 'BUSY',
    title: null,
    courseId: null,
    energy: 'NORMAL',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: null,
    weekdays: 1 << 1, // Mondays
    startTime: '12:00',
    endTime: '13:00',
    exceptions: [],
    course: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScheduleInputsService(prisma);
    userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences: null });
    dayBoundsFindMany.mockResolvedValue([]);
    scheduleBlockFindMany.mockResolvedValue([]);
    courseFindMany.mockResolvedValue([]);
    studySessionFindMany.mockResolvedValue([]);
    plannedSessionFindMany.mockResolvedValue([]);
  });

  it('every read carries the student id (V-15-4); exceptions and courses ride on the owned block', async () => {
    await service.scheduleInputs(userId, MON, SUN);
    expect(dayBoundsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }));
    expect(scheduleBlockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId }),
        include: expect.objectContaining({
          exceptions: expect.anything(),
          course: expect.anything(),
        }),
      })
    );
    expect(courseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) })
    );
    expect(studySessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) })
    );
    expect(plannedSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ studyPlan: { userId } }) })
    );
  });

  it('returns one bound per day (defaults when no rows), the week in order and the resolved zone', async () => {
    userFindUnique.mockResolvedValue({ timeZone: 'not-a-zone' });
    const out = await service.scheduleInputs(userId, MON, SUN);
    expect(out.timeZone).toBe('UTC');
    expect(out.days).toHaveLength(7);
    expect(out.days[0]).toBe(MON);
    expect(out.days[6]).toBe(SUN);
    expect(out.bounds.configured).toBe(false);
    expect(out.dayBounds).toEqual(
      out.days.map((date) => ({ date, startMinute: 480, endMinute: 1380 }))
    );
  });

  it('splits block occurrences: BUSY → blocked (dated), STUDY → preferred with energy, key and course', async () => {
    scheduleBlockFindMany.mockResolvedValue([
      block(),
      block({
        id: 'blk-study',
        kind: 'STUDY',
        energy: 'HIGH',
        courseId: 'c1',
        course: { id: 'c1', name: 'Algo', code: 'CS101', color: '#000' },
        weekdays: (1 << 1) | (1 << 3),
        startTime: '18:00',
        endTime: '20:00',
        exceptions: [{ date: new Date('2026-11-04T00:00:00.000Z') }],
      }),
      block({
        id: 'blk-once',
        weekdays: null,
        startDate: new Date('2026-11-05T00:00:00.000Z'),
        startTime: '07:00',
        endTime: '08:00',
      }),
    ]);
    const out = await service.scheduleInputs(userId, MON, SUN);
    expect(out.blocked).toEqual([
      { date: '2026-11-02', startMinute: 720, endMinute: 780 },
      { date: '2026-11-05', startMinute: 420, endMinute: 480 },
    ]);
    // Monday only: the Wednesday occurrence is cancelled.
    expect(out.preferred).toEqual([
      {
        date: '2026-11-02',
        startMinute: 1080,
        endMinute: 1200,
        preferredKey: 'blk-study',
        energy: 'HIGH',
        courseId: 'c1',
      },
    ]);
    expect(out.occurrences.map((o) => `${o.date}:${o.blockId}:${o.kind}:${o.recurring}`)).toEqual([
      '2026-11-02:blk-1:BUSY:true',
      '2026-11-02:blk-study:STUDY:true',
      '2026-11-05:blk-once:BUSY:false',
    ]);
    expect(out.occurrences[1].course).toEqual({
      id: 'c1',
      name: 'Algo',
      code: 'CS101',
      color: '#000',
    });
    expect(out.occurrences[0].course).toBeNull();
  });

  it('classes come from active course meetings as weekly windows', async () => {
    courseFindMany.mockResolvedValue([
      { id: 'c1', meetings: [{ dayOfWeek: 2, startTime: '09:00', endTime: '10:30' }] },
    ]);
    const out = await service.scheduleInputs(userId, MON, SUN);
    expect(out.classes).toEqual([{ dayOfWeek: 2, startMinute: 540, endMinute: 630 }]);
    expect(courseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, isActive: true } })
    );
  });

  it('busy = confirmed sessions (untagged, in range) + preserved planned rows (tagged, every date — EP08 counts)', async () => {
    studySessionFindMany.mockResolvedValue([
      { startTime: new Date('2026-11-03T14:00:00Z'), endTime: new Date('2026-11-03T15:00:00Z') },
      { startTime: new Date('2026-11-03T16:00:00Z'), endTime: null }, // open: ignored
      { startTime: new Date('2026-10-01T14:00:00Z'), endTime: new Date('2026-10-01T15:00:00Z') }, // out of range
    ]);
    plannedSessionFindMany.mockResolvedValue([
      {
        status: 'COMPLETED',
        locked: false,
        startTime: new Date('2026-10-20T09:00:00Z'),
        endTime: new Date('2026-10-20T10:00:00Z'),
        studyPlan: { date: new Date('2026-10-20T00:00:00.000Z') },
      },
      {
        status: 'SCHEDULED',
        locked: true,
        startTime: new Date('2026-11-04T09:00:00Z'),
        endTime: new Date('2026-11-04T10:00:00Z'),
        studyPlan: { date: new Date('2026-11-04T00:00:00.000Z') },
      },
      {
        status: 'SCHEDULED',
        locked: false,
        startTime: new Date('2026-11-04T11:00:00Z'),
        endTime: new Date('2026-11-04T12:00:00Z'),
        studyPlan: { date: new Date('2026-11-04T00:00:00.000Z') },
      }, // not preserved: filtered in code even if the read returned it
    ]);
    const out = await service.scheduleInputs(userId, MON, SUN);
    expect(out.busy).toEqual([
      { date: '2026-11-03', startMinute: 840, endMinute: 900 },
      { date: '2026-10-20', startMinute: 540, endMinute: 600, completed: true, locked: false },
      { date: '2026-11-04', startMinute: 540, endMinute: 600, completed: false, locked: true },
    ]);
  });

  describe('the planner reads through the seam (EP15D-AC1)', () => {
    it('gatherPlanData hands the engine exactly the seam’s dayBounds, blocked, preferred, classes and busy', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-02T12:00:00.000Z'));
      try {
        scheduleBlockFindMany.mockResolvedValue([
          block(),
          block({
            id: 'blk-study',
            kind: 'STUDY',
            energy: 'LOW',
            startTime: '18:00',
            endTime: '20:00',
          }),
        ]);
        dayBoundsFindMany.mockResolvedValue([
          { dayOfWeek: 1, wakeTime: '07:00', sleepTime: '22:00' },
        ]);
        courseFindMany.mockResolvedValue([
          { id: 'c1', meetings: [{ dayOfWeek: 2, startTime: '09:00', endTime: '10:30' }] },
        ]);
        const seam = new ScheduleInputsService(prisma);
        const seen = jest.spyOn(seam, 'scheduleInputs');
        const engine = jest.spyOn(scheduler, 'schedule');
        const plans = new StudyPlansService(prisma, seam);

        await plans.preview(userId);

        expect(seen).toHaveBeenCalledWith(userId, '2026-11-02', '2026-11-08');
        const inputs = await seen.mock.results[0].value;
        const engineInput = engine.mock.calls[0][0];
        expect(engineInput.dayBounds).toEqual(inputs.dayBounds);
        expect(engineInput.blocked).toEqual(inputs.blocked);
        expect(engineInput.preferred).toEqual(inputs.preferred);
        expect(engineInput.classes).toEqual(inputs.classes);
        expect(engineInput.busy).toEqual(inputs.busy);
        expect(engineInput.dayBounds[0]).toEqual({
          date: '2026-11-02',
          startMinute: 420,
          endMinute: 1320,
        });
        expect(engineInput.preferred[0].preferredKey).toBe('blk-study');
        engine.mockRestore();
      } finally {
        jest.useRealTimers();
      }
    });

    it('neither the planner nor the calendar reads availability_slots any more (D15-15)', () => {
      for (const file of [
        '../study-plans/study-plans.service.ts',
        '../calendar/calendar.service.ts',
        './schedule-inputs.service.ts',
      ]) {
        const source = readFileSync(join(__dirname, file), 'utf8');
        expect(source).not.toMatch(/availabilitySlot\./);
        expect(source).not.toMatch(/legacyEngineInputs|legacy-windows/);
      }
    });
  });
});
