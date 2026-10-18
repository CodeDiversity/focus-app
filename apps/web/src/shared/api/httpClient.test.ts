import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import api, { setSessionExpiredHandler, refreshAccessToken } from './httpClient';
import type { AuthResponse } from '@/features/auth/model/types';
import { tokenStore } from './tokenStore';
import { isRecoveryBarrierActive, runRecoveryReset, snapshotSessionGeneration } from './recovery';
function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  const response = {
    data: { message: 'Unauthorized' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  } as AxiosResponse;
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
}

function authHeader(config: InternalAxiosRequestConfig): string | undefined {
  const headers = config.headers as { Authorization?: string; get?: (n: string) => string };
  return headers?.Authorization ?? headers?.get?.('Authorization');
}

describe('api interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clearToken();
    setSessionExpiredHandler(null);
  });

  it('refreshes once on 401 and retries the original request', async () => {
    tokenStore.setToken('old-token');
    let refreshCalls = 0;
    api.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCalls += 1;
        return ok(config, {
          accessToken: 'new-token',
          user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
        });
      }
      if (authHeader(config) === 'Bearer new-token') {
        return ok(config, { ok: true });
      }
      throw unauthorized(config);
    };

    const response = await api.get('/protected');
    expect(response.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(tokenStore.getToken()).toBe('new-token');
  });

  it('shares a single refresh across concurrent 401s', async () => {
    tokenStore.setToken('old-token');
    let refreshCalls = 0;
    api.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 10));
        return ok(config, {
          accessToken: 'new-token',
          user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
        });
      }
      if (authHeader(config) === 'Bearer new-token') {
        return ok(config, { ok: true });
      }
      throw unauthorized(config);
    };

    const [a, b] = await Promise.all([api.get('/a'), api.get('/b')]);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
  });

  it('redirects to login when refresh fails', async () => {
    tokenStore.setToken('old-token');
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    api.defaults.adapter = async (config) => {
      throw unauthorized(config);
    };

    await expect(api.get('/protected')).rejects.toBeTruthy();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(tokenStore.getToken()).toBeNull();
  });

  it('shares a single refresh between boot restore and concurrent callers', async () => {
    let refreshCalls = 0;
    api.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 10));
        return ok(config, {
          accessToken: 'boot-token',
          user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
        });
      }
      throw unauthorized(config);
    };

    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);
    expect(a.accessToken).toBe('boot-token');
    expect(b.accessToken).toBe('boot-token');
    expect(refreshCalls).toBe(1);
    expect(tokenStore.getToken()).toBe('boot-token');
  });

  it('does not attempt refresh for auth endpoints', async () => {
    let refreshCalls = 0;
    api.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) refreshCalls += 1;
      throw unauthorized(config);
    };

    await expect(api.post('/auth/login', {})).rejects.toBeTruthy();
    expect(refreshCalls).toBe(0);
  });

  it.each(['/auth/verify-email', '/auth/resend-verification'])(
    'does not attempt session refresh for public %s errors',
    async (path) => {
      tokenStore.setToken('existing-session');
      const expired = vi.fn();
      setSessionExpiredHandler(expired);
      let refreshCalls = 0;
      api.defaults.adapter = async (config) => {
        if (config.url === '/auth/refresh') refreshCalls += 1;
        throw unauthorized(config);
      };
      await expect(api.post(path, {})).rejects.toBeTruthy();
      expect(refreshCalls).toBe(0);
      expect(expired).not.toHaveBeenCalled();
      expect(tokenStore.getToken()).toBe('existing-session');
    }
  );
});

