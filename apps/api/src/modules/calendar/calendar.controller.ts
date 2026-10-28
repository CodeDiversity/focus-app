import { Controller, Get, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { ListCalendarEventsQueryDto } from './dto/list-calendar-events-query.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async events(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCalendarEventsQueryDto) {
    return this.calendarService.list(user.id, query);
  }
}
