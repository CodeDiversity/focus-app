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

/**
 * Course service (SP-107B, D107-6).
 *
 * This module is the **onboarding-minimal** create endpoint: `POST
 * /courses` only.  **EP02 extends this module** with list/get/update/
 * delete, archiving, meetings, and views — it must not create duplicate
 * endpoints (D107-9).
 *
 * Every operation is scoped to the requesting student via the JWT principal
 * (SP-104): `userId` comes from the authenticated user, never from the
 * request body (the global pipe forbids unknown fields).  The unique
 * constraint `@@unique([userId, code])` is per student, so the same code is
 * reusable across students but 409s within one.
 *
 * `semesterId` ownership (repo convention, `common/ownership/ownership.ts`):
 * when provided it must reference a semester that exists **and belongs to
 * the requesting student** — the ownership predicate is in the query
 * (`findFirst({ where: { id, userId } })`); a miss (missing or another
 * student's id) throws the uniform 404 `Resource not found` and no course
 * row is written (no existence oracle).  Omitted → `semesterId: null`.
 */
@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a course owned by the requesting student.
   *
   * - `code`/`name` are trimmed; non-empty, ≤ 20 / ≤ 100 chars (AC-107-07).
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
   *   `description` NULL, `isActive` `true`).
   */
  async create(userId: string, dto: CreateCourseDto) {
    const code = dto.code.trim();
    const name = dto.name.trim();
    // Optional fields: an explicit null is treated as omitted (the DTO's
    // `@IsOptional()` skips nulls, so normalize before validating/spreading).
    const description = dto.description ?? undefined;
    const credits = dto.credits ?? undefined;
    const color = dto.color ?? undefined;

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
          // description NULL, isActive true).
          ...(description !== undefined ? { description } : {}),
          ...(credits !== undefined ? { credits } : {}),
          ...(color !== undefined ? { color } : {}),
        },
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
   * Project a course row to the API shape.  Matches the frontend `Course`
   * type exactly (the contract's fixed shape): `semesterId` is deliberately
   * not part of it — the wizard keeps the created semester's id in the
   * onboarding state (D107-8); EP02 may extend the shape when it adds
   * read routes.
   */
  private toResponse(course: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    color: string;
    credits: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: course.id,
      code: course.code,
      name: course.name,
      description: course.description,
      color: course.color,
      credits: course.credits,
      isActive: course.isActive,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }
}
