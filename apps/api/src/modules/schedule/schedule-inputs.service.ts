import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, formatCalendarDate, parseCalendarDate } from '../../common/lib/calendar-date';
import { resolveTimeZone, wallClockToInstant, zoneParts } from '../../common/lib/civil-date';
import {
  dayBoundsFor,
  expandBlocks,
  readDayBounds,
  timeToMinutes,
} from '../../domain/schedule/recurrence';
import type { DayBoundsView, Occurrence, ScheduleBlockInput } from '../../domain/schedule/types';
import type { ReplanBusyInterval } from '../../domain/study-planning/catch-up';
import type {
  DatedInterval,
  PreferredInterval,
  WeeklyWindow,
} from '../../domain/study-planning/types';

/** A block occurrence plus the tied course's display fields (STUDY only). */
export type ScheduleOccurrence = Occurrence & {
  course: { id: string; name: string; code: string; color: string } | null;
};

/**
 * What the seam returns for one student and one inclusive civil-date range
 * (contracts.md → *The shared gathering seam*).
 */
export type ScheduleInputs = {
  timeZone: string;
  /** Every civil date in `[from, to]`, ascending. */
  days: string[];
  /** The stored day bounds, defaults filled (EP15A `readDayBounds`). */
  bounds: DayBoundsView;
  /** One `[wake, sleep)` interval per day in `days` (the engine's base). */
  dayBounds: DatedInterval[];
  /** BUSY block occurrences, dated. */
  blocked: DatedInterval[];
  /** STUDY block occurrences with energy, key and course tie. */
  preferred: PreferredInterval[];
  /** Class meetings of active courses, weekly. */
  classes: WeeklyWindow[];
  /** Confirmed study sessions and preserved (completed / locked) planned sessions. */
  busy: ReplanBusyInterval[];
  /** Every block occurrence in range (both kinds) for the calendar's events. */
  occurrences: ScheduleOccurrence[];
};

/** `HH:mm` → minutes (the stored rows are validated, so `?? 0` never fires). */
const minutes = (time: string): number => timeToMinutes(time) ?? 0;

/**
 * The one gathering seam (EP15D, D-D2; AC-E15-08): the **only** code that
 * turns `DayBounds`, `ScheduleBlock` (+ exceptions), `ClassMeeting`,
 * `StudySession` and preserved `PlannedSession` rows into intervals. The
 * planner (`gatherPlanData`) and the calendar (`CalendarService.list`) both
 * call it, so what the calendar labels "free" is what the planner may use —
 * by construction (V-15-1 pins it).
 *
 * Ownership (DoD-3, V-15-4): every read carries `userId` — directly on
 * `dayBounds`, `scheduleBlock`, `course` and `studySession`, and through
 * `studyPlan: { userId }` on `plannedSession`; exceptions and courses come
 * in through the owned block. Date math is civil-date string arithmetic plus
 * the shared zone seam (`civil-date.ts`); the domain functions it calls are
 * pure.
 */
@Injectable()
export class ScheduleInputsService {
  constructor(private readonly prisma: PrismaService) {}

