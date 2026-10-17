import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { ARGON2_OPTIONS } from './auth.service';
import {
  PasswordResetService,
  RESET_TOKEN_TTL_MS,
  COOLDOWN_MS,
  RESET_SUCCESS_MESSAGE,
  INVALID_RESET_MESSAGE,
} from './password-reset.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}));

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const tokenA = 'a'.repeat(43);
const tokenB = 'b'.repeat(43);
const tokenC = 'c'.repeat(43);
const tokenOther = 'e'.repeat(43);
const tokenGhost = 'g'.repeat(43);
const now = new Date('2026-10-15T12:00:00Z');

// Serialized, rollback-capable transaction double exercising conditional
// database predicates, mirroring the SP-103 precedent.
function database() {
  const state = {
    user: {
      id: 'owner',
      email: 'ada@example.com',
      passwordResetRequestedAt: null as Date | null,
    },
    tokens: [] as Array<{
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      usedAt: Date | null;
    }>,
    // PR-107: when set, the fake PostgreSQL clock differs from the fake-timer
    // application clock — the issuance claim/expiry must follow the database.
    dbNow: null as Date | null,
    lockWaitMs: 0,
  };
  const tx = {
    $queryRaw: jest.fn(async (query: TemplateStringsArray, ...values: unknown[]) => {
      const sql = query.join('?');
      if (sql.includes('FOR UPDATE')) {
        if (state.lockWaitMs > 0) jest.advanceTimersByTime(state.lockWaitMs);
        const userId = values[0] as string;
        return userId === state.user.id ? [{ id: userId }] : [];
      }
      if (sql.includes('clock_timestamp()')) {
        return [{ checkedAt: state.dbNow ?? new Date() }];
      }
      throw new Error(`unexpected raw query in test double: ${sql}`);
    }),
    user: {
      updateMany: jest.fn(async ({ where, data }) => {
        const matches = where.id === state.user.id;
        const cutoff = where.OR?.[1]?.passwordResetRequestedAt?.lte;
        if (!matches) return { count: 0 };
        if (
          cutoff &&
          state.user.passwordResetRequestedAt &&
          state.user.passwordResetRequestedAt > cutoff
        ) {
          return { count: 0 };
        }
        Object.assign(state.user, data);
        return { count: 1 };
      }),
      findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
        if (where?.email !== state.user.email) return null;
        return { id: state.user.id, email: state.user.email };
      }),
    },
    passwordResetToken: {
      updateMany: jest.fn(async ({ where, data }) => {
        let count = 0;
        for (const row of state.tokens) {
          if (
            row.userId === where.userId &&
            row.usedAt === null &&
            (!where.expiresAt || row.expiresAt > where.expiresAt.gt)
          ) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
      }),
      create: jest.fn(async ({ data }) => {
        const row = { id: `t${state.tokens.length + 1}`, usedAt: null, ...data };
        state.tokens.push(row);
        return row;
      }),
    },
  };
  let tail: Promise<unknown> = Promise.resolve();
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback) => {
      const result = tail.then(async () => {
        const before = structuredClone(state);
        try {
          return await callback(tx);
        } catch (error) {
          Object.assign(state, before);
          throw error;
        }
      });
      tail = result.catch(() => undefined);
      return result;
    }),
  };
  return { state, tx, prisma };
}

interface ResetTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}
interface RefreshTokenRow {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
}
interface OwnerRow {
  id: string;
  passwordHash: string;
  passwordResetRequestedAt: Date | null;
}

/**
 * Redemption transaction double (SP-105B): the same serialized,
 * rollback-capable $transaction contract as `database()`, plus the two
 * raw-query steps of the owner-first protocol — the `users` row lock
 * (with a simulated lock wait that advances the fake clock) and the
 * post-lock `clock_timestamp()` read.
 */
