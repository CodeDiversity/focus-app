import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { databaseNow } from './owner-lock';

/**
 * Shared per-IP admission limits for SP-105's public recovery endpoints
 * (SD8, approved 2026-10-14): at most 10 admitted `forgot-password` requests
 * and 30 admitted `reset-password` submissions per normalized source IP in
 * the preceding 60 seconds, in **separate** buckets.
 *
 * The window lives in PostgreSQL (`RecoveryRateLimitBucket`), so every
 * service replica enforces the same limits and concurrent requests near the
 * limit cannot overshoot: admission is an upsert + `FOR UPDATE` row lock +
 * fresh post-lock `clock_timestamp()` + conditional append in one short
 * transaction (the owner-lock time protocol; the bucket lock is released
 * when this transaction ends — always before any A/B user or credential
 * lock, so limiter and recovery transactions can never deadlock against
 * each other).
 *
 * Counting and storage are account-independent by construction: only the
 * endpoint name and the normalized IP are stored — never emails, tokens,
 * passwords, or request bodies — so the limiter cannot leak or influence
 * account existence. Storage failures **fail closed** with a sanitized,
 * account-independent 503; they never disable the limits.
 */

export const RECOVERY_LIMITS = {
  'forgot-password': 10,
  'reset-password': 30,
} as const;

export type RecoveryEndpoint = keyof typeof RECOVERY_LIMITS;

/** Rolling window shared by both endpoints (SD8 / parent retry contract). */
export const RECOVERY_WINDOW_MS = 60_000;

/**
 * Bounded attempts: a bucket row that disappears between the upsert and the
 * lock (concurrent stale cleanup) is retried once; a still-missing row fails
 * closed. Never unlimited admission.
 */
const ADMISSION_ATTEMPTS = 2;

export type Admission =
  { readonly allowed: true } | { readonly allowed: false; readonly retryAfterSeconds: number };

/**
 * Sanitized, account-independent failure message. Deliberately generic: it
 * must not reveal whether an account exists, what was requested, or any
 * source address or database detail (SD9, AC3/AC5).
 */
export const RECOVERY_UNAVAILABLE_MESSAGE =
  'Service temporarily unavailable. Please try again later.';

/** `timestamp(3)[]` comes back as driver-parsed values; accept both shapes. */
type Timestamp = string | Date;

function toTimestamps(values: readonly Timestamp[] | null): Date[] {
  if (values === null) {
    throw new Error('recovery rate-limit bucket is missing its window');
  }
  return values.map((value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('recovery rate-limit bucket has an unparseable timestamp');
    }
    return date;
  });
}

/**
 * Parent retry wire contract: integer delta-seconds `max(1, ceil(
 * earliestRetainedAdmission + 60s - checkedAt ))`, clamped to 1–60 for this
 * rolling window. No account cooldown enters this value.
 */
export function retryAfterSeconds(earliestRetained: Date, checkedAt: Date): number {
  const seconds = Math.ceil(
    (earliestRetained.getTime() + RECOVERY_WINDOW_MS - checkedAt.getTime()) / 1000
  );
  return Math.min(60, Math.max(1, seconds));
}

@Injectable()
export class RecoveryRateLimitStore {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admit or deny one attempt for `endpoint` from `normalizedIp`.
   *
   * Returns an admission decision; on any storage failure throws a sanitized
   * `ServiceUnavailableException` (503) that reveals nothing about the
   * requester or the database.
   */
  async admit(endpoint: RecoveryEndpoint, normalizedIp: string): Promise<Admission> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        for (let attempt = 1; attempt <= ADMISSION_ATTEMPTS; attempt += 1) {
          const decision = await this.admitAttempt(tx, endpoint, normalizedIp);
          if (decision !== null) {
            return decision;
          }
        }
        // The row kept disappearing under concurrent cleanup — fail closed.
        throw new Error('recovery rate-limit bucket unavailable');
      });
    } catch {
      throw new ServiceUnavailableException(RECOVERY_UNAVAILABLE_MESSAGE);
    }
  }

  private async admitAttempt(
    tx: Prisma.TransactionClient,
    endpoint: RecoveryEndpoint,
    normalizedIp: string
  ): Promise<Admission | null> {
    // 1. Ensure the bucket exists. The create branch starts with an empty
    //    window; the update branch is a no-op — the decision re-reads the
    //    window under the row lock below, so a concurrent write cannot slip
    //    past the count.
    await tx.recoveryRateLimitBucket.upsert({
      where: { endpoint_normalizedIp: { endpoint, normalizedIp } },
      create: { endpoint, normalizedIp, admittedAt: [] },
      update: {},
    });

    // 2. Lock the bucket row and read the window in one parameterized query.
    //    The bound values make client input impossible to use as SQL.
    const rows = await tx.$queryRaw<{ id: string; admittedAt: Timestamp[] | null }[]>`
      SELECT "id", "admittedAt"
      FROM "recovery_rate_limit_buckets"
      WHERE "endpoint" = ${endpoint} AND "normalizedIp" = ${normalizedIp}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      // Disappeared between the upsert and the lock (concurrent cleanup) —
      // signal a bounded retry to the caller; never unlimited admission.
      return null;
    }

    // 3. Fresh post-lock wall clock (owner-lock protocol): an entry that
    //    expires while this transaction waited for the lock cannot keep its
    //    slot.
    const checkedAt = await databaseNow(tx);

    // 4. Prune entries at or before the window start. An admission exactly
    //    60 seconds old has fully elapsed and frees its slot.
    const windowStartMs = checkedAt.getTime() - RECOVERY_WINDOW_MS;
    const retained = toTimestamps(row.admittedAt)
      .filter((admittedAt) => admittedAt.getTime() > windowStartMs)
      .sort((a, b) => a.getTime() - b.getTime());

    const limit = RECOVERY_LIMITS[endpoint];

    if (retained.length < limit) {
      // Admit: append the fresh admission time (the window stays bounded by
      // the endpoint limit). A fully stale bucket is replaced, not preserved
      // (bounded cleanup); a live bucket is updated in place.
      const window = [...retained, checkedAt];
      if (retained.length === 0) {
        await tx.recoveryRateLimitBucket.delete({ where: { id: row.id } });
        await tx.recoveryRateLimitBucket.create({
          data: { endpoint, normalizedIp, admittedAt: window },
        });
      } else {
        await tx.recoveryRateLimitBucket.update({
          where: { id: row.id },
          data: { admittedAt: window, updatedAt: checkedAt },
        });
      }
      return { allowed: true };
    }

    // Deny: the window is full. No write of any kind — a denied attempt
    // never prolongs the window and never mutates user or credential rows
    // (the guard rejects before A/B run). Retry guidance derives from the
    // earliest retained admission: when it leaves the window.
    const retry = retryAfterSeconds(retained[0], checkedAt);
    return { allowed: false, retryAfterSeconds: retry };
  }
}