  async scheduleInputs(userId: string, from: string, to: string): Promise<ScheduleInputs> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true },
    });
    const timeZone = resolveTimeZone(user?.timeZone);

    const days: string[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      days.push(date);
      if (days.length > 366) break; // defensive: callers validate the range
    }
    const fromDate = parseCalendarDate(from) as Date;
    const toDate = parseCalendarDate(to) as Date;

    const [boundRows, blockRows, courses, sessionRows, plannedRows] = await Promise.all([
      this.prisma.dayBounds.findMany({
        where: { userId },
        select: { dayOfWeek: true, wakeTime: true, sleepTime: true },
      }),
      this.prisma.scheduleBlock.findMany({
        where: {
          userId,
          startDate: { lte: toDate },
          OR: [{ endDate: null }, { endDate: { gte: fromDate } }],
        },
        include: {
          exceptions: { select: { date: true } },
          course: { select: { id: true, name: true, code: true, color: true } },
        },
        orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.course.findMany({
        where: { userId, isActive: true },
        include: { meetings: true },
      }),
      this.prisma.studySession.findMany({
        where: {
          userId,
          endTime: { not: null },
          startTime: {
            gte: wallClockToInstant(addDays(from, -1), '00:00', timeZone),
            lt: wallClockToInstant(addDays(to, 1), '00:00', timeZone),
          },
        },
        select: { startTime: true, endTime: true },
      }),
      // Preserved planned rows are read for **every** date, not just the
      // range: EP08's `lockedPreserved` / `completedPreserved` counts
      // (TR-E08-04) derive from this list and count past kept commitments
      // too, exactly as `gatherPlanData` did before EP15D. The engine and the
      // calendar filter by date themselves.
      this.prisma.plannedSession.findMany({
        where: { studyPlan: { userId }, OR: [{ status: 'COMPLETED' }, { locked: true }] },
        include: { studyPlan: { select: { date: true } } },
      }),
    ]);

    // Day bounds → the engine's base, one interval per day (D15-13 defaults).
    const bounds = readDayBounds(boundRows);
    const dayBounds = days.map((date) => dayBoundsFor(bounds.days, date));

    // Blocks → occurrences (recurrence + exceptions, EP15A), split by kind.
    const courseById = new Map(blockRows.map((row) => [row.id, row.course]));
    const domainBlocks: ScheduleBlockInput[] = blockRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      courseId: row.courseId,
      energy: row.energy,
      startDate: formatCalendarDate(row.startDate),
      endDate: row.endDate ? formatCalendarDate(row.endDate) : null,
      weekdays: row.weekdays,
      startTime: row.startTime,
      endTime: row.endTime,
      exceptionDates: row.exceptions.map((e) => formatCalendarDate(e.date)),
    }));
    const occurrences: ScheduleOccurrence[] = expandBlocks(domainBlocks, from, to).map((o) => ({
      ...o,
      course: o.kind === 'STUDY' ? (courseById.get(o.blockId) ?? null) : null,
    }));
    const blocked: DatedInterval[] = [];
    const preferred: PreferredInterval[] = [];
    for (const o of occurrences) {
      if (o.kind === 'BUSY') {
        blocked.push({ date: o.date, startMinute: o.startMinute, endMinute: o.endMinute });
      } else {
        const item: PreferredInterval = {
          date: o.date,
          startMinute: o.startMinute,
          endMinute: o.endMinute,
          preferredKey: o.blockId,
          energy: o.energy,
        };
        if (o.courseId !== null) item.courseId = o.courseId;
        preferred.push(item);
      }
    }

    // Class meetings → weekly windows (unchanged shape, EP06).
    const classes: WeeklyWindow[] = [];
    for (const course of courses) {
      for (const m of course.meetings) {
        classes.push({
          dayOfWeek: m.dayOfWeek,
          startMinute: minutes(m.startTime),
          endMinute: minutes(m.endTime),
        });
      }
    }

    // Busy: confirmed sessions (untagged) + preserved planned rows (tagged, EP13A).
    // Filters repeated in code so a caller's broader read never leaks in.
    const busy: ReplanBusyInterval[] = [];
    for (const s of sessionRows) {
      if (!s.endTime) continue;
      const start = zoneParts(s.startTime, timeZone);
      if (start.date < from || start.date > to) continue;
      const end = zoneParts(s.endTime, timeZone);
      busy.push({
        date: start.date,
        startMinute: minutes(start.time),
        endMinute: minutes(end.time),
      });
    }
    for (const ps of plannedRows) {
      if (!(ps.status === 'COMPLETED' || ps.locked)) continue;
      const start = zoneParts(ps.startTime, timeZone);
      const end = zoneParts(ps.endTime, timeZone);
      busy.push({
        date: start.date,
        startMinute: minutes(start.time),
        endMinute: minutes(end.time),
        completed: ps.status === 'COMPLETED',
        locked: ps.locked,
      });
    }

    return { timeZone, days, bounds, dayBounds, blocked, preferred, classes, busy, occurrences };
  }
}
