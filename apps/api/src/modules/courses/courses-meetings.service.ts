import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, assertAffected } from '../../common/ownership/ownership';
import { CreateClassMeetingDto } from './dto/create-class-meeting.dto';
import { UpdateClassMeetingDto } from './dto/update-class-meeting.dto';

/**
 * A `class_meetings` row as stored (the model's scalar fields).
 */
type ClassMeetingRow = {
  id: string;
  userId: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The `ClassMeeting` API shape (shared API contract, SP-112 README):
 * `{ id, dayOfWeek, startTime, endTime, createdAt, updatedAt }` with ISO
 * timestamps.  `userId`/`courseId` are never exposed (the course is the
 * navigation unit — D112-2).  Exported so `CoursesService.get()` reuses the
 * same mapping for the detail projection (D112-3) — one canonical shape.
 */
export function toMeetingResponse(row: ClassMeetingRow) {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** `HH:mm` 24-hour format (D112-1). */
const HH_MM = /^\d{2}:\d{2}$/;

/**
 * Validate one `HH:mm` value (format, then hour 00–23 / minute 00–59) into
 * the field-level `errors` map.  Returns whether the value is a usable time.
 */
function validateTime(
  value: unknown,
  field: 'startTime' | 'endTime',
  errors: Record<string, string[]>
): boolean {
  if (typeof value !== 'string' || !HH_MM.test(value)) {
    errors[field] = [`${field} must be a 24-hour HH:mm time (e.g. 09:00)`];
    return false;
  }
  if (Number(value.slice(0, 2)) > 23 || Number(value.slice(3, 5)) > 59) {
    errors[field] = [`${field} must be a valid 24-hour time (hour 00-23, minute 00-59)`];
    return false;
  }
  return true;
}

/**
 * The meeting time rules (D112-1, backend authoritative): `dayOfWeek`
 * integer 0–6 (Sunday=0 … Saturday=6); both times `HH:mm` with hour 00–23 /
 * minute 00–59; `endTime` **strictly after** `startTime` on the same day —
 * a midnight wrap (e.g. 23:00 → 01:00) is 400, never stored.  Zero-padded
 * `HH:mm` compares chronologically under plain string comparison, so
 * `end > start` is safe.  Returns the field-level `errors` map, or `null`
 * when the values are valid.
 */
function validateMeetingTimes(
  dayOfWeek: unknown,
  startTime: unknown,
  endTime: unknown
): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  if (
    typeof dayOfWeek !== 'number' ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    errors.dayOfWeek = ['dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday)'];
  }
  const startOk = validateTime(startTime, 'startTime', errors);
  const endOk = validateTime(endTime, 'endTime', errors);
  if (startOk && endOk && !((endTime as string) > (startTime as string))) {
    errors.endTime = ['endTime must be strictly after startTime (same day)'];
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

function throwFieldErrors(errors: Record<string, string[]>): never {
  throw new BadRequestException({
    statusCode: 400,
    message: Object.values(errors).flat(),
    error: 'Bad Request',
    errors,
  });
}

/**
 * Class meetings service (SP-112A) — the recurring-meeting surface nested
 * under the course routes (D112-2): `GET/POST /courses/:id/meetings`,
 * `PATCH/DELETE /courses/:id/meetings/:meetingId`.
 *
 * Ownership (repo convention, `common/ownership/ownership.ts`): every
 * operation checks the **course** first (`findFirst({ where: { id, userId }
 * })` → uniform 404 `Resource not found`), and every meeting query carries
 * **both** `courseId` and the principal's `userId` in the `where`.  A
 * missing record, another student's record, or a meeting of a different
 * course all produce the same uniform 404 — no existence oracle, no write.
 * `userId` comes from the JWT principal only (the global pipe forbids a
 * `userId`/`courseId` body field).
 *
 * Validation: the DTOs declare the per-field rules for the global
 * `FieldValidationPipe`; the service re-checks everything (backend
 * authoritative), including the cross-field `endTime > startTime` rule a
 * single-field decorator cannot express.  The per-course slot uniqueness
 * (`@@unique([courseId, dayOfWeek, startTime])`) maps P2002 to the
 * resource-specific 409.
 */
@Injectable()
export class CoursesMeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The course-ownership gate every nested route passes through: the course
   * must exist **and** belong to the requesting student.  A miss (missing or
   * another student's id) throws the uniform 404 and nothing else is read or
   * written (no existence oracle).
   */
  private async assertCourseOwned(userId: string, courseId: string): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, userId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
  }

  /**
   * GET /courses/:id/meetings — the student's meetings for the student's own
   * course, ordered `dayOfWeek` asc then `startTime` asc (contract).
   *
   * 200 → `[ ClassMeeting ]`; 404 → uniform (course missing/foreign);
   * 401 → unauthenticated (global guard).
   */
  async list(userId: string, courseId: string) {
    await this.assertCourseOwned(userId, courseId);
    const rows = await this.prisma.classMeeting.findMany({
      where: { courseId, userId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map((row) => toMeetingResponse(row));
  }

  /**
   * POST /courses/:id/meetings — create a recurring meeting on the student's
   * own course.
   *
   * 201 → the created `ClassMeeting`; 400 → field-level errors (dayOfWeek
   * 0–6, `HH:mm` bounds, `end > start` same day); 404 → uniform (course
   * missing/foreign); 409 → the same `dayOfWeek` + `startTime` slot already
   * exists for this course (P2002, `@@unique([courseId, dayOfWeek,
   * startTime])`); 401 → unauthenticated (global guard).
   */
  async create(userId: string, courseId: string, dto: CreateClassMeetingDto) {
    await this.assertCourseOwned(userId, courseId);

    const errors = validateMeetingTimes(dto.dayOfWeek, dto.startTime, dto.endTime);
    if (errors) {
      throwFieldErrors(errors);
    }

    try {
      const row = await this.prisma.classMeeting.create({
        data: {
          userId,
          courseId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });
      return toMeetingResponse(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A meeting already exists at this time.');
      }
      throw error;
    }
  }

  /**
   * PATCH /courses/:id/meetings/:meetingId — partial merge of
   * `{ dayOfWeek?, startTime?, endTime? }` (at least one field; unknown
   * fields → 400 via the global pipe).
   *
   * The meeting must belong to **both** the `:id` course and the requesting
   * student — a missing meeting, another student's meeting, or a meeting of
   * a different course → uniform 404, no write.  Validation runs on the
   * **merged** values; the same-slot P2002 → 409.  200 → the updated
   * `ClassMeeting`; 401 → unauthenticated (global guard).
   */
  async update(userId: string, courseId: string, meetingId: string, dto: UpdateClassMeetingDto) {
    // Dual-ownership lookup: both `courseId` and `userId` are in the where,
    // so every miss shape (missing / another student's / different course)
    // is the same uniform 404.
    const existing = await this.prisma.classMeeting.findFirst({
      where: { id: meetingId, courseId, userId },
    });
    if (!existing) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // An explicit null is treated as omitted (the DTO's `@IsOptional()`
    // skips nulls) — normalize before merging.
    const has = (value: unknown): boolean => value !== undefined && value !== null;

    // At least one field (contract: "partial body; at least one field").
    if (!has(dto.dayOfWeek) && !has(dto.startTime) && !has(dto.endTime)) {
      throw new BadRequestException('At least one field must be provided');
    }

    // Merge the patch over the stored values, then validate the merged
    // values (a patch of one field is only legal against the stored row —
    // e.g. an `endTime` patched to equal the stored `startTime` must 400).
    const mergedDayOfWeek = has(dto.dayOfWeek) ? dto.dayOfWeek! : existing.dayOfWeek;
    const mergedStartTime = has(dto.startTime) ? dto.startTime! : existing.startTime;
    const mergedEndTime = has(dto.endTime) ? dto.endTime! : existing.endTime;

    const errors = validateMeetingTimes(mergedDayOfWeek, mergedStartTime, mergedEndTime);
    if (errors) {
      throwFieldErrors(errors);
    }

    // Only the provided fields are written (partial merge).
    const data: { dayOfWeek?: number; startTime?: string; endTime?: string } = {};
    if (has(dto.dayOfWeek)) {
      data.dayOfWeek = mergedDayOfWeek;
    }
    if (has(dto.startTime)) {
      data.startTime = mergedStartTime;
    }
    if (has(dto.endTime)) {
      data.endTime = mergedEndTime;
    }

    try {
      const updated = await this.prisma.classMeeting.update({
        where: { id: meetingId, userId },
        data,
      });
      return toMeetingResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A meeting already exists at this time.');
        }
        if (error.code === 'P2025') {
          // The target vanished (or was never this student's) between the
          // read and the write — the same uniform 404 as the read miss.
          throw new NotFoundException(RESOURCE_NOT_FOUND);
        }
      }
      throw error;
    }
  }

  /**
   * DELETE /courses/:id/meetings/:meetingId — remove the meeting.
   *
   * The scoped `deleteMany` carries **both** `courseId` and `userId` in the
   * where; 0 affected rows (missing / another student's / different course)
   * → uniform 404 via `assertAffected`.  204 → deleted; 401 →
   * unauthenticated (global guard).
   */
  async delete(userId: string, courseId: string, meetingId: string): Promise<void> {
    const result = await this.prisma.classMeeting.deleteMany({
      where: { id: meetingId, courseId, userId },
    });
    assertAffected(userId, result.count);
  }
}
