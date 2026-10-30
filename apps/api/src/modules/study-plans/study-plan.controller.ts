import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';

import { StudyPlansService } from './study-plans.service';
import { SaveStudyPlanDto } from './dto/save-study-plan.dto';
import { ListStudyPlansQueryDto } from './dto/list-study-plans-query.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * The `/study-plans` half of the study-planning surface (EP06B, D06-2):
 * `GET /study-plans/remaining-work`.
 *
 * The sibling `study-plans.controller.ts` owns the `/study-preferences`
 * half (EP06A) — the preferences are a **top-level** domain surface, while
 * the plan routes are the study-planning ones. EP06D adds the plan preview,
 * save and read to this controller.
 *
 * Every route is scoped to the authenticated student via `@CurrentUser()`;
 * there is no id in the path and no id in the body, so the read is the
 * principal's own by construction. Authentication is enforced by the global
 * JWT guard (APP_GUARD in AuthModule) — deliberately no class-level
 * `@UseGuards`.
 */
@Controller('study-plans')
export class StudyPlanController {
  constructor(private readonly studyPlansService: StudyPlansService) {}

  /**
   * GET /study-plans/remaining-work — every **unfinished** assignment with
   * its estimate, its confirmed study time and what is left of it, plus the
   * reason an assignment was flagged instead of scheduled. The items are
   * ordered by the shared comparator, so the list and the plan always agree
   * about which work is "next".
   * 200 → `{ items, unattributedConfirmedMinutes }`; 401 → unauthenticated
   * (global guard).
   */
  @Get('remaining-work')
  getRemainingWork(@CurrentUser() user: AuthenticatedUser) {
    return this.studyPlansService.getRemainingWork(user.id);
  }

  /**
   * POST /study-plans/preview — run the engine over the student's data and
   * return the proposal. Writes nothing.
   */
  @Post('preview')
  @HttpCode(200)
  preview(@CurrentUser() user: AuthenticatedUser) {
    return this.studyPlansService.preview(user.id);
  }

  /**
   * POST /study-plans — save the edited proposal (atomic, conflict re-check).
   */
  @Post()
  save(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveStudyPlanDto) {
    return this.studyPlansService.save(user.id, dto);
  }

  /**
   * GET /study-plans — the saved plan for a range (or the most recent saved
   * window when no range is given).
   */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListStudyPlansQueryDto) {
    return this.studyPlansService.getPlan(user.id, query.from, query.to);
  }
}
