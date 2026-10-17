import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { Method } from 'axios';
import { configureStore } from '@reduxjs/toolkit';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import httpClient, { setSessionExpiredHandler } from '@/shared/api/httpClient';
import { authService } from '../services/auth';
import { tokenStore } from '@/shared/api/tokenStore';
import {
  RESEND_FALLBACK_MESSAGE,
  RESEND_INVALID_EMAIL_MESSAGE,
  api as storeApi,
  axiosBaseQuery,
  resendErrorMessage,
} from './api';

type BaseQueryArgs = { url: string; method: Method; body?: unknown };

const endpointArgs: BaseQueryArgs = {
  url: '/auth/resend-verification',
  method: 'POST',
  body: { email: 'ada@example.com' },
};

function makeStore() {
  return configureStore({
    reducer: { [storeApi.reducerPath]: storeApi.reducer },
    middleware: (gdm) => gdm().concat(storeApi.middleware),
  });
}

// The baseQuery reads neither the RTK `api` argument nor the extra options —
// the transport is the shared axios instance, so empty stubs are enough.
const unusedBaseQueryApi = {} as BaseQueryApi;
const noExtraOptions = {} as never;
function run(args: BaseQueryArgs = endpointArgs) {
  return axiosBaseQuery(args, unusedBaseQueryApi, noExtraOptions);
}

function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}

function failure(config: InternalAxiosRequestConfig, status: number, message: string): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: { message },
    status,
    statusText: 'Error',
    headers: {},
  } as AxiosResponse);
}

const originalAdapter = httpClient.defaults.adapter;

describe('store api baseQuery', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    setSessionExpiredHandler(null);
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('baseQuery executes the request through the shared axios instance', async () => {
    const request = vi
      .spyOn(httpClient, 'request')
      .mockResolvedValue({ data: { message: 'sent' } } as AxiosResponse);

    const result = await run();

    expect(request).toHaveBeenCalledTimes(1);
    const config = request.mock.calls[0][0];
    expect(config.url).toBe('/auth/resend-verification');
    expect(config.method).toBe('POST');
    expect(config.data).toEqual({ email: 'ada@example.com' });
    expect(result).toEqual({ data: { message: 'sent' } });
  });

  it('a sanitized interceptor rejection surfaces as an RTK Query error with the interceptor message and the status as code', async () => {
    // Drive the real interceptor chain: the adapter rejects, the response
    // interceptor sanitizes it to { ...error, message } and the baseQuery maps
    // that rejection onto RTK Query's { error } result.
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, 'Please enter a valid email address');
    };

    const result = await run();

    expect(result).toEqual({
      error: { message: 'Please enter a valid email address', code: '400' },
    });
  });

  it('a network failure surfaces the interceptor message with no status code', async () => {
    httpClient.defaults.adapter = async () => {
      throw new Error('Network Error');
    };

    const result = await run();

    expect(result.error?.code).toBeUndefined();
    expect(result.error?.message).toBe('Network Error');
  });

  it('a 401 on an auth path neither refreshes nor invokes the session-expired handler', async () => {
    const sessionExpired = vi.fn();
    setSessionExpiredHandler(sessionExpired);
    let refreshCalls = 0;
    httpClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls += 1;
        return ok(config, { accessToken: 'rotated', user: { id: 'ada' } });
      }
      throw failure(config, 401, 'Unauthorized');
    };

    const result = await run();

    expect(refreshCalls).toBe(0);
    expect(sessionExpired).not.toHaveBeenCalled();
    expect(result.error?.code).toBe('401');
  });

  it('resendErrorMessage returns the invalid-email message for 400 and the connection message otherwise', () => {
    expect(resendErrorMessage('400')).toBe(RESEND_INVALID_EMAIL_MESSAGE);
    expect(resendErrorMessage('401')).toBe(RESEND_FALLBACK_MESSAGE);
    expect(resendErrorMessage(undefined)).toBe(RESEND_FALLBACK_MESSAGE);
  });
});

describe('resend error message parity with authService', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  async function serviceAndEndpointMessage(
    status: number,
    payloadMessage: string,
  ): Promise<{ service: string; endpoint: string }> {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, status, payloadMessage);
    };

    let service = '';
    try {
      await authService.resendVerification('ada@example.com');
    } catch (error: unknown) {
      service = (error as Error).message;
    }

    const result = await run();
    const endpoint = resendErrorMessage(result.error?.code);

    return { service, endpoint };
  }

  it('the endpoint error message matches authService.resendVerification for 400', async () => {
    const { service, endpoint } = await serviceAndEndpointMessage(
      400,
      'Please enter a valid email address',
    );
    expect(service).toBe(RESEND_INVALID_EMAIL_MESSAGE);
    expect(endpoint).toBe(service);
  });

  it('the endpoint error message matches authService.resendVerification for a network failure', async () => {
    const { service, endpoint } = await serviceAndEndpointMessage(500, 'Internal Server Error');
    expect(service).toBe(RESEND_FALLBACK_MESSAGE);
    expect(endpoint).toBe(service);
  });

  it('the mutation trigger rejects with the same mapped message the hook renders', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, 'Please enter a valid email address');
    };

    const store = makeStore();
    const trigger = store.dispatch(storeApi.endpoints.resendVerification.initiate('ada@example.com'));
    const result = await trigger;

    expect(result.error).toEqual({
      message: 'Please enter a valid email address',
      code: '400',
    });
    expect(resendErrorMessage(result.error?.code)).toBe(RESEND_INVALID_EMAIL_MESSAGE);
  });
});