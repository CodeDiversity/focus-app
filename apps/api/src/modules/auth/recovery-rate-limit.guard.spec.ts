import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RecoveryRateLimitStore, RECOVERY_UNAVAILABLE_MESSAGE } from './recovery-rate-limit.store';
import {
  RecoveryRateLimitGuard,
  RATE_LIMITED_MESSAGE,
  normalizeSourceIp,
} from './recovery-rate-limit.guard';

function makeStore(allowed: boolean, retryAfterSeconds = 25, throws = false) {
  // Mirrors the real store contract: storage failures already surface as the
  // sanitized 503 before the guard ever sees them.
  return {
    admit: jest.fn(async () => {
      if (throws) throw new ServiceUnavailableException(RECOVERY_UNAVAILABLE_MESSAGE);
      return allowed
        ? ({ allowed: true } as const)
        : ({ allowed: false, retryAfterSeconds } as const);
    }),
  } as unknown as RecoveryRateLimitStore;
}

function makeContext(opts: { path: string; ip?: string; xff?: string }) {
  const setHeader = jest.fn();
  const request = {
    method: 'POST',
    path: opts.path,
    ip: opts.ip,
    headers: opts.xff ? { 'x-forwarded-for': opts.xff } : {},
  } as Partial<Request>;
  const response = { setHeader } as unknown as Response;
  const context = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
  return { context, setHeader };
}

function makeGuard(store: RecoveryRateLimitStore) {
  return new RecoveryRateLimitGuard(store);
}

async function expectRateLimited429(promise: Promise<unknown>) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(HttpException);
  const httpError = error as HttpException;
  expect(httpError.getStatus()).toBe(429);
  expect(httpError.getResponse()).toEqual({
    statusCode: 429,
    message: RATE_LIMITED_MESSAGE,
    error: 'Too Many Requests',
  });
}

async function expectSanitized503(promise: Promise<unknown>) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(ServiceUnavailableException);
  const httpError = error as ServiceUnavailableException;
  expect(httpError.getStatus()).toBe(503);
  const body = httpError.getResponse() as { statusCode: number; message: string };
  expect(body.statusCode).toBe(503);
  expect(body.message).toBe(RECOVERY_UNAVAILABLE_MESSAGE);
}

describe('RecoveryRateLimitGuard', () => {
  it('admits an in-limit request and runs the route without headers', async () => {
    const store = makeStore(true);
    const guard = makeGuard(store);
    const { context, setHeader } = makeContext({
      path: '/auth/forgot-password',
      ip: '203.0.113.7',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(store.admit).toHaveBeenCalledWith('forgot-password', '203.0.113.7');
    expect(setHeader).not.toHaveBeenCalled();
  });

  it('maps the reset-password route to its own bucket', async () => {
    const store = makeStore(true);
    const guard = makeGuard(store);
    const { context } = makeContext({ path: '/auth/reset-password', ip: '203.0.113.7' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(store.admit).toHaveBeenCalledWith('reset-password', '203.0.113.7');
  });

  it('sets Retry-After before throwing the filtered 429 with the exact message', async () => {
    const store = makeStore(false, 25);
    const guard = makeGuard(store);
    const { context, setHeader } = makeContext({
      path: '/auth/forgot-password',
      ip: '203.0.113.7',
    });

    await expectRateLimited429(guard.canActivate(context));
    // The guard sets Retry-After on the response before throwing, so the
    // exception filter's body write keeps it (PR-001; proven over HTTP in
    // recovery-rate-limit.http.spec.ts).
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '25');
  });

  it('never trusts a client-supplied X-Forwarded-For', async () => {
    const store = makeStore(true);
    const guard = makeGuard(store);
    const { context } = makeContext({
      path: '/auth/forgot-password',
      ip: '10.0.0.9', // the real socket peer
      xff: '8.8.8.8', // a spoofed claim
    });

    await guard.canActivate(context);
    expect(store.admit).toHaveBeenCalledWith('forgot-password', '10.0.0.9');
  });

  it('resolves an unresolvable source address with a sanitized 503', async () => {
    for (const ip of [undefined, '', 'not-an-ip', '::ffff:garbage']) {
      const store = makeStore(true);
      const guard = makeGuard(store);
      const { context } = makeContext({ path: '/auth/forgot-password', ip });

      await expectSanitized503(guard.canActivate(context));
      expect(store.admit).not.toHaveBeenCalled();
    }
  });

  it('fails closed on a route it does not own', async () => {
    const store = makeStore(true);
    const guard = makeGuard(store);
    const { context } = makeContext({ path: '/auth/login', ip: '203.0.113.7' });

    await expectSanitized503(guard.canActivate(context));
    expect(store.admit).not.toHaveBeenCalled();
  });

  it('passes through the sanitized, account-independent 503 from the store', async () => {
    const store = makeStore(false, 5, true);
    const guard = makeGuard(store);
    const { context, setHeader } = makeContext({
      path: '/auth/reset-password',
      ip: '203.0.113.7',
    });

    await expectSanitized503(guard.canActivate(context));
    expect(setHeader).not.toHaveBeenCalled();
  });
});

describe('normalizeSourceIp', () => {
  it.each([
    ['1.2.3.4', '1.2.3.4'],
    ['::ffff:1.2.3.4', '1.2.3.4'], // IPv4-mapped IPv6 → dotted quad
    ['2001:DB8::1', '2001:db8::1'], // canonical lower case
    ['::1', '::1'],
    [' 1.2.3.4 ', '1.2.3.4'], // surrounding whitespace
    [undefined, null],
    ['', null],
    ['999.1.2.3', null], // out-of-range octet
    ['::ffff:garbage', null], // malformed mapped form
    // Zone-scoped link-local: Node's isIP() accepts it; the zone is kept in
    // the key so distinct interfaces stay distinct buckets.
    ['fe80::1%eth0', 'fe80::1%eth0'],
  ])('normalizes %j → %j', (input, expected) => {
    expect(normalizeSourceIp(input)).toBe(expected);
  });
});
