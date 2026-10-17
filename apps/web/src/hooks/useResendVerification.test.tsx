import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';
import httpClient, { setSessionExpiredHandler } from '../services/api';
import { tokenStore } from '../services/tokenStore';
import { useResendVerification } from './useResendVerification';
import { Providers } from '../test/providers';

const originalAdapter = httpClient.defaults.adapter;

let sent: { url?: string; email: string }[];
let responder: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function wrapper({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}

function resendOk(config: InternalAxiosRequestConfig): AxiosResponse {
  return {
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {
      message:
        'If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.',
    },
  };
}

function resendFailure(config: InternalAxiosRequestConfig, status: number, message: string): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: { message },
    status,
    statusText: 'Error',
    headers: {},
  } as AxiosResponse);
}

describe('useResendVerification', () => {
  beforeEach(() => {
    sent = [];
    tokenStore.clearToken();
    setSessionExpiredHandler(null);
    responder = async (config) => resendOk(config);
    httpClient.defaults.adapter = async (config) => {
      sent.push({
        url: config.url,
        email: config.data ? JSON.parse(config.data).email : '',
      });
      return responder(config);
    };
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('a successful send posts the trimmed, lowercased email once and reports isSuccess', async () => {
    const { result } = renderHook(() => useResendVerification(), { wrapper });

    await act(async () => {
      await result.current.sendEmail('  Ada@Example.COM ');
    });

    expect(sent).toEqual([{ url: '/auth/resend-verification', email: 'ada@example.com' }]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('the sixty-second cooldown starts on success and blocks further sends', async () => {
    const { result } = renderHook(() => useResendVerification(), { wrapper });

    await act(async () => {
      await result.current.sendEmail('ada@example.com');
    });

    await waitFor(() => expect(result.current.secondsRemaining).toBe(60));
    expect(result.current.secondsRemaining).toBeGreaterThan(0);

    await act(async () => {
      await result.current.sendEmail('ada@example.com');
    });

    expect(sent).toHaveLength(1);
  });

  it('a second send while one is in flight is suppressed', async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    responder = async (config) => {
      await pending;
      return resendOk(config);
    };

    const { result } = renderHook(() => useResendVerification(), { wrapper });

    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    await act(async () => {
      first = result.current.sendEmail('ada@example.com');
      second = result.current.sendEmail('ada@example.com');
      release?.();
      await Promise.all([first, second]);
    });

    expect(sent).toHaveLength(1);
  });

  it('a 400 failure surfaces the invalid-email message', async () => {
    responder = async (config) => {
      throw resendFailure(config, 400, 'Please enter a valid email address');
    };
    const { result } = renderHook(() => useResendVerification(), { wrapper });

    await act(async () => {
      await result.current.sendEmail('not-an-email');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(false));
    expect(result.current.error).toBe('Please enter a valid email address');
    // A failed send must not start the cooldown.
    expect(result.current.secondsRemaining).toBe(0);
  });

  it('a network failure surfaces the connection message', async () => {
    responder = async () => {
      throw new Error('Network Error');
    };
    const { result } = renderHook(() => useResendVerification(), { wrapper });

    await act(async () => {
      await result.current.sendEmail('ada@example.com');
    });

    await waitFor(() => expect(result.current.error).toBe(
      'We could not request a verification email. Check your connection and try again.',
    ));
  });
});