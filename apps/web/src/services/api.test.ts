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
