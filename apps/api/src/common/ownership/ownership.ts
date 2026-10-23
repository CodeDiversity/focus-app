import { NotFoundException } from '@nestjs/common';

/**
 * Ownership scoping — the convention every route that touches academic data
 * follows (SP-104; mirrored in the "Ownership scoping" section of the
 * repo-root AGENTS.md).
 *
 * Every Prisma query for a student's academic data must include the
 * authenticated student's `userId` in its `where` clause:
 *
 *   - single-record read:   where: ownedWhere(userId, id)
 *   - every result:         passes through assertOwned(userId, record)
 *   - updateMany/deleteMany: passes through assertAffected(userId, count)
 *   - direct update/delete: where: ownedWhere(userId, id); Prisma P2025 is
 *     normalized by AllExceptionsFilter to the same RESOURCE_NOT_FOUND 404
 *
 * A record that is not owned — whether it does not exist or belongs to
 * another student — is reported with the same uniform 404 and the same
 * generic message (see `RESOURCE_NOT_FOUND`). Never answer a not-owned
 * access with a 403 or a distinct message: that would reveal that another
 * student's record exists (an existence oracle). One scoping rule
 * ("always include the authenticated userId in the where") is all a
 * controller needs.
 *
 * Scope by `userId` on every model that carries one: `Semester`, `Course`,
 * `ClassMeeting`, `Assignment`, `Task`, `StudySession`, `StudyPlan`,
 * `AvailabilitySlot`.
 * `ScheduledTask` has no `userId` column of its own — scope it through its
 * parents (`studyPlan.userId` / `task.userId`). The only legitimate unscoped
 * user lookups are the internal auth flows (login's email lookup); there is
 * no user-facing route that takes a client-supplied user id.
 */

export const RESOURCE_NOT_FOUND = 'Resource not found';

/** Where-clause for `findUnique` / `update` / `delete` on a single record. */
export function ownedWhere(userId: string, id: string): { id: string; userId: string } {
  return { id, userId };
}

/**
 * Pass a fetched record through this before returning or mutating it.
 * Throws the uniform 404 when the record is missing OR owned by someone
 * else — identical status and message for both cases.
 */
export function assertOwned(
  userId: string,
  record: { userId: string } | null | undefined
): asserts record is { userId: string } {
  if (!record || record.userId !== userId) {
    throw new NotFoundException(RESOURCE_NOT_FOUND);
  }
}

/**
 * Pass the affected-row count of a scoped `updateMany` / `deleteMany`
 * through this. A count of 0 means the target was missing or not owned —
 * the same uniform 404.
 */
export function assertAffected(_userId: string, count: number): void {
  if (count === 0) {
    throw new NotFoundException(RESOURCE_NOT_FOUND);
  }
}
