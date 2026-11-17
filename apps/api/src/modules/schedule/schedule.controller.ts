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
  Put,
  Query,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PutDayBoundsDto } from './dto/put-day-bounds.dto';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Schedule endpoints (EP15B, D15-3 / D-B3): the student's day bounds and
 * schedule blocks — the write surface the EP15F/EP15G editors drive and
 * the EP15D read model consumes.
 *
 * Every route is scoped to the authenticated student via `@CurrentUser()`;
 * the global JWT guard (APP_GUARD in AuthModule) enforces authentication —
 * deliberately no class-level `@UseGuards`. The DTOs are the `@Body()`
 * metatypes so the global `FieldValidationPipe` applies (unknown fields →
 * field-level 400). `:id` and `:date` are plain strings on purpose: a
 * malformed id is "missing" and 404s uniformly; a malformed date is a 400
 * the service names.
 */
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /** GET /schedule/day-bounds — `{ configured, days[7] }`, defaults filled. */
  @Get('day-bounds')
  getDayBounds(@CurrentUser() user: AuthenticatedUser) {
    return this.scheduleService.getDayBounds(user.id);
  }

  /** PUT /schedule/day-bounds — replace all seven; 200 the stored set with `configured: true`. */
  @Put('day-bounds')
  putDayBounds(@CurrentUser() user: AuthenticatedUser, @Body() dto: PutDayBoundsDto) {
    return this.scheduleService.putDayBounds(user.id, dto);
  }

  /** GET /schedule/blocks — ordered `startDate`, `startTime`, `id`. */
  @Get('blocks')
  listBlocks(@CurrentUser() user: AuthenticatedUser) {
    return this.scheduleService.listBlocks(user.id);
  }

  /** POST /schedule/blocks — 201 the block; 400 field-level; 404 uniform (foreign course). */
  @Post('blocks')
  createBlock(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScheduleBlockDto) {
    return this.scheduleService.createBlock(user.id, dto);
  }

  /** PATCH /schedule/blocks/:id — in place or split (D-B2); 200 the row that holds the chosen date. */
  @Patch('blocks/:id')
  updateBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleBlockDto
  ) {
    return this.scheduleService.updateBlock(user.id, id, dto);
  }

  /** DELETE /schedule/blocks/:id?from=YYYY-MM-DD — delete, or end the series the day before `from`. */
  @Delete('blocks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('from') from?: unknown
  ) {
    await this.scheduleService.deleteBlock(user.id, id, from);
  }

  /** DELETE /schedule/blocks/:id/occurrences/:date — cancel one occurrence (idempotent). */
  @Delete('blocks/:id/occurrences/:date')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOccurrence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('date') date: string
  ) {
    await this.scheduleService.cancelOccurrence(user.id, id, date);
  }
}
