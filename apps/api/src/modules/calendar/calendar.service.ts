import { BadRequestException, Injectable } from '@nestjs/common';
import { validateSync } from 'class-validator';

import { addDays, dayOfWeekOf } from '../../common/lib/calendar-date';
import { toCivilDate, wallClockToInstant, zoneParts } from '../../common/lib/civil-date';
import { dayBoundsFor, minutesToTime, timeToMinutes } from '../../domain/schedule/recurrence';
import { freeIntervals } from '../../domain/study-planning/intervals';
import type { DatedInterval } from '../../domain/study-planning/types';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleInputsService } from '../schedule/schedule-inputs.service';
import { ListCalendarEventsQueryDto } from './dto/list-calendar-events-query.dto';

/**
 * EP15D (D15-3): `AVAILABILITY` and `BLOCKED_TIME` are gone; `EVENT` (a
 * BUSY block occurrence) and `STUDY_BLOCK` (a STUDY block occurrence) take
 * their place, and the payload gains `days[]` with the day's bounds and
 * free time (contracts.md → *Calendar read model*).
 */
export type CalendarEventType =
  | 'CLASS'
  | 'ASSIGNMENT_DEADLINE'
  | 'EXAM_DEADLINE'
  | 'STUDY_SESSION'
  | 'PLANNED_SESSION'
  | 'EVENT'
  | 'STUDY_BLOCK';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
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
  /**
   * EP13H — the planned session's clock relation (EP13G): `FLEX_DAY` is a
   * day-anchored intention whose times are a *suggestion* (the client
   * renders "Anytime" and the day sorts it first); `FIXED` keeps the clock.
   * `null` for every non-planned event type.
   */
  anchor: 'FIXED' | 'FLEX_DAY' | null;
  /** EP15D — the schedule block behind an `EVENT` / `STUDY_BLOCK`; `null` for every other type. */
  blockId: string | null;
  /** EP15D — `true` for an occurrence of a weekly block, `false` for a one-off; `null` otherwise. */
  recurring: boolean | null;
  /** EP15D — a `STUDY_BLOCK`'s energy; `null` for every other type. */
  energy: 'HIGH' | 'NORMAL' | 'LOW' | null;
}

/** EP15D — one civil date of the range: its bounds and the free time left after everything on it. */
export interface CalendarDay {
  date: string;
  wakeTime: string;
  sleepTime: string;
  free: { startTime: string; endTime: string }[];
}

export interface ListResult {
  timeZone: string;
  today: string;
  from: string;
  to: string;
  /** EP15D — one entry per date in `[from, to]`, ascending (AC-E15-08). */
  days: CalendarDay[];
  events: CalendarEvent[];
}

