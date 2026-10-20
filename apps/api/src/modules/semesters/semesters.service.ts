import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatCalendarDate, parseCalendarDate } from '../../common/lib/calendar-date';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';

/** A semester row with its attached-course count (`SemesterWithCount`, contract). */
type CountedSemester = {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { courses: number };
};

/**
 * Semester service (SP-107B, D107-5; SP-110A full management surface).
 *
 * This module is the **semester management surface**: `POST` (onboarding
 * minimal, SP-107B) plus list / get / `PATCH` (incl. single-active
 * activation, D110-1) / `DELETE` (orphaned courses, D110-2).  The remaining
 * EP02 extension of the academic-structure modules is course-side only
 * (D107-9 — no duplicate endpoints).
 *
 * Every operation is scoped to the requesting student via the JWT principal
 * (SP-104): `userId` comes from the authenticated user, never from the
 * request body (the global pipe forbids unknown fields).  A record that is
 * missing OR owned by another student is reported with the same uniform 404
 * `Resource not found` — no existence oracle (repo ownership convention).
 *
 * Dates (D107-7): the DTOs take strict `yyyy-MM-dd` strings; they are parsed
 * to UTC-midnight `Date`s for the `@db.Date` columns and serialized back as
 * `yyyy-MM-dd` in the response — calendar dates, never instants.
 */
