/**
 * SP-105I — Recovery credential concurrency suite (real PostgreSQL).
 *
 * Test-only artifact. This suite proves the SP-105 credential invariants
 * against migrated PostgreSQL using the SP-105H harness (real pooled clients,
 * fixtures and deterministic owner-lock barriers):
 *
 *   - AC1 single-use: same-token and distinct-token redemption races.
 *   - AC2 ordering: issuance/redemption, login/reset and refresh/reset in both
 *     orders, including genuine owner-lock-barrier races.
 *   - AC3 expiry-after-wait, transaction rollback and post-reset session
 *     outcomes (old password, prior families, bounded access-JWT window, SD7).
 *
 * No production code, schema, migration, HTTP envelope, limiter or browser
 * behavior is exercised here — those stay with SP-105B (controller),
 * SP-105J (limiter) and SP-105D (integrated/browser/SMTP sign-off).
 *
 * Determinism: no sleeps. Races hold the owner row through
 * `harness.hold(lockOwner)` and observe real blocked backends via
 * `pg_blocking_pids` before releasing. An unavailable `_test` database fails
 * this explicit command rather than skipping.
 */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { setTimeout as delay } from 'timers/promises';
import * as argon2 from 'argon2';
import type { PrismaClient } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { EmailProvider } from '../email/email-provider';
import { EmailVerificationService } from './email-verification.service';
import { lockOwner } from './owner-lock';
import { RecoveryDbHarness } from './testing/recovery-db-harness';
import {
  INVALID_RESET_MESSAGE,
  PasswordResetService,
  RESET_SUCCESS_MESSAGE,
  RESET_TOKEN_TTL_MS,
} from './password-reset.service';
import { ARGON2_OPTIONS, AuthService } from './auth.service';

const JWT_SECRET = 'sp105i-integration-secret';
const OLD_PASSWORD = 'OldPassw0rd!';
const NEW_PASSWORD = 'NewPassw0rd!';
const OTHER_PASSWORD = 'OtherPassw0rd!';

const sha256 = (raw: string) => createHash('sha256').update(raw).digest('hex');
const emailFor = (userId: string) => `${userId}@recovery.test`;

interface EmailStub {
  send: jest.Mock;
  tokens: string[];
}

/** Captures raw reset tokens from the detached delivery attempt (in memory only). */
function createEmailStub(): EmailStub {
  const tokens: string[] = [];
  const send = jest.fn(async (message: { text: string }) => {
    const match = /#token=([A-Za-z0-9_-]{43})/.exec(message.text);
    if (match) tokens.push(match[1]);
  });
  return { send, tokens };
}

async function waitForIssuedToken(email: EmailStub, timeoutMs = 3_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (email.tokens.length > 0) return email.tokens[email.tokens.length - 1];
    await delay(10);
  }
  throw new Error('reset email was not captured');
}

function buildPasswordReset(prisma: PrismaService, email: EmailStub): PasswordResetService {
  const config = new ConfigService({
    FRONTEND_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  });
  return new PasswordResetService(prisma, email as unknown as EmailProvider, config);
}

function buildAuth(prisma: PrismaService, jwt: JwtService): AuthService {
  return new AuthService(
    new UsersService(prisma),
    prisma,
    jwt,
    {} as unknown as EmailVerificationService
  );
}

/**
 * A `PrismaService`-shaped object whose interactive `$transaction` runs the
 * real callback but hands it a proxy whose `user.update` throws once. Every
 * other operation passes through the real transaction client, so the earlier
 * claim/retire/revoke writes execute and PostgreSQL rolls them back on throw.
 */
