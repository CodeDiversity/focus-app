import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StudySessionStatus } from '../../generated/prisma/client';
import { StudySessionsService } from './study-sessions.service';
import { StartStudySessionDto } from './dto/start-study-session.dto';

describe('StudySessionsService (EP07A)', () => {
  let service: StudySessionsService;
  let prisma: {
    studySession: { findFirst: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
    assignment: { findFirst: jest.Mock };
    task: { findFirst: jest.Mock };
  };

  const now = new Date('2026-10-30T12:00:00.000Z');

  function makeRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'sess-1',
      userId: 'u1',
      assignmentId: null,
      taskId: null,
      startTime: now,
      endTime: null,
      status: StudySessionStatus.ACTIVE,
      elapsedSeconds: 0,
      durationMinutes: 0,
      plannedMinutes: null,
      notes: null,
      isFocusMode: true,
      rating: null,
      resumedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      studySession: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      assignment: { findFirst: jest.fn() },
      task: { findFirst: jest.fn() },
    };
    service = new StudySessionsService(prisma as never);
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('start creates an ACTIVE session with the expected fields', async () => {
    prisma.task.findFirst
      .mockResolvedValueOnce({ assignmentId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8' }) // mismatch check
      .mockResolvedValueOnce({ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7' }); // ownership
    prisma.assignment.findFirst.mockResolvedValue({ id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8' });
    prisma.studySession.findFirst.mockResolvedValue(null); // no open session
    const aId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    const tId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const row = makeRow({ assignmentId: aId, taskId: tId, plannedMinutes: 30, resumedAt: now });
    prisma.studySession.create.mockResolvedValue(row);

    const result = await service.start('u1', {
      assignmentId: aId,
      taskId: tId,
      plannedMinutes: 30,
    } as unknown as StartStudySessionDto);

    expect(prisma.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          assignmentId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          status: StudySessionStatus.ACTIVE,
          elapsedSeconds: 0,
          durationMinutes: 0,
          plannedMinutes: 30,
          endTime: null,
        }),
      })
    );
    expect(result.status).toBe('ACTIVE');
    expect(result.elapsedSeconds).toBe(0);
    expect(result.durationMinutes).toBe(0);
  });

  it('start rejects out-of-range plannedMinutes with 400', async () => {
    await expect(
      service.start('u1', { plannedMinutes: 1 } as unknown as StartStudySessionDto)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('start rejects unknown body fields with 400', async () => {
    await expect(
      service.start('u1', { foo: 1 } as unknown as StartStudySessionDto)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('start throws 404 on foreign/missing assignment', async () => {
    prisma.assignment.findFirst.mockResolvedValue(null);
    await expect(
      service.start('u1', {
        assignmentId: '550e8400-e29b-41d4-a716-446655440000',
      } as unknown as StartStudySessionDto)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('start throws 404 on foreign/missing task', async () => {
    prisma.task.findFirst.mockResolvedValue(null);
    await expect(
      service.start('u1', {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      } as unknown as StartStudySessionDto)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('start throws 400 when taskId belongs to a different assignment', async () => {
    // mismatch check reads task first
    prisma.task.findFirst.mockResolvedValue({
      assignmentId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
    });
    await expect(
      service.start('u1', {
        assignmentId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        taskId: '123e4567-e89b-42d3-a456-556642440000',
      } as unknown as StartStudySessionDto)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('start throws 409 when an open session exists', async () => {
    prisma.studySession.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.start('u1', {} as unknown as StartStudySessionDto)).rejects.toThrow(
      'A focus session is already in progress.'
    );
  });

  it('pause adds the running segment and clears resumedAt', async () => {
    const segmentStart = new Date(now.getTime() - 5000);
    const row = makeRow({ resumedAt: segmentStart, elapsedSeconds: 10 });
    prisma.studySession.findFirst.mockResolvedValueOnce(row);
    const updated = makeRow({
      status: StudySessionStatus.PAUSED,
      elapsedSeconds: 15,
      resumedAt: null,
    });
    prisma.studySession.updateMany.mockResolvedValue({ count: 1 });
    prisma.studySession.findFirst.mockResolvedValueOnce(updated);

    const result = await service.pause('u1', 'sess-1');

    expect(prisma.studySession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1', userId: 'u1', status: StudySessionStatus.ACTIVE },
        data: expect.objectContaining({
          status: StudySessionStatus.PAUSED,
          resumedAt: null,
        }),
      })
    );
    expect(result.status).toBe('PAUSED');
    expect(result.elapsedSeconds).toBe(15);
  });

  it('pause on PAUSED/COMPLETED throws 409', async () => {
    prisma.studySession.findFirst.mockResolvedValue(makeRow({ status: StudySessionStatus.PAUSED }));
    await expect(service.pause('u1', 'sess-1')).rejects.toThrow('This session is already paused.');

    prisma.studySession.findFirst.mockResolvedValue(
      makeRow({ status: StudySessionStatus.COMPLETED })
    );
    await expect(service.pause('u1', 'sess-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('pause lost race throws 409 with reload message', async () => {
    prisma.studySession.findFirst.mockResolvedValue(makeRow());
    prisma.studySession.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.pause('u1', 'sess-1')).rejects.toThrow(
      'The session changed; reload and try again.'
    );
  });

  it('resume sets a new resumedAt', async () => {
    const row = makeRow({ status: StudySessionStatus.PAUSED, resumedAt: null });
    prisma.studySession.findFirst.mockResolvedValueOnce(row);
    const updated = makeRow({ status: StudySessionStatus.ACTIVE, resumedAt: now });
    prisma.studySession.updateMany.mockResolvedValue({ count: 1 });
    prisma.studySession.findFirst.mockResolvedValueOnce(updated);

    const result = await service.resume('u1', 'sess-1');

    expect(prisma.studySession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1', userId: 'u1', status: StudySessionStatus.PAUSED },
        data: expect.objectContaining({ status: StudySessionStatus.ACTIVE }),
      })
    );
    expect(result.status).toBe('ACTIVE');
  });

  it('resume on ACTIVE throws 409 "This session is already active."', async () => {
    prisma.studySession.findFirst.mockResolvedValue(makeRow({ status: StudySessionStatus.ACTIVE }));
    await expect(service.resume('u1', 'sess-1')).rejects.toThrow('This session is already active.');
  });

  it('resume on COMPLETED throws 409', async () => {
    prisma.studySession.findFirst.mockResolvedValue(
      makeRow({ status: StudySessionStatus.COMPLETED })
    );
    await expect(service.resume('u1', 'sess-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('resume lost race throws 409 with reload message', async () => {
    prisma.studySession.findFirst.mockResolvedValue(makeRow({ status: StudySessionStatus.PAUSED }));
    prisma.studySession.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.resume('u1', 'sess-1')).rejects.toThrow(
      'The session changed; reload and try again.'
    );
  });

  it('current returns open session or null and performs no write', async () => {
    const row = makeRow();
    prisma.studySession.findFirst.mockResolvedValue(row);
    const result = await service.current('u1');
    expect(result).not.toBeNull();
    expect(prisma.studySession.create).not.toHaveBeenCalled();
    expect(prisma.studySession.updateMany).not.toHaveBeenCalled();

    prisma.studySession.findFirst.mockResolvedValue(null);
    const none = await service.current('u1');
    expect(none).toBeNull();
  });

  it('missing/foreign session returns uniform 404', async () => {
    prisma.studySession.findFirst.mockResolvedValue(null);
    await expect(service.pause('u1', 'nope')).rejects.toThrow('Resource not found');
    prisma.studySession.findFirst.mockResolvedValue(null);
    await expect(service.resume('u1', 'nope')).rejects.toThrow('Resource not found');
  });
});
