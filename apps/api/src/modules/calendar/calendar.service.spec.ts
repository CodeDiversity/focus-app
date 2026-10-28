import { BadRequestException } from '@nestjs/common';

import { CalendarService } from './calendar.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CalendarService (SP-127A)', () => {
  let service: CalendarService;
  let prisma: {
    user: { findUnique: jest.Mock };
    course: { findMany: jest.Mock };
    assignment: { findMany: jest.Mock };
    studySession: { findMany: jest.Mock };
    availabilitySlot: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      course: { findMany: jest.fn() },
      assignment: { findMany: jest.fn() },
      studySession: { findMany: jest.fn() },
      availabilitySlot: { findMany: jest.fn() },
    };
    service = new CalendarService(prisma as unknown as PrismaService);
  });

  function mockEmpty() {
    prisma.user.findUnique.mockResolvedValue({ timeZone: 'UTC' });
    prisma.course.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.studySession.findMany.mockResolvedValue([]);
    prisma.availabilitySlot.findMany.mockResolvedValue([]);
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
    prisma.availabilitySlot.findMany.mockResolvedValue([]);

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
    prisma.availabilitySlot.findMany.mockResolvedValue([]);

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
    prisma.availabilitySlot.findMany.mockResolvedValue([]);

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
      prisma.availabilitySlot.findMany.mockResolvedValue([]);

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
    prisma.availabilitySlot.findMany.mockResolvedValue([]);

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
    prisma.availabilitySlot.findMany.mockResolvedValue([
      { id: 'sl1', dayOfWeek: 3, startTime: '09:00', endTime: '10:00', isAvailable: true },
      { id: 'sl2', dayOfWeek: 3, startTime: '12:00', endTime: '13:00', isAvailable: false },
    ]);

    const result = await service.list('u1', { from: '2026-10-28', to: '2026-10-28' });
    const sess = result.events.find((e) => e.type === 'STUDY_SESSION');
    expect(sess?.focus).toBe(true);
    expect(result.events.find((e) => e.type === 'AVAILABILITY')).toBeTruthy();
    expect(result.events.find((e) => e.type === 'BLOCKED_TIME')).toBeTruthy();
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
    prisma.availabilitySlot.findMany.mockResolvedValue([]);

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
    prisma.availabilitySlot.findMany.mockResolvedValue([]);

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
});
