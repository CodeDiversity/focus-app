import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { Providers } from '@/test/providers';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
// test-only: suite renders the real App router (SP-109H)
// eslint-disable-next-line import/no-restricted-paths
import App from '@/app/App';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import api from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import { setupUser } from '@/test/user';

// The implemented backend strings (SP-105A/B/F) — the page renders the
// sanitized RecoveryError message and the uniform invalid-link message.
const TOKEN = 'AbC123_-'.repeat(6).slice(0, 43);
const SUCCESS_MESSAGE = 'Password updated. Please sign in.';
const INVALID_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.';
const RATE_LIMITED = 'Too many recovery requests. Wait and try again.';
const UNAVAILABLE = 'Service temporarily unavailable. Please try again later.';
const DRAIN_TIMEOUT = 'Your session is still syncing. Please wait a moment, then try again.';

const student = { id: 'ada', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };

let signedIn = false;
let calls: { path?: string; data: Record<string, unknown> }[];
let resetHandler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
let restoreHandler: ((config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) | undefined;

function ok(
  config: InternalAxiosRequestConfig,
  data: unknown,
  headers: Record<string, string> = {}
): AxiosResponse {
  return { config, data, status: 200, statusText: 'OK', headers } as AxiosResponse;
}

function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
  headers: Record<string, string> = {}
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

// The `|reset` suffix exposes `location.state.reset` for the one-time-notice
// handoff assertion.
function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location">
      {location.pathname}
      {location.hash}
      {location.state?.reset === true ? '|reset' : ''}
    </span>
  );
}

