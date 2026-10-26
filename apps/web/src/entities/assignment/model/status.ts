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

/** Lifecycle order used by the status Select (D121-2). */
export const ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SUBMITTED',
  'GRADED',
] as const;
