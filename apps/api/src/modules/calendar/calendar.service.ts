import { BadRequestException, Injectable } from '@nestjs/common';
import { validateSync } from 'class-validator';

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

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zoneDateParts(date: Date, timeZone: string): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const y = get('year');
  const m = get('month');
  const d = get('day');
  let h = get('hour');
  if (h === '24') h = '00';
  const min = get('minute');
  return { date: `${y}-${m}-${d}`, time: `${h}:${min}` };
}

function formatToday(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayOfWeekOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
}

// Range instants for study session overlap:
function rangeStartInstant(from: string, timeZone: string): Date {
  // midnight of `from` in zone -> instant
  const [y, m, d] = from.split('-').map(Number);
  // Use Intl to find offset
  return wallToInstant(y, m, d, 0, 0, timeZone);
}

function rangeEndInstant(to: string, timeZone: string): Date {
  const [y, m, d] = to.split('-').map(Number);
  // end of day = next day midnight
  const next = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const ny = next.getUTCFullYear();
  const nm = next.getUTCMonth() + 1;
  const nd = next.getUTCDate();
  return wallToInstant(ny, nm, nd, 0, 0, timeZone);
}

function wallToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Iterative: guess UTC, compute offset, adjust.
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const offsetMs = tzOffsetMs(new Date(guess), timeZone);
    const corrected = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMs;
    if (corrected === guess) break;
    guess = corrected;
  }
  return new Date(guess);
}

function tzOffsetMs(date: Date, timeZone: string): number {
  // Returns offset in ms: local = UTC + offset => offset = local - UTC.
  // Use formatToParts with timeZoneName? Instead compute via difference.
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return tzDate.getTime() - utcDate.getTime();
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
    const timeZone = user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : 'UTC';

    const today = formatToday(timeZone);

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
      const { date, time } = zoneDateParts(a.dueDate, timeZone);
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
      const start = zoneDateParts(s.startTime, timeZone);
      // include if start date within range (already filtered by overlap, but ensure date in range)
      if (start.date < from || start.date > to) {
        // Skip out-of-range start (incl. open sessions whose start is outside the range).
        continue;
      }
      // Null endTime (open session) is emitted with endTime: null (D07-8).
      const end = s.endTime ? zoneDateParts(s.endTime, timeZone) : null;
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
