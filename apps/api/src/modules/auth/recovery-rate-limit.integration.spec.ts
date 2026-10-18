/**
 * SP-105J — Recovery shared-limiter concurrency suite (real PostgreSQL).
 *
 * Test-only artifact. Two `RecoveryRateLimitStore` instances share one bucket
 * through the SP-105H harness:
 *
 *   - AC1 last-slot races on both endpoints, restart via a new client, and
 *     reset-password admission while forgot-password contenders are blocked.
 *   - AC2 real `clock_timestamp()` window: a 61s-old entry frees a slot; a
 *     full in-window bucket denies without a write.
 *   - AC3 fully stale delete-and-recreate race settles at two admissions, and
 *     seeded credential rows stay unchanged.
 *
 * No Nest app, guard, HTTP envelope, harness change, or production code.
 * An unavailable `_test` database fails this command rather than skipping.
 */
import { setTimeout as delay } from 'timers/promises';
import type { PrismaClient } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { databaseNow } from './owner-lock';
import {
  Admission,
  RECOVERY_LIMITS,
  RecoveryEndpoint,
  RecoveryRateLimitStore,
  retryAfterSeconds,
} from './recovery-rate-limit.store';
import { RecoveryDbHarness } from './testing/recovery-db-harness';

const FORGOT: RecoveryEndpoint = 'forgot-password';
const RESET: RecoveryEndpoint = 'reset-password';

function storeFor(client: PrismaClient): RecoveryRateLimitStore {
  return new RecoveryRateLimitStore(client as unknown as PrismaService);
}

function epochMs(instant: Date): number {
  return Math.round(instant.getTime());
}

/** Oldest entry at `oldestAgeMs`; every other entry is about three seconds old. */
function seededWindow(baseMs: number, count: number, oldestAgeMs: number): Date[] {
  const oldest = new Date(baseMs - oldestAgeMs);
  const rest = Array.from(
    { length: count - 1 },
    (_, index) => new Date(baseMs - 3_000 + index * 10)
  );
  return [oldest, ...rest].sort((left, right) => left.getTime() - right.getTime());
}

function staleWindow(baseMs: number, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => new Date(baseMs - 120_000 - index * 1_000));
}

function stamp(values: readonly Date[]): number[] {
  return values.map((value) => value.getTime());
}

/**
 * Count backends transitively blocked by the held bucket lock. `admit` does
 * not expose its pid, and `pg_blocking_pids` may name the lock-group leader
 * for queued waiters. Thrown errors carry counts only.
 */
async function waitUntilBlockedCount(
  client: PrismaClient,
  holderPid: number,
  expected: number,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let count = 0;
  try {
    while (Date.now() < deadline) {
      const rows = await client.$queryRaw<{ pid: number }[]>`
        WITH RECURSIVE waiters(pid) AS (
          SELECT pid FROM pg_stat_activity
          WHERE datname = current_database() AND ${holderPid}::int = ANY(pg_blocking_pids(pid))
          UNION
          SELECT activity.pid FROM pg_stat_activity activity
          JOIN waiters ON waiters.pid = ANY(pg_blocking_pids(activity.pid))
          WHERE activity.datname = current_database()
        )
        SELECT pid FROM waiters
      `;
      count = rows.length;
      if (count >= expected) return;
      await delay(10);
    }
  } catch {
    throw new Error('Recovery lock observation failed');
  }
  throw new Error(`expected ${expected} blocked backends, observed ${count}`);
}

async function readBucket(client: PrismaClient, endpoint: RecoveryEndpoint, normalizedIp: string) {
  return client.recoveryRateLimitBucket.findUnique({
    where: { endpoint_normalizedIp: { endpoint, normalizedIp } },
  });
}

function expectSingleAdmission(results: PromiseSettledResult<Admission>[]): void {
  const rejected = results.filter((result) => result.status === 'rejected');
  expect(rejected).toHaveLength(0);
  const values = results.map((result) => (result as PromiseFulfilledResult<Admission>).value);
  const allowed = values.filter((value) => value.allowed);
  const denied = values.filter(
    (value): value is { allowed: false; retryAfterSeconds: number } => !value.allowed
  );
  expect(allowed).toHaveLength(1);
  expect(denied).toHaveLength(1);
  expect(Number.isInteger(denied[0].retryAfterSeconds)).toBe(true);
  expect(denied[0].retryAfterSeconds).toBeGreaterThanOrEqual(1);
  expect(denied[0].retryAfterSeconds).toBeLessThanOrEqual(60);
}

