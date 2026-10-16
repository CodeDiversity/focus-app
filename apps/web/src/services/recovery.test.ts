import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api, { refreshAccessToken } from './api';
import { tokenStore } from './tokenStore';
import {
  RECOVERY_DRAIN_TIMEOUT_MS,
  RecoveryError,
  ResetPasswordResult,
  isRecoveryBarrierActive,
  registerLocalSessionClearer,
  runRecoveryReset,
  sanitizeRecoveryError,
  snapshotSessionGeneration,
} from './recovery';

// A 43-character base64url token with a distinctive marker: if a sanitized
// error ever leaked its Axios config/request body, the marker would appear.
const RAW_TOKEN = `T0k3n${'a'.repeat(37)}`;
const RESET_SUCCESS_MESSAGE = 'Password updated. Please sign in.';
const INVALID_RESET_MESSAGE =
  'This reset link is invalid or has expired. Please request a new one.';

const USER = { id: 'user-1', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };

interface PendingCall {
  config: InternalAxiosRequestConfig;
  resolve: (response: AxiosResponse) => void;
  reject: (error: unknown) => void;
}

function ok(
  config: InternalAxiosRequestConfig,
  data: unknown,
  headers: Record<string, string> = {},
): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers, config } as AxiosResponse;
}

function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): AxiosError {
  const response = {
    data,
    status,
    statusText: String(status),
    headers,
    config,
  } as AxiosResponse;
  const code = status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST';
  return new AxiosError(`Request failed with status code ${status}`, code, config, null, response);
}

/** Flush pending microtasks (real timers). */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The reset request as SP-105C will supply it: through the shared api instance. */
const resetSend = () =>
  api
    .post<ResetPasswordResult>('/auth/reset-password', {
      token: RAW_TOKEN,
      password: 'correct-horse-9',
      confirmPassword: 'correct-horse-9',
    })
    .then((response) => response.data);

/** Adapter that records every request and hands the test full resolve/reject control. */
function installPendingHarness() {
  const urls: string[] = [];
  const pending: PendingCall[] = [];
  api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    urls.push(config.url ?? '');
    const entry: PendingCall = { config, resolve: () => undefined, reject: () => undefined };
    pending.push(entry);
    return new Promise<AxiosResponse>((res, rej) => {
      // The executor runs synchronously, so `entry` carries the real settle
      // functions by the time any test can observe it.
      entry.resolve = res;
      entry.reject = rej;
    });
  };
  return {
    urls,
    pending,
    count: (url: string) => urls.filter((u) => u === url).length,
    pendingFor(url: string): PendingCall {
      for (let i = pending.length - 1; i >= 0; i -= 1) {
        if (pending[i].config.url === url) return pending[i];
      }
      throw new Error(`no recorded call for ${url}`);
    },
  };
}

