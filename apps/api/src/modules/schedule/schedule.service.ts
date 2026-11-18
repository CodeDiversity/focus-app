import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, assertAffected } from '../../common/ownership/ownership';
import { addDays, formatCalendarDate, parseCalendarDate } from '../../common/lib/calendar-date';
import {
  MINUTES_PER_DAY,
  expandBlocks,
  maskToWeekdays,
  readDayBounds,
  timeToMinutes,
  weekdaysToMask,
} from '../../domain/schedule/recurrence';
import type { ScheduleBlockInput } from '../../domain/schedule/types';
import { PutDayBoundsDto } from './dto/put-day-bounds.dto';
import {
  CreateScheduleBlockDto,
  ENERGY_LEVELS,
  SCHEDULE_BLOCK_KINDS,
  type EnergyLevelInput,
  type ScheduleBlockKindInput,
} from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';

/** A `schedule_blocks` row as stored (the model's scalar fields). */
type ScheduleBlockRow = {
  id: string;
  userId: string;
  kind: ScheduleBlockKindInput;
  title: string | null;
  courseId: string | null;
  energy: EnergyLevelInput;
  startDate: Date;
  endDate: Date | null;
  weekdays: number | null;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
};

/** The merged, normalized values every block rule is checked against. */
type BlockValues = {
  kind: ScheduleBlockKindInput;
  title: string | null;
  courseId: string | null;
  energy: EnergyLevelInput;
  startDate: string;
  endDate: string | null;
  weekdays: number[] | null;
  startTime: string;
  endTime: string;
};

