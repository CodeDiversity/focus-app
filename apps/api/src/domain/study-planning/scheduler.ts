import { compareAssignments } from './ordering';
import { freeIntervals } from './intervals';
import type {
  AssignmentScheduleResult,
  DatedInterval,
  DeficitCategory,
  PlannedSessionProposal,
  SchedulerInput,
  SchedulerOutput,
  SchedulableAssignment,
  WeeklyWindow,
} from './types';

/**
 * The deterministic scheduling engine (EP06C).
 *
 * A pure function: given the same input it returns the same output, with no
 * clock, no randomness, no database, no HTTP and no import from `@nestjs/*`
 * or the Prisma client. "Today" is `input.days[0]`; every time window is
 * supplied by the caller (D06-17, D06-24).
 *
 * The rules are the shared contract's *The engine's rules* (1–12). The
 * placement uses the one shared comparator (`ordering.ts`) and the one
 * shared free-interval helper (`intervals.ts`).
 */

/** Convert a weekly window list into dated intervals for one civil date. */
function weeklyToDated(windows: WeeklyWindow[], date: string): DatedInterval[] {
  // The weekday of a civil date is getUTCDay() on its UTC midnight — the
  // calendar's own `dayOfWeekOf` (`calendar.service.ts:83-85`), Sunday = 0.
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const result: DatedInterval[] = [];
  for (const window of windows) {
    if (window.dayOfWeek !== weekday) {
      continue;
    }
    result.push({ date, startMinute: window.startMinute, endMinute: window.endMinute });
  }
  return result;
}

/** Sum the free minutes of a list of intervals. */
function freeMinutes(intervals: DatedInterval[]): number {
  let total = 0;
  for (const interval of intervals) {
    total += interval.endMinute - interval.startMinute;
  }
  return total;
}

export function schedule(input: SchedulerInput): SchedulerOutput {
  const { days, preferences } = input;
  const today = days.length > 0 ? days[0] : '';

  // Sort the assignments by the one shared comparator (D06-22).
  const sorted: SchedulableAssignment[] = [...input.assignments].sort((a, b) =>
    compareAssignments(
      { id: a.id, dueDate: a.dueDate, priority: a.priority, createdAt: a.createdAt },
      { id: b.id, dueDate: b.dueDate, priority: b.priority, createdAt: b.createdAt },
      today
    )
  );

  // State shared across placements.
  const sessions: PlannedSessionProposal[] = [];
  const results: AssignmentScheduleResult[] = [];
  const placedSessions: DatedInterval[] = []; // all sessions placed so far
  const dailyBudget = new Map<string, number>();
  for (const day of days) {
    dailyBudget.set(day, preferences.dailyCapMinutes);
  }

  for (const assignment of sorted) {
    const remainingTotal = assignment.remainingMinutes;
    let remaining = remainingTotal;
    let placedMinutes = 0;

    const overdue = assignment.dueDate < today;
    const beyondWindow = !overdue && assignment.dueDate > days[days.length - 1];

    // Horizon dates: overdue → all days; otherwise days <= dueDate.
    const horizonDates: string[] = overdue
      ? [...days]
      : days.filter((d) => d <= assignment.dueDate);

    // Capacity before this assignment's own placements (after earlier
    // assignments took their pick).
    let capacityBefore = 0;
    for (const date of horizonDates) {
      const free = freeIntervals({
        date,
        base: { kind: 'declared', windows: weeklyToDated(input.availability, date) },
        blocked: weeklyToDated(input.blocked, date),
        classes: weeklyToDated(input.classes, date),
        busy: input.busy,
        placed: placedSessions,
      });
      capacityBefore += freeMinutes(free);
    }

    // Placement loop.
    while (remaining > 0) {
      let placedThisPass = false;
      for (const date of horizonDates) {
        const budget = dailyBudget.get(date) ?? 0;
        if (budget <= 0) {
          continue;
        }

        const desired = Math.min(preferences.sessionLengthMinutes, remaining);
        const length = Math.min(desired, budget);
        if (length <= 0) {
          continue;
        }

        const free = freeIntervals({
          date,
          base: { kind: 'declared', windows: weeklyToDated(input.availability, date) },
          blocked: weeklyToDated(input.blocked, date),
          classes: weeklyToDated(input.classes, date),
          busy: input.busy,
          placed: placedSessions,
        });

        // Find the first free interval that fits the whole length.
        const interval = free.find((iv) => iv.endMinute - iv.startMinute >= length);
        if (!interval) {
          continue;
        }

        const startMinute = interval.startMinute;
        const endMinute = startMinute + length;

        sessions.push({
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          date,
          startMinute,
          endMinute,
          durationMinutes: length,
        });

        placedSessions.push({ date, startMinute, endMinute });
        dailyBudget.set(date, budget - length);
        remaining -= length;
        placedMinutes += length;
        placedThisPass = true;
        break; // restart to recompute free intervals with the new placement
      }

      if (!placedThisPass) {
        break;
      }
    }

    // Determine the deficit / deferred outcome.
    let deferredMinutes = 0;
    let deficitMinutes = 0;
    let deficitCategory: DeficitCategory | null = null;

    if (overdue) {
      deficitCategory = 'OVERDUE';
      deficitMinutes = remainingTotal; // full remaining, whatever was placed
    } else if (beyondWindow) {
      deferredMinutes = Math.max(0, remainingTotal - placedMinutes);
    } else if (placedMinutes < remainingTotal) {
      if (capacityBefore === 0) {
        deficitCategory = 'NO_AVAILABLE_TIME';
        deficitMinutes = remainingTotal;
      } else {
        deficitCategory = 'INSUFFICIENT_TIME_BEFORE_DEADLINE';
        deficitMinutes = remainingTotal - placedMinutes;
      }
    }

    results.push({
      assignmentId: assignment.id,
      placedMinutes,
      deferredMinutes,
      deficitMinutes,
      deficitCategory,
    });
  }

  return { sessions, results };
}