/** The non-block event types carry no block fields. */
const NO_BLOCK = { blockId: null, recurring: null, energy: null } as const;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleInputs: ScheduleInputsService
  ) {}

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

    // EP15D: bounds, block occurrences, classes and busy time come through
    // the one gathering seam the planner uses too (AC-E15-08); it resolves
    // the profile zone from the stored user.
    const inputs = await this.scheduleInputs.scheduleInputs(userId, from, to);
    const { timeZone } = inputs;

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

    /**
     * EP13D (closes EP06's V-05-1): the plan becomes visible on the calendar.
     *
     * Only *current* planned work is emitted — `SCHEDULED`, `IN_PROGRESS` and
     * `COMPLETED`. Rows that EP13C rolled forward (`RESCHEDULED`) or the
     * student set aside (`SKIPPED`) are deliberately **not** drawn: leaving
     * ghosts of unstarted past sessions on the calendar would rebuild exactly
     * the accumulating "missed" ledger EP13C removes (D13-9).
     *
     * Ownership: `PlannedSession` has no `userId` column, so the scoped where
     * carries the authenticated id through the parent plan.
     */
    const plannedSessions = await this.prisma.plannedSession.findMany({
      where: {
        studyPlan: { userId, date: { gte: fromDate, lte: toDate } },
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
      },
      include: {
        studyPlan: { select: { date: true } },
        assignment: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, name: true, code: true, color: true } },
          },
        },
      },
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
            anchor: null,
            ...NO_BLOCK,
          });
        }
      }
    }

    // EVENT / STUDY_BLOCK (EP15D): block occurrences after recurrence and
    // exceptions, from the seam. Default titles are the server's (D-D3).
    for (const o of inputs.occurrences) {
      if (o.kind === 'BUSY') {
        events.push({
          id: `event:${o.blockId}:${o.date}`,
          type: 'EVENT',
          title: o.title ?? 'Busy',
          subtitle: null,
          date: o.date,
          startTime: minutesToTime(o.startMinute),
          endTime: minutesToTime(o.endMinute),
          courseId: null,
          courseName: null,
          courseColor: null,
          assignmentId: null,
          completed: false,
          focus: false,
          link: null,
          anchor: null,
          blockId: o.blockId,
          recurring: o.recurring,
          energy: null,
        });
      } else {
        events.push({
          id: `study-block:${o.blockId}:${o.date}`,
          type: 'STUDY_BLOCK',
          title: o.title ?? 'Study',
          subtitle: o.course?.code ?? null,
          date: o.date,
          startTime: minutesToTime(o.startMinute),
          endTime: minutesToTime(o.endMinute),
          courseId: o.course?.id ?? null,
          courseName: o.course?.name ?? null,
          courseColor: o.course?.color ?? null,
          assignmentId: null,
          completed: false,
          focus: false,
          link: null,
          anchor: null,
          blockId: o.blockId,
          recurring: o.recurring,
          energy: o.energy,
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
        anchor: null,
        ...NO_BLOCK,
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
        anchor: null,
        ...NO_BLOCK,
      });
    }

    // PLANNED_SESSION (EP13D). The plan row's civil date comes from its
    // parent plan (stored as UTC midnight of that civil date, EP06
    // convention); the wall times are rendered in the profile zone.
    for (const ps of plannedSessions) {
      const date = ps.studyPlan.date.toISOString().slice(0, 10);
      if (date < from || date > to) continue;
      const start = zoneParts(ps.startTime, timeZone);
      const end = zoneParts(ps.endTime, timeZone);
      events.push({
        id: `planned:${ps.id}`,
        type: 'PLANNED_SESSION',
        title: ps.assignment?.title ?? 'Study session',
        subtitle: ps.assignment?.course?.code ?? null,
        date,
        startTime: start.time,
        endTime: end.time,
        courseId: ps.assignment?.course?.id ?? null,
        courseName: ps.assignment?.course?.name ?? null,
        courseColor: ps.assignment?.course?.color ?? null,
        assignmentId: ps.assignmentId,
        // A finished planned session reuses the existing "completed" flag, so
        // the chip's established Completed badge covers it without a payload
        // contract change.
        completed: ps.status === 'COMPLETED',
        focus: false,
        link: null,
        // EP13H: the anchor travels so flex sessions can render day-level.
        anchor: ps.anchor,
        ...NO_BLOCK,
      });
    }

    // days[] (EP15D, AC-E15-08): the day's bounds and what is free once
    // events, classes, busy time and the current FIXED planned sessions
    // (D-D1 — flex sessions occupy no clock time) are taken out — the same
    // `freeIntervals` over the same seam inputs the planner reads (V-15-1).
    const placed: DatedInterval[] = [];
    for (const ps of plannedSessions) {
      if (ps.anchor !== 'FIXED') continue;
      if (ps.status !== 'SCHEDULED' && ps.status !== 'IN_PROGRESS') continue;
      const date = ps.studyPlan.date.toISOString().slice(0, 10);
      const start = zoneParts(ps.startTime, timeZone);
      const end = zoneParts(ps.endTime, timeZone);
      placed.push({
        date,
        startMinute: timeToMinutes(start.time) ?? 0,
        endMinute: timeToMinutes(end.time) ?? 0,
      });
    }
    const days: CalendarDay[] = dates.map((date) => {
      const bound = dayBoundsFor(inputs.bounds.days, date);
      const dow = dayOfWeekOf(date);
      const classesDated: DatedInterval[] = inputs.classes
        .filter((w) => w.dayOfWeek === dow)
        .map((w) => ({ date, startMinute: w.startMinute, endMinute: w.endMinute }));
      const free = freeIntervals({
        date,
        base: { kind: 'declared', windows: [bound] },
        blocked: inputs.blocked,
        classes: classesDated,
        busy: inputs.busy,
        placed,
      });
      return {
        date,
        wakeTime: minutesToTime(bound.startMinute),
        sleepTime: minutesToTime(bound.endMinute),
        free: free.map((f) => ({
          startTime: minutesToTime(f.startMinute),
          endTime: minutesToTime(f.endMinute),
        })),
      };
    });

    // Sort: date asc, then — EP13H — the day's flexible planned sessions
    // first (they are day-level items, like all-day events; their suggested
    // startTime is not a clock position), then startTime asc, type, id.
    const dayRank = (e: CalendarEvent) => (e.anchor === 'FLEX_DAY' ? 0 : 1);
    events.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (dayRank(a) !== dayRank(b)) return dayRank(a) - dayRank(b);
      if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
      if (a.type !== b.type) return a.type < b.type ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });

    return {
      timeZone,
      today,
      from,
      to,
      days,
      events,
    };
  }
}
