import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { useLocation } from 'react-router-dom';
import { Providers, makeTestStore } from '@/test/providers';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
// test-only: suite renders the real App router (SP-109H)
// eslint-disable-next-line import/no-restricted-paths
import App from '@/app/App';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import api from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';

const linkToken = 'a'.repeat(43);
const student = { id: 'ada', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };
let signedIn = false;
let calls: { path?: string; data: Record<string, string> }[];
let confirmation: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
let resend: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
let restore: ((config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) | undefined;
let profile: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}
function failure(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: { message: 'This verification link is invalid or has expired. Request a new email.' },
    status,
    statusText: 'Error',
    headers: {},
  });
}
function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location">
      {location.pathname}
      {location.hash}
    </span>
  );
}
function renderPage(path = `/verify-email#token=${linkToken}`, strict = false) {
  const store = makeTestStore();
  const page = (
    <Providers store={store} initialEntries={[path]}>
      <AuthProvider>
        <LocationProbe />
        <App />
      </AuthProvider>
    </Providers>
  );
  render(strict ? <StrictMode>{page}</StrictMode> : page);
  return store;
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    signedIn = false;
    calls = [];
    restore = undefined;
    profile = async (config) => ok(config, { ...student, createdAt: '', updatedAt: '' });
    confirmation = async (config) => ok(config, { message: 'Email verified successfully.' });
    resend = async (config) =>
      ok(config, {
        message:
          'If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.',
      });
    api.defaults.adapter = async (config) => {
      const data = config.data ? JSON.parse(config.data) : {};
      calls.push({ path: config.url, data });
      if (config.url === '/auth/refresh') {
        if (restore) return restore(config);
        if (!signedIn) failure(config, 401);
        return ok(config, { accessToken: 'existing-session', user: student });
      }
      if (config.url === '/auth/verify-email') return confirmation(config);
      if (config.url === '/auth/resend-verification') return resend(config);
      if (config.url === '/users/me') return profile(config);
      throw new Error('Unexpected test request');
    };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens without sending a confirmation request and removes the token fragment under StrictMode', async () => {
    renderPage(undefined, true);
    expect(await screen.findByRole('button', { name: /^verify email$/i })).toBeEnabled();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/verify-email$/);
    expect(calls.filter((call) => call.path === '/auth/verify-email')).toHaveLength(0);
  });

  it.each([false, true])(
    'is reachable while signed in=%s and requires an explicit Verify email action',
    async (authenticated) => {
      signedIn = authenticated;
      const store = renderPage();
      const user = setupUser();
      await user.click(await screen.findByRole('button', { name: /^verify email$/i }));
      expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
      expect(calls.filter((call) => call.path === '/auth/verify-email')).toEqual([
        { path: '/auth/verify-email', data: { token: linkToken } },
      ]);
      // The raw link token must not survive in any client-side cache.
      const mutations = store.getState().api.mutations;
      expect(JSON.stringify(Object.values(mutations).map((entry) => entry))).not.toContain(
        linkToken
      );
      if (authenticated) {
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
        expect(tokenStore.getToken()).toBe('existing-session');
        await waitFor(() => expect(calls.some((call) => call.path === '/users/me')).toBe(true));
        // A successful link does not mark the signed-in account verified: only its profile does.
        expect(screen.getByRole('region', { name: /verify your email/i })).toBeInTheDocument();
        expect(screen.getByText(/signed in as ada@example.com/i)).toBeInTheDocument();
      } else expect(tokenStore.getToken()).toBeNull();
    }
  );

  it.each(['/verify-email', '/verify-email#token=malformed'])(
    'shows missing or malformed token guidance and the resend form for %s',
    async (path) => {
      renderPage(path);
      expect(await screen.findByText(/request a new verification email/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^verify email$/i })).not.toBeInTheDocument();
    }
  );

  it.each([false, true])(
    'reconciles verification completed before session restoration with StrictMode=%s',
    async (strict) => {
      let finishRestore!: () => void;
      restore = (config) =>
        new Promise((resolve) => {
          finishRestore = () =>
            resolve(ok(config, { accessToken: 'existing-session', user: student }));
        });
      profile = async (config) =>
        ok(config, {
          ...student,
          emailVerifiedAt: '2026-10-14T12:00:00Z',
          createdAt: '',
          updatedAt: '',
        });
      renderPage(undefined, strict);
      await setupUser().click(await screen.findByRole('button', { name: /^verify email$/i }));
      expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
      expect(calls.filter((call) => call.path === '/users/me')).toHaveLength(0);
      await act(async () => {
        finishRestore();
      });
      await waitFor(() =>
        expect(calls.filter((call) => call.path === '/users/me')).toHaveLength(1)
      );
      expect(screen.queryByRole('region', { name: /verify your email/i })).not.toBeInTheDocument();
      expect(tokenStore.getToken()).toBe('existing-session');
      expect(calls.filter((call) => call.path === '/auth/refresh')).toHaveLength(1);
    }
  );

  it('queues a fresh post-confirmation profile after an older focus response', async () => {
    signedIn = true;
    let finishOldProfile!: () => void;
    let profileCalls = 0;
    profile = (config) => {
      profileCalls += 1;
      if (profileCalls === 1)
        return new Promise((resolve) => {
          finishOldProfile = () =>
            resolve(ok(config, { ...student, createdAt: '', updatedAt: '' }));
        });
      return Promise.resolve(
        ok(config, {
          ...student,
          emailVerifiedAt: '2026-10-14T12:00:00Z',
          createdAt: '',
          updatedAt: '',
        })
      );
    };
    renderPage();
    await screen.findByRole('region', { name: /verify your email/i });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(profileCalls).toBe(1);
    await setupUser().click(screen.getByRole('button', { name: /^verify email$/i }));
    expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
    await act(async () => {
      finishOldProfile();
    });
    await waitFor(() => expect(profileCalls).toBe(2));
    expect(screen.queryByRole('region', { name: /verify your email/i })).not.toBeInTheDocument();
    expect(calls.filter((call) => call.path === '/auth/refresh')).toHaveLength(1);
  });

  it('shows pending confirmation and prevents duplicate submission', async () => {
    let finish!: () => void;
    confirmation = (config) =>
      new Promise((resolve) => {
        finish = () => resolve(ok(config, { message: 'Email verified successfully.' }));
      });
    renderPage();
    const user = setupUser();
    const button = await screen.findByRole('button', { name: /^verify email$/i });
    await user.dblClick(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('status', { name: /confirmation/i })).toHaveTextContent(/verifying/i);
    expect(calls.filter((call) => call.path === '/auth/verify-email')).toHaveLength(1);
    await act(async () => {
      finish();
    });
  });

  it.each(['invalid', 'expired', 'used'])('offers resend for %s links', async () => {
    confirmation = async (config) => failure(config, 400);
    renderPage();
    await setupUser().click(await screen.findByRole('button', { name: /^verify email$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /^verify email$/i })).not.toBeInTheDocument();
  });

  it('keeps retry available after a network failure', async () => {
    confirmation = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };
    renderPage();
    const user = setupUser();
    await user.click(await screen.findByRole('button', { name: /^verify email$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i);
    confirmation = async (config) => ok(config, { message: 'Email verified successfully.' });
    await user.click(screen.getByRole('button', { name: /^verify email$/i }));
    expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
    expect(calls.filter((call) => call.path === '/auth/verify-email')[1].data.token).toBe(
      linkToken
    );
  });

  it('shows resend pending and network error without losing the confirmation token', async () => {
    let failResend!: () => void;
    resend = (config) =>
      new Promise((_resolve, reject) => {
        failResend = () => reject(new AxiosError('Network Error', 'ERR_NETWORK', config));
      });
    renderPage();
    const user = setupUser();
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'ada@example.com');
    await user.dblClick(screen.getByRole('button', { name: /send verification email/i }));
    expect(screen.getByRole('button', { name: /requesting email/i })).toBeDisabled();
    expect(calls.filter((call) => call.path === '/auth/resend-verification')).toHaveLength(1);
    expect(screen.getByRole('status', { name: /resend/i })).toHaveTextContent(/requesting/i);
    await act(async () => {
      failResend();
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /check your connection and try again/i
    );
    expect(screen.getByRole('button', { name: /send verification email/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /^verify email$/i }));
    expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
  });

  it.each(['', 'not-an-email'])('validates resend email %s without submitting', async (email) => {
    renderPage('/verify-email');
    const user = setupUser();
    if (email) await user.type(screen.getByRole('textbox', { name: /email address/i }), email);
    await user.click(screen.getByRole('button', { name: /send verification email/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email address/i);
    expect(screen.getByRole('textbox', { name: /email address/i })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(calls.filter((call) => call.path === '/auth/resend-verification')).toHaveLength(0);
  });

  it('shows generic resend feedback and a visible sixty-second cooldown', async () => {
    renderPage('/verify-email');
    const user = setupUser();
    await user.type(screen.getByRole('textbox', { name: /email address/i }), '  ADA@Example.com  ');
    await user.click(screen.getByRole('button', { name: /send verification email/i }));
    expect(await screen.findByRole('status', { name: /resend/i })).toHaveTextContent(
      /if this email needs verification/i
    );
    expect(calls.filter((call) => call.path === '/auth/resend-verification')[0].data).toEqual({
      email: 'ada@example.com',
    });
    const resendButton = screen.getByRole('button', { name: /send verification email/i });
    expect(resendButton).toBeDisabled();
    expect(screen.getByText(/try again in 60 seconds/i)).toBeInTheDocument();
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);
    await waitFor(() => expect(resendButton).toBeEnabled(), { timeout: 1500 });
    expect(screen.queryByText(/try again in/i)).not.toBeInTheDocument();
    clock.mockRestore();
  });

  it('completes confirmation and resend using keyboard only', async () => {
    renderPage();
    const user = setupUser();
    const verify = await screen.findByRole('button', { name: /^verify email$/i });
    verify.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
    const email = screen.getByRole('textbox', { name: /email address/i });
    email.focus();
    await user.keyboard('ada@example.com');
    await user.tab();
    expect(screen.getByRole('button', { name: /send verification email/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /resend/i })).toHaveTextContent(/check your inbox/i)
    );
  });
});
