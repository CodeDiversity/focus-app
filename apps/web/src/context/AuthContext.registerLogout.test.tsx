import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import { Providers, makeTestStore } from '../test/providers';
import type { AuthResponse, RegisteredUser } from '../types';

vi.mock('../services/auth', () => ({
  authService: {
    register: vi.fn(),
    getProfile: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const mockedRegister = vi.mocked(authService.register);
const mockedRefresh = vi.mocked(authService.refreshToken);
const mockedLogout = vi.mocked(authService.logout);

const sessionUser = { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', emailVerifiedAt: null };

let currentAuth: ReturnType<typeof useAuth>;

/** Captures the context and surfaces its error/loading/session state. */
function Probe() {
  currentAuth = useAuth();
  return (
    <div>
      <span data-testid="auth-error">{currentAuth.error ?? ''}</span>
      <span data-testid="auth-loading">{String(currentAuth.isLoading)}</span>
      <span data-testid="auth-user">{currentAuth.user?.id ?? 'signed-out'}</span>
    </div>
  );
}

function renderProvider() {
  const store = makeTestStore();
  render(
    <Providers store={store} initialEntries={['/register']}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </Providers>,
  );
  return store;
}

/** Settles the boot restore so the test observes only its own action. */
async function bootRestored() {
  mockedRefresh.mockResolvedValue({ accessToken: 'token-1', user: sessionUser } as AuthResponse);
  const store = renderProvider();
  await waitFor(() => expect(store.getState().auth.isLoading).toBe(false));
  return store;
}

describe('AuthContext register callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clearToken();
    mockedRefresh.mockRejectedValue(new Error('401'));
  });

  it('register rejection stores the sanitized message and rethrows (no user set)', async () => {
    mockedRegister.mockRejectedValue(new Error('An account with this email already exists.'));
    const store = renderProvider();
    await waitFor(() => expect(store.getState().auth.isLoading).toBe(false));

    let thrown: unknown;
    await act(async () => {
      thrown = await currentAuth.register('Ada Lovelace', 'ada@example.com', 'password123').catch(
        (err: unknown) => err,
      );
    });

    // The caller still sees the rejection (RegisterPage renders it / must not navigate).
    expect((thrown as Error).message).toBe('An account with this email already exists.');
    expect(screen.getByTestId('auth-error')).toHaveTextContent('An account with this email already exists.');
    expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
    expect(store.getState().auth.user).toBeNull();
    expect(tokenStore.getToken()).toBeNull();
  });

  it('register success does not authenticate and clears loading', async () => {
    mockedRegister.mockResolvedValue({ id: 'user-9' } as RegisteredUser);
    const store = renderProvider();
    await waitFor(() => expect(store.getState().auth.isLoading).toBe(false));

    await act(async () => {
      await currentAuth.register('Ada Lovelace', 'ada@example.com', 'password123');
    });

    // Registration issues no token and signs nobody in (SP-102's flow).
    expect(store.getState().auth.user).toBeNull();
    expect(tokenStore.getToken()).toBeNull();
    expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('auth-error')).toHaveTextContent('');
  });
});

describe('AuthContext logout callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clearToken();
  });

  it('logout clears token and user even when the service rejects', async () => {
    mockedLogout.mockRejectedValue(new Error('network'));

    const store = await bootRestored();
    expect(store.getState().auth.user).toMatchObject({ id: 'user-1' });
    expect(tokenStore.getToken()).toBeNull(); // the mocked refresh does not write the token

    // The always-clear-token guarantee: a live token is dropped regardless.
    tokenStore.setToken('token-1');
    const clearSpy = vi.spyOn(tokenStore, 'clearToken');

    await act(async () => {
      await currentAuth.logout();
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(tokenStore.getToken()).toBeNull();
    expect(store.getState().auth.user).toBeNull();
    expect(screen.getByTestId('auth-user')).toHaveTextContent('signed-out');
  });

  it('logout clears token and user when the service resolves', async () => {
    mockedLogout.mockResolvedValue();

    const store = await bootRestored();
    tokenStore.setToken('token-1');

    await act(async () => {
      await currentAuth.logout();
    });

    expect(tokenStore.getToken()).toBeNull();
    expect(store.getState().auth.user).toBeNull();
  });
});