/** The `ScheduleBlock` API shape (contracts.md § API). `userId` is never exposed. */
export type ScheduleBlockResponse = {
  id: string;
  kind: ScheduleBlockKindInput;
  title: string | null;
  courseId: string | null;
  energy: EnergyLevelInput;
  startDate: string;
  endDate: string | null;
  weekdays: number[] | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

export type DayBoundsResponse = {
  configured: boolean;
  days: { dayOfWeek: number; wakeTime: string; sleepTime: string }[];
};

const TITLE_MAX = 60;
const DAY_BOUND_KEYS = ['dayOfWeek', 'wakeTime', 'sleepTime'] as const;
const ROW_SELECT = {
  id: true,
  userId: true,
  kind: true,
  title: true,
  courseId: true,
  energy: true,
  startDate: true,
  endDate: true,
  weekdays: true,
  startTime: true,
  endTime: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toBlockResponse(row: ScheduleBlockRow): ScheduleBlockResponse {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    courseId: row.courseId,
    energy: row.energy,
    startDate: formatCalendarDate(row.startDate),
    endDate: row.endDate ? formatCalendarDate(row.endDate) : null,
    weekdays: row.weekdays === null ? null : maskToWeekdays(row.weekdays),
    startTime: row.startTime,
    endTime: row.endTime,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** A stored row → the pure recurrence input (exceptions supplied by the caller). */
function toDomainBlock(row: ScheduleBlockRow, exceptionDates: string[]): ScheduleBlockInput {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    courseId: row.courseId,
    energy: row.energy,
    startDate: formatCalendarDate(row.startDate),
    endDate: row.endDate ? formatCalendarDate(row.endDate) : null,
    weekdays: row.weekdays,
    startTime: row.startTime,
    endTime: row.endTime,
    exceptionDates,
  };
}

/**
 * Re-run a DTO's declared constraint set without coercion
 * (availability.service.ts precedent): defense in depth for non-HTTP
 * callers — the global `FieldValidationPipe` owns the HTTP path.
 */
function dtoErrors(dto: object, template: object): Record<string, string[]> | null {
  const failures = validateSync(Object.assign(template, dto), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (!failures.length) return null;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A key is "provided" when present and not `undefined`; `null` counts as provided. */
function provided<T extends object>(dto: T, key: keyof T): boolean {
  return dto[key] !== undefined;
}

/** `HH:mm` → minutes, or an error message naming the field. */
function clockError(field: string, value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    return `${field} must be a 24-hour HH:mm time (e.g. 09:00)`;
  }
  if (timeToMinutes(value) === null) {
    return `${field} must be a valid 24-hour time (hour 00-24, minute 00-59; 24:00 only as an end)`;
  }
  return null;
}

/**
 * The time-pair rules shared by day bounds and blocks (D15-4 / D-A4):
 * `start` is `00:00…23:59`, `end` is `00:01…24:00`, `end` strictly after
 * `start`. Zero-padded `HH:mm` compares chronologically as a string, and
 * `"24:00" > "23:59"`, so the comparison is safe.
 */
function validateTimePair(
  startField: string,
  start: unknown,
  endField: string,
  end: unknown,
  errors: Record<string, string[]>
): void {
  const startError = clockError(startField, start);
  const endError = clockError(endField, end);
  if (startError) errors[startField] = [startError];
  if (endError) errors[endField] = [endError];
  if (startError || endError) return;
  if ((timeToMinutes(start as string) as number) >= MINUTES_PER_DAY) {
    errors[startField] = [`${startField} must be before 24:00`];
    return;
  }
  if (!((end as string) > (start as string))) {
    errors[endField] = [`${endField} must be strictly after ${startField}`];
  }
}

/**
 * The block field rules (contracts.md → *Field rules*; backend
 * authoritative). `energyProvided` lets a PATCH on a `BUSY` block reject an
 * explicit `energy` even though the stored row carries the `NORMAL`
 * default. Returns the field-level `errors` map, or `null`.
 */
function validateBlockValues(
  values: BlockValues,
  energyProvided: boolean
): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};

  if (!SCHEDULE_BLOCK_KINDS.includes(values.kind)) {
    errors.kind = ['kind must be BUSY or STUDY'];
  }
  if (values.title !== null && values.title.length > TITLE_MAX) {
    errors.title = [`title must be ${TITLE_MAX} characters or fewer`];
  }
  if (values.kind === 'BUSY') {
    if (values.courseId !== null) errors.courseId = ['courseId applies to study blocks only'];
    if (energyProvided) errors.energy = ['energy applies to study blocks only'];
  }
  if (!ENERGY_LEVELS.includes(values.energy)) {
    errors.energy = ['energy must be one of HIGH, NORMAL, LOW'];
  }

  const startDate = parseCalendarDate(values.startDate);
  if (!startDate) errors.startDate = ['startDate must be a valid YYYY-MM-DD date'];
  if (values.endDate !== null && !parseCalendarDate(values.endDate)) {
    errors.endDate = ['endDate must be a valid YYYY-MM-DD date'];
  }

  if (values.weekdays !== null) {
    const ok =
      Array.isArray(values.weekdays) &&
      values.weekdays.length >= 1 &&
      values.weekdays.length <= 7 &&
      values.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
      new Set(values.weekdays).size === values.weekdays.length;
    if (!ok) {
      errors.weekdays = [
        'weekdays must be 1 to 7 distinct integers between 0 (Sunday) and 6 (Saturday)',
      ];
    }
  }

  if (values.endDate !== null) {
    if (values.weekdays === null) {
      errors.endDate = ['endDate applies to weekly blocks only (set weekdays or omit endDate)'];
    } else if (!errors.startDate && !errors.endDate && values.endDate < values.startDate) {
      errors.endDate = ['endDate must be on or after startDate'];
    }
  }

  validateTimePair('startTime', values.startTime, 'endTime', values.endTime, errors);

  return Object.keys(errors).length > 0 ? errors : null;
}

/** `title` trimmed; empty → `null`. */
function normalizeTitle(title: string | null | undefined): string | null {
  if (title === null || title === undefined) return null;
  const trimmed = title.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toDate(value: string): Date {
  return parseCalendarDate(value) as Date;
}

/**
 * Schedule service (EP15B, D15-3 / D-B3): one owner for the student's day
 * bounds and schedule blocks — `GET/PUT /schedule/day-bounds`,
 * `GET/POST /schedule/blocks`, `PATCH/DELETE /schedule/blocks/:id`,
 * `DELETE /schedule/blocks/:id/occurrences/:date`.
 *
 * Ownership (`common/ownership/ownership.ts`): every read and write carries
 * the principal's `userId` (directly, or through `block: { userId }` for
 * exceptions); a missing, foreign or malformed id is the uniform 404
 * `Resource not found` with no write. A `courseId` is accepted only when a
 * scoped `course.findFirst({ id, userId })` finds it — the miss is the same
 * uniform 404, so the route is no oracle for other students' courses.
 *
 * Validation: the DTOs declare per-field shape for the global pipe; the
 * service re-checks them (`validateSync`) and owns every cross-field and
 * merged-value rule. Multi-row writes (seven bounds, a split, a delete-from)
 * run in one transaction.
 */
@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Day bounds
  // -------------------------------------------------------------------------

  /** GET /schedule/day-bounds — seven entries, defaults filled (D15-13), plus `configured`. */
  async getDayBounds(userId: string): Promise<DayBoundsResponse> {
    const rows = await this.prisma.dayBounds.findMany({
      where: { userId },
      select: { dayOfWeek: true, wakeTime: true, sleepTime: true },
    });
    return readDayBounds(rows);
  }

  /**
   * PUT /schedule/day-bounds — replace all seven (D-B4). Exactly one entry
   * per weekday; each pair valid; all seven upserted in one transaction;
   * any failure writes nothing and returns field-level 400s.
   */
  async putDayBounds(userId: string, dto: PutDayBoundsDto): Promise<DayBoundsResponse> {
    const fieldErrors = dtoErrors(dto, new PutDayBoundsDto());
    if (fieldErrors) throwFieldErrors(fieldErrors);

    const errors: Record<string, string[]> = {};
    const seen = new Set<number>();
    const entries: { dayOfWeek: number; wakeTime: string; sleepTime: string }[] = [];

    dto.days.forEach((entry, index) => {
      const at = `days[${index}]`;
      if (!isPlainObject(entry)) {
        errors[at] = [`${at} must be an object { dayOfWeek, wakeTime, sleepTime }`];
        return;
      }
      for (const key of Object.keys(entry)) {
        if (!(DAY_BOUND_KEYS as readonly string[]).includes(key)) {
          errors[`${at}.${key}`] = [`property ${key} should not exist`];
        }
      }
      const { dayOfWeek, wakeTime, sleepTime } = entry;
      if (
        typeof dayOfWeek !== 'number' ||
        !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 ||
        dayOfWeek > 6
      ) {
        errors[`${at}.dayOfWeek`] = [
          `${at}.dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday)`,
        ];
      } else if (seen.has(dayOfWeek)) {
        errors.days = ['days must hold each weekday exactly once'];
      } else {
        seen.add(dayOfWeek);
      }
      validateTimePair(`${at}.wakeTime`, wakeTime, `${at}.sleepTime`, sleepTime, errors);
      if (
        typeof dayOfWeek === 'number' &&
        typeof wakeTime === 'string' &&
        typeof sleepTime === 'string'
      ) {
        entries.push({ dayOfWeek, wakeTime, sleepTime });
      }
    });
    if (Object.keys(errors).length === 0 && seen.size !== 7) {
      errors.days = ['days must hold each weekday exactly once'];
    }
    if (Object.keys(errors).length > 0) throwFieldErrors(errors);

    // One atomic batch: all seven rows, or none (the array form of $transaction).
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.dayBounds.upsert({
          where: { userId_dayOfWeek: { userId, dayOfWeek: entry.dayOfWeek } },
          create: { userId, ...entry },
          update: { wakeTime: entry.wakeTime, sleepTime: entry.sleepTime },
        })
      )
    );

    return this.getDayBounds(userId);
  }

  // -------------------------------------------------------------------------
  // Blocks
  // -------------------------------------------------------------------------

  /** GET /schedule/blocks — the student's blocks ordered `startDate`, `startTime`, `id`. */
  async listBlocks(userId: string): Promise<ScheduleBlockResponse[]> {
    const rows = await this.prisma.scheduleBlock.findMany({
      where: { userId },
      orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      select: ROW_SELECT,
    });
    return rows.map((row) => toBlockResponse(row));
  }

  /**
   * POST /schedule/blocks — create a block. 201 the block; 400 field-level;
   * 404 uniform when `courseId` is not the student's course (no write).
   */
  async createBlock(userId: string, dto: CreateScheduleBlockDto): Promise<ScheduleBlockResponse> {
    const fieldErrors = dtoErrors(dto, new CreateScheduleBlockDto());
    if (fieldErrors) throwFieldErrors(fieldErrors);

    const values: BlockValues = {
      kind: dto.kind,
      title: normalizeTitle(dto.title),
      courseId: dto.courseId ?? null,
      energy: dto.energy ?? 'NORMAL',
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      weekdays: dto.weekdays ?? null,
      startTime: dto.startTime,
      endTime: dto.endTime,
    };
    const errors = validateBlockValues(values, dto.energy !== undefined && dto.energy !== null);
    if (errors) throwFieldErrors(errors);

    if (values.courseId !== null) await this.assertCourseOwned(userId, values.courseId);

    const row = await this.prisma.scheduleBlock.create({
      data: {
        userId,
        kind: values.kind,
        title: values.title,
        courseId: values.courseId,
        energy: values.energy,
        startDate: toDate(values.startDate),
        endDate: values.endDate === null ? null : toDate(values.endDate),
        weekdays: values.weekdays === null ? null : weekdaysToMask(values.weekdays),
        startTime: values.startTime,
        endTime: values.endTime,
      },
      select: ROW_SELECT,
    });
    return toBlockResponse(row);
  }

  /**
   * PATCH /schedule/blocks/:id — merged-value validation, then the
   * in-place-or-split rule (D-B2; contracts.md → *PATCH semantics*).
   *
   * In place: a one-off, a body without `effectiveFrom`, or `effectiveFrom ≤
   * startDate`. Otherwise one transaction ends the original the day before
   * `effectiveFrom`, creates the successor from the merged values with
   * `startDate := effectiveFrom`, moves exceptions dated `≥ effectiveFrom`
   * (or drops them when the successor is a one-off, which has no
   * occurrences to cancel) and returns the successor.
   */
  async updateBlock(
    userId: string,
    blockId: string,
    dto: UpdateScheduleBlockDto
  ): Promise<ScheduleBlockResponse> {
    const fieldErrors = dtoErrors(dto, new UpdateScheduleBlockDto());
    if (fieldErrors) throwFieldErrors(fieldErrors);

    const existing = await this.prisma.scheduleBlock.findFirst({
      where: { id: blockId, userId },
      select: ROW_SELECT,
    });
    if (!existing) throw new NotFoundException(RESOURCE_NOT_FOUND);

    // Nullable columns take `null` as a value; the others treat `null` as omitted.
    const has = (key: keyof UpdateScheduleBlockDto) => provided(dto, key);
    const nonNull = (key: keyof UpdateScheduleBlockDto) =>
      dto[key] !== undefined && dto[key] !== null;
    const anyField =
      has('title') ||
      has('courseId') ||
      has('endDate') ||
      has('weekdays') ||
      nonNull('energy') ||
      nonNull('startDate') ||
      nonNull('startTime') ||
      nonNull('endTime') ||
      nonNull('effectiveFrom');
    if (!anyField) throw new BadRequestException('At least one field must be provided');

    const current = toBlockResponse(existing);
    const merged: BlockValues = {
      kind: existing.kind,
      title: has('title') ? normalizeTitle(dto.title) : current.title,
      courseId: has('courseId') ? (dto.courseId ?? null) : current.courseId,
      energy: nonNull('energy') ? (dto.energy as EnergyLevelInput) : current.energy,
      startDate: nonNull('startDate') ? (dto.startDate as string) : current.startDate,
      endDate: has('endDate') ? (dto.endDate ?? null) : current.endDate,
      weekdays: has('weekdays') ? (dto.weekdays ?? null) : current.weekdays,
      startTime: nonNull('startTime') ? (dto.startTime as string) : current.startTime,
      endTime: nonNull('endTime') ? (dto.endTime as string) : current.endTime,
    };

    const effectiveFrom = nonNull('effectiveFrom') ? (dto.effectiveFrom as string) : null;
    const wasWeekly = existing.weekdays !== null;
    const errors: Record<string, string[]> = {};

    if (effectiveFrom !== null) {
      if (!wasWeekly) {
        errors.effectiveFrom = ['effectiveFrom applies to weekly blocks only'];
      } else if (current.endDate !== null && effectiveFrom > current.endDate) {
        errors.effectiveFrom = ['effectiveFrom must be on or before the block’s endDate'];
      }
    } else if (wasWeekly && has('weekdays') && dto.weekdays === null) {
      // D-G10 / R-EP15-10: ending a series as a one-off needs the date.
      errors.effectiveFrom = [
        'effectiveFrom is required to turn a weekly block into a one-off (the date it applies to)',
      ];
    }
    if (Object.keys(errors).length > 0) throwFieldErrors(errors);

    const split = wasWeekly && effectiveFrom !== null && effectiveFrom > current.startDate;
    const successor: BlockValues = split ? { ...merged, startDate: effectiveFrom } : merged;

    const valueErrors = validateBlockValues(successor, nonNull('energy'));
    if (valueErrors) throwFieldErrors(valueErrors);

    if (nonNull('courseId')) await this.assertCourseOwned(userId, successor.courseId as string);

    const data = {
      title: successor.title,
      courseId: successor.courseId,
      energy: successor.energy,
      startDate: toDate(successor.startDate),
      endDate: successor.endDate === null ? null : toDate(successor.endDate),
      weekdays: successor.weekdays === null ? null : weekdaysToMask(successor.weekdays),
      startTime: successor.startTime,
      endTime: successor.endTime,
    };

    try {
      if (!split) {
        const updated = await this.prisma.scheduleBlock.update({
          where: { id: blockId, userId },
          data,
          select: ROW_SELECT,
        });
        return toBlockResponse(updated);
      }

      const created = await this.prisma.$transaction(async (tx) => {
        const ended = await tx.scheduleBlock.updateMany({
          where: { id: blockId, userId },
          data: { endDate: toDate(addDays(effectiveFrom as string, -1)) },
        });
        assertAffected(userId, ended.count);
        const next = await tx.scheduleBlock.create({
          data: { userId, kind: existing.kind, ...data },
          select: ROW_SELECT,
        });
        const from = toDate(effectiveFrom as string);
        if (successor.weekdays === null) {
          await tx.scheduleBlockException.deleteMany({
            where: { blockId, date: { gte: from } },
          });
        } else {
          await tx.scheduleBlockException.updateMany({
            where: { blockId, date: { gte: from } },
            data: { blockId: next.id },
          });
        }
        return next;
      });
      return toBlockResponse(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * DELETE /schedule/blocks/:id?from= — a one-off, no `from`, or `from ≤
   * startDate` deletes the row (exceptions cascade); `from` after `endDate`
   * is a no-op; otherwise `endDate := from − 1` and exceptions `≥ from` go,
   * in one transaction. 400 when `from` is malformed; 404 uniform.
   */
  async deleteBlock(userId: string, blockId: string, from?: unknown): Promise<void> {
    let fromDate: string | null = null;
    if (from !== undefined) {
      if (typeof from !== 'string' || parseCalendarDate(from) === null) {
        throwFieldErrors({ from: ['from must be a valid YYYY-MM-DD date'] });
      }
      fromDate = from as string;
    }

    const existing = await this.prisma.scheduleBlock.findFirst({
      where: { id: blockId, userId },
      select: { id: true, startDate: true, endDate: true, weekdays: true },
    });
    if (!existing) throw new NotFoundException(RESOURCE_NOT_FOUND);

    const startDate = formatCalendarDate(existing.startDate);
    if (fromDate === null || existing.weekdays === null || fromDate <= startDate) {
      const result = await this.prisma.scheduleBlock.deleteMany({ where: { id: blockId, userId } });
      assertAffected(userId, result.count);
      return;
    }

    const endDate = existing.endDate ? formatCalendarDate(existing.endDate) : null;
    if (endDate !== null && fromDate > endDate) return; // nothing to trim

    await this.prisma.$transaction(async (tx) => {
      const trimmed = await tx.scheduleBlock.updateMany({
        where: { id: blockId, userId },
        data: { endDate: toDate(addDays(fromDate as string, -1)) },
      });
      assertAffected(userId, trimmed.count);
      await tx.scheduleBlockException.deleteMany({
        where: { blockId, date: { gte: toDate(fromDate as string) } },
      });
    });
  }

  /**
   * DELETE /schedule/blocks/:id/occurrences/:date — cancel one occurrence
   * (D15-5). Weekly: insert the exception row (idempotent). One-off whose
   * `startDate === date`: delete the row. Any other date → 400.
   */
  async cancelOccurrence(userId: string, blockId: string, date: string): Promise<void> {
    if (typeof date !== 'string' || parseCalendarDate(date) === null) {
      throwFieldErrors({ date: ['date must be a valid YYYY-MM-DD date'] });
    }

    const existing = await this.prisma.scheduleBlock.findFirst({
      where: { id: blockId, userId },
      select: ROW_SELECT,
    });
    if (!existing) throw new NotFoundException(RESOURCE_NOT_FOUND);

    if (existing.weekdays === null) {
      if (formatCalendarDate(existing.startDate) !== date) {
        throwFieldErrors({ date: ['date is not an occurrence of this block'] });
      }
      const result = await this.prisma.scheduleBlock.deleteMany({ where: { id: blockId, userId } });
      assertAffected(userId, result.count);
      return;
    }

    // Occurrence test without exceptions, so a repeated cancel stays a 204.
    const occurs = expandBlocks([toDomainBlock(existing, [])], date, date).length === 1;
    if (!occurs) throwFieldErrors({ date: ['date is not an occurrence of this block'] });

    await this.prisma.scheduleBlockException.upsert({
      where: { blockId_date: { blockId, date: toDate(date) } },
      create: { blockId, date: toDate(date) },
      update: {},
    });
  }

  /**
   * PUT /schedule/blocks/:id/occurrences/:date — restore one occurrence
   * (EP15K D-K2; promotes BL-15-05): the documented inverse of
   * `cancelOccurrence`. Weekly: delete that date's exception row — a date
   * with no exception is already an occurrence, so a repeat stays a 204.
   * One-off whose `startDate === date`: it exists, a no-op 204 (a cancelled
   * one-off is deleted, so its id is the uniform 404). Any other date → 400,
   * the same occurrence test the cancel uses.
   */
  async restoreOccurrence(userId: string, blockId: string, date: string): Promise<void> {
    if (typeof date !== 'string' || parseCalendarDate(date) === null) {
      throwFieldErrors({ date: ['date must be a valid YYYY-MM-DD date'] });
    }

    const existing = await this.prisma.scheduleBlock.findFirst({
      where: { id: blockId, userId },
      select: ROW_SELECT,
    });
    if (!existing) throw new NotFoundException(RESOURCE_NOT_FOUND);

    if (existing.weekdays === null) {
      if (formatCalendarDate(existing.startDate) !== date) {
        throwFieldErrors({ date: ['date is not an occurrence of this block'] });
      }
      return;
    }

    const occurs = expandBlocks([toDomainBlock(existing, [])], date, date).length === 1;
    if (!occurs) throwFieldErrors({ date: ['date is not an occurrence of this block'] });

    // Scoped by construction: `existing` was found through `userId` above,
    // and the exception rows are reachable only through their block.
    await this.prisma.scheduleBlockException.deleteMany({
      where: { blockId, date: toDate(date) },
    });
  }

  // -------------------------------------------------------------------------

  /** A `courseId` must be the student's own course; the miss is the uniform 404. */
  private async assertCourseOwned(userId: string, courseId: string): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, userId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException(RESOURCE_NOT_FOUND);
  }
}