function failUserUpdate(tx: unknown): unknown {
  return new Proxy(tx as object, {
    get(target, property, receiver) {
      if (property === 'user') {
        const user = (target as { user: object }).user;
        return new Proxy(user, {
          get(userTarget, userProperty, userReceiver) {
            if (userProperty === 'update') {
              return () => {
                throw new Error('injected password write failure');
              };
            }
            const value = Reflect.get(userTarget, userProperty, userReceiver);
            return typeof value === 'function' ? value.bind(userTarget) : value;
          },
        });
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

type TransactionFn = (
  callback: (tx: unknown) => Promise<unknown>,
  options?: unknown
) => Promise<unknown>;

function throwingPasswordWritePrisma(base: PrismaClient): PrismaService {
  const client = base as unknown as PrismaService;
  const originalTransaction = (client.$transaction as unknown as TransactionFn).bind(client);
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === '$transaction') {
        return (callback: (tx: unknown) => Promise<unknown>, options?: unknown) =>
          originalTransaction((tx) => callback(failUserUpdate(tx)), options);
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as PrismaService;
}

/**
 * Observe real PostgreSQL contention deterministically: count backends that
 * are transitively blocked by the held owner-lock pid (a service call does not
 * expose its own pid, so this replaces H's `waitUntilBlocked` for service
 * contenders). `pg_blocking_pids` may report the lock-group leader rather than
 * the holder for queued waiters, so the transitive closure is required.
 */
async function waitUntilBlockedCount(
  client: PrismaClient,
  holderPid: number,
  expected: number,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let count = 0;
  let diagnostics: unknown;
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
    diagnostics = await client.$queryRaw`
      SELECT pid, state, wait_event_type FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'
    `;
    await delay(10);
  }
  throw new Error(
    `expected ${expected} backends blocked on the owner lock, observed ${count} :: ${JSON.stringify(
      diagnostics
    )}`
  );
}

describe('Recovery credential concurrency (real PostgreSQL)', () => {
  jest.setTimeout(60_000);

  let harness: RecoveryDbHarness;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    harness = await RecoveryDbHarness.create();
    prisma = harness.client as unknown as PrismaService;
    jwt = new JwtService({ secret: JWT_SECRET, signOptions: { expiresIn: '15m' } });
  });

  afterAll(async () => {
    if (harness) await harness.close();
  });

  /** A second, directly seeded unused reset token for the same owner. */
  async function addResetToken(
    userId: string,
    expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  ): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await harness.client.passwordResetToken.create({
      data: { userId, tokenHash: sha256(raw), expiresAt },
    });
    return raw;
  }

  async function captureOwnerState(fixture: { userId: string }) {
    const user = await harness.client.user.findUnique({
      where: { id: fixture.userId },
      select: { passwordHash: true, passwordResetRequestedAt: true },
    });
    const resetTokens = await harness.client.passwordResetToken.findMany({
      where: { userId: fixture.userId },
      orderBy: { id: 'asc' },
      select: { tokenHash: true, usedAt: true, expiresAt: true },
    });
    const refreshTokens = await harness.client.refreshToken.findMany({
      where: { userId: fixture.userId },
      orderBy: { id: 'asc' },
      select: { tokenHash: true, revokedAt: true, replacedByTokenId: true },
    });
    return { user, resetTokens, refreshTokens };
  }

  const resetDto = (token: string, password = NEW_PASSWORD) => ({
    token,
    password,
    confirmPassword: password,
  });

  // ---------------------------------------------------------------------------
  // AC1 — single-use redemption
  // ---------------------------------------------------------------------------

  it('lets exactly one of two concurrent redemptions of the same token succeed', async () => {
    const owner = await harness.seed({
      passwordHash: await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS),
    });
    const service = buildPasswordReset(prisma, createEmailStub());
    const tokenHash = sha256(owner.resetToken);

    const held = await harness.hold((tx) => lockOwner(tx, owner.userId));
    const both = Promise.allSettled([
      service.resetPassword(resetDto(owner.resetToken, NEW_PASSWORD)),
      service.resetPassword(resetDto(owner.resetToken, OTHER_PASSWORD)),
    ]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 2);
    } finally {
      await held.release();
    }
    const results = await both;

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect((fulfilled[0] as PromiseFulfilledResult<{ message: string }>).value).toEqual({
      message: RESET_SUCCESS_MESSAGE,
    });
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
    expect((rejected[0].reason as BadRequestException).message).toBe(INVALID_RESET_MESSAGE);

    const tokenRow = await harness.client.passwordResetToken.findUnique({ where: { tokenHash } });
    expect(tokenRow?.usedAt).toBeInstanceOf(Date);

    const stored = await harness.client.user.findUnique({
      where: { id: owner.userId },
      select: { passwordHash: true },
    });
    const matches = await Promise.all([
      argon2.verify(stored!.passwordHash, NEW_PASSWORD),
      argon2.verify(stored!.passwordHash, OTHER_PASSWORD),
    ]);
    expect(matches.filter(Boolean)).toHaveLength(1);

    expect(
      await harness.client.refreshToken.count({
        where: { userId: owner.userId, revokedAt: null },
      })
    ).toBe(0);
  });

  it('lets exactly one of two concurrent redemptions of distinct valid tokens succeed', async () => {
    const owner = await harness.seed();
    const otherToken = await addResetToken(owner.userId);
    const service = buildPasswordReset(prisma, createEmailStub());

    const held = await harness.hold((tx) => lockOwner(tx, owner.userId));
    const both = Promise.allSettled([
      service.resetPassword(resetDto(owner.resetToken, NEW_PASSWORD)),
      service.resetPassword(resetDto(otherToken, OTHER_PASSWORD)),
    ]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 2);
    } finally {
      await held.release();
    }
    const results = await both;

    // Both contenders settled (no token-before-owner deadlock).
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
    expect((rejected[0].reason as BadRequestException).message).toBe(INVALID_RESET_MESSAGE);

    // The winner claims its token and retires the other; the loser rolls back.
    const rows = await harness.client.passwordResetToken.findMany({
      where: { userId: owner.userId },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.usedAt !== null)).toBe(true);
    expect(
      await harness.client.refreshToken.count({
        where: { userId: owner.userId, revokedAt: null },
      })
    ).toBe(0);
  });

  it('leaves another account untouched', async () => {
    const victim = await harness.seed();
    const bystander = await harness.seed();
    const service = buildPasswordReset(prisma, createEmailStub());
    const before = await captureOwnerState(bystander);

    const held = await harness.hold((tx) => lockOwner(tx, victim.userId));
    const both = Promise.allSettled([
      service.resetPassword(resetDto(victim.resetToken, NEW_PASSWORD)),
      service.resetPassword(resetDto(victim.resetToken, OTHER_PASSWORD)),
    ]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 2);
    } finally {
      await held.release();
    }
    await both;

    expect(await captureOwnerState(bystander)).toEqual(before);
  });

  // ---------------------------------------------------------------------------
  // AC2 — cross-operation ordering
  // ---------------------------------------------------------------------------

  it('issuance before redemption retires the previously issued token', async () => {
    const owner = await harness.seed();
    const email = createEmailStub();
    const service = buildPasswordReset(prisma, email);
    const seededHash = sha256(owner.resetToken);

    await service.forgotPassword(emailFor(owner.userId));
    const fresh = await waitForIssuedToken(email);
    expect(fresh).not.toBe(owner.resetToken);

    await expect(service.resetPassword(resetDto(owner.resetToken))).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(
      (await harness.client.passwordResetToken.findUnique({ where: { tokenHash: seededHash } }))
        ?.usedAt
    ).toBeInstanceOf(Date);

    await expect(service.resetPassword(resetDto(fresh))).resolves.toEqual({
      message: RESET_SUCCESS_MESSAGE,
    });
  });

  it('redemption before issuance leaves a fresh issuance valid', async () => {
    const owner = await harness.seed();
    const email = createEmailStub();
    const service = buildPasswordReset(prisma, email);
    const seededHash = sha256(owner.resetToken);

    await service.resetPassword(resetDto(owner.resetToken));
    await service.forgotPassword(emailFor(owner.userId));

    expect(
      (await harness.client.passwordResetToken.findUnique({ where: { tokenHash: seededHash } }))
        ?.usedAt
    ).toBeInstanceOf(Date);
    expect(
      await harness.client.passwordResetToken.count({
        where: { userId: owner.userId, usedAt: null },
      })
    ).toBe(1);
  });

  it('reset before an old-password login rejects the stale credentials', async () => {
    const passwordHash = await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS);
    const owner = await harness.seed({ passwordHash });
    const service = buildPasswordReset(prisma, createEmailStub());
    const auth = buildAuth(prisma, jwt);
    const before = await harness.client.refreshToken.count({ where: { userId: owner.userId } });

    await service.resetPassword(resetDto(owner.resetToken));

    await expect(
      auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD })
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(await harness.client.refreshToken.count({ where: { userId: owner.userId } })).toBe(before);
  });

  it('login before reset has its new family revoked', async () => {
    const passwordHash = await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS);
    const owner = await harness.seed({ passwordHash });
    const service = buildPasswordReset(prisma, createEmailStub());
    const auth = buildAuth(prisma, jwt);

    const session = await auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD });
    const loginHash = sha256(session.refreshToken);
    expect(
      (await harness.client.refreshToken.findUnique({ where: { tokenHash: loginHash } }))?.revokedAt
    ).toBeNull();

    await service.resetPassword(resetDto(owner.resetToken));

    expect(
      (await harness.client.refreshToken.findUnique({ where: { tokenHash: loginHash } }))?.revokedAt
    ).toBeInstanceOf(Date);
    await expect(auth.refresh(session.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('concurrent issuance and redemption serialize on the owner lock without deadlock', async () => {
    const owner = await harness.seed();
    const bystander = await harness.seed();
    const service = buildPasswordReset(prisma, createEmailStub());
    const before = await captureOwnerState(bystander);

    const held = await harness.hold((tx) => lockOwner(tx, owner.userId));
    const both = Promise.allSettled([
      service.forgotPassword(emailFor(owner.userId)),
      service.resetPassword(resetDto(owner.resetToken)),
    ]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 2);
    } finally {
      await held.release();
    }
    const results = await both;

    // Issuance always returns its generic success; a rejection can only be the
    // uniform redemption 400 (a deadlock error would surface as something else).
    expect(results[0].status).toBe('fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(BadRequestException);
    }
    expect(await captureOwnerState(bystander)).toEqual(before);
  });

  it('concurrent login and reset leave no live session on the old password', async () => {
    const passwordHash = await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS);
    const owner = await harness.seed({ passwordHash });
    const service = buildPasswordReset(prisma, createEmailStub());
    const auth = buildAuth(prisma, jwt);

    const held = await harness.hold((tx) => lockOwner(tx, owner.userId));
    const both = Promise.allSettled([
      auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD }),
      service.resetPassword(resetDto(owner.resetToken)),
    ]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 2);
    } finally {
      await held.release();
    }
    const results = await both;

    // A valid token always resets; whichever order wins, no live session survives.
    expect(results[1].status).toBe('fulfilled');
    expect(
      await harness.client.refreshToken.count({
        where: { userId: owner.userId, revokedAt: null },
      })
    ).toBe(0);
  });

  it('eligible concurrent issuance issues a single live token', async () => {
    const owner = await harness.seed();
    const service = buildPasswordReset(prisma, createEmailStub());
    const seededHash = sha256(owner.resetToken);

    const held = await harness.hold((tx) => lockOwner(tx, owner.userId));
    const both = Promise.allSettled([
      service.forgotPassword(emailFor(owner.userId)),
      service.forgotPassword(emailFor(owner.userId)),
    ]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 2);
    } finally {
      await held.release();
    }
    const results = await both;

    // Both requests keep the identical generic success; one claims the cooldown.
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const messages = results.map(
      (r) => (r as PromiseFulfilledResult<{ message: string }>).value.message
    );
    expect(messages[0]).toBe(messages[1]);
    expect(messages[0]).toContain('If an account exists');

    // A single new redeemable token; the superseded seeded token is retired.
    expect(
      await harness.client.passwordResetToken.count({
        where: { userId: owner.userId, usedAt: null },
      })
    ).toBe(1);
    expect(
      (await harness.client.passwordResetToken.findUnique({ where: { tokenHash: seededHash } }))
        ?.usedAt
    ).toBeInstanceOf(Date);
  });

  it('refresh before reset has its successor family revoked', async () => {
    const passwordHash = await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS);
    const owner = await harness.seed({ passwordHash });
    const service = buildPasswordReset(prisma, createEmailStub());
    const auth = buildAuth(prisma, jwt);

    const session = await auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD });
    const successor = await auth.refresh(session.refreshToken);
    const successorHash = sha256(successor.refreshToken);
    expect(
      (await harness.client.refreshToken.findUnique({ where: { tokenHash: successorHash } }))
        ?.revokedAt
    ).toBeNull();

    const held = await harness.hold((tx) => lockOwner(tx, owner.userId));
    const both = Promise.allSettled([
      auth.refresh(successor.refreshToken),
      service.resetPassword(resetDto(owner.resetToken)),
    ]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 2);
    } finally {
      await held.release();
    }
    const results = await both;

    // Whichever order wins (refresh rotates in, or reset revokes first), the
    // reset leaves no live family and the rotated successor is unusable.
    expect(results[1].status).toBe('fulfilled');
    expect(
      await harness.client.refreshToken.count({
        where: { userId: owner.userId, revokedAt: null },
      })
    ).toBe(0);
    await expect(auth.refresh(successor.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // ---------------------------------------------------------------------------
  // AC3 — expiry across the lock wait, rollback and post-reset outcomes
  // ---------------------------------------------------------------------------

  it('rejects a token that expires while the redemption waits for the owner lock', async () => {
    const owner = await harness.seed({
      passwordHash: await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS),
    });
    const service = buildPasswordReset(prisma, createEmailStub());
    const tokenHash = sha256(owner.resetToken);

    const held = await harness.hold((tx) => lockOwner(tx, owner.userId));
    const settled = Promise.allSettled([service.resetPassword(resetDto(owner.resetToken))]);
    try {
      await waitUntilBlockedCount(harness.client, held.pid, 1);
      await harness.client.passwordResetToken.update({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
    } finally {
      await held.release();
    }
    const [result] = await settled;

    expect(result.status).toBe('rejected');
    expect((result as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
    expect(((result as PromiseRejectedResult).reason as BadRequestException).message).toBe(
      INVALID_RESET_MESSAGE
    );

    const stored = await harness.client.user.findUnique({
      where: { id: owner.userId },
      select: { passwordHash: true },
    });
    // The stored hash is unchanged: the expired token was never redeemed.
    expect(await argon2.verify(stored!.passwordHash, OLD_PASSWORD)).toBe(true);
    expect(await argon2.verify(stored!.passwordHash, NEW_PASSWORD)).toBe(false);
    expect(
      await harness.client.refreshToken.count({
        where: { userId: owner.userId, revokedAt: null },
      })
    ).toBe(1);
  });

  it('rolls back token claim, retirement and family revocation when the password write fails', async () => {
    const passwordHash = await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS);
    const owner = await harness.seed({ passwordHash });
    const secondToken = await addResetToken(owner.userId);
    const secondHash = sha256(secondToken);
    const service = buildPasswordReset(throwingPasswordWritePrisma(harness.client), createEmailStub());
    const passwordBefore = (
      await harness.client.user.findUnique({
        where: { id: owner.userId },
        select: { passwordHash: true },
      })
    )!.passwordHash;

    await expect(service.resetPassword(resetDto(owner.resetToken))).rejects.toThrow(
      'injected password write failure'
    );

    expect(
      (
        await harness.client.passwordResetToken.findUnique({
          where: { tokenHash: sha256(owner.resetToken) },
        })
      )?.usedAt
    ).toBeNull();
    expect(
      (await harness.client.passwordResetToken.findUnique({ where: { tokenHash: secondHash } }))
        ?.usedAt
    ).toBeNull();
    expect(
      await harness.client.refreshToken.count({
        where: { userId: owner.userId, revokedAt: null },
      })
    ).toBe(1);
    expect(
      (
        await harness.client.user.findUnique({
          where: { id: owner.userId },
          select: { passwordHash: true },
        })
      )!.passwordHash
    ).toBe(passwordBefore);
  });

  it('allows a new-password login and rejects the old password and prior family after a reset', async () => {
    const passwordHash = await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS);
    const owner = await harness.seed({ passwordHash });
    const service = buildPasswordReset(prisma, createEmailStub());
    const auth = buildAuth(prisma, jwt);

    const prior = await auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD });
    await service.resetPassword(resetDto(owner.resetToken));

    const fresh = await auth.login({ email: emailFor(owner.userId), password: NEW_PASSWORD });
    expect(fresh.accessToken).toEqual(expect.any(String));
    await expect(
      auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD })
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.refresh(prior.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('keeps a previously issued access JWT valid only for its configured expiry', async () => {
    const passwordHash = await argon2.hash(OLD_PASSWORD, ARGON2_OPTIONS);
    const owner = await harness.seed({ passwordHash });
    const service = buildPasswordReset(prisma, createEmailStub());
    const auth = buildAuth(prisma, jwt);

    const session = await auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD });
    const decoded = jwt.decode(session.accessToken) as { sub: string; iat: number; exp: number };
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
    expect(jwt.verify<{ sub: string }>(session.accessToken).sub).toBe(owner.userId);

    await service.resetPassword(resetDto(owner.resetToken));

    // No denylist (SD7): the pre-reset access JWT stays valid for its remaining TTL.
    expect(jwt.verify<{ sub: string }>(session.accessToken).sub).toBe(owner.userId);
    await expect(
      auth.login({ email: emailFor(owner.userId), password: OLD_PASSWORD })
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.refresh(session.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
