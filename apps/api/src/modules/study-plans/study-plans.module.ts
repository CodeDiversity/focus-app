import { Module } from '@nestjs/common';
import { StudyPlansController } from './study-plans.controller';
import { StudyPlansService } from './study-plans.service';

/**
 * Study-plans module (EP06A) — the study-planning surface.
 *
 * EP06A ships the **preferences half** of it: `GET /study-preferences` and
 * `PUT /study-preferences` over the `studyDefaults` object in
 * `User.preferences` (D06-4). EP06B adds the remaining-work read and
 * EP06D the plan preview/save API to this same module.
 */
@Module({
  controllers: [StudyPlansController],
  providers: [StudyPlansService],
  exports: [StudyPlansService],
})
export class StudyPlansModule {}
