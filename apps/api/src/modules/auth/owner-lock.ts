import type { PrismaClient } from '../../generated/prisma/client';

/**
 * Owner-first row locking — the shared credential-mutation protocol of
 * SP-105. Used by password-reset redemption (SP-105B); SP-105E applies
 * the same order to login/refresh/logout.
 *
 * Every transaction that mutates a user's credentials must:
 *
 *   1. discover the owner **without** writing or locking credential rows;
 *   2. lock the owner's `users` row **before any** credential write —
 *      {@link lockOwner} below;
 *   3. take a fresh database wall-clock **after** the lock wait —
 *      {@link databaseNow} below;
 *   4. re-validate state (usage, expiry) against that fresh time with a
 *      conditional write, and roll back on zero affected rows.
 *
 * `SELECT ... FOR UPDATE` makes concurrent mutations for one account
 * serialize on the same `users` row: a contender proceeds only after the
 * winner commits or rolls back, so its conditional writes see the
 * winner's result and fail closed. Issuance (SP-105A) takes this same
 * explicit owner lock before its cooldown claim (PR-107), so all
 * credential transactions serialize on the same row. Credential
 * transactions never hold a token
 * row lock while waiting for the owner lock, which rules out the
 * token-before-owner deadlock.
 */
export type OwnerLockClient = Pick<PrismaClient, '$queryRaw'>;

/**
 * Lock the owner's `users` row for the duration of the surrounding
 * transaction and confirm the row exists.
 *
 * The mapped table is `users` (see `schema.prisma`) — the parameter is
 * bound by Prisma, never interpolated.
 *
 * @returns `true` when the row exists and is now locked; `false` when it
 *   does not. Callers must treat `false` exactly like an unknown token —
 *   the uniform 400, never a distinct message (no existence oracle).
 */
export async function lockOwner(tx: OwnerLockClient, userId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE
  `;
  return rows.length === 1;
}

/**
 * A fresh database wall-clock value for use *after* waiting for the
 * owner lock.
 *
 * `clock_timestamp()` moves with the real clock, whereas `now()` /
 * `transaction_timestamp()` are frozen at transaction start. A token
 * whose expiry lands *while this transaction waits for the lock* must
 * therefore fail: comparing against the post-lock time is what a
 * stale timestamp would silently let through.
 */
export async function databaseNow(tx: OwnerLockClient): Promise<Date> {
  const rows = await tx.$queryRaw<{ checkedAt: Date | string }[]>`
    SELECT clock_timestamp() AS "checkedAt"
  `;
  const checkedAt = rows[0]?.checkedAt;
  if (checkedAt === undefined || checkedAt === null) {
    throw new Error('clock_timestamp() did not return a timestamp');
  }
  return new Date(checkedAt);
}
