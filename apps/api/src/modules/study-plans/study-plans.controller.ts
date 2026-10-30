import { Body, Controller, Get, Put } from '@nestjs/common';

import { StudyPlansService } from './study-plans.service';
import { UpdateStudyPreferencesDto } from './dto/update-study-preferences.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Study-preferences endpoints (EP06A, D06-4) — the study-planning surface's
 * preferences half: `GET /study-preferences` and `PUT /study-preferences`.
 *
 * The paths are **top-level** (the `availability` module's
 * `/availability-slots` precedent), not nested under `/users`: the study
 * defaults are a domain surface, while the generic profile bag stays a
 * profile concern (and is deliberately left open — D06-14).
 *
 * Every route is scoped to the authenticated student via `@CurrentUser()`;
 * `userId` is derived from the JWT principal and there is no id in the
 * request body (the global pipe forbids unknown fields). Authentication is
 * enforced by the global JWT guard (APP_GUARD in AuthModule) — deliberately
 * no class-level `@UseGuards`.
 *
 * `UpdateStudyPreferencesDto` is the `@Body()` metatype so the global
 * `FieldValidationPipe` applies: `whitelist` + `forbidNonWhitelisted` →
 * unknown fields 400 with a field-level `errors` map.
 */
@Controller('study-preferences')
export class StudyPlansController {
  constructor(private readonly studyPlansService: StudyPlansService) {}

  /**
   * GET /study-preferences — the student's effective study defaults
   * (`sessionLengthMinutes`, `minSessionMinutes`, `maxSessionMinutes`,
   * `dailyCapMinutes`); the stored values with the defaults filled in for
   * any missing or invalid field, then the documented repair order.
   * 200 → the four keys; 401 → unauthenticated (global guard).
   */
  @Get()
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.studyPlansService.getPreferences(user.id);
  }

  /**
   * PUT /study-preferences — a **merge**: any subset of the four keys is
   * applied on top of the current effective values, the merged result is
   * validated, and the complete four-key object is written into
   * `preferences.studyDefaults` (the bag's other keys survive unchanged).
   * 200 → the effective values; 400 → a field-level `errors` map and nothing
   * written; 401 → unauthenticated (global guard).
   */
  @Put()
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStudyPreferencesDto
  ) {
    return this.studyPlansService.updatePreferences(user.id, dto);
  }
}
