import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';

import { StudyPlansService } from './study-plans.service';
import { SaveStudyPlanDto } from './dto/save-study-plan.dto';
import { SetSessionLockDto } from './dto/set-session-lock.dto';
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
   * GET /study-plans/recovery-summary — the student's recovery summary
   * (EP08A): missed planned sessions, unfinished work (EP06 classification
   * and ordering) and the total confirmed study time, plus a neutral message.
   * 200 → `RecoverySummary`; 404 → the uniform `Resource not found`; 401 →
   * unauthenticated (global guard).
   */
  @Get('recovery-summary')
  getRecoverySummary(@CurrentUser() user: AuthenticatedUser) {
    return this.studyPlansService.getRecoverySummary(user.id);
  }

  /**
   * GET /study-plans/today (EP13C) — today's reconciled sessions with live
   * statuses, the single recommended next session (or null with a stated
   * reason) and the minutes already confirmed inside today's profile-zone
   * day. Reading it rolls unstarted past sessions forward first, so the
   * answer is always a valid current view.
   * 200 → `TodayPlan`; 404 → the uniform `Resource not found`; 401 →
   * unauthenticated (global guard).
   */
  @Get('today')
  getToday(@CurrentUser() user: AuthenticatedUser) {
    return this.studyPlansService.getToday(user.id);
  }

  /**
   * POST /study-plans/preview — run the engine over the student's data and
   * return the proposal. Writes nothing beyond the idempotent EP13C
   * reconciliation; the proposal itself persists nothing.
   */
  @Post('preview')
  @HttpCode(200)
  preview(@CurrentUser() user: AuthenticatedUser) {
    return this.studyPlansService.preview(user.id);
  }

  /**
   * POST /study-plans/catch-up/preview — run the rescheduler over the
   * student's current data and return a side-effect-free CatchUpPreview.
   */
  @Post('catch-up/preview')
  @HttpCode(200)
  catchUpPreview(@CurrentUser() user: AuthenticatedUser) {
    return this.studyPlansService.catchUpPreview(user.id);
  }

  /**
   * POST /study-plans/catch-up/confirm — persist the accepted change set
   * transactionally (conflict re-check, locked/completed preservation).
   */
  @Post('catch-up/confirm')
  catchUpConfirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveStudyPlanDto) {
    return this.studyPlansService.catchUpConfirm(user.id, dto);
  }

  /**
   * PATCH /study-plans/sessions/:sessionId/lock — the student's explicit
   * lock toggle for one planned session (EP08E, D08-4). Sets only `locked`;
   * status-agnostic on purpose (the scheduling effect lives in confirm,
   * which preserves locked rows). `:sessionId` is the `PlannedSession.id` —
   * the only planned-session id the client ever sees.
   * 200 → exactly `{ id, locked }`; 400 field errors on the body; 404 →
   * the uniform `Resource not found` (missing or foreign, never 403);
   * 401 → unauthenticated (global guard).
   */
  @Patch('sessions/:sessionId/lock')
  @HttpCode(200)
  setSessionLock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SetSessionLockDto
  ) {
    return this.studyPlansService.setSessionLock(user.id, sessionId, dto);
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
