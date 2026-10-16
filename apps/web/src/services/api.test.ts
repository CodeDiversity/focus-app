import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import api, { setSessionExpiredHandler } from './api';
import { authService } from './auth';
import { tokenStore } from './tokenStore';

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

    const [a, b] = await Promise.all([
      authService.refreshToken(),
      authService.refreshToken(),
    ]);
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

  it.each(['/auth/verify-email', '/auth/resend-verification'])('does not attempt session refresh for public %s errors', async (path) => {
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
  });
});

describe('api recovery paths (SP-105G)', () => {
  beforeEach(() => {
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
    return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response);
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
    },
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
