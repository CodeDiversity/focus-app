import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { StudySessionsService } from './study-sessions.service';
import { StartStudySessionDto } from './dto/start-study-session.dto';
import { FinishStudySessionDto } from './dto/finish-study-session.dto';
import { ListStudySessionsQueryDto } from './dto/list-study-sessions-query.dto';
import { AuthenticatedUser } from '../../common/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('study-sessions')
export class StudySessionsController {
  constructor(private readonly studySessionsService: StudySessionsService) {}

  @Post()
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartStudySessionDto) {
    return this.studySessionsService.start(user.id, dto);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studySessionsService.pause(user.id, id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studySessionsService.resume(user.id, id);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: FinishStudySessionDto
  ) {
    return this.studySessionsService.finish(user.id, id, dto);
  }

  @Get('current')
  current(@CurrentUser() user: AuthenticatedUser) {
    return this.studySessionsService.current(user.id);
  }

  @Get('confirmed-time')
  confirmedTime(
    @CurrentUser() user: AuthenticatedUser,
    @Query('assignmentId') assignmentId?: string
  ) {
    return this.studySessionsService.confirmedTime(user.id, assignmentId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListStudySessionsQueryDto) {
    return this.studySessionsService.list(user.id, query);
  }
}