describe('api recovery paths (SP-105G)', () => {
  beforeEach(() => {
    api.defaults.adapter = undefined;
    vi.clearAllMocks();
    tokenStore.clearToken();
    setSessionExpiredHandler(null);
  });

  // 43-character base64url token with a distinctive marker: if a sanitized
  // rejection ever leaked the raw Axios config/body, the marker would appear.
  const RAW_TOKEN = `T0k3n${'a'.repeat(37)}`;
  const INVALID_RESET_MESSAGE =
    'This reset link is invalid or has expired. Please request a new one.';

  function failure(config: InternalAxiosRequestConfig, status: number): AxiosError {
    const response = {
      data: {
        statusCode: status,
        message: status === 400 ? INVALID_RESET_MESSAGE : 'Unauthorized',
        error: 'Bad Request',
        path: config.url,
        timestamp: '2026-10-15T12:00:00.000Z',
      },
      status,
      statusText: String(status),
      headers: { 'Set-Cookie': 'refresh_token=; Path=/auth; Max-Age=0' },
      config,
    } as AxiosResponse;
    return new AxiosError(
      `Request failed with status code ${status}`,
      'ERR_BAD_REQUEST',
      config,
      null,
      response
    );
  }

  it.each(['/auth/forgot-password', '/auth/reset-password'] as const)(
    'never triggers a refresh or the session-expired handler for %s 400/401/404/429/503 errors',
    async (path) => {
      tokenStore.setToken('existing-session');
      const expired = vi.fn();
      setSessionExpiredHandler(expired);
      let refreshCalls = 0;
      for (const status of [400, 401, 404, 429, 503]) {
        api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
          if (config.url === '/auth/refresh') {
            refreshCalls += 1;
            return ok(config, {
              accessToken: 'new-token',
              user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
            });
          }
          return Promise.reject(failure(config, status));
        };
        await expect(api.post(path, { email: 'ada@example.com' })).rejects.toBeTruthy();
        expect(refreshCalls).toBe(0);
        expect(expired).not.toHaveBeenCalled();
        expect(tokenStore.getToken()).toBe('existing-session');
      }
    }
  );

  it('rejects recovery-path failures as sanitized errors without the raw Axios error', async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      return Promise.reject(failure(config, 400));
    };
    const rejected = await api
      .post('/auth/reset-password', { token: RAW_TOKEN, password: 'x', confirmPassword: 'x' })
      .catch((e) => e);
    const rendered = JSON.stringify(rejected);
    expect(rendered).not.toContain('T0k3n'); // raw link token in the request body
    expect(rendered).not.toContain('refresh_token=');
    expect(rejected).not.toHaveProperty('config');
    expect(rejected.message).toBe(INVALID_RESET_MESSAGE);
  });

  it('keeps the existing spread error shape for non-recovery paths', async () => {
    tokenStore.setToken('old-token');
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      return Promise.reject(unauthorized(config));
    };
    const rejected = await api.get('/protected').catch((e) => e);
    expect(rejected.message).toBe('Your session has expired. Please sign in again.');
    expect(rejected).toHaveProperty('config'); // pre-existing spread shape unchanged
    expect(tokenStore.getToken()).toBeNull();
  });
});

