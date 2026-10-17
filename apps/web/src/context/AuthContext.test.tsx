import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/auth';
import api from '../services/api';
import { tokenStore } from '../services/tokenStore';
import { runRecoveryReset } from '../services/recovery';
import type { AuthResponse } from '../types';
import authSlice from '../store/authSlice';

vi.mock('../services/auth', () => ({
  authService: {
    register: vi.fn(),
    getProfile: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockedRefresh = vi.mocked(authService.refreshToken);

function makeStore() {
  return configureStore({
    reducer: { auth: authSlice },
  });
}

function Probe() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? user?.email : 'logged-out'}</span>
      <span data-testid="path">{location.pathname}</span>
    </div>
  );
}

const renderProvider = () => {
  const store = makeStore();
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Provider store={store}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Probe />} />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
      </Provider>
    </MemoryRouter>,
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clearToken();
  });

  it('restores the session on reload via silent refresh', async () => {
    mockedRefresh.mockImplementation(async () => {
      tokenStore.setToken('token-1');
      return {
        accessToken: 'token-1',
        user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
      } as never;
    });

    renderProvider();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(tokenStore.getToken()).toBe('token-1');
  });

  it('stays logged out without redirecting when silent refresh fails', async () => {
    mockedRefresh.mockRejectedValue(new Error('401'));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('logged-out');
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/');
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('navigates to /login with expired state and the saved page when a mid-session refresh fails', async () => {
    mockedRefresh.mockImplementation(async () => {
      tokenStore.setToken('token-1');
      return {
        accessToken: 'token-1',
        user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
      } as never;
    });

    function NavProbe() {
      const location = useLocation();
      const state = location.state as {
        sessionExpired?: boolean;
        from?: { pathname?: string };
      } | null;
      return (
        <div>
          <span data-testid="nav-path">{location.pathname}</span>
          <span data-testid="nav-expired">{String(Boolean(state?.sessionExpired))}</span>
          <span data-testid="nav-from">{state?.from?.pathname ?? ''}</span>
        </div>
      );
    }

    const store = makeStore();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Provider store={store}>
          <AuthProvider>
            <NavProbe />
            <Routes>
              <Route path="/dashboard" element={<div>Dashboard page</div>} />
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </AuthProvider>
        </Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();

    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const response = {
        data: { message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      } as AxiosResponse;
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
    };

    await act(async () => { await expect(api.get('/protected-data')).rejects.toBeTruthy(); });

    await waitFor(() => {
      expect(screen.getByTestId('nav-path')).toHaveTextContent('/login');
    });
    expect(screen.getByTestId('nav-expired')).toHaveTextContent('true');
    expect(screen.getByTestId('nav-from')).toHaveTextContent('/dashboard');
    expect(tokenStore.getToken()).toBeNull();
  });

  it('logout clears the local session even when the logout request fails', async () => {
    mockedRefresh.mockResolvedValue({
      accessToken: 'token-1',
      user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
    } as never);
    vi.mocked(authService.logout).mockRejectedValue(new Error('network'));

    function LogoutProbe() {
      const { logout, isAuthenticated } = useAuth();
      return (
        <button onClick={() => void logout()}>
          {isAuthenticated ? 'sign-out' : 'signed-out'}
        </button>
      );
    }

    const store = makeStore();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Provider store={store}>
          <AuthProvider>
            <LogoutProbe />
          </AuthProvider>
        </Provider>
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: 'sign-out' });
    await act(async () => { button.click(); });
    expect(await screen.findByRole('button', { name: 'signed-out' })).toBeInTheDocument();
    expect(tokenStore.getToken()).toBeNull();
  });

  const sessionUser = { id: 'user-1', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };
  let currentAuth: ReturnType<typeof useAuth>;
  function VerificationProbe() {
    currentAuth = useAuth();
    return <span data-testid="profile-state">{JSON.stringify(currentAuth.user)}</span>;
  }
  async function renderVerificationProvider() {
    mockedRefresh.mockResolvedValue({ accessToken: 'session', user: sessionUser });
    const store = makeStore();
    render(<MemoryRouter><Provider store={store}><AuthProvider><VerificationProbe /></AuthProvider></Provider></MemoryRouter>);
    await waitFor(() => expect(currentAuth.user?.id).toBe('user-1'));
  }

  it('refreshes the current profile on focus without rotating the session', async () => {
    await renderVerificationProvider();
    vi.mocked(authService.getProfile).mockResolvedValue({ ...sessionUser, emailVerifiedAt: '2026-10-14T12:00:00Z', createdAt: '', updatedAt: '' });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(currentAuth.user?.emailVerifiedAt).toBe('2026-10-14T12:00:00Z');
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(authService.getProfile).toHaveBeenCalledTimes(1);
  });

  it('deduplicates verification profile refresh', async () => {
    await renderVerificationProvider();
    let resolveProfile!: (value: Awaited<ReturnType<typeof authService.getProfile>>) => void;
    vi.mocked(authService.getProfile).mockImplementation(() => new Promise(resolve => { resolveProfile = resolve; }));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => { first = currentAuth.refreshProfile(); second = currentAuth.refreshProfile(); });
    expect(authService.getProfile).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveProfile({ ...sessionUser, createdAt: '', updatedAt: '' });
      await Promise.all([first, second]);
    });
  });

  it('keeps the usable session when verification profile refresh fails', async () => {
    await renderVerificationProvider();
    tokenStore.setToken('usable-session');
    vi.mocked(authService.getProfile).mockRejectedValue(new Error('network unavailable'));
    await act(async () => { await currentAuth.refreshProfile(); });
    expect(currentAuth.isAuthenticated).toBe(true);
    expect(currentAuth.isLoading).toBe(false);
    expect(currentAuth.error).toBeNull();
    expect(tokenStore.getToken()).toBe('usable-session');
  });

  it('keeps the signed-in account when another account is verified', async () => {
    await renderVerificationProvider();
    vi.mocked(authService.getProfile).mockResolvedValue({ ...sessionUser, createdAt: '', updatedAt: '' });
    await act(async () => { await currentAuth.refreshProfile(); });
    expect(currentAuth.user).toMatchObject(sessionUser);
  });

  it.each(['logout', 'account change'] as const)('ignores a late profile response and queued fresh read after %s', async (change) => {
    await renderVerificationProvider();
    let resolveProfile!: (value: Awaited<ReturnType<typeof authService.getProfile>>) => void;
    vi.mocked(authService.getProfile).mockImplementation(() => new Promise(resolve => { resolveProfile = resolve; }));
    let flight!: Promise<void>;
    let queued!: Promise<void>;
    act(() => { flight = currentAuth.refreshProfile(); queued = currentAuth.refreshProfile({ fresh: true }); });
    if (change === 'logout') {
      vi.mocked(authService.logout).mockResolvedValue();
      await act(async () => { await currentAuth.logout(); });
    } else {
      vi.mocked(authService.login).mockResolvedValue({ accessToken: 'other-session', user: { ...sessionUser, id: 'user-2', email: 'grace@example.com' } });
      await act(async () => { await currentAuth.login('grace@example.com', 'password'); });
    }
    await act(async () => {
      resolveProfile({ ...sessionUser, emailVerifiedAt: '2026-10-14', createdAt: '', updatedAt: '' });
      await Promise.all([flight, queued]);
    });
    expect(currentAuth.user?.id ?? null).toBe(change === 'logout' ? null : 'user-2');
    expect(authService.getProfile).toHaveBeenCalledTimes(1);
  });
});

