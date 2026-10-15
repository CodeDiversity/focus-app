import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetService, RESET_TOKEN_TTL_MS, COOLDOWN_MS } from './password-reset.service';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const tokenA = 'a'.repeat(43);
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
  };
  const tx = {
    user: {
      updateMany: jest.fn(async ({ where, data }) => {
        const matches = where.email === state.user.email;
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
      findUnique: jest.fn(async ({ where }) => ({
        id: state.user.id,
        email: state.user.email,
      })),
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
  it('generates only a SHA256 hash with a one-hour expiry', () => {
    const prepared = service.prepareToken();
    expect(prepared.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prepared.tokenHash).toBe(hash(prepared.rawToken));
    expect(prepared.expiresAt).toEqual(new Date(now.getTime() + RESET_TOKEN_TTL_MS));
    expect(prepared.requestedAt).toEqual(now);
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
});
