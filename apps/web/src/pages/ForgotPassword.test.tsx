import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Providers } from '../test/providers';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';
import { tokenStore } from '../services/tokenStore';
import { setupUser } from '../test/user';

// The implemented backend strings (SP-105A/B/F) — the page renders the
// sanitized RecoveryError message and the 200 body verbatim.
const GENERIC_SUCCESS =
  'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.';
const RATE_LIMITED = 'Too many recovery requests. Wait and try again.';
const UNAVAILABLE = 'Service temporarily unavailable. Please try again later.';

const student = { id: 'ada', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };

let signedIn = false;
let calls: { path?: string; data: Record<string, unknown> }[];
let requestHandler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function ok(
  config: InternalAxiosRequestConfig,
  data: unknown,
  headers: Record<string, string> = {},
): AxiosResponse {
  return { config, data, status: 200, statusText: 'OK', headers } as AxiosResponse;
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

function renderPage() {
  render(
    <Providers initialEntries={['/forgot-password']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Providers>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    signedIn = false;
    calls = [];
    requestHandler = async (config) => ok(config, { message: GENERIC_SUCCESS });
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const data = config.data ? JSON.parse(config.data) : {};
      calls.push({ path: config.url, data });
      if (config.url === '/auth/refresh') {
        if (!signedIn) throw fail(config, 401, { message: 'Unauthorized' });
        return ok(config, { accessToken: 'existing-session', user: student });
      }
      if (config.url === '/auth/forgot-password') return requestHandler(config);
      if (config.url === '/users/me') return ok(config, { ...student, createdAt: '', updatedAt: '' });
      throw new Error(`Unexpected test request: ${config.url}`);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the email form without requesting a link', async () => {
    renderPage();
    expect(await screen.findByRole('textbox', { name: /email/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeEnabled();
    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toHaveLength(0);
  });

  it('submits the trimmed, lowercased email and shows the single generic success state', async () => {
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByRole('textbox', { name: /email/i }), '  ADA@Example.com  ');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(GENERIC_SUCCESS)).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toEqual([
      { path: '/auth/forgot-password', data: { email: 'ada@example.com' } },
    ]);
  });

  it('shows the same generic success for a 200 regardless of account existence', async () => {
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByRole('textbox', { name: /email/i }), 'unknown@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    // One generic message, one request — the UI cannot and must not branch
    // on account existence (SD9).
    expect(await screen.findByText(GENERIC_SUCCESS)).toBeInTheDocument();
    expect(screen.getAllByText(GENERIC_SUCCESS)).toHaveLength(1);
    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toHaveLength(1);
  });

  it('renders a server 400 field error as an actionable alert and keeps the form', async () => {
    requestHandler = (config) => {
      throw fail(config, 400, {
        statusCode: 400,
        // All four DTO constraints carry the same message; the sanitizer dedupes.
        message: [
          'Please enter a valid email address',
          'Please enter a valid email address',
          'Please enter a valid email address',
          'Please enter a valid email address',
        ],
        error: 'Bad Request',
      });
    };
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByRole('textbox', { name: /email/i }), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a valid email address');
    expect(screen.getByRole('textbox', { name: /email/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeEnabled();
  });

  it('disables submit while in flight and prevents duplicate submissions', async () => {
    let finish!: () => void;
    requestHandler = (config) =>
      new Promise<AxiosResponse>((resolve) => {
        finish = () => resolve(ok(config, { message: GENERIC_SUCCESS }));
      });
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByRole('textbox', { name: /email/i }), 'ada@example.com');
    const button = screen.getByRole('button', { name: /send reset link/i });
    await user.dblClick(button);
    expect(button).toBeDisabled();
    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toHaveLength(1);
    await act(async () => {
      finish();
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(await screen.findByText(GENERIC_SUCCESS)).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toHaveLength(1);
  });

  it.each([false, true])(
    'is reachable while signed in=%s and the request preserves the session',
    async signed => {
      signedIn = signed;
      renderPage();
      const user = setupUser();
      await user.type(await screen.findByRole('textbox', { name: /email/i }), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      expect(await screen.findByText(GENERIC_SUCCESS)).toBeInTheDocument();
      if (signed) {
        // forgot-password never touches the live session — no barrier, no clear.
        expect(tokenStore.getToken()).toBe('existing-session');
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      } else {
        expect(tokenStore.getToken()).toBeNull();
      }
    },
  );

  it('waits out a 429 Retry-After, keeps the email, and offers explicit retry without resubmitting', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_000_000);
    requestHandler = (config) => {
      throw fail(
        config,
        429,
        { statusCode: 429, message: RATE_LIMITED, error: 'Too Many Requests' },
        { 'Retry-After': '5' },
      );
    };
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByRole('textbox', { name: /email/i }), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many recovery requests/i);
    expect(screen.getByText(/try again in 5 seconds/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /send reset link/i });
    expect(button).toBeDisabled();
    // The wait elapses on the monotonic clock — no automatic resubmission.
    clock.mockReturnValue(1_000_000 + 5_000);
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 1500 });
    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toHaveLength(1);
    // The typed email survives the rate limit for the explicit retry.
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('ada@example.com');
    requestHandler = async (config) => ok(config, { message: GENERIC_SUCCESS });
    await user.click(button);
    expect(await screen.findByText(GENERIC_SUCCESS)).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toHaveLength(2);
  });

  it.each([
    ['absent', {}],
    ['malformed', { 'Retry-After': 'soon' }],
    ['zero', { 'Retry-After': '0' }],
    ['out of range', { 'Retry-After': '61' }],
  ])(
    'falls back to the 60-second wait for a %s Retry-After',
    async (_name, headers) => {
      requestHandler = (config) => {
        throw fail(
          config,
          429,
          { statusCode: 429, message: RATE_LIMITED, error: 'Too Many Requests' },
          headers,
        );
      };
      renderPage();
      const user = setupUser();
      await user.type(await screen.findByRole('textbox', { name: /email/i }), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/too many recovery requests/i);
      expect(screen.getByText(/try again in 60 seconds/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeDisabled();
    },
  );

  it.each([
    ['a 503', (config: InternalAxiosRequestConfig, reject: (e: unknown) => void) =>
      reject(
        fail(config, 503, {
          statusCode: 503,
          message: UNAVAILABLE,
          error: 'Service Unavailable',
        }),
      )],
    ['a network failure', (config: InternalAxiosRequestConfig, reject: (e: unknown) => void) =>
      reject(new AxiosError('Network Error', 'ERR_NETWORK', config))],
  ])(
    'offers retry for %s without a rate-limit countdown and keeps the email',
    async (_name, produce) => {
      requestHandler = (config) =>
        new Promise<AxiosResponse>((_resolve, reject) => produce(config, reject));
      renderPage();
      const user = setupUser();
      await user.type(await screen.findByRole('textbox', { name: /email/i }), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/try again|check your connection/i);
      expect(screen.queryByText(/try again in/i)).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('ada@example.com');
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeEnabled();
    },
  );

  it('completes the request using keyboard only', async () => {
    renderPage();
    const user = setupUser();
    const email = await screen.findByRole('textbox', { name: /email/i });
    email.focus();
    await user.keyboard('ada@example.com');
    await user.tab();
    expect(screen.getByRole('button', { name: /send reset link/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText(GENERIC_SUCCESS)).toBeInTheDocument();
  });

  it('announces async status via aria-live', async () => {
    let finish!: () => void;
    requestHandler = (config) =>
      new Promise<AxiosResponse>((resolve) => {
        finish = () => resolve(ok(config, { message: GENERIC_SUCCESS }));
      });
    renderPage();
    const user = setupUser();
    await user.type(await screen.findByRole('textbox', { name: /email/i }), 'ada@example.com');
    const status = screen.getByRole('status');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(status).toHaveTextContent(/requesting your reset link/i);
    await act(async () => {
      finish();
    });
    await waitFor(() => expect(status).toHaveTextContent(GENERIC_SUCCESS));
  });
});