describe('AuthContext recovery session generation (SP-105G M2)', () => {
  const sessionUser = { id: 'user-1', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };
  let currentAuth: ReturnType<typeof useAuth>;

  function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
    return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
  }

  function Probe() {
    currentAuth = useAuth();
    const location = useLocation();
    const state = location.state as { sessionExpired?: boolean; from?: { pathname?: string } } | null;
    if (currentAuth.isLoading) return <div>loading</div>;
    return (
      <div>
        <span data-testid="auth-state">{currentAuth.isAuthenticated ? currentAuth.user?.email : 'logged-out'}</span>
        <span data-testid="nav-path">{location.pathname}</span>
        <span data-testid="nav-expired">{String(Boolean(state?.sessionExpired))}</span>
      </div>
    );
  }

  function renderProvider() {
    const store = makeStore();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Provider store={store}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Probe />} />
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </AuthProvider>
        </Provider>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    cleanup();
    api.defaults.adapter = undefined;
    vi.clearAllMocks();
    tokenStore.clearToken();
  });

  it('rejects a boot-restore completion predating a successful reset', async () => {
    tokenStore.setToken('live-token');
    // The silent boot refresh is in flight (its generation snapshot predates the reset).
    let resolveRefresh!: (value: AuthResponse) => void;
    mockedRefresh.mockImplementation(() => new Promise((resolve) => { resolveRefresh = resolve; }));

    renderProvider();
    await act(async () => {
      await runRecoveryReset(() => Promise.resolve({ message: 'Password updated. Please sign in.' }));
    });
    expect(tokenStore.getToken()).toBeNull(); // cleared by the reset

    // The pre-reset boot refresh "succeeds" late: it must not resurrect the cleared session.
    await act(async () => {
      resolveRefresh({ accessToken: 'stale-token', user: { ...sessionUser, emailVerifiedAt: '2026-10-14' } } as AuthResponse);
    });
    expect(await screen.findByTestId('auth-state')).toHaveTextContent('logged-out');
    expect(tokenStore.getToken()).toBeNull();
  });

  it('rejects a profile-flight completion predating a successful reset', async () => {
    mockedRefresh.mockResolvedValue({ accessToken: 'session', user: sessionUser } as AuthResponse);
    renderProvider();
    await screen.findByText('ada@example.com');

    // A profile flight is in flight (focus-driven verification read).
    let resolveProfile!: (value: Awaited<ReturnType<typeof authService.getProfile>>) => void;
    vi.mocked(authService.getProfile).mockImplementation(() => new Promise((resolve) => { resolveProfile = resolve; }));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(authService.getProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      await runRecoveryReset(() => Promise.resolve({ message: 'Password updated. Please sign in.' }));
    });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('logged-out');

    // The stale profile read completes: it must not re-apply the old session.
    await act(async () => {
      resolveProfile({ ...sessionUser, emailVerifiedAt: '2026-10-14', createdAt: '', updatedAt: '' });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('logged-out'));
  });

  it('an explicit login after the reset re-establishes session operation', async () => {
    mockedRefresh.mockResolvedValue({ accessToken: 'session', user: sessionUser } as AuthResponse);
    renderProvider();
    await screen.findByText('ada@example.com');

    await act(async () => {
      await runRecoveryReset(() => Promise.resolve({ message: 'Password updated. Please sign in.' }));
    });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('logged-out');
    expect(tokenStore.getToken()).toBeNull();

    // The advanced generation must not block an explicit, post-reset login.
    // Models the real login, which writes the token on success.
    vi.mocked(authService.login).mockImplementation(async () => {
      tokenStore.setToken('new-token');
      return { accessToken: 'new-token', user: sessionUser } as AuthResponse;
    });
    await act(async () => { await currentAuth.login('ada@example.com', 'brand-new-password'); });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('ada@example.com');
    expect(tokenStore.getToken()).toBe('new-token');
  });

  it('a failed reset preserves the session and ordinary expiry still logs out', async () => {
    // Models the real single-flight refresh, which writes the token on success.
    mockedRefresh.mockImplementation(async () => {
      tokenStore.setToken('session');
      return { accessToken: 'session', user: sessionUser } as AuthResponse;
    });
    // The probe renders beside the Routes so it survives the /login redirect.
    const store = makeStore();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Provider store={store}>
          <AuthProvider>
            <Probe />
            <Routes>
              <Route path="/" element={<div>Home page</div>} />
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </AuthProvider>
        </Provider>
      </MemoryRouter>,
    );
    await screen.findByText('ada@example.com');

    // A uniform invalid-link 400 from the reset endpoint.
    const invalidLink = 'This reset link is invalid or has expired. Please request a new one.';
    const resetSend = () =>
      api
        .post('/auth/reset-password', { token: 'T0k3n', password: 'x', confirmPassword: 'x' })
        .then((r) => r.data);
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/refresh') {
        return ok(config, { accessToken: 'session', user: sessionUser } as AuthResponse);
      }
      const response = {
        data: { statusCode: 400, message: invalidLink, error: 'Bad Request', path: config.url, timestamp: '2026-10-15T12:00:00.000Z' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config,
      } as AxiosResponse;
      throw new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, null, response);
    };
    await expect(runRecoveryReset(resetSend)).rejects.toBeTruthy();

    // The prior session is preserved: no logout, no navigation, generation unchanged.
    expect(screen.getByTestId('auth-state')).toHaveTextContent('ada@example.com');
    expect(screen.getByTestId('nav-path')).toHaveTextContent('/');
    expect(screen.getByTestId('nav-expired')).toHaveTextContent('false');
    expect(tokenStore.getToken()).toBe('session');

    // Ordinary mid-session expiry afterwards still clears the session and navigates.
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/refresh') {
        return ok(config, { accessToken: 'session', user: sessionUser } as AuthResponse);
      }
      const response = { data: { message: 'Unauthorized' }, status: 401, statusText: 'Unauthorized', headers: {}, config } as AxiosResponse;
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
    };
    await act(async () => {
      await expect(api.get('/protected')).rejects.toBeTruthy();
    });
    await waitFor(() => expect(screen.getByTestId('nav-path')).toHaveTextContent('/login'));
    expect(screen.getByTestId('nav-expired')).toHaveTextContent('true');
    expect(screen.getByTestId('auth-state')).toHaveTextContent('logged-out');
    expect(tokenStore.getToken()).toBeNull();
  });
});
