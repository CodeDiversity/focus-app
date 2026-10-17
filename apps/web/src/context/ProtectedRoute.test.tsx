import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PublicRoute } from '../components/PublicRoute';
import { authService } from '@/features/auth/api/authService';
import { Providers, makeTestStore } from '../test/providers';
import type { AuthResponse } from '@/features/auth/model/types';

vi.mock('@/features/auth/api/authService', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('@/entities/user/api/userService', () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const mockedRefresh = vi.mocked(authService.refreshToken);

const sessionUser = { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', emailVerifiedAt: null };

/** The real guards' spinner is the only `.animate-spin` element they render. */
function spinner(container: HTMLElement) {
  return container.querySelector('.animate-spin');
}

/** Renders beside `<Routes>` so it survives the guard's redirect. */
function LocationProbe() {
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string } } | null;
  return (
    <div>
      <span data-testid="nav-path">{location.pathname}</span>
      <span data-testid="nav-from">{state?.from?.pathname ?? ''}</span>
    </div>
  );
}

function renderGuards(initialEntry: string) {
  const store = makeTestStore();
  const utils = render(
    <Providers store={store} initialEntries={[initialEntry]}>
      <AuthProvider>
        <LocationProbe />
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard content</div>} />
            <Route path="/profile" element={<div>Profile content</div>} />
          </Route>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Login form</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Providers>,
  );
  return { store, ...utils };
}

/** Leaves the silent boot refresh in flight until the test settles it. */
function pendingRefresh() {
  let resolveRefresh!: (value: AuthResponse) => void;
  let rejectRefresh!: (reason?: unknown) => void;
  const promise = new Promise<AuthResponse>((resolve, reject) => {
    resolveRefresh = resolve;
    rejectRefresh = reject;
  });
  mockedRefresh.mockImplementation(() => promise);
  return {
    resolve: async () => {
      await act(async () => {
        resolveRefresh({ accessToken: 'token-1', user: { ...sessionUser } } as AuthResponse);
        await promise.catch(() => undefined);
      });
    },
    reject: async () => {
      await act(async () => {
        rejectRefresh(new Error('401'));
        await promise.catch(() => undefined);
      });
    },
  };
}

describe('route guards — boot session restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pending boot refresh shows the spinner and stays on /dashboard', async () => {
    pendingRefresh();

    const { container } = renderGuards('/dashboard');

    // The guard must hold the session-restoring spinner, not redirect.
    expect(screen.getByTestId('nav-path')).toHaveTextContent('/dashboard');
    expect(spinner(container)).not.toBeNull();
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
  });

  it('resolved boot refresh renders the protected outlet', async () => {
    const refresh = pendingRefresh();

    const { container, store } = renderGuards('/dashboard');
    expect(spinner(container)).not.toBeNull();

    await refresh.resolve();

    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByTestId('nav-path')).toHaveTextContent('/dashboard');
    expect(spinner(container)).toBeNull();
    expect(store.getState().auth.user).toMatchObject({ id: 'user-1' });
  });

  it('failed restore redirects to /login and records state.from for a /profile deep link', async () => {
    const refresh = pendingRefresh();

    renderGuards('/profile');
    expect(screen.getByTestId('nav-path')).toHaveTextContent('/profile');

    await refresh.reject();

    await waitFor(() => {
      expect(screen.getByTestId('nav-path')).toHaveTextContent('/login');
    });
    expect(await screen.findByText('Login form')).toBeInTheDocument();
    expect(screen.getByTestId('nav-from')).toHaveTextContent('/profile');
  });
});

describe('PublicRoute — boot session restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PublicRoute holds the spinner during restore and does not redirect to /dashboard', async () => {
    const refresh = pendingRefresh();

    const { container } = renderGuards('/login');

    expect(screen.getByTestId('nav-path')).toHaveTextContent('/login');
    expect(spinner(container)).not.toBeNull();
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();

    // Once the restore settles as authenticated, the public guard redirects.
    await refresh.resolve();

    await waitFor(() => {
      expect(screen.getByTestId('nav-path')).toHaveTextContent('/dashboard');
    });
    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
  });
});