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
import { FinishStudySessionDto } from './dto/finish-study-session.dto';
import { ListStudySessionsQueryDto } from './dto/list-study-sessions-query.dto';
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

  async finish(userId: string, id: string, dto: FinishStudySessionDto) {
    const fieldErrors = dtoErrors(
      dto ?? ({} as FinishStudySessionDto),
      new FinishStudySessionDto()
    );
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const row = await this.prisma.studySession.findFirst({
      where: ownedWhere(userId, id),
    });
    if (!row) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    if (row.status === StudySessionStatus.COMPLETED) {
      throw new ConflictException('This session is already completed.');
    }
    if (row.status !== StudySessionStatus.ACTIVE && row.status !== StudySessionStatus.PAUSED) {
      throw new ConflictException('This session cannot be finished.');
    }

    const now = new Date();
    let newElapsed = row.elapsedSeconds;
    if (row.status === StudySessionStatus.ACTIVE) {
      const segmentStart = row.resumedAt ?? row.startTime;
      const added = Math.max(0, Math.floor((now.getTime() - segmentStart.getTime()) / 1000));
      newElapsed = row.elapsedSeconds + added;
    }

    const confirmed =
      dto?.confirmedMinutes != null ? dto.confirmedMinutes : Math.round(newElapsed / 60);

    const result = await this.prisma.studySession.updateMany({
      where: {
        id,
        userId,
        status: row.status,
      },
      data: {
        status: StudySessionStatus.COMPLETED,
        endTime: now,
        durationMinutes: confirmed,
        elapsedSeconds: newElapsed,
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

  async list(userId: string, query: ListStudySessionsQueryDto) {
    const fieldErrors = dtoErrors(
      query ?? ({} as ListStudySessionsQueryDto),
      new ListStudySessionsQueryDto()
    );
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const assignmentId = query?.assignmentId ?? null;
    if (assignmentId) {
      const assignment = await this.prisma.assignment.findFirst({
        where: ownedWhere(userId, assignmentId),
        select: { id: true },
      });
      if (!assignment) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
    }

    const from = query?.from ? new Date(query.from) : null;
    const to = query?.to ? new Date(query.to) : null;

    const where: Record<string, unknown> = {
      userId,
      status: StudySessionStatus.COMPLETED,
    };
    if (assignmentId) {
      where.assignmentId = assignmentId;
    }
    if (from || to) {
      where.startTime = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const limit = query?.limit ?? 50;
    const offset = query?.offset ?? 0;

    const [rows, total] = await Promise.all([
      this.prisma.studySession.findMany({
        where,
        orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.studySession.count({ where }),
    ]);

    return {
      items: rows.map((row: StudySession) => toStudySessionResponse(row)),
      total,
    };
  }

  async confirmedTime(userId: string, assignmentId?: string) {
    if (assignmentId) {
      const assignment = await this.prisma.assignment.findFirst({
        where: ownedWhere(userId, assignmentId),
        select: { id: true },
      });
      if (!assignment) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      const agg = await this.prisma.studySession.aggregate({
        where: {
          userId,
          status: StudySessionStatus.COMPLETED,
          assignmentId,
        },
        _sum: { durationMinutes: true },
        _count: true,
      });
      return {
        assignmentId,
        confirmedMinutes: agg._sum.durationMinutes ?? 0,
        sessionCount: (typeof agg._count === 'number' ? agg._count : 0) as number,
      };
    }

    const groups = await this.prisma.studySession.groupBy({
      by: ['assignmentId'],
      where: {
        userId,
        status: StudySessionStatus.COMPLETED,
        assignmentId: { not: null },
      },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });

    const assignments = groups
      .map(
        (group: {
          assignmentId: string | null;
          _sum: { durationMinutes: number | null };
          _count: { _all: number };
        }) => ({
          assignmentId: group.assignmentId as string,
          confirmedMinutes: group._sum.durationMinutes ?? 0,
          sessionCount: group._count._all ?? 0,
        })
      )
      .sort((a, b) =>
        a.assignmentId < b.assignmentId ? -1 : a.assignmentId > b.assignmentId ? 1 : 0
      );

    return { assignments };
  }
}
