import { Body, Controller, Post } from '@nestjs/common';
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Semester endpoints (SP-107B, D107-5).
 *
 * **Onboarding-minimal: `POST /semesters` only.**  EP02 extends this module
 * with list/get/update/delete, activation, and views — it must not create
 * duplicate endpoints (D107-9).
 *
 * The route is scoped to the authenticated user via `@CurrentUser()`;
 * `userId` is derived from the JWT principal and there is no id in the
 * request.  Authentication is enforced by the global JWT guard (APP_GUARD
 * in AuthModule, SP-104) — deliberately no class-level `@UseGuards`.
 *
 * `CreateSemesterDto` is the `@Body()` metatype so the global
 * `FieldValidationPipe` (D106-6) applies to it: `whitelist` +
 * `forbidNonWhitelisted` → unknown fields 400 with a field-level `errors`
 * map; `transform` + implicit conversion cast the body to the DTO.
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
}
