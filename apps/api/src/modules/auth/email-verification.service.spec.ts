import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationService } from './email-verification.service';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const tokenA = 'a'.repeat(43);
const tokenB = 'b'.repeat(43);
const now = new Date('2026-10-13T12:00:00Z');

// A serialized, rollback-capable transaction double exercises shared state,
// including conditional database predicates. PostgreSQL integration separately
// establishes actual row-lock behavior rather than relying on these doubles.
function database() {
  const state = {
    user: {
      id: 'owner',
      email: 'ada@example.com',
      emailVerifiedAt: null as Date | null,
      emailVerificationRequestedAt: null as Date | null,
    },
    tokens: [
      {
        id: 't1',
        userId: 'owner',
        tokenHash: hash(tokenA),
        expiresAt: new Date('2026-10-14T12:00:00Z'),
        usedAt: null as Date | null,
      },
    ],
  };
  const tx = {
    user: {
      updateMany: jest.fn(async ({ where, data }) => {
        const matches =
          (where.id ? where.id === state.user.id : where.email === state.user.email) &&
          state.user.emailVerifiedAt === null;
        const cutoff = where.OR?.[1]?.emailVerificationRequestedAt?.lte;
        if (
          !matches ||
          (cutoff &&
            state.user.emailVerificationRequestedAt &&
            state.user.emailVerificationRequestedAt > cutoff)
        )
          return { count: 0 };
        Object.assign(state.user, data);
        return { count: 1 };
      }),
      findUnique: jest.fn(async () => ({ id: state.user.id })),
    },
    emailVerificationToken: {
      findUnique: jest.fn(
        async ({ where }) => state.tokens.find((t) => t.tokenHash === where.tokenHash) ?? null
      ),
      create: jest.fn(async ({ data }) => {
        const row = { id: `t${state.tokens.length + 1}`, usedAt: null, ...data };
        state.tokens.push(row);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        let count = 0;
        for (const row of state.tokens) {
          if (
            (where.id ? row.id === where.id : row.userId === where.userId) &&
            row.usedAt === null &&
            (!where.expiresAt || row.expiresAt > where.expiresAt.gt)
          ) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
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

describe('EmailVerificationService', () => {
  let db: ReturnType<typeof database>;
  let provider: { send: jest.Mock };
  let service: EmailVerificationService;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] }).setSystemTime(now);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    db = database();
    provider = { send: jest.fn().mockResolvedValue(undefined) };
    service = new EmailVerificationService(
      db.prisma as unknown as PrismaService,
      provider,
      new ConfigService({ FRONTEND_URL: 'http://localhost:3000' })
    );
  });
  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  it('generates only a SHA256 hash for persistence with a twenty-four-hour expiry', () => {
    const prepared = service.prepareToken();
    expect(prepared.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prepared.tokenHash).toBe(hash(prepared.rawToken));
    expect(prepared.expiresAt).toEqual(new Date('2026-10-14T12:00:00Z'));
    expect(prepared.requestedAt).toEqual(now);
  });
  it('verifies the token owner and retires all outstanding tokens', async () => {
    db.state.tokens.push({ ...db.state.tokens[0], id: 't2', tokenHash: hash(tokenB) });
    await expect(service.verifyEmail(tokenA)).resolves.toEqual({
      message: 'Email verified successfully.',
    });
    expect(db.state.user.emailVerifiedAt).toEqual(now);
    expect(db.state.tokens.every((t) => t.usedAt?.getTime() === now.getTime())).toBe(true);
    expect(db.tx.user.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      db.tx.emailVerificationToken.updateMany.mock.invocationCallOrder[0]
    );
  });
  it.each(['', 'malformed', 'x'.repeat(43)])(
    'rejects malformed or unknown token %s without changing the account',
    async (token) => {
      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
      expect(db.state.user.emailVerifiedAt).toBeNull();
    }
  );
  it('rejects a used token', async () => {
    db.state.tokens[0].usedAt = now;
    await expect(service.verifyEmail(tokenA)).rejects.toThrow(/Request a new email/);
  });
  it.each([0, -1])('rejects expiry at and after the boundary (%s ms)', async (offset) => {
    db.state.tokens[0].expiresAt = new Date(now.getTime() + offset);
    await expect(service.verifyEmail(tokenA)).rejects.toThrow(BadRequestException);
    expect(db.state.user.emailVerifiedAt).toBeNull();
  });
  it.each([tokenA, tokenB])(
    'lets one concurrent confirmation succeed even for different tokens',
    async (second) => {
      db.state.tokens.push({ ...db.state.tokens[0], id: 't2', tokenHash: hash(tokenB) });
      const outcomes = await Promise.allSettled([
        service.verifyEmail(tokenA),
        service.verifyEmail(second),
      ]);
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter((r) => r.status === 'rejected')).toHaveLength(1);
    }
  );
  it('rolls back owner verification when claiming the token fails', async () => {
    db.tx.emailVerificationToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.verifyEmail(tokenA)).rejects.toThrow(BadRequestException);
    expect(db.state.user.emailVerifiedAt).toBeNull();
    expect(db.state.tokens[0].usedAt).toBeNull();
  });
  it('does not touch another account or refresh sessions', async () => {
    await service.verifyEmail(tokenA);
    expect(db.tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'owner', emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    expect(db.tx.emailVerificationToken.updateMany).toHaveBeenLastCalledWith({
      where: { userId: 'owner', usedAt: null },
      data: { usedAt: now },
    });
  });
  it('normalizes email and preserves earlier links after resend', async () => {
    await service.resendVerification('  Ada@EXAMPLE.COM  ');
    expect(db.state.tokens).toHaveLength(2);
    expect(db.state.tokens[0].usedAt).toBeNull();
    await expect(service.verifyEmail(tokenA)).resolves.toBeDefined();
  });
  it('returns identical generic success for unknown verified throttled and eligible addresses', async () => {
    const eligible = await service.resendVerification('ada@example.com');
    const throttled = await service.resendVerification('ada@example.com');
    const unknown = await service.resendVerification('unknown@example.com');
    db.state.user.emailVerifiedAt = now;
    const verified = await service.resendVerification('ada@example.com');
    expect([throttled, unknown, verified]).toEqual([eligible, eligible, eligible]);
    expect(db.state.tokens).toHaveLength(2);
  });
  it('includes registration in cooldown, does not extend it, and permits the sixty-second boundary', async () => {
    db.state.user.emailVerificationRequestedAt = now;
    jest.setSystemTime(new Date(now.getTime() + 59_999));
    await service.resendVerification('ada@example.com');
    expect(db.state.tokens).toHaveLength(1);
    expect(db.state.user.emailVerificationRequestedAt).toEqual(now);
    jest.setSystemTime(new Date(now.getTime() + 60_000));
    await service.resendVerification('ada@example.com');
    expect(db.state.tokens).toHaveLength(2);
  });
  it('allows only one concurrent resend and persists cooldown across service instances', async () => {
    const another = new EmailVerificationService(
      db.prisma as unknown as PrismaService,
      provider,
      new ConfigService()
    );
    await Promise.all([
      service.resendVerification('ada@example.com'),
      another.resendVerification('ada@example.com'),
    ]);
    expect(db.state.tokens).toHaveLength(2);
    await another.resendVerification('ada@example.com');
    expect(db.state.tokens).toHaveLength(2);
  });
  it('leaves no redeemable token when resend races confirmation', async () => {
    await Promise.all([service.resendVerification('ada@example.com'), service.verifyEmail(tokenA)]);
    expect(db.state.tokens.every((t) => t.usedAt !== null)).toBe(true);
    expect(db.state.user.emailVerifiedAt).toEqual(now);
  });
  it('rolls back the cooldown on token persistence failure and still returns generic success', async () => {
    db.tx.emailVerificationToken.create.mockRejectedValueOnce(new Error('database unavailable'));
    const result = await service.resendVerification('ada@example.com');
    expect(result).toMatchObject({ message: expect.stringContaining('If this email') });
    expect(db.state.user.emailVerificationRequestedAt).toBeNull();
  });
  it('does not await SMTP and handles failure without exposing recipients or tokens', async () => {
    provider.send.mockRejectedValue(new Error(`recipient ada@example.com token ${tokenA}`));
    const result = await service.resendVerification('ada@example.com');
    expect(result).toMatchObject({ message: expect.stringContaining('If this email') });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(db.state.tokens[0].usedAt).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/ada@example.com|aaaaa/);
    provider.send.mockImplementation(() => new Promise(() => undefined));
    jest.setSystemTime(new Date(now.getTime() + 60_000));
    await expect(service.resendVerification('ada@example.com')).resolves.toEqual(result);
  });
  it('composes a trusted fragment link only during the detached delivery attempt', async () => {
    service.sendVerification('ada@example.com', tokenA);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(provider.send).toHaveBeenCalledWith({
      to: 'ada@example.com',
      subject: expect.stringContaining('Verify'),
      text: expect.stringContaining(`http://localhost:3000/verify-email#token=${tokenA}`),
    });
  });
});
