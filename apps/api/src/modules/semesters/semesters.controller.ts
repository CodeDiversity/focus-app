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
} from '@nestjs/common';
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Semester endpoints (SP-107B `POST`; SP-110A full management surface).
 *
 * **Routes:** `POST /semesters` (onboarding minimal, SP-107B — unchanged),
 * `GET /semesters` (list + `courseCount`), `GET /semesters/:id`,
 * `PATCH /semesters/:id` (partial merge incl. single-active activation,
 * D110-1/D110-5), `DELETE /semesters/:id` (orphaned courses, D110-2).
 * EP02's remaining extension of the academic-structure modules is
 * course-side only (D107-9 — no duplicate endpoints).
 *
 * Every route is scoped to the authenticated student via `@CurrentUser()`;
 * `userId` is derived from the JWT principal and never from the request
 * body or params (the global pipe forbids unknown fields).  Authentication
 * is enforced by the global JWT guard (APP_GUARD in AuthModule, SP-104) —
 * deliberately no class-level `@UseGuards`.
 *
 * `CreateSemesterDto` / `UpdateSemesterDto` are the `@Body()` metatypes so
 * the global `FieldValidationPipe` (D106-6) applies: `whitelist` +
 * `forbidNonWhitelisted` → unknown fields 400 with a field-level `errors`
 * map; `transform` + implicit conversion cast the body to the DTO.
 *
 * `:id` is a plain string on purpose (repo convention, `CreateCourseDto`
 * note): a malformed id is "missing" per the contract and 404s (uniform
 * `Resource not found`), never 400.
 */
@Controller('semesters')
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  /**
   * POST /semesters — create a semester owned by the requesting student.
   *
   * 201 → `{ id, name, startDate, endDate, isActive, createdAt,
   * updatedAt }` (dates serialized `yyyy-MM-dd`).
   * 400 → field-level validation errors; 409 → duplicate name for this
   * student; 401 → unauthenticated (global guard).
   */
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSemesterDto) {
    return this.semestersService.create(user.id, dto);
  }

  /**
   * GET /semesters — list the student's semesters (contract): ordered
   * `startDate` desc, then `name` asc; each row `SemesterWithCount`
   * (dates `yyyy-MM-dd`, `courseCount` = attached courses, D110-3).
   * 401 → unauthenticated (global guard).
   */
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.semestersService.list(user.id);
  }

  /**
   * GET /semesters/:id — read one of the student's semesters.
   * 200 → `SemesterWithCount`; 404 → uniform `Resource not found` (missing
   * OR owned by another student — no existence oracle); 401 →
   * unauthenticated (global guard).
   */
  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.semestersService.get(user.id, id);
  }

  /**
   * PATCH /semesters/:id — partial merge of `{ name?, startDate?,
   * endDate?, isActive? }` (at least one field; validation on the merged
   * values, D110-5).  `isActive: true` activates the target and deactivates
   * the student's other semesters in one transaction (D110-1);
   * `isActive: false` deactivates only the target.
   *
   * 200 → updated `SemesterWithCount`; 400 → field-level errors (or empty
   * body); 404 → uniform `Resource not found` (missing or foreign); 409 →
   * name collides with a different semester of the same student; 401 →
   * unauthenticated (global guard).
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSemesterDto
  ) {
    return this.semestersService.update(user.id, id, dto);
  }

  /**
   * DELETE /semesters/:id — delete the semester; its courses are explicitly
   * orphaned (`semesterId: null`) in the same transaction (D110-2) — course
   * rows survive, unaffiliated.
   *
   * 204 → deleted (no body); 404 → uniform `Resource not found` (missing or
   * foreign — no writes); 401 → unauthenticated (global guard).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.semestersService.delete(user.id, id);
    // Void handler + explicit 204: Nest 10 defaults a void DELETE to 200.
  }
}