@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a semester owned by the requesting student.
   *
   * - `name` is trimmed; non-empty and ≤ 100 chars (AC-107-06).
   * - `startDate`/`endDate` must be valid calendar dates and
   *   `endDate` must be strictly after `startDate` — violations → 400 with
   *   a field-level `errors` map (the service re-checks what the DTO
   *   declares: backend authoritative, ticket AC-2).
   * - Duplicate name for this student (Prisma P2002 on
   *   `@@unique([userId, name])`) → 409 with the resource-specific message;
   *   the global filter's generic P2002 message remains the fallback for any
   *   other unique path.
   * - `isActive` is deliberately omitted from `data`: the schema default
   *   `false` applies (EP02 owns activation, D107-5).
   */
  async create(userId: string, dto: CreateSemesterDto) {
    const name = dto.name.trim();
    const startDate = parseCalendarDate(dto.startDate);
    const endDate = parseCalendarDate(dto.endDate);

    const errors: Record<string, string[]> = {};
    if (name.length === 0 || name.length > 100) {
      errors.name = ['name must not be empty and must be 100 characters or fewer'];
    }
    if (!startDate) {
      errors.startDate = ['startDate must be a valid yyyy-MM-dd calendar date'];
    }
    if (!endDate) {
      errors.endDate = ['endDate must be a valid yyyy-MM-dd calendar date'];
    }
    // Both dates must be present to compare; UTC-midnight instants compare
    // as calendar dates (D107-7).
    if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
      errors.endDate = ['endDate must be after startDate'];
    }
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: Object.values(errors).flat(),
        error: 'Bad Request',
        errors,
      });
    }

    try {
      const semester = await this.prisma.semester.create({
        data: {
          userId,
          name,
          startDate: startDate!,
          endDate: endDate!,
        },
      });
      return this.toResponse(semester);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A semester with this name already exists.');
      }
      throw error;
    }
  }

  /**
   * List the requesting student's semesters (SP-110A, contract):
   * `startDate` desc, then `name` asc; each row in the `SemesterWithCount`
   * shape (D110-3: `courseCount` = attached courses, all archive states).
   * Another student's rows never appear — the `where` is the principal.
   */
  async list(userId: string) {
    const rows = await this.prisma.semester.findMany({
      where: { userId },
      include: { _count: { select: { courses: true } } },
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.toCountedResponse(row));
  }

  /**
   * Read one of the student's semesters. A missing id or another student's
   * id → uniform 404 `Resource not found` (the ownership predicate is in the
   * query; both cases are indistinguishable to the caller — no existence
   * oracle).
   */
  async get(userId: string, id: string) {
    const row = await this.prisma.semester.findFirst({
      where: { id, userId },
      include: { _count: { select: { courses: true } } },
    });
    if (!row) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    return this.toCountedResponse(row);
  }

  /**
   * Partial-merge update (SP-110A, D110-5): omitted fields keep the stored
   * value; validation runs on the **merged** (post-patch) values — the
   * service re-checks what the DTO declares (backend authoritative).
   *
   * - At least one field must be provided (empty body → 400); an explicit
   *   `null` is treated as omitted (the DTO's `@IsOptional()` skips nulls).
   * - Merged `name` non-empty after trim, ≤ 100 chars; merged dates valid
   *   `yyyy-MM-dd`; merged `endDate` strictly after `startDate` — violations
   *   → 400 with a field-level `errors` map, nothing written.
   * - A name colliding with a **different** semester of the same student
   *   (Prisma P2002 on `@@unique([userId, name])`) → 409 with the
   *   resource-specific message.
   * - `isActive: true` (D110-1): one transaction deactivates all of the
   *   student's other semesters and activates the target — after every
   *   request at most one active per student; a stale/foreign target makes
   *   the conditional `userId` write a miss → uniform 404, rolled back.
   * - `isActive: false`: deactivates only the target.
   * - Response: the updated `SemesterWithCount`.
   */
  async update(userId: string, id: string, dto: UpdateSemesterDto) {
    const existing = await this.prisma.semester.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // An explicit null is treated as omitted (the DTO's `@IsOptional()`
    // skips nulls) — normalize before merging.
    const has = (value: unknown): boolean => value !== undefined && value !== null;

    // At least one field (contract: "partial body; at least one field").
    if (!has(dto.name) && !has(dto.startDate) && !has(dto.endDate) && !has(dto.isActive)) {
      throw new BadRequestException('At least one field must be provided');
    }

    // Merge the patch over the stored values, then validate the merged
    // values (a patch of one date is only legal against the other stored
    // date — e.g. `endDate: 2026-09-01` on a semester starting 2026-09-01
    // must 400, even though the string alone is well-formed).
    const mergedName = has(dto.name) ? dto.name!.trim() : existing.name;
    const mergedStart = has(dto.startDate) ? parseCalendarDate(dto.startDate!) : existing.startDate;
    const mergedEnd = has(dto.endDate) ? parseCalendarDate(dto.endDate!) : existing.endDate;

    const errors: Record<string, string[]> = {};
    if (mergedName.length === 0 || mergedName.length > 100) {
      errors.name = ['name must not be empty and must be 100 characters or fewer'];
    }
    if (!mergedStart) {
      errors.startDate = ['startDate must be a valid yyyy-MM-dd calendar date'];
    }
    if (!mergedEnd) {
      errors.endDate = ['endDate must be a valid yyyy-MM-dd calendar date'];
    }
    // Both dates must be present to compare; UTC-midnight instants compare
    // as calendar dates (D107-7).
    if (mergedStart && mergedEnd && mergedEnd.getTime() <= mergedStart.getTime()) {
      errors.endDate = ['endDate must be after startDate'];
    }
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: Object.values(errors).flat(),
        error: 'Bad Request',
        errors,
      });
    }

    // Only the provided fields are written (partial merge).
    const data: { name?: string; startDate?: Date; endDate?: Date } = {};
    if (has(dto.name)) {
      data.name = mergedName;
    }
    if (has(dto.startDate)) {
      data.startDate = mergedStart!;
    }
    if (has(dto.endDate)) {
      data.endDate = mergedEnd!;
    }
    const hasIsActive = has(dto.isActive);

    try {
      let updated: CountedSemester;
      if (dto.isActive === true) {
        // Single-active invariant (D110-1): deactivate every other semester
        // of this student and activate the target in ONE transaction.  The
        // conditional `userId` in both writes makes a stale/foreign target a
        // miss (P2025 → uniform 404, rolled back); concurrent activations
        // are last-write-wins — the invariant always holds.
        const [, row] = await this.prisma.$transaction([
          this.prisma.semester.updateMany({
            where: { userId, NOT: { id } },
            data: { isActive: false },
          }),
          this.prisma.semester.update({
            where: { id, userId },
            data: { ...data, isActive: true },
            include: { _count: { select: { courses: true } } },
          }),
        ]);
        updated = row;
      } else {
        // `isActive: false` deactivates only the target; omitted → the flag
        // is untouched.
        updated = await this.prisma.semester.update({
          where: { id, userId },
          data: { ...data, ...(hasIsActive ? { isActive: dto.isActive! } : {}) },
          include: { _count: { select: { courses: true } } },
        });
      }
      return this.toCountedResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A semester with this name already exists.');
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
   * Delete one of the student's semesters (SP-110A, D110-2): in ONE
   * transaction the semester's courses are explicitly set to
   * `semesterId: null` (orphaned, not destroyed — they stay fully
   * accessible, unaffiliated) and the semester row is deleted.  The
   * explicit `updateMany` does not rely on the schema's implicit SetNull
   * default.  A missing/foreign id → the scoped delete misses (P2025) →
   * uniform 404 and the whole transaction rolls back — no writes.
   */
  async delete(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.course.updateMany({
          where: { semesterId: id, userId },
          data: { semesterId: null },
        }),
        this.prisma.semester.delete({ where: { id, userId } }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * Project a semester row to the API shape: dates as `yyyy-MM-dd`
   * (date part only — never an instant, D107-7), timestamps as ISO strings.
   * Matches the frontend `Semester` type exactly (the SP-107B 7-key shape,
   * unchanged for `POST /semesters`).
   */
  private toResponse(semester: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: semester.id,
      name: semester.name,
      startDate: formatCalendarDate(semester.startDate),
      endDate: formatCalendarDate(semester.endDate),
      isActive: semester.isActive,
      createdAt: semester.createdAt.toISOString(),
      updatedAt: semester.updatedAt.toISOString(),
    };
  }

  /**
   * `SemesterWithCount` (contract, D110-3): the SP-107B shape plus
   * `courseCount` — the number of attached courses (all archive states).
   */
  private toCountedResponse(semester: CountedSemester) {
    return {
      ...this.toResponse(semester),
      courseCount: semester._count.courses,
    };
  }
}