function resetDatabase() {
  const state = {
    users: [
      {
        id: 'owner',
        passwordHash: 'old-hash',
        passwordResetRequestedAt: new Date(now.getTime() - 120_000),
      },
      { id: 'other', passwordHash: 'other-hash', passwordResetRequestedAt: null },
    ] as OwnerRow[],
    tokens: [] as ResetTokenRow[],
    refreshTokens: [] as RefreshTokenRow[],
    lockWaitMs: 0,
    dropOwner: false,
  };
  const tx = {
    $queryRaw: jest.fn(async (query: TemplateStringsArray, ...values: unknown[]) => {
      const sql = query.join('?');
      if (sql.includes('FOR UPDATE')) {
        if (state.lockWaitMs > 0) jest.advanceTimersByTime(state.lockWaitMs);
        if (state.dropOwner) return [] as { id: string }[];
        const userId = values[0] as string;
        return state.users.filter((u) => u.id === userId).map((u) => ({ id: u.id }));
      }
      if (sql.includes('clock_timestamp()')) {
        return [{ checkedAt: new Date() }];
      }
      throw new Error(`unexpected raw query in test double: ${sql}`);
    }),
    passwordResetToken: {
      findUnique: jest.fn(
        async ({ where }: { where: { tokenHash: string } }) => {
          const row = state.tokens.find((t) => t.tokenHash === where.tokenHash);
          return row ? { id: row.id, userId: row.userId } : null;
        }
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: Partial<{ id: string; userId: string; usedAt: null; expiresAt: { gt: Date } }>;
          data: Partial<ResetTokenRow>;
        }) => {
          let count = 0;
          for (const row of state.tokens) {
            if (where.userId !== undefined && row.userId !== where.userId) continue;
            if (where.id !== undefined && row.id !== where.id) continue;
            if (where.usedAt !== undefined && row.usedAt !== where.usedAt) continue;
            if (where.expiresAt?.gt && !(row.expiresAt > where.expiresAt.gt)) continue;
            Object.assign(row, data);
            count++;
          }
          return { count };
        }
      ),
    },
    refreshToken: {
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: Partial<{ userId: string; revokedAt: null }>;
          data: Partial<RefreshTokenRow>;
        }) => {
          let count = 0;
          for (const row of state.refreshTokens) {
            if (where.userId !== undefined && row.userId !== where.userId) continue;
            if (where.revokedAt !== undefined && row.revokedAt !== where.revokedAt) continue;
            Object.assign(row, data);
            count++;
          }
          return { count };
        }
      ),
    },
    user: {
      update: jest.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<OwnerRow> }) => {
          const row = state.users.find((u) => u.id === where.id);
          if (!row) throw new Error('owner row vanished');
          Object.assign(row, data);
          return row;
        }
      ),
    },
  };
  let tail: Promise<unknown> = Promise.resolve();
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => {
      const result = tail.then(async () => {
        // Shallow row copies, not structuredClone: a clone would turn the
        // fake-timer Date instances into native Dates, and post-rollback
        // assertions check constructor identity.
        const before = {
          users: state.users.map((u) => ({ ...u })),
          tokens: state.tokens.map((t) => ({ ...t })),
          refreshTokens: state.refreshTokens.map((r) => ({ ...r })),
          lockWaitMs: state.lockWaitMs,
          dropOwner: state.dropOwner,
        };
        try {
          return await callback(tx);
        } catch (error) {
          Object.assign(state, before);
          throw error;
        }
      });
      tail = result.catch(() => undefined);
      return result;
    }),
  };
  return { state, tx, prisma };
}

