import { Body, Controller, Post } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Course endpoints (SP-107B, D107-6).
 *
 * **Onboarding-minimal: `POST /courses` only.**  EP02 extends this module
 * with list/get/update/delete, archiving, meetings, and views — it must not
 * create duplicate endpoints (D107-9).
 *
 * The route is scoped to the authenticated user via `@CurrentUser()`;
 * `userId` is derived from the JWT principal and there is no id in the
 * request.  Authentication is enforced by the global JWT guard (APP_GUARD
 * in AuthModule, SP-104) — deliberately no class-level `@UseGuards`.
 *
 * `CreateCourseDto` is the `@Body()` metatype so the global
 * `FieldValidationPipe` (D106-6) applies to it: `whitelist` +
 * `forbidNonWhitelisted` → unknown fields 400 with a field-level `errors`
 * map; `transform` + implicit conversion cast the body to the DTO.
 */
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * POST /courses — create a course owned by the requesting student.
   *
   * 201 → the created course (the frontend `Course` type shape).
   * 400 → field-level validation errors; 404 → `semesterId` missing or
   * owned by another student (uniform `Resource not found`); 409 →
   * duplicate code for this student; 401 → unauthenticated (global guard).
   */
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(user.id, dto);
  }
}
