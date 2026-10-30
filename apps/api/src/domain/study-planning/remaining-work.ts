import type {
  AssignmentFacts,
  AssignmentStatusValue,
  FlaggedAssignment,
  SchedulableAssignment,
  UnfinishedAssignmentStatus,
} from './types';

/**
 * The remaining-work classification (EP06B — the backend half of AC-E06-02
 * and AC-E06-09).
 *
 * This file is the **single** implementation of the rules the epic's
 * remaining-work read and the scheduler both depend on:
 *
 * - the estimate → minutes conversion (`round(estimatedHours × 60)`);
 * - the unfinished-status filter (`PENDING` and `IN_PROGRESS` are
 *   candidates; `COMPLETED`, `SUBMITTED` and `GRADED` are not);
 * - the flagging rule (AC-E06-09, D06-25): no estimate (or a non-positive
 *   one) → `MISSING_ESTIMATE`; no due date → `MISSING_DUE_DATE`;
 *   `MISSING_ESTIMATE` wins when both are missing;
 * - the remaining-work arithmetic — `remainingMinutes = max(0,
 *   estimatedMinutes − confirmedMinutes)`.
 *
 * It is a pure domain module (D06-17): it imports nothing from `@nestjs/*`,
 * nothing from Prisma, reads no clock and knows no time zone. The caller
 * supplies the confirmed minutes (a map keyed by assignment id) and the
 * **civil** due dates (`YYYY-MM-DD`, D06-24) — so EP06C's engine and EP08 can
 * reuse it directly.
 */

/** The statuses that are still unfinished — the candidates (rule 11). */
export const UNFINISHED_ASSIGNMENT_STATUSES: readonly UnfinishedAssignmentStatus[] = [
  'PENDING',
  'IN_PROGRESS',
];

/** Is this status still unfinished (a candidate of the remaining work)? */
export function isUnfinishedStatus(
  status: AssignmentStatusValue
): status is UnfinishedAssignmentStatus {
  return status === 'PENDING' || status === 'IN_PROGRESS';
}

/**
 * The estimate → minutes conversion: `round(estimatedHours × 60)`.
 *
 * A **missing** estimate (`null`, `undefined`) and a **non-positive** one
 * (zero or negative) both return `null`: they are treated as *missing*, not
 * as "no work left" (D06-25) — treating a wrongly entered zero estimate as
 * "no work left" would silently drop the assignment, which is the opposite of
 * AC-E06-09. `null` is what makes the assignment flagged
 * `MISSING_ESTIMATE` and its `estimatedMinutes` / `remainingMinutes` `null`.
 */
export function estimateToMinutes(estimatedHours: number | null | undefined): number | null {
  if (
    typeof estimatedHours !== 'number' ||
    !Number.isFinite(estimatedHours) ||
    estimatedHours <= 0
  ) {
    return null;
  }
  return Math.round(estimatedHours * 60);
}

/**
 * The remaining work: `max(0, estimatedMinutes − confirmedMinutes)`.
 *
 * The remaining work never goes negative — confirmed time beyond the
 * estimate leaves zero minutes, not a negative figure. A missing estimate
 * has no remaining work to report at all, so it is `null`.
 */
export function remainingMinutesOf(estimatedMinutes: number, confirmedMinutes: number): number;
export function remainingMinutesOf(
  estimatedMinutes: number | null,
  confirmedMinutes: number
): number | null;
export function remainingMinutesOf(
  estimatedMinutes: number | null,
  confirmedMinutes: number
): number | null {
  if (estimatedMinutes === null) {
    return null;
  }
  return Math.max(0, estimatedMinutes - confirmedMinutes);
}

/**
 * Classify the student's assignments into the two lists the rest of EP06
 * uses: the **schedulable** ones (which feed the engine, EP06C) and the
 * **flagged** ones (which are reported with their reason, AC-E06-09).
 *
 * - Assignments whose status is not unfinished are **not** returned at all:
 *   a completed, submitted or graded assignment is not remaining work.
 * - The confirmed minutes arrive as an **input** (`confirmedByAssignment`,
 *   keyed by assignment id). The function never reads a database — the
 *   service owns that read (D06-6).
 * - The two lists keep the caller's input order; the **ordering** is the
 *   shared comparator's business (`ordering.ts`, D06-22).
 */
export function classifyAssignments(
  assignments: AssignmentFacts[],
  confirmedByAssignment: ReadonlyMap<string, number>
): { schedulable: SchedulableAssignment[]; flagged: FlaggedAssignment[] } {
  const schedulable: SchedulableAssignment[] = [];
  const flagged: FlaggedAssignment[] = [];

  for (const assignment of assignments) {
    if (!isUnfinishedStatus(assignment.status)) {
      continue;
    }

    const estimatedMinutes = estimateToMinutes(assignment.estimatedHours);
    const confirmedMinutes = confirmedByAssignment.get(assignment.id) ?? 0;

    const base = {
      id: assignment.id,
      title: assignment.title,
      courseCode: assignment.courseCode,
      dueDate: assignment.dueDate,
      estimatedMinutes,
      confirmedMinutes,
      remainingMinutes: remainingMinutesOf(estimatedMinutes, confirmedMinutes),
      status: assignment.status,
      priority: assignment.priority,
      createdAt: assignment.createdAt,
    };

    // The flagging rule (AC-E06-09, D06-25) — expressed here and nowhere
    // else, and the **order is the precedence**: a missing (or non-positive)
    // estimate is `MISSING_ESTIMATE` and wins over a missing due date.
    if (estimatedMinutes === null) {
      flagged.push({ ...base, flagged: 'MISSING_ESTIMATE' });
      continue;
    }
    if (assignment.dueDate === null) {
      flagged.push({ ...base, flagged: 'MISSING_DUE_DATE' });
      continue;
    }

    // A schedulable assignment has both an estimate and a due date, so every
    // remaining-work figure is a number.
    schedulable.push({
      ...base,
      dueDate: assignment.dueDate,
      estimatedMinutes,
      remainingMinutes: remainingMinutesOf(estimatedMinutes, confirmedMinutes),
      flagged: null,
    });
  }

  return { schedulable, flagged };
}
