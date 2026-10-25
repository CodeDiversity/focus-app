import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { toMeetingResponse } from './courses-meetings.service';

/**
 * A course row with its semester projection — the `CourseWithSemester`
 * contract shape (SP-111A, D111-4): the SP-107B 8-key shape plus
 * `instructor` (D111-1), `semesterId`, and `semester: { id, name } | null`
 * (null when unaffiliated — orphaned by semester deletion, D110-2).
 * Returned by every route, including the extended `POST /courses`
 * (backward-compatible: the onboarding wizard ignores the extra keys).
 */
type CourseWithSemesterRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  credits: number | null;
  instructor: string | null;
  isActive: boolean;
  semesterId: string | null;
  semester: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

/** The semester projection every course query includes. */
const SEMESTER_PROJECTION = { semester: { select: { id: true, name: true } } } as const;

/**
 * A `assignments` row as stored (the model's scalar fields).
 */
type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  status: string;
  priority: string;
  type: string | null; // SP-115G (D115-4)
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The read-only `Assignment` projection for the detail route (SP-112A,
 * D112-3): the frontend `Assignment` type minus the nested `course` —
 * `dueDate` ISO-serialized (EP03 owns date semantics); `userId`/`courseId`
 * are never exposed.  Management stays with EP03 (D112-6).
 */