function renderPage(path = `/reset-password#token=${TOKEN}`) {
  render(
    <Providers initialEntries={[path]}>
      <AuthProvider>
        <LocationProbe />
        <App />
      </AuthProvider>
    </Providers>
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    signedIn = false;
    calls = [];
    restoreHandler = undefined;
    resetHandler = async (config) => ok(config, { message: SUCCESS_MESSAGE });
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const data = config.data ? JSON.parse(config.data) : {};
      calls.push({ path: config.url, data });
      if (config.url === '/auth/refresh') {
        if (restoreHandler) return restoreHandler(config);
        if (!signedIn) throw fail(config, 401, { message: 'Unauthorized' });
        return ok(config, { accessToken: 'existing-session', user: student });
      }
      if (config.url === '/auth/reset-password') return resetHandler(config);
      if (config.url === '/users/me')
        return ok(config, { ...student, createdAt: '', updatedAt: '' });
      throw new Error(`Unexpected test request: ${config.url}`);
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reads the token from the URL fragment and offers the reset form', async () => {
    renderPage();
    // <input type="password"> has no implicit role in this toolchain, so the
    // form is queried by label (the Login.test pattern), not by textbox role.
    expect(await screen.findByLabelText(/^new password$/i)).toBeEnabled();
    expect(screen.getByLabelText(/^confirm new password$/i)).toBeEnabled();
    expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled();
    expect(calls.filter((c) => c.path === '/auth/reset-password')).toHaveLength(0);
  });

  it('strips the token fragment from the displayed URL', async () => {
    renderPage();
    await screen.findByLabelText(/^new password$/i);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/reset-password$/)
    );
  });

  it.each([
    ['/reset-password', 'a missing token'],
    [`/reset-password#token=${'a'.repeat(42)}`, 'a 42-character token'],
    [`/reset-password#token=${'a'.repeat(40)}$.!`, 'a non-base64url token'],
  ])('shows guidance and a re-request link for %s (no broken form)', async (path, _what) => {
    renderPage(path);
    expect(await screen.findByText(/needs the link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/auth/reset-password')).toHaveLength(0);
  });

  it('submits { token, password, confirmPassword } and hands off to /login', async () => {
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByLabelText(/^new password$/i), 'NewPassword1!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/login/));
    expect(calls.filter((c) => c.path === '/auth/reset-password')).toEqual([
      {
        path: '/auth/reset-password',
        data: { token: TOKEN, password: 'NewPassword1!', confirmPassword: 'NewPassword1!' },
      },
    ]);
    expect(tokenStore.getToken()).toBeNull();
  });

  it.each([
    [
      'a string message',
      (config: InternalAxiosRequestConfig) =>
        fail(config, 400, { statusCode: 400, message: INVALID_MESSAGE, error: 'Bad Request' }),
    ],
    [
      'a repeated constraint array',
      (config: InternalAxiosRequestConfig) =>
        fail(config, 400, {
          statusCode: 400,
          message: [INVALID_MESSAGE, INVALID_MESSAGE, INVALID_MESSAGE],
          error: 'Bad Request',
        }),
    ],
  ])(
    'shows the uniform invalid-link message and offers a new request on 400 (%s)',
    async (_what, produce) => {
      resetHandler = (config) => {
        throw produce(config);
      };
      renderPage();
      const user = setupUser();
      await user.type(await screen.findByLabelText(/^new password$/i), 'NewPassword1!');
      await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
      await user.click(screen.getByRole('button', { name: /update password/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_MESSAGE);
      // C11: the captured token is consumed — the form is gone, no retry possible.
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /request a new reset link/i })).toBeInTheDocument();
      expect(calls.filter((c) => c.path === '/auth/reset-password')).toHaveLength(1);
    }
  );

  it('keeps the token and form on a 400 password field error and resubmits with the token', async () => {
    resetHandler = (config) => {
      throw fail(config, 400, {
        statusCode: 400,
        message: ['Password must be at least 8 characters', 'Passwords do not match'],
        // The implemented filter puts a string in `error` — no field map (C7).
        error: 'Bad Request',
      });
    };
    renderPage();
    const user = setupUser();
    const password = await screen.findByLabelText(/^new password$/i);
    await user.type(password, 'ValidPass1!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'ValidPass1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 8 characters. Passwords do not match'
    );
    // C11: a field error does not consume the token — the form stays usable.
    expect(password).toHaveValue('ValidPass1!');
    expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /update password/i }));
    const resets = calls.filter((c) => c.path === '/auth/reset-password');
    expect(resets).toHaveLength(2);
    expect(resets[1].data).toEqual({
      token: TOKEN,
      password: 'ValidPass1!',
      confirmPassword: 'ValidPass1!',
    });
  });

  it.each([
    [
      'a 503',
      (config: InternalAxiosRequestConfig, reject: (e: unknown) => void) =>
        reject(
          fail(config, 503, { statusCode: 503, message: UNAVAILABLE, error: 'Service Unavailable' })
        ),
    ],
    [
      'a network failure',
      (config: InternalAxiosRequestConfig, reject: (e: unknown) => void) =>
        reject(new AxiosError('Network Error', 'ERR_NETWORK', config)),
    ],
  ])(
    'keeps the token and offers retry for %s without a rate-limit countdown',
    async (_what, produce) => {
      resetHandler = (config) =>
        new Promise<AxiosResponse>((_resolve, reject) => produce(config, reject));
      renderPage();
      const user = setupUser();
      const password = await screen.findByLabelText(/^new password$/i);
      await user.type(password, 'NewPassword1!');
      await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
      await user.click(screen.getByRole('button', { name: /update password/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /try again|check your connection/i
      );
      expect(screen.queryByText(/try again in/i)).not.toBeInTheDocument();
      expect(password).toHaveValue('NewPassword1!');
      expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled();
    }
  );

  it('renders a retryable drain failure when the in-flight refresh does not settle within the 10s bound', async () => {
    let settle: (() => void) | undefined;
    restoreHandler = (config) =>
      new Promise<AxiosResponse>((resolve) => {
        settle = () => resolve(ok(config, { accessToken: 'existing-session', user: student }));
      });
    try {
      renderPage();
      const user = setupUser();
      const password = await screen.findByLabelText(/^new password$/i);
      await user.type(password, 'NewPassword1!');
      await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
      // The 10s drain bound must be faked. userEvent awaits a (now fake) 0ms
      // timer per interaction, so the submit goes through fireEvent instead.
      vi.useFakeTimers();
      const form = screen.getByRole('button', { name: /update password/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });
      // The reset must not be dispatched while the refresh is undrained.
      expect(calls.filter((c) => c.path === '/auth/reset-password')).toHaveLength(0);
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });
      // The drain failure's re-render is scheduled on the real scheduler
      // (MessageChannel) once act resolves, so restore real timers before
      // polling: waitFor's interval must be able to fire to observe it.
      vi.useRealTimers();
      expect(await screen.findByRole('alert')).toHaveTextContent(DRAIN_TIMEOUT);
      expect(calls.filter((c) => c.path === '/auth/reset-password')).toHaveLength(0);
      // C11: a drain failure keeps the token and the form for the retry.
      expect(password).toHaveValue('NewPassword1!');
      expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled();
    } finally {
      // Self-heal the module state even if an assertion above failed: settle
      // the boot refresh so beginRefresh's finally clears the in-flight
      // registration and releases the held barrier — it must not leak into
      // later tests (a stuck barrier 409s every subsequent reset).
      vi.useRealTimers();
      await act(async () => {
        settle?.();
      });
    }
  });

  it('preserves the signed-in session on a 429 and runs the countdown', async () => {
    signedIn = true;
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_000_000);
    resetHandler = (config) => {
      throw fail(
        config,
        429,
        { statusCode: 429, message: RATE_LIMITED, error: 'Too Many Requests' },
        { 'Retry-After': '5' }
      );
    };
    renderPage();
    const user = setupUser();
    const password = await screen.findByLabelText(/^new password$/i);
    await user.type(password, 'NewPassword1!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many recovery requests/i);
    expect(screen.getByText(/try again in 5 seconds/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /update password/i });
    expect(button).toBeDisabled();
    // G: a failed reset preserves the session — token and user survive.
    expect(tokenStore.getToken()).toBe('existing-session');
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(password).toHaveValue('NewPassword1!');
    clock.mockReturnValue(1_000_000 + 5_000);
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 1500 });
  });

  it('uses a readable Retry-After within 1-60, waits it out, and retains form and token state', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_000_000);
    resetHandler = (config) => {
      throw fail(
        config,
        429,
        { statusCode: 429, message: RATE_LIMITED, error: 'Too Many Requests' },
        { 'Retry-After': '5' }
      );
    };
    renderPage();
    const user = setupUser();
    const password = await screen.findByLabelText(/^new password$/i);
    await user.type(password, 'NewPassword1!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many recovery requests/i);
    expect(screen.getByText(/try again in 5 seconds/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /update password/i });
    expect(button).toBeDisabled();
    clock.mockReturnValue(1_000_000 + 5_000);
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 1500 });
    // No automatic resubmission — the retry is the user's explicit click.
    expect(calls.filter((c) => c.path === '/auth/reset-password')).toHaveLength(1);
    expect(password).toHaveValue('NewPassword1!');
    resetHandler = async (config) => ok(config, { message: SUCCESS_MESSAGE });
    await user.click(button);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/login/));
    expect(calls.filter((c) => c.path === '/auth/reset-password')).toHaveLength(2);
  });

  it.each([
    ['absent', {}],
    ['malformed', { 'Retry-After': 'soon' }],
    ['zero', { 'Retry-After': '0' }],
    ['out of range', { 'Retry-After': '61' }],
  ])(
    'falls back to the 60-second wait for a %s Retry-After and retains form and token state',
    async (_what, headers) => {
      resetHandler = (config) => {
        throw fail(
          config,
          429,
          { statusCode: 429, message: RATE_LIMITED, error: 'Too Many Requests' },
          headers
        );
      };
      renderPage();
      const user = setupUser();
      const password = await screen.findByLabelText(/^new password$/i);
      await user.type(password, 'NewPassword1!');
      await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
      await user.click(screen.getByRole('button', { name: /update password/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/too many recovery requests/i);
      expect(screen.getByText(/try again in 60 seconds/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();
      expect(password).toHaveValue('NewPassword1!');
    }
  );

  it('clears the local token and user on success and navigates to /login with the notice state', async () => {
    signedIn = true;
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByLabelText(/^new password$/i), 'NewPassword1!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/login\|reset$/)
    );
    expect(tokenStore.getToken()).toBeNull();
    // The local user is cleared (G) — the signed-in header is gone.
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
    // The Login form is the landing state.
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('completes the flow using keyboard only', async () => {
    renderPage();
    const user = setupUser();
    const password = await screen.findByLabelText(/^new password$/i);
    password.focus();
    await user.keyboard('NewPassword1!');
    await user.tab();
    expect(screen.getByLabelText(/^confirm new password$/i)).toHaveFocus();
    await user.keyboard('NewPassword1!');
    await user.tab();
    expect(screen.getByRole('button', { name: /update password/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/login/));
  });

  it('announces async status via aria-live', async () => {
    let finish!: () => void;
    resetHandler = (config) =>
      new Promise<AxiosResponse>((resolve) => {
        finish = () => resolve(ok(config, { message: SUCCESS_MESSAGE }));
      });
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByLabelText(/^new password$/i), 'NewPassword1!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
    const status = screen.getByRole('status');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(status).toHaveTextContent(/updating your password/i);
    await act(async () => {
      finish();
    });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/login/));
  });
});
