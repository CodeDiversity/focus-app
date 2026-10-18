import { Body, Controller, Get, Patch } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Onboarding state endpoints (SP-107A).
 *
 * Every route is scoped to the authenticated user via `@CurrentUser()`;
 * there is no id parameter or cross-student access.  Authentication is
 * enforced by the global JWT guard (APP_GUARD in AuthModule, SP-104).
 */
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * GET /onboarding — return the current onboarding state.
   */
  @Get()
  async getState(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getState(user.id);
  }

  /**
   * PATCH /onboarding — update onboarding state.
   *
   * `UpdateOnboardingDto` is the `@Body()` metatype so the global
   * `FieldValidationPipe` (D106-6) applies to it: `whitelist` +
   * `forbidNonWhitelisted` → unknown fields 400 with a field-level
   * `errors` map; `transform` + implicit conversion cast the body to the
   * DTO.  (A `Record<string, unknown>` metatype would leave the pipe a
   * no-op and silently accept unknown fields.)
   */
  @Patch()
  async update(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateOnboardingDto) {
    return this.onboardingService.update(user.id, body);
  }
}