describe('recovery operation boundary (runRecoveryReset)', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    registerLocalSessionClearer(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays the reset POST until the in-flight refresh settles', async () => {
    const harness = installPendingHarness();
    tokenStore.setToken('live-token');
    const genBefore = snapshotSessionGeneration();

    const refresh = refreshAccessToken();
    const reset = runRecoveryReset(resetSend);
    await flush(); // axios dispatches the refresh in a microtask

    // The barrier holds the reset until the in-flight refresh has settled —
    // aborting would not prove its response cookie cannot still arrive.
    expect(harness.count('/auth/refresh')).toBe(1);
    expect(harness.count('/auth/reset-password')).toBe(0);

    harness
      .pendingFor('/auth/refresh')
      .resolve(ok(harness.pendingFor('/auth/refresh').config, { accessToken: 'rotated-token', user: USER }));
    await refresh;
    await flush();

    expect(harness.count('/auth/reset-password')).toBe(1);

    harness
      .pendingFor('/auth/reset-password')
      .resolve(ok(harness.pendingFor('/auth/reset-password').config, { message: RESET_SUCCESS_MESSAGE }));
    await expect(reset).resolves.toEqual({ message: RESET_SUCCESS_MESSAGE });

    // Success commits the session change: generation advances, token clears,
    // barrier releases. The pre-reset refresh write was followed by the clear.
    expect(snapshotSessionGeneration()).toBe(genBefore + 1);
    expect(tokenStore.getToken()).toBeNull();
    expect(isRecoveryBarrierActive()).toBe(false);
  });

  it('defers new automatic refreshes started while the barrier is active, then runs them after release', async () => {
    const harness = installPendingHarness();
    tokenStore.setToken('live-token');

    const reset = runRecoveryReset(resetSend);
    expect(isRecoveryBarrierActive()).toBe(true);

    const deferred = refreshAccessToken();
    await flush();
    expect(harness.count('/auth/refresh')).toBe(0); // deferred — never dispatched yet

    // drain is trivial (no in-flight) → the reset POST dispatches
    expect(harness.count('/auth/reset-password')).toBe(1);

    harness
      .pendingFor('/auth/reset-password')
      .resolve(ok(harness.pendingFor('/auth/reset-password').config, { message: RESET_SUCCESS_MESSAGE }));
    await expect(reset).resolves.toEqual({ message: RESET_SUCCESS_MESSAGE });
    expect(isRecoveryBarrierActive()).toBe(false);

    await flush(); // release runs the deferred rotation
    expect(harness.count('/auth/refresh')).toBe(1);

    // Server-side all refresh rows were revoked, so the deferred rotation fails;
    // the held request resolves as a failure, not as a resurrected session.
    harness.pendingFor('/auth/refresh').reject(
      fail(harness.pendingFor('/auth/refresh').config, 401, { message: 'Unauthorized' }),
    );
    await expect(deferred).rejects.toBeTruthy();
    expect(tokenStore.getToken()).toBeNull();
  });

  it('sends no reset and returns a sanitized retryable error when the in-flight does not settle within the 10s bound', async () => {
    vi.useFakeTimers();
    const harness = installPendingHarness();
    tokenStore.setToken('live-token');

    const refresh = refreshAccessToken();
    const reset = runRecoveryReset(resetSend);
    // Attach before advancing past the drain bound: the 409 rejects as the
    // fake timer fires, so a handler attached afterwards is an unhandled rejection.
    const settled = reset.catch((e: unknown) => e as RecoveryError);
    await vi.advanceTimersByTimeAsync(0); // let the dispatch microtasks run
    expect(harness.count('/auth/reset-password')).toBe(0);

    await vi.advanceTimersByTimeAsync(RECOVERY_DRAIN_TIMEOUT_MS);

    const error: RecoveryError = (await settled) as RecoveryError;
    expect(error).toMatchObject({ status: 409, retryable: true });
    expect(error).not.toHaveProperty('retryAfterSeconds'); // client-side wait — no IP-429 countdown
    expect(error.message).toBeTruthy();

    // The reset was never dispatched, and nothing leaked.
    expect(harness.count('/auth/reset-password')).toBe(0);
    const rendered = JSON.stringify(error);
    expect(rendered).not.toContain('T0k3n');
    expect(error).not.toHaveProperty('config');
    expect(error).not.toHaveProperty('response');
    // The barrier stays held: the in-flight refresh may still deliver its cookie.
    expect(isRecoveryBarrierActive()).toBe(true);

    // Complete the lifecycle: the in-flight settles late and the barrier releases.
    harness
      .pendingFor('/auth/refresh')
      .resolve(ok(harness.pendingFor('/auth/refresh').config, { accessToken: 'rotated-token', user: USER }));
    await refresh;
    await vi.advanceTimersByTimeAsync(0);
    expect(isRecoveryBarrierActive()).toBe(false);
  });

  it('a late refresh completion after the timeout cannot bypass the still-active drain', async () => {
    vi.useFakeTimers();
    const harness = installPendingHarness();
    tokenStore.setToken('live-token');

    const refresh = refreshAccessToken();
    const reset = runRecoveryReset(resetSend);
    // Attach before advancing past the drain bound: the 409 rejects as the
    // fake timer fires, so a handler attached afterwards is an unhandled rejection.
    const settled = reset.catch((e: unknown) => e as RecoveryError);
    await vi.advanceTimersByTimeAsync(0); // let the dispatch microtasks run
    await vi.advanceTimersByTimeAsync(RECOVERY_DRAIN_TIMEOUT_MS);
    await expect(settled).resolves.toMatchObject({ status: 409, retryable: true });
    expect(harness.count('/auth/reset-password')).toBe(0);

    // The in-flight refresh finally settles — the still-active drain must not
    // turn the already-rejected reset into a dispatch.
    harness
      .pendingFor('/auth/refresh')
      .resolve(ok(harness.pendingFor('/auth/refresh').config, { accessToken: 'rotated-token', user: USER }));
    await refresh;
    await vi.advanceTimersByTimeAsync(0);

    expect(harness.count('/auth/reset-password')).toBe(0); // still never sent
    expect(isRecoveryBarrierActive()).toBe(false); // settle released the barrier

    // A fresh attempt after release can proceed normally.
    const retry = runRecoveryReset(resetSend);
    await vi.advanceTimersByTimeAsync(0);
    expect(harness.count('/auth/reset-password')).toBe(1);
    harness
      .pendingFor('/auth/reset-password')
      .resolve(ok(harness.pendingFor('/auth/reset-password').config, { message: RESET_SUCCESS_MESSAGE }));
    await expect(retry).resolves.toEqual({ message: RESET_SUCCESS_MESSAGE });
  });

  it('rejects a second overlapping reset operation', async () => {
    const harness = installPendingHarness();
    tokenStore.setToken('live-token');

    const first = runRecoveryReset(resetSend);
    await flush();
    expect(harness.count('/auth/refresh')).toBe(0);
    expect(harness.count('/auth/reset-password')).toBe(1);

    const second = runRecoveryReset(resetSend);
    const error: RecoveryError = (await second.catch((e: unknown) => e)) as RecoveryError;
    expect(error).toMatchObject({ status: 409, retryable: true });
    expect(harness.count('/auth/reset-password')).toBe(1); // only the first dispatched

    harness
      .pendingFor('/auth/reset-password')
      .resolve(ok(harness.pendingFor('/auth/reset-password').config, { message: RESET_SUCCESS_MESSAGE }));
    await expect(first).resolves.toEqual({ message: RESET_SUCCESS_MESSAGE });
    expect(isRecoveryBarrierActive()).toBe(false);
  });
});

