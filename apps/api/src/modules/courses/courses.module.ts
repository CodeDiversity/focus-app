import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

/**
 * Courses module (SP-107B, D107-6/D107-9).
 *
 * **Onboarding-minimal:** the only route is `POST /courses` (the
 * onboarding wizard's step 3).  EP02 extends this module with
 * list/get/update/delete, archiving, meetings, and views — it must not
 * create duplicate endpoints.
 */
@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
