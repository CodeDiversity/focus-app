import type { AssignmentStatus } from '@/shared/types/academic';

/**
 * SP-121B / D121-4, D121-5: the unfinished-work predicate. `PENDING` and
 * `IN_PROGRESS` are unfinished; `COMPLETED`, `SUBMITTED` and `GRADED` are
 * finished. Lives in one place so story 7 (overdue/completed views) reuses it.
 *
 * Accepts either an `AssignmentStatus` value or any object carrying a `status`
 * field, so callers can pass a row or a bare status.
 */
export function isUnfinishedAssignment(
  value: AssignmentStatus | { status: AssignmentStatus }
): boolean {
  const status = typeof value === 'string' ? value : value.status;
  return status === 'PENDING' || status === 'IN_PROGRESS';
}

export function isFinishedAssignment(
  value: AssignmentStatus | { status: AssignmentStatus }
): boolean {
  return !isUnfinishedAssignment(value);
}

/**
 * SP-123A / D123-1, D123-2: overdue identification. An assignment is overdue
 * iff it is unfinished (`PENDING` or `IN_PROGRESS`, reused via
 * `isUnfinishedAssignment`) AND has a non-null `dueDate` whose timestamp is
 * strictly before `now` (defaulting to the current time). No end-of-day grace.
 *
 * Accepts any object carrying `status` and `dueDate` (e.g. `CourseAssignment`,
 * `AssignmentListItem`), so both surfaces call it without reshaping. `now` may
 * be a `Date`, epoch millis, or ISO string for deterministic tests.
 */
export function isOverdueAssignment(
  value: { status: AssignmentStatus; dueDate: string | Date | null },
  now?: Date | number | string
): boolean {
  if (!isUnfinishedAssignment(value)) return false;
  if (value.dueDate === null) return false;
  const due =
    value.dueDate instanceof Date ? value.dueDate.getTime() : new Date(value.dueDate).getTime();
  if (Number.isNaN(due)) return false;
  const nowMs =
    now === undefined
      ? Date.now()
      : now instanceof Date
        ? now.getTime()
        : typeof now === 'number'
          ? now
          : new Date(now).getTime();
  return due < nowMs;
}

/** Lifecycle order used by the status Select (D121-2). */
export const ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SUBMITTED',
  'GRADED',
] as const;

/**
 * SP-125 (R-125-007): the "due soon" presentation predicate. Unfinished
 * assignments due within the next `withinDays` days (default 3, inclusive)
 * earn the amber urgency badge. Overdue rows are excluded — they are red, not
 * amber — and finished rows never sort as urgent. Pure presentation rule
 * derived from the stored `dueDate`; no server semantics.
 */
export function isDueSoonAssignment(
  value: { status: AssignmentStatus; dueDate: string | Date | null },
  now?: Date | number | string,
  withinDays = 3
): boolean {
  if (isFinishedAssignment(value)) return false;
  if (value.dueDate === null) return false;
  if (isOverdueAssignment(value, now)) return false;
  const due =
    value.dueDate instanceof Date ? value.dueDate.getTime() : new Date(value.dueDate).getTime();
  if (Number.isNaN(due)) return false;
  const nowMs =
    now === undefined
      ? Date.now()
      : now instanceof Date
        ? now.getTime()
        : typeof now === 'number'
          ? now
          : new Date(now).getTime();
  return due <= nowMs + withinDays * 24 * 60 * 60 * 1000;
}
