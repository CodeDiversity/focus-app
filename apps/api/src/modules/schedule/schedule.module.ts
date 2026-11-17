import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

/**
 * Schedule module (EP15B, D15-3 / D-B3): one owner for the `/schedule/*`
 * surface — day bounds and schedule blocks over the EP15A tables. The
 * calendar read model and the planner (EP15D) consume the stored rows
 * through the shared gathering seam; the EP15F/EP15G editors consume these
 * routes. `/availability-slots` stays untouched until EP15I retires it.
 */
@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
