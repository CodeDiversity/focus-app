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
import { AvailabilityService } from './availability.service';
import { CreateAvailabilitySlotDto } from './dto/create-availability-slot.dto';
import { UpdateAvailabilitySlotDto } from './dto/update-availability-slot.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Availability-slot endpoints (SP-128A, D404-11) — the recurring weekly
 * availability + blocked-time management surface: `GET /availability-slots`,
 * `POST /availability-slots`, `PATCH /availability-slots/:id`,
 * `DELETE /availability-slots/:id`, over the existing `AvailabilitySlot`
 * model (D404-5 — no migration; no bulk operations in the contract).
 *
 * Every route is scoped to the authenticated student via `@CurrentUser()`;
 * `userId` is derived from the JWT principal and there is no id in the
 * request body (the global pipe forbids unknown fields). Authentication is
 * enforced by the global JWT guard (APP_GUARD in AuthModule, SP-104) —
 * deliberately no class-level `@UseGuards`.
 *
 * `CreateAvailabilitySlotDto` / `UpdateAvailabilitySlotDto` are the
 * `@Body()` metatypes so the global `FieldValidationPipe` (D106-6) applies:
 * `whitelist` + `forbidNonWhitelisted` → unknown fields 400 with a
 * field-level `errors` map.
 *
 * `:id` is a plain string on purpose (repo convention): a malformed id is
 * "missing" per the contract and 404s (uniform `Resource not found`),
 * never 400.
 */
@Controller('availability-slots')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * GET /availability-slots — the student's slots ordered `dayOfWeek` asc,
   * then `startTime` asc.  `isAvailable: true` rows are free study windows;
   * `false` rows are recurring blocked times.
   * 200 → `[ AvailabilitySlot ]`; 401 → unauthenticated (global guard).
   */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.list(user.id);
  }

  /**
   * POST /availability-slots — create a slot for the requesting student.
   * Body: `{ dayOfWeek: 0-6, startTime: "HH:mm", endTime: "HH:mm",
   * isAvailable?: boolean }`; `isAvailable` omitted → `true` (an
   * availability window), `false` records a recurring blocked time.
   * 201 → the created `AvailabilitySlot`; 400 → field-level errors
   * (dayOfWeek 0–6; `HH:mm` format + hour/minute bounds; `endTime` strictly
   * after `startTime` — no midnight wrap); 409 → the same
   * `dayOfWeek` + `startTime` slot already exists for this student;
   * 401 → unauthenticated (global guard).
   */
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAvailabilitySlotDto) {
    return this.availabilityService.create(user.id, dto);
  }

  /**
   * PATCH /availability-slots/:id — partial merge of
   * `{ dayOfWeek?, startTime?, endTime?, isAvailable? }` (at least one
   * field; unknown fields → 400; validation on the merged values).
   * 200 → the updated `AvailabilitySlot`; 400 → field-level errors or
   * empty body; 404 → uniform `Resource not found` (missing, another
   * student's, or malformed id — no existence oracle); 409 → a duplicate
   * `(userId, dayOfWeek, startTime)` after the merge; 401 →
   * unauthenticated (global guard).
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilitySlotDto
  ) {
    return this.availabilityService.update(user.id, id, dto);
  }

  /**
   * DELETE /availability-slots/:id — remove the slot.
   * 204 → deleted; 404 → uniform `Resource not found` (a repeated delete
   * included); 401 → unauthenticated (global guard).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.availabilityService.delete(user.id, id);
  }
}
