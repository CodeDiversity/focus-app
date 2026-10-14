import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/auth';
import api from '../services/api';
import { tokenStore } from '../services/tokenStore';

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

const renderProvider = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Probe />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

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

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <NavProbe />
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
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

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <LogoutProbe />
        </AuthProvider>
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
    render(<MemoryRouter><AuthProvider><VerificationProbe /></AuthProvider></MemoryRouter>);
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
