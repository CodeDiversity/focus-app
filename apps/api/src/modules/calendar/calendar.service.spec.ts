import { BadRequestException } from '@nestjs/common';

import { CalendarService } from './calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleInputsService } from '../schedule/schedule-inputs.service';

describe('CalendarService (SP-127A)', () => {
  let service: CalendarService;
  let prisma: {
    user: { findUnique: jest.Mock };
    course: { findMany: jest.Mock };
    assignment: { findMany: jest.Mock };
    studySession: { findMany: jest.Mock };
    dayBounds: { findMany: jest.Mock };
    scheduleBlock: { findMany: jest.Mock };
    plannedSession: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      course: { findMany: jest.fn() },
      assignment: { findMany: jest.fn() },
      studySession: { findMany: jest.fn() },
      dayBounds: { findMany: jest.fn().mockResolvedValue([]) },
      scheduleBlock: { findMany: jest.fn().mockResolvedValue([]) },
      // EP13D: planned sessions are drawn on the calendar too.
      plannedSession: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new CalendarService(
      prisma as unknown as PrismaService,
      new ScheduleInputsService(prisma as unknown as PrismaService)
    );
  });

  /** A weekly `schedule_blocks` row (+ the seam's includes) on Wednesdays from 2026-10-01. */
  function blockRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'blk-1',
      userId: 'u1',
      kind: 'BUSY',
      title: null,
      courseId: null,
      energy: 'NORMAL',
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: null,
      weekdays: 1 << 3,
      startTime: '09:00',
      endTime: '10:00',
      exceptions: [],
      course: null,
      ...overrides,
    };
  }

  function mockEmpty() {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([]);
    prisma.plannedSession.findMany.mockResolvedValue([]);
  }

  it('recurrence: a dayOfWeek=1 meeting appears on every Monday in a 7-day range and nowhere else', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Course',
        code: 'CS',
        color: '#fff',
        meetings: [{ id: 'm1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      },
    ]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([]);

    const result = await service.list('u1', { from: '2026-10-26', to: '2026-11-01' });
    const classEvents = result.events.filter((e) => e.type === 'CLASS');
    // Only Monday 2026-10-26 falls in this range.
    expect(classEvents).toHaveLength(1);
    expect(classEvents[0].date).toBe('2026-10-26');
    expect(classEvents[0].startTime).toBe('09:00');
  });

  it('recurrence: a two-meeting course yields two events per matching day', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Course',
        code: 'CS',
        color: '#fff',
        meetings: [
          { id: 'm1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
          { id: 'm2', dayOfWeek: 1, startTime: '11:00', endTime: '12:00' },
        ],
      },
    ]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([]);

    const result = await service.list('u1', { from: '2026-10-26', to: '2026-10-26' });
    expect(result.events.filter((e) => e.type === 'CLASS')).toHaveLength(2);
  });

  it('DST: a meeting at 09:00 keeps 09:00 local on dates before and after a DST transition', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'America/New_York' });
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Course',
        code: 'CS',
        color: '#fff',
        meetings: [{ id: 'm1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      },
    ]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([]);

    const result = await service.list('u1', { from: '2026-10-26', to: '2026-11-02' });
    const classEvents = result.events.filter((e) => e.type === 'CLASS');
    expect(classEvents.length).toBeGreaterThanOrEqual(2);
    for (const ev of classEvents) {
      expect(ev.startTime).toBe('09:00');
    }
  });

  it('zone conversion: a deadline at 2026-10-28T23:30:00Z lands on 2026-10-28 in America/New_York and 2026-10-29 in Asia/Tokyo', async () => {
    const cases: Array<[string, string]> = [
      ['America/New_York', '2026-10-28'],
      ['Asia/Tokyo', '2026-10-29'],
    ];
    for (const [tz, expectedDate] of cases) {
      prisma.user.findUnique.mockResolvedValue({ timeZone: tz });
      prisma.course.findMany.mockResolvedValue([]);
      prisma.assignment.findMany.mockResolvedValue([
        {
          id: 'a1',
          title: 'Essay',
          dueDate: new Date('2026-10-28T23:30:00Z'),
          status: 'PENDING',
          type: null,
          courseId: null,
          course: null,
        },
      ]);
      prisma.studySession.findMany.mockResolvedValue([]);

      const result = await service.list('u1', { from: '2026-10-25', to: '2026-11-02' });
      const ev = result.events.find((e) => e.type === 'ASSIGNMENT_DEADLINE');
      expect(ev?.date).toBe(expectedDate);
      expect(result.timeZone).toBe(tz);
      expect(typeof result.today).toBe('string');
    }
  });

  it('deadline typing and completion flag: EXAM -> EXAM_DEADLINE, COMPLETED -> completed, null dueDate -> no event', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([
      {
        id: 'a1',
        title: 'Exam',
        dueDate: new Date('2026-10-28T10:00:00Z'),
        status: 'COMPLETED',
        type: 'EXAM',
        courseId: null,
        course: null,
      },
      {
        id: 'a2',
        title: 'HW',
        dueDate: new Date('2026-10-28T11:00:00Z'),
        status: 'PENDING',
        type: 'HOMEWORK',
        courseId: null,
        course: null,
      },
      {
        id: 'a3',
        title: 'No date',
        dueDate: null,
        status: 'PENDING',
        type: null,
        courseId: null,
        course: null,
      },
    ]);
    prisma.studySession.findMany.mockResolvedValue([]);

    const result = await service.list('u1', { from: '2026-10-28', to: '2026-10-28' });
    const exam = result.events.find((e) => e.id === 'assignment:a1');
    expect(exam?.type).toBe('EXAM_DEADLINE');
    expect(exam?.completed).toBe(true);
    const hw = result.events.find((e) => e.id === 'assignment:a2');
    expect(hw?.type).toBe('ASSIGNMENT_DEADLINE');
    expect(hw?.completed).toBe(false);
    expect(result.events.find((e) => e.id === 'assignment:a3')).toBeUndefined();
  });

  it('session and availability bucketing: focus flag and BLOCKED_TIME', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([
      {
        id: 's1',
        startTime: new Date('2026-10-28T14:00:00Z'),
        endTime: new Date('2026-10-28T15:00:00Z'),
        isFocusMode: true,
        notes: null,
      },
    ]);
    // EP15D: the former slot rows are schedule blocks (a STUDY and a BUSY, Wednesdays).
    prisma.scheduleBlock.findMany.mockResolvedValue([
      blockRow({ id: 'sl1', kind: 'STUDY', startTime: '09:00', endTime: '10:00' }),
      blockRow({ id: 'sl2', kind: 'BUSY', startTime: '12:00', endTime: '13:00' }),
    ]);

    const result = await service.list('u1', { from: '2026-10-28', to: '2026-10-28' });
    const sess = result.events.find((e) => e.type === 'STUDY_SESSION');
    expect(sess?.focus).toBe(true);
    expect(result.events.find((e) => e.type === 'STUDY_BLOCK')).toBeTruthy();
    expect(result.events.find((e) => e.type === 'EVENT')).toBeTruthy();
  });

  it('archived course: meeting absent, assignment deadline present', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    // Archived course excluded by isActive filter -> no active courses.
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([
      {
        id: 'a1',
        title: 'Deadline',
        dueDate: new Date('2026-10-28T10:00:00Z'),
        status: 'PENDING',
        type: null,
        courseId: 'archived-course',
        course: { id: 'archived-course', name: 'Archived', code: 'AR', color: null },
      },
    ]);
    prisma.studySession.findMany.mockResolvedValue([]);

    const result = await service.list('u1', { from: '2026-10-28', to: '2026-10-28' });
    expect(result.events.find((e) => e.type === 'CLASS')).toBeUndefined();
    expect(result.events.find((e) => e.type === 'ASSIGNMENT_DEADLINE')).toBeTruthy();
  });

  it('orders events by date, startTime, type, id', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([
      {
        id: 'b',
        title: 'B',
        dueDate: new Date('2026-10-28T10:00:00Z'),
        status: 'PENDING',
        type: null,
        courseId: null,
        course: null,
      },
      {
        id: 'a',
        title: 'A',
        dueDate: new Date('2026-10-28T09:00:00Z'),
        status: 'PENDING',
        type: null,
        courseId: null,
        course: null,
      },
    ]);
    prisma.studySession.findMany.mockResolvedValue([]);

    const result = await service.list('u1', { from: '2026-10-28', to: '2026-10-28' });
    const dates = result.events.map((e) => e.startTime);
    expect(dates).toEqual(['09:00', '10:00']);
  });

  it('empty range returns empty events, not an error', async () => {
    mockEmpty();
    const result = await service.list('u1', { from: '2026-10-28', to: '2026-10-28' });
    expect(result.events).toEqual([]);
  });

  it('throws 400 when from > to', async () => {
    mockEmpty();
    await expect(
      service.list('u1', { from: '2026-10-31', to: '2026-10-26' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 400 when span exceeds 31 days', async () => {
    mockEmpty();
    await expect(
      service.list('u1', { from: '2026-10-01', to: '2026-11-15' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 400 on a malformed from', async () => {
    mockEmpty();
    await expect(service.list('u1', { from: 'bad', to: '2026-10-28' })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('emits an in-range open session (null endTime) as STUDY_SESSION with endTime null', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([
      {
        id: 's1',
        userId: 'u1',
        startTime: new Date('2026-10-26T09:00:00.000Z'),
        endTime: null,
        notes: 'Focus',
        isFocusMode: true,
      },
    ]);
    const result = await service.list('u1', { from: '2026-10-26', to: '2026-10-26' });
    const ev = result.events.find((e) => e.type === 'STUDY_SESSION');
    expect(ev).toBeDefined();
    expect(ev!.endTime).toBeNull();
    expect(ev!.startTime).toBe('09:00');
  });

  it('does not emit an open session whose start date is outside the range', async () => {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([
      {
        id: 's2',
        userId: 'u1',
        startTime: new Date('2026-10-20T09:00:00.000Z'),
        endTime: null,
        notes: null,
        isFocusMode: true,
      },
    ]);
    const result = await service.list('u1', { from: '2026-10-26', to: '2026-10-26' });
    expect(result.events.filter((e) => e.type === 'STUDY_SESSION')).toHaveLength(0);
  });
  it('EP13D: draws current planned sessions, excludes rolled-forward/set-aside rows, and scopes through the parent plan', async () => {
    mockEmpty();
    const plannedRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'ps-1',
      assignmentId: 'a-1',
      studyPlan: { date: new Date('2026-10-26T00:00:00.000Z') },
      startTime: new Date('2026-10-26T09:00:00.000Z'),
      endTime: new Date('2026-10-26T10:00:00.000Z'),
      durationMinutes: 60,
      status: 'SCHEDULED',
      locked: false,
      // EP13G/EP13H: the clock relation travels to the calendar payload.
      anchor: 'FIXED',
      windowHint: null,
      assignment: {
        id: 'a-1',
        title: 'Problem set 3',
        course: { id: 'c1', name: 'Algorithms', code: 'CS101', color: '#123456' },
      },
      ...overrides,
    });
    prisma.plannedSession.findMany.mockResolvedValue([
      plannedRow(),
      plannedRow({
        id: 'ps-done',
        status: 'COMPLETED',
        startTime: new Date('2026-10-26T11:00:00.000Z'),
        endTime: new Date('2026-10-26T12:00:00.000Z'),
      }),
    ]);

    const result = await service.list('u1', { from: '2026-10-26', to: '2026-10-26' });

    const planned = result.events.filter((e) => e.type === 'PLANNED_SESSION');
    expect(planned).toHaveLength(2);
    expect(planned[0]).toEqual({
      id: 'planned:ps-1',
      type: 'PLANNED_SESSION',
      title: 'Problem set 3',
      subtitle: 'CS101',
      date: '2026-10-26',
      startTime: '09:00',
      endTime: '10:00',
      courseId: 'c1',
      courseName: 'Algorithms',
      courseColor: '#123456',
      assignmentId: 'a-1',
      completed: false,
      focus: false,
      link: null,
      anchor: 'FIXED',
      // EP15D: block fields are null for every non-block type.
      blockId: null,
      recurring: null,
      energy: null,
    });
    // A finished planned session reuses the existing completed flag.
    expect(planned[1].completed).toBe(true);

    // Only current work is queried — RESCHEDULED/SKIPPED rows are never drawn
    // (no past ghosts, D13-9) — and the scope rides through the parent plan.
    // EP15D: the seam reads the preserved rows first; the calendar's own
    // read is the one carrying the status filter. Both are scoped.
    const wheres = prisma.plannedSession.findMany.mock.calls.map((c) => c[0].where);
    const where = wheres.find((w) => w.status !== undefined);
    expect(where.status).toEqual({ in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] });
    for (const w of wheres) expect(w.studyPlan.userId).toBe('u1');
  });

  // ===========================================================================
  // EP13H — the anchor on the payload and the day-level ordering (TR-E13-08).
  // ===========================================================================

  it('EP13H: every non-planned event carries anchor: null', async () => {
    mockEmpty();
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Algorithms',
        code: 'CS101',
        color: '#123456',
        meetings: [{ id: 'm1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      },
    ]);

    const result = await service.list('u1', { from: '2026-10-26', to: '2026-10-26' });

    const cls = result.events.find((e) => e.type === 'CLASS');
    expect(cls).toBeTruthy();
    expect(cls?.anchor).toBeNull();
  });

  it('EP13H: a FLEX_DAY planned session carries its anchor and sorts first in its day', async () => {
    mockEmpty();
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Algorithms',
        code: 'CS101',
        color: '#123456',
        // Monday 2026-10-26, 08:00 — earlier on the clock than everything.
        meetings: [{ id: 'm1', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }],
      },
    ]);
    prisma.plannedSession.findMany.mockResolvedValue([
      {
        id: 'ps-flex',
        assignmentId: 'a-1',
        studyPlan: { date: new Date('2026-10-26T00:00:00.000Z') },
        startTime: new Date('2026-10-26T19:00:00.000Z'),
        endTime: new Date('2026-10-26T20:00:00.000Z'),
        durationMinutes: 60,
        status: 'SCHEDULED',
        locked: false,
        anchor: 'FLEX_DAY',
        windowHint: 'EVENING',
        assignment: { id: 'a-1', title: 'Essay', course: null },
      },
    ]);

    const result = await service.list('u1', { from: '2026-10-26', to: '2026-10-26' });

    const flex = result.events.find((e) => e.id === 'planned:ps-flex');
    expect(flex?.anchor).toBe('FLEX_DAY');
    // Day-level: the flex intention leads the day even though its suggested
    // slot (19:00) is later than the 08:00 class.
    const day = result.events.filter((e) => e.date === '2026-10-26');
    expect(day[0]?.id).toBe('planned:ps-flex');
    expect(day[1]?.type).toBe('CLASS');
  });

  it('EP13H: FIXED planned sessions keep the clock ordering', async () => {
    mockEmpty();
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Algorithms',
        code: 'CS101',
        color: '#123456',
        meetings: [{ id: 'm1', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }],
      },
    ]);
    prisma.plannedSession.findMany.mockResolvedValue([
      {
        id: 'ps-fixed',
        assignmentId: 'a-1',
        studyPlan: { date: new Date('2026-10-26T00:00:00.000Z') },
        startTime: new Date('2026-10-26T19:00:00.000Z'),
        endTime: new Date('2026-10-26T20:00:00.000Z'),
        durationMinutes: 60,
        status: 'SCHEDULED',
        locked: false,
        anchor: 'FIXED',
        windowHint: null,
        assignment: { id: 'a-1', title: 'Essay', course: null },
      },
    ]);

    const result = await service.list('u1', { from: '2026-10-26', to: '2026-10-26' });

    const day = result.events.filter((e) => e.date === '2026-10-26');
    expect(day[0]?.type).toBe('CLASS');
    expect(day[day.length - 1]?.id).toBe('planned:ps-fixed');
  });

  // ---------------------------------------------------------------------------
  // EP15D — days[] and the block event types (EP15D-AC2, TR-E15-04)
  // ---------------------------------------------------------------------------
  describe('EP15D: days[] and EVENT / STUDY_BLOCK', () => {
    const WED = '2026-10-28';

    it('days[] has one entry per date (7-day and 31-day ranges) with default bounds and a whole free day', async () => {
      mockEmpty();
      const week = await service.list('u1', { from: '2026-10-26', to: '2026-11-01' });
      expect(week.days.map((d) => d.date)).toEqual([
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
      ]);
      expect(week.days[0]).toEqual({
        date: '2026-10-26',
        wakeTime: '08:00',
        sleepTime: '23:00',
        free: [{ startTime: '08:00', endTime: '23:00' }],
      });
      const month = await service.list('u1', { from: '2026-10-01', to: '2026-10-31' });
      expect(month.days).toHaveLength(31);
      expect(month.days[30].date).toBe('2026-10-31');
    });

    it('days[] uses the stored bounds (24:00 allowed) and subtracts events, classes, busy time and FIXED planned sessions (D-D1)', async () => {
      mockEmpty();
      prisma.dayBounds.findMany.mockResolvedValue([
        { dayOfWeek: 3, wakeTime: '06:00', sleepTime: '24:00' },
      ]);
      prisma.course.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Course',
          code: 'CS',
          color: '#fff',
          meetings: [{ id: 'm1', dayOfWeek: 3, startTime: '09:00', endTime: '10:00' }],
        },
      ]);
      prisma.scheduleBlock.findMany.mockResolvedValue([
        blockRow({ id: 'b-busy', kind: 'BUSY', startTime: '12:00', endTime: '13:00' }),
        blockRow({ id: 'b-study', kind: 'STUDY', startTime: '20:00', endTime: '22:00' }),
      ]);
      prisma.studySession.findMany.mockResolvedValue([
        {
          id: 's1',
          startTime: new Date(`${WED}T14:00:00Z`),
          endTime: new Date(`${WED}T15:00:00Z`),
          isFocusMode: false,
          notes: null,
        },
      ]);
      prisma.plannedSession.findMany.mockResolvedValue([
        plannedRow('ps-fixed', 'FIXED', 'SCHEDULED', '16:00', '17:00'),
        plannedRow('ps-flex', 'FLEX_DAY', 'SCHEDULED', '18:00', '19:00'),
        plannedRow('ps-done', 'FIXED', 'COMPLETED', '07:00', '08:00'),
      ]);

      const result = await service.list('u1', { from: WED, to: WED });
      expect(result.days).toEqual([
        {
          date: WED,
          wakeTime: '06:00',
          sleepTime: '24:00',
          // 06–07 free, 07–08 completed (busy), 08–09 free, 09–10 class, 10–12 free,
          // 12–13 event, 13–14 free, 14–15 session, 15–16 free, 16–17 FIXED planned,
          // 17–24 free — the flex session (18–19) and the study block take nothing.
          free: [
            { startTime: '06:00', endTime: '07:00' },
            { startTime: '08:00', endTime: '09:00' },
            { startTime: '10:00', endTime: '12:00' },
            { startTime: '13:00', endTime: '14:00' },
            { startTime: '15:00', endTime: '16:00' },
            { startTime: '17:00', endTime: '24:00' },
          ],
        },
      ]);
    });

    it('emits EVENT and STUDY_BLOCK with block fields, default titles and course data; never the old types', async () => {
      mockEmpty();
      prisma.scheduleBlock.findMany.mockResolvedValue([
        blockRow({ id: 'b-busy', kind: 'BUSY', startTime: '12:00', endTime: '13:00' }),
        blockRow({
          id: 'b-study',
          kind: 'STUDY',
          title: '  ',
          energy: 'HIGH',
          courseId: 'c1',
          course: { id: 'c1', name: 'Algorithms', code: 'CS101', color: '#123456' },
          startTime: '20:00',
          endTime: '22:00',
        }),
        blockRow({
          id: 'b-titled',
          kind: 'BUSY',
          title: 'Work shift',
          startTime: '14:00',
          endTime: '16:00',
        }),
      ]);
      const result = await service.list('u1', { from: WED, to: WED });
      const types = result.events.map((e) => e.type);
      expect(types).not.toContain('AVAILABILITY');
      expect(types).not.toContain('BLOCKED_TIME');
      expect(result.events.find((e) => e.id === `event:b-busy:${WED}`)).toEqual({
        id: `event:b-busy:${WED}`,
        type: 'EVENT',
        title: 'Busy',
        subtitle: null,
        date: WED,
        startTime: '12:00',
        endTime: '13:00',
        courseId: null,
        courseName: null,
        courseColor: null,
        assignmentId: null,
        completed: false,
        focus: false,
        link: null,
        anchor: null,
        blockId: 'b-busy',
        recurring: true,
        energy: null,
      });
      expect(result.events.find((e) => e.id === `event:b-titled:${WED}`)?.title).toBe('Work shift');
      expect(result.events.find((e) => e.id === `study-block:b-study:${WED}`)).toEqual({
        id: `study-block:b-study:${WED}`,
        type: 'STUDY_BLOCK',
        // The stored title is whatever the API stored; `null` → "Study".
        title: '  ',
        subtitle: 'CS101',
        date: WED,
        startTime: '20:00',
        endTime: '22:00',
        courseId: 'c1',
        courseName: 'Algorithms',
        courseColor: '#123456',
        assignmentId: null,
        completed: false,
        focus: false,
        link: null,
        anchor: null,
        blockId: 'b-study',
        recurring: true,
        energy: 'HIGH',
      });
      prisma.scheduleBlock.findMany.mockResolvedValue([
        blockRow({
          id: 'b-study',
          kind: 'STUDY',
          title: null,
          startTime: '20:00',
          endTime: '22:00',
        }),
      ]);
      const again = await service.list('u1', { from: WED, to: WED });
      expect(again.events.find((e) => e.type === 'STUDY_BLOCK')?.title).toBe('Study');
    });

    it('a cancelled occurrence is omitted; a one-off appears on its date only; recurring is false for it', async () => {
      mockEmpty();
      prisma.scheduleBlock.findMany.mockResolvedValue([
        blockRow({ id: 'weekly', exceptions: [{ date: new Date(`${WED}T00:00:00.000Z`) }] }),
        blockRow({
          id: 'once',
          weekdays: null,
          startDate: new Date('2026-10-29T00:00:00.000Z'),
          startTime: '07:00',
          endTime: '08:00',
        }),
      ]);
      const result = await service.list('u1', { from: '2026-10-26', to: '2026-11-04' });
      const blocks = result.events.filter((e) => e.type === 'EVENT');
      expect(blocks.map((e) => `${e.date}:${e.blockId}:${e.recurring}`)).toEqual([
        '2026-10-29:once:false',
        '2026-11-04:weekly:true', // 10-28 cancelled; 11-04 is the next Wednesday
      ]);
      // The cancelled occurrence does not take free time either.
      expect(result.days.find((d) => d.date === WED)?.free).toEqual([
        { startTime: '08:00', endTime: '23:00' },
      ]);
    });

    function plannedRow(
      id: string,
      anchor: 'FIXED' | 'FLEX_DAY',
      status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED',
      start: string,
      end: string
    ) {
      return {
        id,
        assignmentId: 'a-1',
        startTime: new Date(`${WED}T${start}:00.000Z`),
        endTime: new Date(`${WED}T${end}:00.000Z`),
        durationMinutes: 60,
        status,
        locked: false,
        anchor,
        windowHint: null,
        studyPlan: { date: new Date(`${WED}T00:00:00.000Z`) },
        assignment: { id: 'a-1', title: 'Problem set', course: null },
      };
    }
  });
});