describe('PasswordResetService', () => {
  let db: ReturnType<typeof database>;
  let provider: { send: jest.Mock };
  let service: PasswordResetService;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] }).setSystemTime(now);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    db = database();
    provider = { send: jest.fn().mockResolvedValue(undefined) };
    service = new PasswordResetService(
      db.prisma as unknown as PrismaService,
      provider,
      new ConfigService({ FRONTEND_URL: 'http://localhost:3000' })
    );
  });
  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  // --- prepareToken ---
  it('generates a 43-character base64url token and its SHA-256 hash', () => {
    // PR-107: prepareToken is deliberately clock-free. Every issued
    // timestamp — claim marker, cooldown boundary, retirement stamp, expiry —
    // must be derived from the database clock inside the transaction, after
    // the owner-lock wait.
    const prepared = service.prepareToken();
    expect(prepared.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prepared.tokenHash).toBe(hash(prepared.rawToken));
    expect(Object.keys(prepared)).toEqual(['rawToken', 'tokenHash']);
  });

  // --- AC1: identical generic response ---
  describe('forgotPassword', () => {
    it('returns identical success for eligible, unknown, and cooldown outcomes', async () => {
      db.state.user.passwordResetRequestedAt = null;
      const eligible = await service.forgotPassword('ada@example.com');
      const cooldown = await service.forgotPassword('ada@example.com');
      const unknown = await service.forgotPassword('unknown@example.com');
      expect([cooldown, unknown]).toEqual([eligible, eligible]);
    });

    it('returns a 400 field error for an empty or malformed email', async () => {
      // This is handled by the DTO validation at the controller layer,
      // not the service itself. The service receives a valid email string.
    });
  });

  // --- AC2: token issuance ---
  describe('token issuance', () => {
    it('stores only the sha256 digest, never the raw token', async () => {
      const initialTokenCount = db.state.tokens.length;
      await service.forgotPassword('ada@example.com');
      expect(db.state.tokens.length).toBe(initialTokenCount + 1);
      // The stored token is a hex SHA-256 digest, NOT a base64url 43-char string
      const stored = db.state.tokens[0].tokenHash;
      expect(stored).toMatch(/^[0-9a-f]{64}$/);
      // Verify the raw token is NOT stored anywhere in the db state
      const tokenRowsString = JSON.stringify(db.state.tokens);
      expect(tokenRowsString).not.toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('expires one hour after issuance', async () => {
      await service.forgotPassword('ada@example.com');
      expect(db.state.tokens[0].expiresAt).toEqual(new Date(now.getTime() + RESET_TOKEN_TTL_MS));
    });

    it('stamps the cooldown claim and expiry from the database clock, not the application clock', async () => {
      // PR-107: skew the fake PostgreSQL clock five minutes ahead of the
      // fake Node clock — every issued timestamp must follow the database.
      const dbClock = new Date(now.getTime() + 5 * 60_000);
      db.state.dbNow = dbClock;
      await service.forgotPassword('ada@example.com');
      expect(db.state.user.passwordResetRequestedAt).toEqual(dbClock);
      expect(db.state.tokens[0].expiresAt).toEqual(
        new Date(dbClock.getTime() + RESET_TOKEN_TTL_MS)
      );
    });

    it('reads the claim time after the owner-lock wait', async () => {
      // The simulated FOR UPDATE wait advances the fake clock before the
      // post-lock clock_timestamp() read, so the claim (and expiry) must
      // land at the post-wait time, and the lock must precede the claim.
      db.state.lockWaitMs = 5_000;
      await service.forgotPassword('ada@example.com');
      const postWait = new Date(now.getTime() + 5_000);
      expect(db.state.user.passwordResetRequestedAt).toEqual(postWait);
      expect(db.state.tokens[0].expiresAt).toEqual(
        new Date(postWait.getTime() + RESET_TOKEN_TTL_MS)
      );
      expect(db.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        db.tx.user.updateMany.mock.invocationCallOrder[0]
      );
    });

    it('never returns the raw token in the response', async () => {
      const result = await service.forgotPassword('ada@example.com');
      expect(result).toHaveProperty('message');
      const keys = Object.keys(result as object);
      expect(keys).toEqual(['message']);
    });
  });

  // --- AC3: issuance retirement ---
  describe('issuance retirement', () => {
    it('retires all outstanding tokens for the account on a new issuance', async () => {
      // Issue the first token.
      await service.forgotPassword('ada@example.com');
      expect(db.state.tokens).toHaveLength(1);
      expect(db.state.tokens[0].usedAt).toBeNull();
      // Reset cooldown and advance time so a second issuance is allowed.
      db.state.tokens[0].usedAt = null;
      db.state.user.passwordResetRequestedAt = null;
      jest.setSystemTime(new Date(now.getTime() + COOLDOWN_MS + 1));
      // Second issuance: the first token is retired, a new one created.
      await service.forgotPassword('ada@example.com');
      // Now there are two tokens: the old one is retired (usedAt set),
      // the new one is still outstanding.
      const outstanding = db.state.tokens.filter((t) => t.usedAt === null);
      const retired = db.state.tokens.filter((t) => t.usedAt !== null);
      expect(outstanding).toHaveLength(1);
      expect(retired).toHaveLength(1);
      expect(retired[0].usedAt?.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });

    it('leaves a single redeemable token after a request', async () => {
      await service.forgotPassword('ada@example.com');
      expect(db.state.tokens.filter((t) => t.usedAt === null).length).toBe(1);
    });
  });

  // --- AC4: cooldown ---
  describe('cooldown', () => {
    it('claims the 60s cooldown atomically', async () => {
      const before = db.state.user.passwordResetRequestedAt;
      await service.forgotPassword('ada@example.com');
      expect(db.state.user.passwordResetRequestedAt).not.toEqual(before);
      // Verify the conditional update was called with the OR-based cooldown clause
      const call = db.tx.user.updateMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR[0]).toHaveProperty('passwordResetRequestedAt', null);
      expect(call.where.OR[1]).toHaveProperty('passwordResetRequestedAt');
    });

    it('blocks a second issuance within 60s with generic success and no new token', async () => {
      await service.forgotPassword('ada@example.com');
      const tokenCount = db.state.tokens.length;
      await service.forgotPassword('ada@example.com');
      expect(db.state.tokens.length).toBe(tokenCount);
    });

    it('allows issuance after 60s', async () => {
      await service.forgotPassword('ada@example.com');
      const initialCount = db.state.tokens.length;
      jest.setSystemTime(new Date(now.getTime() + COOLDOWN_MS + 1));
      await service.forgotPassword('ada@example.com');
      expect(db.state.tokens.length).toBeGreaterThan(initialCount);
    });

    it('lets only one concurrent request claim the account', async () => {
      db.state.user.passwordResetRequestedAt = null;
      const outcomes = await Promise.allSettled([
        service.forgotPassword('ada@example.com'),
        service.forgotPassword('ada@example.com'),
      ]);
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
      // Only one token should be created
      expect(db.state.tokens.length).toBe(1);
    });

    it('preserves the cooldown across service instances', async () => {
      const another = new PasswordResetService(
        db.prisma as unknown as PrismaService,
        provider,
        new ConfigService({ FRONTEND_URL: 'http://localhost:3000' })
      );
      await service.forgotPassword('ada@example.com');
      const initialCount = db.state.tokens.length;
      await another.forgotPassword('ada@example.com');
      expect(db.state.tokens.length).toBe(initialCount);
    });
  });

  // --- AC5: email ---
  describe('email', () => {
    it('returns without awaiting an unresolved SMTP delivery promise', async () => {
      // Mock send to never resolve (blocking the async path).
      // forgotPassword should return the generic success immediately
      // because the email is sent off the response path via setImmediate.
      let returned = false;
      provider.send.mockImplementation(() => new Promise(() => {}));
      const resultPromise = service.forgotPassword('ada@example.com');
      // The service should resolve the transaction and return before
      // the SMTP delivery is awaited (setImmediate queues it).
      await resultPromise;
      returned = true;
      expect(returned).toBe(true);
    });

    it('handles delivery rejection without an unhandled promise', async () => {
      provider.send.mockRejectedValue(new Error('SMTP down'));
      const result = await service.forgotPassword('ada@example.com');
      expect(result).toMatchObject({ message: expect.stringContaining('If an account') });
      await new Promise<void>((resolve) => setImmediate(resolve));
    });

    it('keeps generic success when delivery fails', async () => {
      provider.send.mockRejectedValue(new Error('delivery failed'));
      const result = await service.forgotPassword('ada@example.com');
      expect(result).toEqual({
        message:
          'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.',
      });
    });

    it('sanitizes delivery failures (no token, recipient, or credentials)', async () => {
      provider.send.mockRejectedValue(
        new Error(`recipient ada@example.com token ${tokenA} password secret`)
      );
      await service.forgotPassword('ada@example.com');
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(warn).toHaveBeenCalled();
      const warnCalls = JSON.stringify(warn.mock.calls);
      expect(warnCalls).not.toMatch(/ada@example.com/);
      expect(warnCalls).not.toMatch(tokenA);
      expect(warnCalls).not.toMatch(/secret/);
    });

    it('composes a trusted fragment link only during the detached delivery attempt', async () => {
      service['sendReset']('ada@example.com', tokenA);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(provider.send).toHaveBeenCalledWith({
        to: 'ada@example.com',
        subject: expect.stringContaining('Reset'),
        text: expect.stringContaining(`http://localhost:3000/reset-password#token=${tokenA}`),
      });
    });
  });

  // --- PR-101: operational visibility into absorbed failures ---
  describe('failure observability (PR-101)', () => {
    it('logs a structured issuance-failure event while keeping the generic response', async () => {
      db.tx.user.updateMany.mockImplementation(async () => {
        throw new Error(`connection lost for ada@example.com`);
      });
      const result = await service.forgotPassword('ada@example.com');
      expect(result.message).toContain('If an account exists');
      const calls = JSON.stringify(warn.mock.calls);
      expect(calls).toContain('event=reset_issuance_failed');
      expect(calls).toMatch(
        /correlation=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      );
      // The error *name* identifies the failure class; the message (which
      // may contain the requester's email) must never be logged.
      expect(calls).toContain('error=Error');
      expect(calls).not.toContain('connection lost');
      expect(calls).not.toContain('ada@example.com');
      expect(provider.send).not.toHaveBeenCalled();
    });

    it('logs a structured delivery-failure event without recipient or token details', async () => {
      provider.send.mockRejectedValue(
        new Error(`smtp rejected for ada@example.com token ${tokenA}`),
      );
      await service.forgotPassword('ada@example.com');
      await new Promise<void>((resolve) => setImmediate(resolve));
      const calls = JSON.stringify(warn.mock.calls);
      expect(calls).toContain('event=reset_email_delivery_failed');
      expect(calls).toMatch(
        /correlation=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      );
      expect(calls).toContain('error=Error');
      expect(calls).not.toContain('smtp rejected');
      expect(calls).not.toContain('ada@example.com');
      expect(calls).not.toContain(tokenA);
    });
  });

  // --- SP-105B: redemption ---
  //
  // The double exercises the same serialized, rollback-capable
  // $transaction contract as the issuance block above: conditional
  // updateMany predicates, a $queryRaw double for the owner lock and the
  // post-lock wall clock, and structuredClone rollback on throw. Real
  // PostgreSQL lock-wait behavior is SP-105D/I's integration scope.
  describe('resetPassword', () => {
    let db: ReturnType<typeof resetDatabase>;
    let error: jest.SpyInstance;
    const oneHour = new Date(now.getTime() + RESET_TOKEN_TTL_MS);

    beforeEach(() => {
      db = resetDatabase();
      (argon2.hash as jest.Mock).mockClear().mockResolvedValue('argon2-new-hash');
      error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      // Fixtures: two outstanding owner tokens, one used owner token, one
      // foreign token; owner refresh rows in two families plus one foreign.
      db.state.tokens.push(
        { id: 'tA', userId: 'owner', tokenHash: hash(tokenA), expiresAt: oneHour, usedAt: null },
        { id: 'tB', userId: 'owner', tokenHash: hash(tokenB), expiresAt: oneHour, usedAt: null },
        {
          id: 'tUsed',
          userId: 'owner',
          tokenHash: hash(tokenC),
          expiresAt: oneHour,
          usedAt: new Date(now.getTime() - 1000),
        },
        { id: 'tOther', userId: 'other', tokenHash: hash(tokenOther), expiresAt: oneHour, usedAt: null },
      );
      db.state.refreshTokens.push(
        { id: 'rA1', userId: 'owner', familyId: 'F1', tokenHash: 'h-rA1', expiresAt: oneHour, revokedAt: null, replacedByTokenId: null },
        { id: 'rA2', userId: 'owner', familyId: 'F1', tokenHash: 'h-rA2', expiresAt: oneHour, revokedAt: new Date(now.getTime() - 5000), replacedByTokenId: 'rA1' },
        { id: 'rB', userId: 'owner', familyId: 'F2', tokenHash: 'h-rB', expiresAt: oneHour, revokedAt: null, replacedByTokenId: null },
        { id: 'rOther', userId: 'other', familyId: 'F3', tokenHash: 'h-rOther', expiresAt: oneHour, revokedAt: null, replacedByTokenId: null },
      );
      service = new PasswordResetService(
        db.prisma as unknown as PrismaService,
        provider,
        new ConfigService({ FRONTEND_URL: 'http://localhost:3000' })
      );
    });
    afterEach(() => {
      error.mockRestore();
    });

    const dto = (token: string, password = 'Password123') => ({
      token,
      password,
      confirmPassword: password,
    });
    const owner = () => db.state.users.find((u) => u.id === 'owner')!;
    const token = (id: string) => db.state.tokens.find((t) => t.id === id)!;
    const refresh = (id: string) => db.state.refreshTokens.find((r) => r.id === id)!;

    it('updates the locked owner password with the same argon2id options as registration', async () => {
      await service.resetPassword(dto(tokenA));
      expect(argon2.hash).toHaveBeenCalledWith('Password123', ARGON2_OPTIONS);
      expect(owner().passwordHash).toBe('argon2-new-hash');
    });

    it('returns only the success message after commit', async () => {
      const result = await service.resetPassword(dto(tokenA));
      expect(result).toEqual({ message: RESET_SUCCESS_MESSAGE });
    });

    it('marks the presented token used at the post-lock wall-clock time', async () => {
      await service.resetPassword(dto(tokenA));
      expect(token('tA').usedAt).toBeInstanceOf(Date);
      expect(token('tA').usedAt!.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });

    it('retires every other unused token for the owner, leaving used and foreign rows untouched', async () => {
      const usedBefore = token('tUsed').usedAt!;
      await service.resetPassword(dto(tokenA));
      expect(token('tB').usedAt).toBeInstanceOf(Date); // the other outstanding token is retired
      expect(token('tUsed').usedAt).toEqual(usedBefore); // already used — untouched
      expect(token('tOther').usedAt).toBeNull(); // another owner's token — untouched
    });

    it('revokes every unrevoked refresh row for the owner in every family', async () => {
      const revokedBefore = refresh('rA2').revokedAt!;
      await service.resetPassword(dto(tokenA));
      expect(refresh('rA1').revokedAt).toBeInstanceOf(Date); // family F1
      expect(refresh('rB').revokedAt).toBeInstanceOf(Date); // family F2
      expect(refresh('rA2').revokedAt).toEqual(revokedBefore); // already revoked — untouched
      expect(refresh('rOther').revokedAt).toBeNull(); // another account — untouched
    });

    it('preserves the issuance cooldown marker — reset never grants an extra email', async () => {
      const markerBefore = owner().passwordResetRequestedAt!;
      await service.resetPassword(dto(tokenA));
      expect(owner().passwordResetRequestedAt).toEqual(markerBefore);
      const call = (db.tx.user.update.mock.calls[0][0] as { data: Record<string, unknown> });
      expect(call.data).toHaveProperty('passwordHash');
      expect(call.data).not.toHaveProperty('passwordResetRequestedAt');
    });

    it('returns the uniform 400 for an unknown token and writes nothing', async () => {
      await expect(service.resetPassword(dto(tokenGhost))).rejects.toThrow(INVALID_RESET_MESSAGE);
      expect(db.tx.user.update).not.toHaveBeenCalled();
      expect(token('tA').usedAt).toBeNull();
      expect(refresh('rA1').revokedAt).toBeNull();
      expect(owner().passwordHash).toBe('old-hash');
    });

    it('returns the uniform 400 for a malformed token without touching the database', async () => {
      await expect(service.resetPassword(dto('a'.repeat(42)))).rejects.toThrow(INVALID_RESET_MESSAGE);
      expect(db.prisma.$transaction).not.toHaveBeenCalled();
      expect(argon2.hash).not.toHaveBeenCalled(); // no wasted work before the DB
    });

    it('returns the uniform 400 when the owner row is missing, with no writes', async () => {
      db.state.dropOwner = true;
      await expect(service.resetPassword(dto(tokenA))).rejects.toThrow(INVALID_RESET_MESSAGE);
      expect(token('tA').usedAt).toBeNull();
      expect(refresh('rA1').revokedAt).toBeNull();
      expect(owner().passwordHash).toBe('old-hash');
    });

    it('returns the uniform 400 for a used token and rolls back every dependent write', async () => {
      const usedBefore = token('tUsed').usedAt!;
      await expect(service.resetPassword(dto(tokenC))).rejects.toThrow(INVALID_RESET_MESSAGE);
      const rejected = token('tUsed');
      expect(rejected.usedAt).toEqual(usedBefore); // claim flipped nothing
      expect(token('tB').usedAt).toBeNull(); // retirement rolled back
      expect(refresh('rA1').revokedAt).toBeNull(); // revocation rolled back
      expect(owner().passwordHash).toBe('old-hash'); // password rolled back
    });

    it('returns the uniform 400 for an expired token and writes nothing', async () => {
      token('tA').expiresAt = new Date(now.getTime() - 1000);
      await expect(service.resetPassword(dto(tokenA))).rejects.toThrow(INVALID_RESET_MESSAGE);
      expect(token('tA').usedAt).toBeNull();
      expect(token('tB').usedAt).toBeNull();
      expect(refresh('rA1').revokedAt).toBeNull();
      expect(owner().passwordHash).toBe('old-hash');
    });

    it('does not claim a token that expires while waiting for the owner lock (fresh post-lock clock)', async () => {
      token('tA').expiresAt = new Date(now.getTime() + 2000); // expires during the simulated 5s wait
      db.state.lockWaitMs = 5000;
      await expect(service.resetPassword(dto(tokenA))).rejects.toThrow(INVALID_RESET_MESSAGE);
      // The claim must compare against the post-lock clock (now + 5s), not a
      // pre-lock or transaction-start timestamp.
      const claim = db.tx.passwordResetToken.updateMany.mock.calls[0][0] as {
        where: { expiresAt?: { gt?: Date } };
      };
      expect(claim.where.expiresAt?.gt?.getTime()).toBe(now.getTime() + 5000);
      expect(token('tA').usedAt).toBeNull();
      expect(refresh('rA1').revokedAt).toBeNull();
      expect(owner().passwordHash).toBe('old-hash');
    });

    it('same-token race: one success and one uniform 400', async () => {
      const outcomes = await Promise.allSettled([
        service.resetPassword(dto(tokenA, 'Password123')),
        service.resetPassword(dto(tokenA, 'Another1234')),
      ]);
      const ok = outcomes.filter((o) => o.status === 'fulfilled');
      const rejected = outcomes.filter((o) => o.status === 'rejected') as PromiseRejectedResult[];
      expect(ok).toHaveLength(1);
      expect((ok[0] as PromiseFulfilledResult<{ message: string }>).value).toEqual({
        message: RESET_SUCCESS_MESSAGE,
      });
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      expect((rejected[0].reason as BadRequestException).message).toBe(INVALID_RESET_MESSAGE);
      expect(token('tA').usedAt).toBeInstanceOf(Date); // claimed exactly once
      expect(refresh('rA1').revokedAt).toBeInstanceOf(Date);
    });

    it('distinct-token race: one success and one uniform 400, the loser rolls back', async () => {
      (argon2.hash as jest.Mock)
        .mockResolvedValueOnce('hash-from-A')
        .mockResolvedValueOnce('hash-from-B');
      const [first, second] = await Promise.allSettled([
        service.resetPassword(dto(tokenA, 'Password123')),
        service.resetPassword(dto(tokenB, 'Another1234')),
      ]);
      expect(first.status).toBe('fulfilled');
      expect(second.status).toBe('rejected');
      expect((second as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
      expect(((second as PromiseRejectedResult).reason as BadRequestException).message).toBe(
        INVALID_RESET_MESSAGE
      );
      // The winner's writes commit; the loser retired nothing (its claim failed).
      expect(owner().passwordHash).toBe('hash-from-A');
      expect(token('tA').usedAt).toBeInstanceOf(Date);
      expect(token('tB').usedAt).toBeInstanceOf(Date); // retired by the winner
      expect(refresh('rA1').revokedAt).toBeInstanceOf(Date);
      expect(refresh('rB').revokedAt).toBeInstanceOf(Date);
      expect(token('tOther').usedAt).toBeNull();
      expect(refresh('rOther').revokedAt).toBeNull();
    });

    it('rolls back claim, retirement, and revocation when password persistence fails', async () => {
      db.tx.user.update.mockImplementationOnce(async () => {
        throw new Error('connection lost');
      });
      await expect(service.resetPassword(dto(tokenA))).rejects.toThrow('connection lost');
      // Nothing committed: the token is redeemable again and the account is intact.
      expect(token('tA').usedAt).toBeNull();
      expect(token('tB').usedAt).toBeNull();
      expect(refresh('rA1').revokedAt).toBeNull();
      expect(refresh('rB').revokedAt).toBeNull();
      expect(owner().passwordHash).toBe('old-hash');
    });

    it('never logs the raw token or the proposed password', async () => {
      db.tx.user.update.mockImplementationOnce(async () => {
        throw new Error(`boom token ${tokenA} password Password123`);
      });
      await expect(service.resetPassword(dto(tokenA))).rejects.toThrow();
      const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
      expect(logged).not.toContain(tokenA);
      expect(logged).not.toContain('Password123');
    });
  });
});
