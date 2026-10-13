import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

    await expect(api.get('/protected-data')).rejects.toBeTruthy();

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
    button.click();
    expect(await screen.findByRole('button', { name: 'signed-out' })).toBeInTheDocument();
    expect(tokenStore.getToken()).toBeNull();
  });
});