describe('sanitizeRecoveryError', () => {
  const envelope = (statusCode: number, message: string | string[], error = 'Bad Request') => ({
    statusCode,
    message,
    error,
    path: '/auth/reset-password',
    timestamp: '2026-10-15T12:00:00.000Z',
  });

  function axiosError(
    status: number,
    data: unknown,
    headers: Record<string, string> = {},
    url = '/auth/reset-password',
  ): AxiosError {
    const config = {
      url,
      data: JSON.stringify({ token: RAW_TOKEN, password: 'short', confirmPassword: 'short' }),
    } as InternalAxiosRequestConfig;
    const response = { data, status, statusText: String(status), headers, config } as AxiosResponse;
    return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response);
  }

  it.each([
    ['30', 30],
    ['1', 1],
    ['60', 60],
    [' 30 ', 30],
    ['0', 60],
    ['61', 60],
    ['-1', 60],
    ['3.5', 60],
    ['abc', 60],
    ['1e1', 60],
    [undefined, 60],
  ])(
    '429 Retry-After %s: accepted only as decimal integer 1-60; absent/malformed/out-of-range falls back to 60s',
    (header, expected) => {
      const sanitized = sanitizeRecoveryError(
        axiosError(
          429,
          envelope(429, 'Too many recovery requests. Wait and try again.', 'Too Many Requests'),
          header === undefined ? {} : { 'Retry-After': header },
        ),
      );
      expect(sanitized).toMatchObject({ status: 429, retryable: true, retryAfterSeconds: expected });
      expect(sanitized.message).toBe('Too many recovery requests. Wait and try again.');
    },
  );

  it('sanitized errors exclude the Axios config, request body and response headers', () => {
    const sanitized = sanitizeRecoveryError(
      axiosError(400, envelope(400, INVALID_RESET_MESSAGE, 'BadRequestException'), {
        'Set-Cookie': 'refresh_token=; Path=/auth; Max-Age=0',
        'Retry-After': '30',
      }),
    );
    const rendered = JSON.stringify(sanitized);
    expect(rendered).not.toContain('T0k3n'); // the raw link token in the request body
    expect(rendered).not.toContain('refresh_token=');
    expect(sanitized).not.toHaveProperty('config');
    expect(sanitized).not.toHaveProperty('response');
    expect(sanitized.message).toBe(INVALID_RESET_MESSAGE);
    expect(sanitized.retryable).toBe(false);
    expect(sanitized).not.toHaveProperty('retryAfterSeconds');
  });

  it('400 validation failures surface the envelope field messages', () => {
    const sanitized = sanitizeRecoveryError(
      axiosError(400, envelope(400, ['Password must be at least 8 characters', 'Passwords do not match'])),
    );
    expect(sanitized.message).toBe('Password must be at least 8 characters. Passwords do not match');
    expect(sanitized.retryable).toBe(false);
  });

  it('keeps the uniform invalid-link message byte-identical when repeated constraints duplicate it', () => {
    const sanitized = sanitizeRecoveryError(
      axiosError(400, envelope(400, [INVALID_RESET_MESSAGE, INVALID_RESET_MESSAGE])),
    );
    expect(sanitized.message).toBe(INVALID_RESET_MESSAGE);
  });

  it('surfaces field errors from the envelope error field when it is a field map', () => {
    const sanitized = sanitizeRecoveryError(
      axiosError(
        400,
        {
          statusCode: 400,
          message: 'Validation failed',
          error: { password: ['Password must be at least 8 characters'] },
          path: '/auth/reset-password',
          timestamp: '2026-10-15T12:00:00.000Z',
        },
      ),
    );
    expect(sanitized.fieldErrors).toEqual({ password: ['Password must be at least 8 characters'] });
  });

  it('treats network failures (no response) as sanitized retryable errors without a countdown', () => {
    const config = {
      url: '/auth/reset-password',
      data: JSON.stringify({ token: RAW_TOKEN }),
    } as InternalAxiosRequestConfig;
    const error = new AxiosError('Network Error', 'ERR_NETWORK', config, null, undefined);
    const sanitized = sanitizeRecoveryError(error);
    expect(sanitized).toMatchObject({ status: 0, retryable: true });
    expect(sanitized).not.toHaveProperty('retryAfterSeconds');
    expect(sanitized.message).toMatch(/could not reach/i);
    expect(JSON.stringify(sanitized)).not.toContain('T0k3n');
  });

  it('treats 503 as retryable without a rate-limit countdown', () => {
    const sanitized = sanitizeRecoveryError(
      axiosError(
        503,
        envelope(503, 'Password recovery is temporarily unavailable. Please try again later.', 'Service Unavailable'),
      ),
    );
    expect(sanitized).toMatchObject({ status: 503, retryable: true });
    expect(sanitized).not.toHaveProperty('retryAfterSeconds');
  });

  it('passes RecoveryError values through unchanged', () => {
    const original = sanitizeRecoveryError(
      axiosError(
        429,
        envelope(429, 'Too many recovery requests. Wait and try again.', 'Too Many Requests'),
        { 'Retry-After': '12' },
      ),
    );
    expect(sanitizeRecoveryError(original)).toBe(original);
  });
});
