import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CoursesMeetingsService } from './courses-meetings.service';

/**
 * Courses module (SP-107B, D107-6/D107-9).
 *
 * The **full course surface** (SP-112A): `POST /courses` (onboarding
 * minimal), list/get/`PATCH` management (SP-111A), the nested meetings
 * routes, and the `GET /courses/:id` detail projections (meetings +
 * read-only assignments, D112-3).  EP02's remaining extension of this
 * module is only EP03's assignment management — it must not create
 * duplicate endpoints.
 */
@Module({
  controllers: [CoursesController],
  providers: [CoursesService, CoursesMeetingsService],
  exports: [CoursesService],
})
export class CoursesModule {}
