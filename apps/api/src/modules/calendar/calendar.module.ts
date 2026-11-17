import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  // EP15D: the calendar reads bounds, blocks, classes and busy time through the shared seam.
  imports: [ScheduleModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
