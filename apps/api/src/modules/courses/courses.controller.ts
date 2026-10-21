import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Course endpoints (SP-107B `POST`; SP-111A full management surface).
 *
 * **Routes:** `POST /courses` (onboarding minimal, SP-107B — extended with
 * the optional `instructor`, D111-1), `GET /courses` (list + `semesterId` /
 * `includeArchived` filters), `GET /courses/:id` (archive-agnostic),
 * `PATCH /courses/:id` (partial merge incl. archive/restore, D111-2).  The
 * remaining EP02 extension of this module is meetings + detail projections
 * (SP-112) — no duplicate endpoints (D107-9).
 *
 * Every route is scoped to the authenticated student via `@CurrentUser()`;
 * `userId` is derived from the JWT principal and there is no id in the
 * request body (the global pipe forbids unknown fields).  Authentication is
 * enforced by the global JWT guard (APP_GUARD in AuthModule, SP-104) —
 * deliberately no class-level `@UseGuards`.
 *
 * `CreateCourseDto` / `UpdateCourseDto` are the `@Body()` metatypes so the
 * global `FieldValidationPipe` (D106-6) applies: `whitelist` +
 * `forbidNonWhitelisted` → unknown fields 400 with a field-level `errors`
 * map; `transform` + implicit conversion cast the body to the DTO.
 *
 * `:id` is a plain string on purpose (repo convention, `CreateCourseDto`
 * note): a malformed id is "missing" per the contract and 404s (uniform
 * `Resource not found`), never 400.
 */
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * POST /courses — create a course owned by the requesting student.
   *
   * 201 → the created course (`CourseWithSemester` shape, D111-4).
   * 400 → field-level validation errors; 404 → `semesterId` missing or
   * owned by another student (uniform `Resource not found`); 409 →
   * duplicate code for this student; 401 → unauthenticated (global guard).
   */
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(user.id, dto);
  }

  /**
   * GET /courses — list the student's courses (contract): active courses by
   * default, `?includeArchived=true` adds the `isActive = false` rows
   * (D111-3); `?semesterId=` filters to one semester — it must be the
   * student's own (missing or foreign → uniform 404).  Ordered `name` asc,
   * then `code` asc; each row `CourseWithSemester` (D111-4).
   * 401 → unauthenticated (global guard).
   */
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('semesterId') semesterId?: string,
    @Query('includeArchived') includeArchived?: string
  ) {
    return this.coursesService.list(user.id, {
      semesterId: semesterId || undefined,
      includeArchived: includeArchived === 'true',
    });
  }

  /**
   * GET /courses/:id — read one of the student's courses, **regardless of
   * archive state** (archived courses remain accessible, AC-E02-05).
   * 200 → `CourseWithSemester`; 404 → uniform `Resource not found` (missing
   * OR owned by another student — no existence oracle); 401 →
   * unauthenticated (global guard).
   */
  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.coursesService.get(user.id, id);
  }

  /**
   * PATCH /courses/:id — partial merge of `{ code?, name?, description?,
   * credits?, color?, semesterId?, instructor?, isActive? }` (at least one
   * field; validation on the merged values).  `isActive: false` archives,
   * `isActive: true` restores (D111-2) — no dedicated endpoints, no hard
   * delete.
   *
   * 200 → updated `CourseWithSemester`; 400 → field-level errors (or empty
   * body); 404 → uniform `Resource not found` (course missing/foreign, or
   * `semesterId` missing/foreign — no write); 409 → code collides with a
   * different course of the same student; 401 → unauthenticated (global
   * guard).
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto
  ) {
    return this.coursesService.update(user.id, id, dto);
  }
}
