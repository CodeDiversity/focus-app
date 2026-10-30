import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateSync } from 'class-validator';
import { StudySession, StudySessionStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, ownedWhere } from '../../common/ownership/ownership';
import { StartStudySessionDto } from './dto/start-study-session.dto';

type StudySessionRow = StudySession;

function toStudySessionResponse(row: StudySessionRow) {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    taskId: row.taskId,
    status: row.status,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime ? row.endTime.toISOString() : null,
    elapsedSeconds: row.elapsedSeconds,
    durationMinutes: row.durationMinutes,
    plannedMinutes: row.plannedMinutes,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function dtoErrors(dto: object, template: object): Record<string, string[]> | null {
  const failures = validateSync(Object.assign(template, dto), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (!failures.length) {
    return null;
  }
  return Object.fromEntries(
    failures.map((failure) => [failure.property, Object.values(failure.constraints ?? {})])
  );
}

function throwFieldErrors(errors: Record<string, string[]>): never {
  throw new BadRequestException({
    statusCode: 400,
    message: Object.values(errors).flat(),
    error: 'Bad Request',
    errors,
  });
}

@Injectable()
export class StudySessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(userId: string, dto: StartStudySessionDto) {
    const fieldErrors = dtoErrors(dto ?? ({} as StartStudySessionDto), new StartStudySessionDto());
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const assignmentId =
      dto?.assignmentId === undefined || dto?.assignmentId === null ? null : dto.assignmentId;
    const taskId = dto?.taskId === undefined || dto?.taskId === null ? null : dto.taskId;
    const plannedMinutes =
      dto?.plannedMinutes === undefined || dto?.plannedMinutes === null ? null : dto.plannedMinutes;

    // Task/assignment mismatch (D07-1-B).
    if (assignmentId && taskId) {
      const task = await this.prisma.task.findFirst({
        where: ownedWhere(userId, taskId),
        select: { assignmentId: true },
      });
      if (!task) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      if (task.assignmentId !== null && task.assignmentId !== assignmentId) {
        throwFieldErrors({ taskId: ['taskId must belong to the given assignment'] });
      }
    }

    // Ownership checks for assignment/task.
    if (assignmentId) {
      const assignment = await this.prisma.assignment.findFirst({
        where: ownedWhere(userId, assignmentId),
        select: { id: true },
      });
      if (!assignment) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
    }
    if (taskId) {
      const task = await this.prisma.task.findFirst({
        where: ownedWhere(userId, taskId),
        select: { id: true },
      });
      if (!task) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
    }

    // Open-session check (D07-6-A).
    const open = await this.prisma.studySession.findFirst({
      where: {
        userId,
        status: { in: [StudySessionStatus.ACTIVE, StudySessionStatus.PAUSED] },
      },
      select: { id: true },
    });
    if (open) {
      throw new ConflictException('A focus session is already in progress.');
    }

    const now = new Date();
    const row = await this.prisma.studySession.create({
      data: {
        userId,
        assignmentId,
        taskId,
        startTime: now,
        endTime: null,
        status: StudySessionStatus.ACTIVE,
        elapsedSeconds: 0,
        durationMinutes: 0,
        plannedMinutes,
        resumedAt: now,
      },
    });
    return toStudySessionResponse(row);
  }

  async pause(userId: string, id: string) {
    const row = await this.prisma.studySession.findFirst({
      where: ownedWhere(userId, id),
    });
    if (!row) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    if (row.status === StudySessionStatus.PAUSED) {
      throw new ConflictException('This session is already paused.');
    }
    if (row.status === StudySessionStatus.COMPLETED) {
      throw new ConflictException('This session is already completed.');
    }
    if (row.status !== StudySessionStatus.ACTIVE) {
      throw new ConflictException('This session cannot be paused.');
    }

    const now = new Date();
    const segmentStart = row.resumedAt ?? row.startTime;
    const added = Math.max(0, Math.floor((now.getTime() - segmentStart.getTime()) / 1000));
    const elapsed = row.elapsedSeconds + added;

    const result = await this.prisma.studySession.updateMany({
      where: {
        id,
        userId,
        status: StudySessionStatus.ACTIVE,
      },
      data: {
        status: StudySessionStatus.PAUSED,
        elapsedSeconds: elapsed,
        resumedAt: null,
      },
    });
    if (result.count === 0) {
      throw new ConflictException('The session changed; reload and try again.');
    }

    const updated = await this.prisma.studySession.findFirst({
      where: ownedWhere(userId, id),
    });
    if (!updated) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    return toStudySessionResponse(updated);
  }

  async resume(userId: string, id: string) {
    const row = await this.prisma.studySession.findFirst({
      where: ownedWhere(userId, id),
    });
    if (!row) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    if (row.status === StudySessionStatus.ACTIVE) {
      throw new ConflictException('This session is already active.');
    }
    if (row.status === StudySessionStatus.COMPLETED) {
      throw new ConflictException('This session is already completed.');
    }
    if (row.status !== StudySessionStatus.PAUSED) {
      throw new ConflictException('This session cannot be resumed.');
    }

    const now = new Date();
    const result = await this.prisma.studySession.updateMany({
      where: {
        id,
        userId,
        status: StudySessionStatus.PAUSED,
      },
      data: {
        status: StudySessionStatus.ACTIVE,
        resumedAt: now,
      },
    });
    if (result.count === 0) {
      throw new ConflictException('The session changed; reload and try again.');
    }

    const updated = await this.prisma.studySession.findFirst({
      where: ownedWhere(userId, id),
    });
    if (!updated) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    return toStudySessionResponse(updated);
  }

  async current(userId: string) {
    const row = await this.prisma.studySession.findFirst({
      where: {
        userId,
        status: { in: [StudySessionStatus.ACTIVE, StudySessionStatus.PAUSED] },
      },
      orderBy: { startTime: 'desc' },
    });
    return row ? toStudySessionResponse(row) : null;
  }
}
