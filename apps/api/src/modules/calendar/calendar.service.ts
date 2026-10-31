import { BadRequestException, Injectable } from '@nestjs/common';
import { validateSync } from 'class-validator';

import { addDays, dayOfWeekOf } from '../../common/lib/calendar-date';
import {
  resolveTimeZone,
  toCivilDate,
  wallClockToInstant,
  zoneParts,
} from '../../common/lib/civil-date';
import { PrismaService } from '../prisma/prisma.service';
import { ListCalendarEventsQueryDto } from './dto/list-calendar-events-query.dto';

interface CalendarEvent {
  id: string;
  type:
    | 'CLASS'
    | 'ASSIGNMENT_DEADLINE'
    | 'EXAM_DEADLINE'
    | 'STUDY_SESSION'
    | 'AVAILABILITY'
    | 'BLOCKED_TIME';
  title: string;
  subtitle: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  assignmentId: string | null;
  completed: boolean;
  focus: boolean;
  link: string | null;
}

export interface ListResult {
  timeZone: string;
  today: string;
  from: string;
  to: string;
  events: CalendarEvent[];
}

// Range instants for study session overlap. Thin wrappers over the shared
// wall-clock seam: midnight of `from`, and midnight of the day after `to`.
function rangeStartInstant(from: string, timeZone: string): Date {
  return wallClockToInstant(from, '00:00', timeZone);
}

function rangeEndInstant(to: string, timeZone: string): Date {
  return wallClockToInstant(addDays(to, 1), '00:00', timeZone);
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListCalendarEventsQueryDto): Promise<ListResult> {
    // Defense in depth: rerun DTO rules.
    const failures = validateSync(Object.assign(new ListCalendarEventsQueryDto(), query), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (failures.length) {
      const errors = Object.fromEntries(
        failures.map((f) => [f.property, Object.values(f.constraints ?? {})])
      );
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: Object.values(errors).flat(),
        errors,
      });
    }

    const from = query.from;
    const to = query.to;

    // Cross-field validation: order and 31-day cap.
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    const errors: Record<string, string[]> = {};
    if (fromDate.getTime() > toDate.getTime()) {
      errors.from = ['from must not be after to'];
      errors.to = ['from must not be after to'];
    }
    const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
    if (spanDays > 31) {
      errors.from = [...(errors.from ?? []), 'the inclusive range may not exceed 31 days'];
      errors.to = [...(errors.to ?? []), 'the inclusive range may not exceed 31 days'];
    }
    if (Object.keys(errors).length) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: Object.values(errors).flat(),
        errors,
      });
    }

    // Resolve zone from stored profile.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true },
    });
    const timeZone = resolveTimeZone(user?.timeZone);

    const today = toCivilDate(new Date(), timeZone);

    // Fetch data.
    const courses = await this.prisma.course.findMany({
      where: { userId, isActive: true },
      include: { meetings: true },
    });

    const assignments = await this.prisma.assignment.findMany({
      where: { userId },
      include: { course: { select: { id: true, name: true, code: true, color: true } } },
    });

    const rangeStart = rangeStartInstant(from, timeZone);
    const rangeEnd = rangeEndInstant(to, timeZone);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        startTime: { lt: rangeEnd },
        OR: [{ endTime: null }, { endTime: { gt: rangeStart } }],
      },
    });

    const slots = await this.prisma.availabilitySlot.findMany({
      where: { userId },
    });

    const events: CalendarEvent[] = [];

    // CLASS events from active courses' meetings.
    // iterate dates
    const dates: string[] = [];
    let cur = from;
    for (let i = 0; i < 32; i++) {
      dates.push(cur);
      if (cur === to) break;
      cur = addDays(cur, 1);
    }

    for (const date of dates) {
      const dow = dayOfWeekOf(date);
      for (const course of courses) {
        for (const meeting of course.meetings) {
          if (meeting.dayOfWeek !== dow) continue;
          events.push({
            id: `class:${meeting.id}:${date}`,
            type: 'CLASS',
            title: course.name,
            subtitle: course.code,
            date,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            courseId: course.id,
            courseName: course.name,
            courseColor: course.color,
            assignmentId: null,
            completed: false,
            focus: false,
            link: `/courses/${course.id}`,
          });
        }
      }
      // AVAILABILITY / BLOCKED_TIME from slots.
      for (const slot of slots) {
        if (slot.dayOfWeek !== dow) continue;
        events.push({
          id: `${slot.isAvailable ? 'availability' : 'blocked'}:${slot.id}:${date}`,
          type: slot.isAvailable ? 'AVAILABILITY' : 'BLOCKED_TIME',
          title: slot.isAvailable ? 'Available' : 'Blocked time',
          subtitle: null,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          courseId: null,
          courseName: null,
          courseColor: null,
          assignmentId: null,
          completed: false,
          focus: false,
          link: '/availability',
        });
      }
    }

    // ASSIGNMENT / EXAM deadlines.
    for (const a of assignments) {
      if (!a.dueDate) continue;
      const { date, time } = zoneParts(a.dueDate, timeZone);
      if (date < from || date > to) continue;
      const isExam = a.type === 'EXAM';
      events.push({
        id: `assignment:${a.id}`,
        type: isExam ? 'EXAM_DEADLINE' : 'ASSIGNMENT_DEADLINE',
        title: a.title,
        subtitle: a.course?.code ?? null,
        date,
        startTime: time,
        endTime: null,
        courseId: a.courseId,
        courseName: a.course?.name ?? null,
        courseColor: a.course?.color ?? null,
        assignmentId: a.id,
        completed: a.status === 'COMPLETED' || a.status === 'GRADED',
        focus: false,
        link: a.courseId ? `/courses/${a.courseId}` : '/assignments',
      });
    }

    // STUDY_SESSION.
    for (const s of sessions) {
      const start = zoneParts(s.startTime, timeZone);
      // include if start date within range (already filtered by overlap, but ensure date in range)
      if (start.date < from || start.date > to) {
        // Skip out-of-range start (incl. open sessions whose start is outside the range).
        continue;
      }
      // Null endTime (open session) is emitted with endTime: null (D07-8).
      const end = s.endTime ? zoneParts(s.endTime, timeZone) : null;
      events.push({
        id: `session:${s.id}`,
        type: 'STUDY_SESSION',
        title: s.notes ? s.notes : 'Study session',
        subtitle: null,
        date: start.date,
        startTime: start.time,
        endTime: end ? end.time : null,
        courseId: null,
        courseName: null,
        courseColor: null,
        assignmentId: null,
        completed: false,
        focus: s.isFocusMode,
        link: null,
      });
    }

    // Sort: date asc, startTime asc, type, id.
    events.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
      if (a.type !== b.type) return a.type < b.type ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });

    return {
      timeZone,
      today,
      from,
      to,
      events,
    };
  }
}