function toAssignmentResponse(assignment: AssignmentRow) {
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.dueDate?.toISOString() ?? null,
    estimatedHours: assignment.estimatedHours,
    actualHours: assignment.actualHours,
    status: assignment.status,
    priority: assignment.priority,
    type: assignment.type, // SP-115G (D115-4): `type` after `priority`.
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

/**
 * Course service (SP-107B create; SP-111A full management surface;
 * SP-112A detail projections).
 *
 * This module is the **full course surface**: `POST /courses` (onboarding
 * minimal, SP-107B — extended with `instructor`, D111-1) plus list
 * (semester + archive filters) / get / `PATCH` (partial merge incl.
 * archive/restore, D111-2/D111-3), the meetings routes (SP-112A, in
 * `courses-meetings.service.ts`), and the `GET /courses/:id` detail
 * projections — `meetings` + read-only `assignments` (SP-112A, D112-3).
 * EP02's remaining extension of this module is only EP03's assignment
 * management (out of scope); no duplicate endpoints (D107-9).
 *
 * Every operation is scoped to the requesting student via the JWT principal
 * (SP-104): `userId` comes from the authenticated user, never from the
 * request body (the global pipe forbids unknown fields).  A record that is
 * missing OR owned by another student is reported with the same uniform 404
 * `Resource not found` — no existence oracle (repo ownership convention).
 *
 * `semesterId` ownership (repo convention, `common/ownership/ownership.ts`):
 * when provided it must reference a semester that exists **and belongs to
 * the requesting student** — the ownership predicate is in the query
 * (`findFirst({ where: { id, userId } })`); a miss (missing or another
 * student's id) throws the uniform 404 `Resource not found` and nothing is
 * written (no existence oracle).  Omitted → `semesterId: null`.
 *
 * Archive (D111-2): `isActive: false` archives, `isActive: true` restores —
 * a flag flip through the same `PATCH`; the row survives (no hard delete)
 * and stays accessible via the detail route and the `includeArchived` list.
 */
@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a course owned by the requesting student.
   *
   * - `code`/`name` are trimmed; non-empty, ≤ 20 / ≤ 100 chars (AC-107-07).
   * - `instructor` (D111-1) when present is trimmed; non-empty after trim
   *   and ≤ 100 chars — whitespace-only → 400; omitted → `null`.
   * - `credits` when present `0 < c ≤ 30`; `color` when present `#rrggbb`;
   *   `description` ≤ 2000 chars — violations → 400 with a field-level
   *   `errors` map (the service re-checks what the DTO declares: backend
   *   authoritative, ticket AC-5).
   * - `semesterId` ownership-checked as above; a miss → uniform 404 before
   *   anything is written.
   * - Duplicate code for this student (Prisma P2002 on
   *   `@@unique([userId, code])`) → 409 with the resource-specific message;
   *   the global filter's generic P2002 message remains the fallback for any
   *   other unique path.
   * - Optional fields omitted from the body are omitted from `data` so the
   *   schema defaults apply (`color` `#6366f1`, `credits` NULL,
   *   `description` NULL, `instructor` NULL, `isActive` `true`).
   * - Response: the extended `CourseWithSemester` shape (D111-4).
   */
  async create(userId: string, dto: CreateCourseDto) {
    const code = dto.code.trim();
    const name = dto.name.trim();
    // Optional fields: an explicit null is treated as omitted (the DTO's
    // `@IsOptional()` skips nulls, so normalize before validating/spreading).
    const description = dto.description ?? undefined;
    const credits = dto.credits ?? undefined;
    const color = dto.color ?? undefined;
    const instructor =
      dto.instructor !== undefined && dto.instructor !== null ? dto.instructor.trim() : undefined;

    const errors: Record<string, string[]> = {};
    if (code.length === 0 || code.length > 20) {
      errors.code = ['code must not be empty and must be 20 characters or fewer'];
    }
    if (name.length === 0 || name.length > 100) {
      errors.name = ['name must not be empty and must be 100 characters or fewer'];
    }
    if (credits !== undefined && (credits <= 0 || credits > 30)) {
      errors.credits = ['credits must be greater than 0 and at most 30'];
    }
    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      errors.color = ['color must be a #rrggbb hex color'];
    }
    if (description !== undefined && description.length > 2000) {
      errors.description = ['description must be 2000 characters or fewer'];
    }
    if (instructor !== undefined && (instructor.length === 0 || instructor.length > 100)) {
      errors.instructor = ['instructor must not be empty and must be 100 characters or fewer'];
    }
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: Object.values(errors).flat(),
        error: 'Bad Request',
        errors,
      });
    }

    // `semesterId` ownership: the predicate is scoped to the requesting
    // student, so "missing" and "another student's" are indistinguishable —
    // both throw the uniform 404 and no course row is written.
    let semesterId: string | null = null;
    if (dto.semesterId) {
      const semester = await this.prisma.semester.findFirst({
        where: { id: dto.semesterId, userId },
        select: { id: true },
      });
      if (!semester) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      semesterId = semester.id;
    }

    try {
      const course = await this.prisma.course.create({
        data: {
          userId,
          code,
          name,
          semesterId,
          // Optional fields: omitted (or an explicit null, normalized
          // above) → schema defaults (color #6366f1, credits NULL,
          // description NULL, instructor NULL, isActive true).
          ...(description !== undefined ? { description } : {}),
          ...(credits !== undefined ? { credits } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(instructor !== undefined ? { instructor } : {}),
        },
        include: SEMESTER_PROJECTION,
      });
      return this.toResponse(course);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A course with this code already exists.');
      }
      throw error;
    }
  }

  /**
   * List the requesting student's courses (SP-111A, contract):
   *
   * - Active courses by default; `includeArchived` adds the
   *   `isActive = false` rows (D111-3).
   * - `?semesterId=` filters to one semester — it must be the requesting
   *   student's own semester (missing or foreign → uniform 404 before the
   *   list query; no existence oracle).
   * - Ordered `name` asc, then `code` asc.
   * - Each row in the `CourseWithSemester` shape (D111-4).
   * - Another student's rows never appear — the `where` is the principal.
   */
  async list(userId: string, options: { semesterId?: string; includeArchived?: boolean } = {}) {
    // `semesterId` ownership: the predicate is scoped to the requesting
    // student, so "missing" and "another student's" are indistinguishable —
    // both throw the uniform 404 and nothing is returned.
    const semesterId = options.semesterId ?? null;
    if (semesterId) {
      const semester = await this.prisma.semester.findFirst({
        where: { id: semesterId, userId },
        select: { id: true },
      });
      if (!semester) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
    }

    const rows = await this.prisma.course.findMany({
      where: {
        userId,
        ...(semesterId ? { semesterId } : {}),
        ...(options.includeArchived ? {} : { isActive: true }),
      },
      include: SEMESTER_PROJECTION,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
    return rows.map((row) => this.toResponse(row));
  }

  /**
   * Read one of the student's courses (SP-111A) — **regardless of archive
   * state** (archived courses remain accessible, AC-E02-05 / D111-3) — plus
   * the SP-112A detail projections (D112-3): `meetings` (ordered `dayOfWeek`
   * asc, then `startTime` asc) and `assignments` (read-only, ordered
   * `dueDate` asc (PostgreSQL places null deadlines last) —
   * then `title` asc).  A missing id or another student's id → uniform 404
   * `Resource not found` (the ownership predicate is in the query; both
   * cases are indistinguishable to the caller — no existence oracle).  The
   * **list** route stays light (`CourseWithSemester` only, no nested
   * collections).
   */
  async get(userId: string, id: string) {
    const row = await this.prisma.course.findFirst({
      where: { id, userId },
      include: {
        semester: { select: { id: true, name: true } },
        meetings: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        assignments: { where: { userId }, orderBy: [{ dueDate: 'asc' }, { title: 'asc' }] },
      },
    });
    if (!row) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    return {
      ...this.toResponse(row),
      meetings: row.meetings.map((meeting) => toMeetingResponse(meeting)),
      assignments: row.assignments.map((assignment) => toAssignmentResponse(assignment)),
    };
  }

  /**
   * Partial-merge update (SP-111A): omitted fields keep the stored value;
   * validation runs on the **merged** (post-patch) values — the service
   * re-checks what the DTO declares (backend authoritative).
   *
   * - At least one field must be provided (empty body → 400); an explicit
   *   `null` is treated as omitted (the DTO's `@IsOptional()` skips nulls).
   * - Merged `code` non-empty after trim, ≤ 20 chars; merged `name`
   *   non-empty after trim, ≤ 100 chars; merged `credits` `0 < c ≤ 30`;
   *   merged `color` `#rrggbb`; merged `description` ≤ 2000 chars; merged
   *   `instructor` ≤ 100 chars — violations → 400 with a field-level
   *   `errors` map, nothing written.
   * - A `semesterId` that is missing or owned by another student → uniform
   *   404, **no write** (AC-E02-02, no existence oracle).
   * - A `code` colliding with a **different** course of the same student
   *   (Prisma P2002 on `@@unique([userId, code])`) → 409 with the
   *   resource-specific message.
   * - `isActive: false` archives, `isActive: true` restores (D111-2) — the
   *   same `PATCH`, no dedicated endpoint, no hard delete.
   * - Response: the updated `CourseWithSemester`.
   */
  async update(userId: string, id: string, dto: UpdateCourseDto) {
    const existing = await this.prisma.course.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // An explicit null is treated as omitted (the DTO's `@IsOptional()`
    // skips nulls) — normalize before merging.
    const has = (value: unknown): boolean => value !== undefined && value !== null;

    // At least one field (contract: "partial body; at least one field").
    if (
      !has(dto.code) &&
      !has(dto.name) &&
      !has(dto.description) &&
      !has(dto.credits) &&
      !has(dto.color) &&
      !has(dto.semesterId) &&
      !has(dto.instructor) &&
      !has(dto.isActive)
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    // `semesterId` ownership (AC-E02-02): when provided it must be the
    // requesting student's semester — a miss (missing or another student's)
    // throws the uniform 404 and nothing is written.
    if (has(dto.semesterId)) {
      const semester = await this.prisma.semester.findFirst({
        where: { id: dto.semesterId!, userId },
        select: { id: true },
      });
      if (!semester) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
    }

    // Merge the patch over the stored values, then validate the merged
    // values (a patch of one field is only legal against the stored row —
    // e.g. a whitespace-only `code` patch must 400, even though the stored
    // code was fine).
    const mergedCode = has(dto.code) ? dto.code!.trim() : existing.code;
    const mergedName = has(dto.name) ? dto.name!.trim() : existing.name;
    const mergedDescription = has(dto.description) ? dto.description! : existing.description;
    const mergedCredits = has(dto.credits) ? dto.credits! : existing.credits;
    const mergedColor = has(dto.color) ? dto.color! : existing.color;
    const mergedInstructor = has(dto.instructor) ? dto.instructor!.trim() : existing.instructor;

    const errors: Record<string, string[]> = {};
    if (mergedCode.length === 0 || mergedCode.length > 20) {
      errors.code = ['code must not be empty and must be 20 characters or fewer'];
    }
    if (mergedName.length === 0 || mergedName.length > 100) {
      errors.name = ['name must not be empty and must be 100 characters or fewer'];
    }
    if (mergedCredits !== null && (mergedCredits <= 0 || mergedCredits > 30)) {
      errors.credits = ['credits must be greater than 0 and at most 30'];
    }
    if (mergedColor !== null && !/^#[0-9a-fA-F]{6}$/.test(mergedColor)) {
      errors.color = ['color must be a #rrggbb hex color'];
    }
    if (mergedDescription !== null && mergedDescription.length > 2000) {
      errors.description = ['description must be 2000 characters or fewer'];
    }
    if (
      mergedInstructor !== null &&
      (mergedInstructor.length === 0 || mergedInstructor.length > 100)
    ) {
      errors.instructor = ['instructor must not be empty and must be 100 characters or fewer'];
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
    const data: {
      code?: string;
      name?: string;
      description?: string | null;
      credits?: number | null;
      color?: string;
      semesterId?: string | null;
      instructor?: string | null;
      isActive?: boolean;
    } = {};
    if (has(dto.code)) {
      data.code = mergedCode;
    }
    if (has(dto.name)) {
      data.name = mergedName;
    }
    if (has(dto.description)) {
      data.description = mergedDescription;
    }
    if (has(dto.credits)) {
      data.credits = mergedCredits!;
    }
    if (has(dto.color)) {
      data.color = mergedColor!;
    }
    if (has(dto.semesterId)) {
      data.semesterId = dto.semesterId!;
    }
    if (has(dto.instructor)) {
      data.instructor = mergedInstructor;
    }
    if (has(dto.isActive)) {
      data.isActive = dto.isActive!;
    }

    try {
      const updated = await this.prisma.course.update({
        where: { id, userId },
        data,
        include: SEMESTER_PROJECTION,
      });
      return this.toResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A course with this code already exists.');
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
   * Project a course row to the `CourseWithSemester` API shape (SP-111A,
   * D111-4): the SP-107B 8-key shape (backward-compatible — the onboarding
   * wizard ignores the extra keys) plus `instructor`, `semesterId`, and
   * `semester: { id, name } | null` (null when unaffiliated, D110-2).
   * Timestamps serialize as ISO strings.
   */
  private toResponse(course: CourseWithSemesterRow) {
    return {
      id: course.id,
      code: course.code,
      name: course.name,
      description: course.description,
      color: course.color,
      credits: course.credits,
      instructor: course.instructor,
      isActive: course.isActive,
      semesterId: course.semesterId,
      semester: course.semester ? { id: course.semester.id, name: course.semester.name } : null,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }
}
