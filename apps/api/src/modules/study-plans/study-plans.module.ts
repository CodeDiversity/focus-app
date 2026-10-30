import { Module } from '@nestjs/common';
import { StudyPlanController } from './study-plan.controller';
import { StudyPlansController } from './study-plans.controller';
import { StudyPlansService } from './study-plans.service';

/**
 * Study-plans module (EP06A + EP06B) — the study-planning surface.
 *
 * EP06A ships the **preferences half**: `GET /study-preferences` and
 * `PUT /study-preferences` over the `studyDefaults` object in
 * `User.preferences` (D06-4). EP06B adds the **remaining-work half**:
 * `GET /study-plans/remaining-work`. EP06D adds the plan preview/save/read
 * API to this same module.
 */
@Module({
  controllers: [StudyPlansController, StudyPlanController],
  providers: [StudyPlansService],
  exports: [StudyPlansService],
})
export class StudyPlansModule {}