describe('api session generation (SP-105G M2)', () => {
  beforeEach(() => {
    api.defaults.adapter = undefined;
    vi.clearAllMocks();
    tokenStore.clearToken();
    setSessionExpiredHandler(null);
  });

  const GEN_TOKEN = `G3n${'b'.repeat(37)}`;
  const USER = { id: 'user-1', name: 'Ada', email: 'ada@example.com' };

  function fail(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosError {
    const response = {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    } as AxiosResponse;
    return new AxiosError(
      `Request failed with status code ${status}`,
      'ERR_BAD_REQUEST',
      config,
      null,
      response
    );
  }

  const resetSend = () =>
    api
      .post('/auth/reset-password', {
        token: GEN_TOKEN,
        password: 'new-pass-9',
        confirmPassword: 'new-pass-9',
      })
      .then((r) => r.data as { message: string });

  interface PendingCall {
    config: InternalAxiosRequestConfig;
    resolve: (response: AxiosResponse) => void;
    reject: (error: unknown) => void;
  }

  function installHarness() {
    const urls: string[] = [];
    const pending: PendingCall[] = [];
    api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      urls.push(config.url ?? '');
      const entry: PendingCall = { config, resolve: () => undefined, reject: () => undefined };
      pending.push(entry);
      return new Promise<AxiosResponse>((res, rej) => {
        entry.resolve = res;
        entry.reject = rej;
      });
    };
    return {
      urls,
      count: (url: string) => urls.filter((u) => u === url).length,
      pendingFor(url: string) {
        for (let i = pending.length - 1; i >= 0; i -= 1) {
          if (pending[i].config.url === url) return pending[i];
        }
        throw new Error(`no recorded call for ${url}`);
      },
    };
  }

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('a successful reset rejects a stale refresh token write', async () => {
    const harness = installHarness();
    tokenStore.setToken('live-token');
    const genBefore = snapshotSessionGeneration();

    const reset = runRecoveryReset(resetSend);
    // Two concurrent rotations hit the barrier: deferred, single-flight, and
    // snapshotted at entry so they keep the PRE-reset generation.
    const staleRefresh = refreshAccessToken();
    const staleRefresh2 = refreshAccessToken();
    await flush();
    expect(harness.count('/auth/refresh')).toBe(0); // deferred — never dispatched yet
    expect(harness.count('/auth/reset-password')).toBe(1);

    harness.pendingFor('/auth/reset-password').resolve(
      ok(harness.pendingFor('/auth/reset-password').config, {
        message: 'Password updated. Please sign in.',
      })
    );
    await expect(reset).resolves.toEqual({ message: 'Password updated. Please sign in.' });
    expect(snapshotSessionGeneration()).toBe(genBefore + 1);
    expect(isRecoveryBarrierActive()).toBe(false);

    await flush(); // release runs the deferred rotation
    expect(harness.count('/auth/refresh')).toBe(1); // single-flight preserved

    // Adversarial: the server still "rotates" — the write must be rejected.
    harness.pendingFor('/auth/refresh').resolve(
      ok(harness.pendingFor('/auth/refresh').config, {
        accessToken: 'stale-token',
        user: USER,
      } as AuthResponse)
    );
    await expect(staleRefresh).resolves.toBeTruthy();
    await expect(staleRefresh2).resolves.toBeTruthy();
    expect(tokenStore.getToken()).toBeNull(); // generation rejected the stale write
  });

  it('a stale 401 predating a successful reset refreshes nothing and fires no session-expired handler', async () => {
    const harness = installHarness();
    tokenStore.setToken('old-token');
    const expired = vi.fn();
    setSessionExpiredHandler(expired);

    const protectedFlight = api.get('/protected'); // in flight; snapshots the pre-reset generation
    await flush();

    const reset = runRecoveryReset(resetSend);
    await flush();
    harness.pendingFor('/auth/reset-password').resolve(
      ok(harness.pendingFor('/auth/reset-password').config, {
        message: 'Password updated. Please sign in.',
      })
    );
    await expect(reset).resolves.toBeTruthy();
    expect(tokenStore.getToken()).toBeNull(); // cleared by the reset

    // The stale request's access JWT had lapsed: its 401 arrives after the reset.
    harness
      .pendingFor('/protected')
      .reject(fail(harness.pendingFor('/protected').config, 401, { message: 'Unauthorized' }));
    const rejected = await protectedFlight.catch((e) => e);
    expect(rejected.message).toBe('Your session has expired. Please sign in again.');
    expect(harness.count('/auth/refresh')).toBe(0); // no stale rotation
    expect(expired).not.toHaveBeenCalled(); // no logout/navigation
    expect(tokenStore.getToken()).toBeNull();
  });

  it('a failed reset releases the barrier, preserves the prior session, and performs no logout', async () => {
    const harness = installHarness();
    tokenStore.setToken('live-token');
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    const genBefore = snapshotSessionGeneration();

    const refresh = refreshAccessToken(); // in flight; the reset drains it
    const reset = runRecoveryReset(resetSend);
    const resetFailure = reset.catch((e) => e);
    await flush();

    harness.pendingFor('/auth/refresh').resolve(
      ok(harness.pendingFor('/auth/refresh').config, {
        accessToken: 'rotated-token',
        user: USER,
      } as AuthResponse)
    );
    await refresh;
    expect(tokenStore.getToken()).toBe('rotated-token');
    await flush(); // the drained reset POST dispatches once the drain settles

    harness.pendingFor('/auth/reset-password').reject(
      fail(harness.pendingFor('/auth/reset-password').config, 400, {
        statusCode: 400,
        message: 'This reset link is invalid or has expired. Please request a new one.',
        error: 'Bad Request',
        path: '/auth/reset-password',
        timestamp: '2026-10-15T12:00:00.000Z',
      })
    );
    const error = (await resetFailure) as { status: number; retryable: boolean };
    expect(error).toMatchObject({ status: 400, retryable: false });

    expect(isRecoveryBarrierActive()).toBe(false);
    expect(snapshotSessionGeneration()).toBe(genBefore); // unchanged
    expect(tokenStore.getToken()).toBe('rotated-token'); // prior session preserved
    expect(expired).not.toHaveBeenCalled();

    // Barrier released: a new rotation dispatches immediately (not deferred).
    const next = refreshAccessToken();
    await flush();
    expect(harness.count('/auth/refresh')).toBe(2);
    harness.pendingFor('/auth/refresh').resolve(
      ok(harness.pendingFor('/auth/refresh').config, {
        accessToken: 'later-token',
        user: USER,
      } as AuthResponse)
    );
    await next;
    expect(tokenStore.getToken()).toBe('later-token');
  });
});
