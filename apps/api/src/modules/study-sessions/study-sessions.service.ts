import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateSync } from 'class-validator';
import {
  PlannedSessionAnchor,
  PlannedSessionStatus,
  StudySession,
  StudySessionStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, ownedWhere } from '../../common/ownership/ownership';
import { resolveTimeZone, toCivilDate } from '../../common/lib/civil-date';
import { StartStudySessionDto } from './dto/start-study-session.dto';
import { FinishStudySessionDto } from './dto/finish-study-session.dto';
import { ListStudySessionsQueryDto } from './dto/list-study-sessions-query.dto';
type StudySessionRow = StudySession;

function toStudySessionResponse(row: StudySessionRow) {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    taskId: row.taskId,
    // EP13B: the planned session this focus session executes, or null when it
    // was started from an assignment (EP07's original path).
    plannedSessionId: row.plannedSessionId,
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

  /**
   * EP13B — `POST /study-sessions/from-planned/:plannedSessionId`: start a
   * focus session **from the plan** in one step (AC-E13-03).
   *
   * The created session carries the planned row's `assignmentId`, defaults
   * `plannedMinutes` to its `durationMinutes`, and is linked by
   * `plannedSessionId`; the planned row moves `SCHEDULED → IN_PROGRESS`.
   * Both writes happen in **one transaction**, and EP07's one-open-session
   * guard runs inside it — so a rejected start can never leave a planned row
   * stuck `IN_PROGRESS`.
   *
   * Ownership (repo convention): `PlannedSession` has no `userId` column, so
   * the scoped `where` carries the authenticated `userId` through the parent
   * (`studyPlan.userId`); a missing or foreign id is the same uniform 404
   * `Resource not found` — never a 403, never a distinct message.
   *
   * Startable only on **today's** plan (profile zone, D06-24): an earlier day
   * is EP13C's rollover business, a later day is not yet due. Startable only
   * from `SCHEDULED` or `IN_PROGRESS` (re-entering the same planned row);
   * `COMPLETED`, `SKIPPED` and `RESCHEDULED` each answer 409 with their own
   * actionable reason.
   *
   * EP13G (AC-3): starting a **flex** session fixes it at the real time. A
   * day-anchored session's stored slot was only ever a suggestion; the
   * moment the student starts it the session is happening, so the row
   * becomes `FIXED` and its times move to `[now, now + durationMinutes)`.
   * The calendar then shows when the work actually happened, and the day's
   * remaining free time is computed against the real block. A `FIXED`
   * session keeps its slot untouched — EP06 behaviour, unchanged.
   *
   * 201 → the active session; 404 → uniform; 409 → open session / not today /
   * not startable; 401 → unauthenticated (global guard).
   */
  async startFromPlanned(userId: string, plannedSessionId: string) {
    const planned = await this.prisma.plannedSession.findFirst({
      where: { id: plannedSessionId, studyPlan: { userId } },
      select: {
        id: true,
        assignmentId: true,
        durationMinutes: true,
        status: true,
        anchor: true,
        studyPlan: { select: { date: true } },
      },
    });
    if (!planned) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    const timeZone = resolveTimeZone(user.timeZone);

    // The plan row's civil date, compared with the server's civil "today" in
    // the profile zone. `StudyPlan.date` is stored as UTC midnight of the
    // civil date (EP06 convention), so the date part is read directly — never
    // by converting a profile-zone midnight to an instant.
    const plannedDate = planned.studyPlan.date.toISOString().slice(0, 10);
    const today = toCivilDate(new Date(), timeZone);
    if (plannedDate !== today) {
      throw new ConflictException(
        plannedDate < today
          ? 'That session was planned for an earlier day. Generate a fresh plan to pick this work up today.'
          : 'That session is planned for a later day.'
      );
    }

    if (planned.status === PlannedSessionStatus.COMPLETED) {
      throw new ConflictException('That planned session is already finished.');
    }
    if (
      planned.status !== PlannedSessionStatus.SCHEDULED &&
      planned.status !== PlannedSessionStatus.IN_PROGRESS
    ) {
      throw new ConflictException('That session is no longer part of today’s plan.');
    }

    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      // The open-session invariant (D07-6-A), re-checked inside the
      // transaction so the planned row and the session always agree.
      const open = await tx.studySession.findFirst({
        where: {
          userId,
          status: { in: [StudySessionStatus.ACTIVE, StudySessionStatus.PAUSED] },
        },
        select: { id: true },
      });
      if (open) {
        throw new ConflictException('A focus session is already in progress.');
      }

      const session = await tx.studySession.create({
        data: {
          userId,
          assignmentId: planned.assignmentId,
          taskId: null,
          plannedSessionId: planned.id,
          startTime: now,
          endTime: null,
          status: StudySessionStatus.ACTIVE,
          elapsedSeconds: 0,
          durationMinutes: 0,
          plannedMinutes: planned.durationMinutes,
          resumedAt: now,
        },
      });

      // Conditional: only a SCHEDULED row moves to IN_PROGRESS, so
      // re-entering an already IN_PROGRESS planned row is a no-op.
      //
      // EP13G: a flex row is also fixed at the real time in the same write —
      // one row update, inside the same transaction, so a rejected start can
      // never leave a half-moved session behind.
      const fixFlex =
        planned.anchor === PlannedSessionAnchor.FLEX_DAY
          ? {
              anchor: PlannedSessionAnchor.FIXED,
              startTime: now,
              endTime: new Date(now.getTime() + planned.durationMinutes * 60_000),
            }
          : {};
      await tx.plannedSession.updateMany({
        where: {
          id: planned.id,
          studyPlan: { userId },
          status: PlannedSessionStatus.SCHEDULED,
        },
        data: { status: PlannedSessionStatus.IN_PROGRESS, ...fixFlex },
      });

      return session;
    });

    return toStudySessionResponse(created);
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

    const finishWhere = { id, userId, status: row.status };
    const finishData = {
      status: StudySessionStatus.COMPLETED,
      endTime: now,
      durationMinutes: confirmed,
      elapsedSeconds: newElapsed,
      resumedAt: null,
    };

    // EP13B (AC-E13-03): a session started from the plan carries its planned
    // row forward — ≥ 1 confirmed minute completes it, 0 minutes hands it
    // back as SCHEDULED. Both writes run in one transaction.
    //
    // A session with no link (EP07's original path) keeps exactly the
    // statements it always ran: no transaction, and no planned row is ever
    // touched.
    // Falsy covers both `null` (an unlinked row) and `undefined` (a caller
    // that selected a narrower row shape) — both mean "no planned row".
    const plannedSessionId = row.plannedSessionId;
    if (!plannedSessionId) {
      const result = await this.prisma.studySession.updateMany({
        where: finishWhere,
        data: finishData,
      });
      if (result.count === 0) {
        throw new ConflictException('The session changed; reload and try again.');
      }
    } else {
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.studySession.updateMany({
          where: finishWhere,
          data: finishData,
        });
        if (result.count === 0) {
          throw new ConflictException('The session changed; reload and try again.');
        }

        if (confirmed >= 1) {
          // D13-3: the first qualifying finish completes the planned row;
          // later linked finishes match no row and are silent no-ops.
          await tx.plannedSession.updateMany({
            where: {
              id: plannedSessionId,
              studyPlan: { userId },
              status: {
                in: [PlannedSessionStatus.SCHEDULED, PlannedSessionStatus.IN_PROGRESS],
              },
            },
            data: { status: PlannedSessionStatus.COMPLETED },
          });
        } else {
          // Nothing was confirmed: the plan keeps the work as still to do.
          await tx.plannedSession.updateMany({
            where: {
              id: plannedSessionId,
              studyPlan: { userId },
              status: PlannedSessionStatus.IN_PROGRESS,
            },
            data: { status: PlannedSessionStatus.SCHEDULED },
          });
        }
      });
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
