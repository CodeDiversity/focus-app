import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesMeetingsService } from './courses-meetings.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateClassMeetingDto } from './dto/create-class-meeting.dto';
import { UpdateClassMeetingDto } from './dto/update-class-meeting.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Course endpoints (SP-107B `POST`; SP-111A full management surface;
 * SP-112A meetings + detail projections) — the full course surface.
 *
 * **Routes:** `POST /courses` (onboarding minimal, SP-107B — extended with
 * the optional `instructor`, D111-1), `GET /courses` (list + `semesterId` /
 * `includeArchived` filters), `GET /courses/:id` (archive-agnostic, plus the
 * SP-112A `meetings` + read-only `assignments` projections, D112-3),
 * `PATCH /courses/:id` (partial merge incl. archive/restore, D111-2), and
 * the nested meeting routes `GET/POST /courses/:id/meetings`,
 * `PATCH/DELETE /courses/:id/meetings/:meetingId` (SP-112A, D112-2).  EP02's
 * remaining extension of this module is only EP03's assignment management —
 * no duplicate endpoints (D107-9).
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
  constructor(
    private readonly coursesService: CoursesService,
    private readonly meetingsService: CoursesMeetingsService
  ) {}

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
   * archive state** (archived courses remain accessible, AC-E02-05), plus
   * the SP-112A detail projections (D112-3): `meetings` (ordered
   * `dayOfWeek` asc, `startTime` asc) and `assignments` (read-only, ordered
   * `dueDate` asc, then `title` asc — empty until EP03 builds management).
   * 200 → `CourseWithSemester` + `meetings` + `assignments`; 404 → uniform
   * `Resource not found` (missing OR owned by another student — no
   * existence oracle); 401 → unauthenticated (global guard).
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

  // ==================== Class meetings (SP-112A, D112-2) ====================
  //
  // Nested under the course routes — the course is the navigation and
  // ownership unit.  Every route checks the course's ownership first, then
  // scopes the meeting queries to `courseId` + the principal's `userId`
  // (repo ownership convention); a miss → uniform 404.  `:id`/`:meetingId`
  // are plain strings on purpose (repo convention): a malformed id is
  // "missing" per the contract and 404s (uniform `Resource not found`),
  // never 400.

  /**
   * GET /courses/:id/meetings — the student's meetings for the student's own
   * course, ordered `dayOfWeek` asc then `startTime` asc.
   * 200 → `[ ClassMeeting ]`; 404 → uniform (course missing/foreign);
   * 401 → unauthenticated (global guard).
   */
  @Get(':id/meetings')
  async listMeetings(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.meetingsService.list(user.id, id);
  }

  /**
   * POST /courses/:id/meetings — create a recurring meeting on the student's
   * own course.  Body: `{ dayOfWeek: 0-6, startTime: "HH:mm",
   * endTime: "HH:mm" }`.
   * 201 → the created `ClassMeeting`; 400 → field-level errors (dayOfWeek
   * 0–6; `HH:mm` with hour 00–23 / minute 00–59; `endTime` strictly after
   * `startTime` — no midnight wrap); 404 → uniform (course missing/foreign);
   * 409 → the same `dayOfWeek` + `startTime` slot already exists for this
   * course; 401 → unauthenticated (global guard).
   */
  @Post(':id/meetings')
  async createMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateClassMeetingDto
  ) {
    return this.meetingsService.create(user.id, id, dto);
  }

  /**
   * PATCH /courses/:id/meetings/:meetingId — partial merge of
   * `{ dayOfWeek?, startTime?, endTime? }` (at least one field; unknown
   * fields → 400).  The meeting must belong to **both** the `:id` course
   * and the requesting student — a miss (missing, another student's, or a
   * meeting of a different course) → uniform 404, no write; merged-value
   * violations → 400; same-slot collision → 409.  200 → the updated
   * `ClassMeeting`; 401 → unauthenticated (global guard).
   */
  @Patch(':id/meetings/:meetingId')
  async updateMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateClassMeetingDto
  ) {
    return this.meetingsService.update(user.id, id, meetingId, dto);
  }

  /**
   * DELETE /courses/:id/meetings/:meetingId — remove the meeting (the
   * dual-ownership condition of PATCH).  204 → deleted; 404 → uniform;
   * 401 → unauthenticated (global guard).
   */
  @Delete(':id/meetings/:meetingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('meetingId') meetingId: string
  ) {
    await this.meetingsService.delete(user.id, id, meetingId);
  }
}