async function raceAdmit(
  harness: RecoveryDbHarness,
  endpoint: RecoveryEndpoint,
  normalizedIp: string,
  onBlocked?: (holderPid: number) => Promise<void>
): Promise<PromiseSettledResult<Admission>[]> {
  const left = storeFor(await harness.connection());
  const right = storeFor(await harness.connection());
  const held = await harness.hold(
    (tx) =>
      tx.$queryRaw`
      SELECT "id"
      FROM "recovery_rate_limit_buckets"
      WHERE "endpoint" = ${endpoint} AND "normalizedIp" = ${normalizedIp}
      FOR UPDATE
    `
  );
  const both = Promise.allSettled([
    left.admit(endpoint, normalizedIp),
    right.admit(endpoint, normalizedIp),
  ]);
  let thrown: unknown;
  try {
    await waitUntilBlockedCount(harness.client, held.pid, 2);
    if (onBlocked) await onBlocked(held.pid);
  } catch (error) {
    thrown = error;
  } finally {
    await held.release();
  }
  const results = await both;
  if (thrown) throw thrown;
  return results;
}

describe('Recovery shared-limiter concurrency (real PostgreSQL)', () => {
  jest.setTimeout(60_000);

  let harness: RecoveryDbHarness;

  beforeAll(async () => {
    harness = await RecoveryDbHarness.create();
  });

  afterAll(async () => {
    if (harness) await harness.close();
  });

  async function clockBase(): Promise<number> {
    return epochMs(await databaseNow(harness.client));
  }

  async function credentialSnapshot(userId: string) {
    const user = await harness.client.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    const resetTokens = await harness.client.passwordResetToken.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      select: { usedAt: true },
    });
    const refreshTokens = await harness.client.refreshToken.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      select: { revokedAt: true },
    });
    return { passwordHash: user?.passwordHash ?? null, resetTokens, refreshTokens };
  }

  it('admits exactly one of two clients racing the last forgot-password slot', async () => {
    const seeded = seededWindow(await clockBase(), RECOVERY_LIMITS[FORGOT] - 1, 4_000);
    const fixture = await harness.seed({
      bucket: true,
      endpoint: FORGOT,
      admittedAt: seeded,
    });

    const results = await raceAdmit(harness, FORGOT, fixture.normalizedIp);
    expectSingleAdmission(results);

    const row = await readBucket(harness.client, FORGOT, fixture.normalizedIp);
    expect(row?.admittedAt).toHaveLength(RECOVERY_LIMITS[FORGOT]);
    expect(stamp(row?.admittedAt ?? [])).toContain(seeded[0].getTime());
  });

  it('admits exactly one of two clients racing the last reset-password slot', async () => {
    const seeded = seededWindow(await clockBase(), RECOVERY_LIMITS[RESET] - 1, 4_000);
    const fixture = await harness.seed({
      bucket: true,
      endpoint: RESET,
      admittedAt: seeded,
    });

    const results = await raceAdmit(harness, RESET, fixture.normalizedIp);
    expectSingleAdmission(results);

    const row = await readBucket(harness.client, RESET, fixture.normalizedIp);
    expect(row?.admittedAt).toHaveLength(RECOVERY_LIMITS[RESET]);
    expect(stamp(row?.admittedAt ?? [])).toContain(seeded[0].getTime());
  });

  it('admits reset-password while forgot-password contenders are blocked', async () => {
    const seeded = seededWindow(await clockBase(), RECOVERY_LIMITS[FORGOT] - 1, 4_000);
    const fixture = await harness.seed({
      bucket: true,
      endpoint: FORGOT,
      admittedAt: seeded,
    });
    const ip = fixture.normalizedIp;
    try {
      const results = await raceAdmit(harness, FORGOT, ip, async (holderPid) => {
        const during = await readBucket(harness.client, FORGOT, ip);
        expect(during?.admittedAt).toHaveLength(RECOVERY_LIMITS[FORGOT] - 1);
        const reset = storeFor(await harness.connection());
        await expect(reset.admit(RESET, ip)).resolves.toEqual({ allowed: true });
        await waitUntilBlockedCount(harness.client, holderPid, 2);
      });
      expectSingleAdmission(results);
      const row = await readBucket(harness.client, FORGOT, ip);
      expect(row?.admittedAt).toHaveLength(RECOVERY_LIMITS[FORGOT]);
    } finally {
      await harness.client.recoveryRateLimitBucket.deleteMany({
        where: { endpoint: RESET, normalizedIp: ip },
      });
    }
  });

  it('a new store on a new connection denies a full persisted window', async () => {
    const seeded = seededWindow(await clockBase(), RECOVERY_LIMITS[FORGOT], 5_000);
    const fixture = await harness.seed({
      bucket: true,
      endpoint: FORGOT,
      admittedAt: seeded,
    });
    const expected = stamp(seeded);

    const first = storeFor(await harness.connection());
    const second = storeFor(await harness.connection());
    await expect(first.admit(FORGOT, fixture.normalizedIp)).resolves.toMatchObject({
      allowed: false,
    });
    const midpoint = await readBucket(harness.client, FORGOT, fixture.normalizedIp);
    expect(stamp(midpoint?.admittedAt ?? [])).toEqual(expected);

    await expect(second.admit(FORGOT, fixture.normalizedIp)).resolves.toMatchObject({
      allowed: false,
    });
    const after = await readBucket(harness.client, FORGOT, fixture.normalizedIp);
    expect(stamp(after?.admittedAt ?? [])).toEqual(expected);
  });

  it('frees a slot when the oldest admission is already outside the 60 second window', async () => {
    const seeded = seededWindow(await clockBase(), RECOVERY_LIMITS[FORGOT], 61_000);
    const oldest = seeded[0].getTime();
    const fixture = await harness.seed({
      bucket: true,
      endpoint: FORGOT,
      admittedAt: seeded,
    });

    await expect(storeFor(harness.client).admit(FORGOT, fixture.normalizedIp)).resolves.toEqual({
      allowed: true,
    });

    const row = await readBucket(harness.client, FORGOT, fixture.normalizedIp);
    expect(row?.admittedAt).toHaveLength(RECOVERY_LIMITS[FORGOT]);
    expect(stamp(row?.admittedAt ?? [])).not.toContain(oldest);
  });

  it('denies a full in-window bucket without changing its timestamps', async () => {
    const seeded = seededWindow(await clockBase(), RECOVERY_LIMITS[FORGOT], 30_000);
    const fixture = await harness.seed({
      bucket: true,
      endpoint: FORGOT,
      admittedAt: seeded,
    });
    const expected = stamp(seeded);
    const before = await databaseNow(harness.client);
    const decision = await storeFor(harness.client).admit(FORGOT, fixture.normalizedIp);
    const after = await databaseNow(harness.client);

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      const low = retryAfterSeconds(seeded[0], after);
      const high = retryAfterSeconds(seeded[0], before);
      expect(Number.isInteger(decision.retryAfterSeconds)).toBe(true);
      expect(decision.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(decision.retryAfterSeconds).toBeLessThanOrEqual(60);
      expect(decision.retryAfterSeconds).toBeGreaterThanOrEqual(Math.min(low, high) - 2);
      expect(decision.retryAfterSeconds).toBeLessThanOrEqual(Math.max(low, high) + 2);
    }
    const row = await readBucket(harness.client, FORGOT, fixture.normalizedIp);
    expect(stamp(row?.admittedAt ?? [])).toEqual(expected);
  });

  it('serializes two admits on a fully stale bucket into exactly two admissions', async () => {
    const seeded = staleWindow(await clockBase(), 3);
    const fixture = await harness.seed({
      bucket: true,
      endpoint: FORGOT,
      admittedAt: seeded,
    });

    const results = await raceAdmit(harness, FORGOT, fixture.normalizedIp);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(0);
    const values = results.map((result) => (result as PromiseFulfilledResult<Admission>).value);
    expect(values).toEqual([{ allowed: true }, { allowed: true }]);

    const rows = await harness.client.recoveryRateLimitBucket.findMany({
      where: { endpoint: FORGOT, normalizedIp: fixture.normalizedIp },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].admittedAt).toHaveLength(2);
  });

  it("leaves the seeded user's password, reset token, and refresh row unchanged", async () => {
    const full = seededWindow(await clockBase(), RECOVERY_LIMITS[FORGOT], 5_000);
    const fixture = await harness.seed({
      bucket: true,
      endpoint: FORGOT,
      admittedAt: full,
    });
    const before = await credentialSnapshot(fixture.userId);

    const denial = await storeFor(harness.client).admit(FORGOT, fixture.normalizedIp);
    expect(denial.allowed).toBe(false);

    const raceWindow = seededWindow(await clockBase(), RECOVERY_LIMITS[FORGOT] - 1, 4_000);
    await harness.client.recoveryRateLimitBucket.update({
      where: {
        endpoint_normalizedIp: { endpoint: FORGOT, normalizedIp: fixture.normalizedIp },
      },
      data: { admittedAt: raceWindow },
    });
    expectSingleAdmission(await raceAdmit(harness, FORGOT, fixture.normalizedIp));

    expect(await credentialSnapshot(fixture.userId)).toEqual(before);
    const buckets = await harness.client.recoveryRateLimitBucket.findMany({
      where: { normalizedIp: fixture.normalizedIp },
    });
    const serialized = JSON.stringify(buckets);
    expect(serialized).not.toContain(`${fixture.userId}@recovery.test`);
    expect(serialized).not.toContain('@recovery.test');
  });
});
