import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { PublicRoute } from '@/widgets/public-route/ui/PublicRoute';
// test-only: the BL-14-07 reproduction drives the real login path (EP16D-AC5)
// eslint-disable-next-line import/no-restricted-paths
import { LoginPage } from '@/pages/login/ui/LoginPage';
import { Header } from '@/widgets/header/ui/Header';
import { authService } from '@/features/auth/api/authService';
import { onboardingService, type OnboardingState } from '@/features/onboarding/api/onboardingApi';
import { Providers, makeTestStore } from '@/test/providers';
import { setupUser } from '@/test/user';
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

vi.mock('@/features/onboarding/api/onboardingApi', () => ({
  onboardingService: {
    getState: vi.fn(),
    updateState: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedRefresh = vi.mocked(authService.refreshToken);
const mockedLogin = vi.mocked(authService.login);
const mockedGetState = vi.mocked(onboardingService.getState);

const sessionUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
};

/**
 * BL-14-07 reproduction (EP16D-AC5) through the real login path: signing in
 * triggers two `replace` navigations one network round-trip apart (`PublicRoute`
 * → `/today`, then `LoginPage`'s onboarding check → `/onboarding`). A menu the
 * student opens between them must survive the second, programmatic redirect.
 */
describe('Header post-login redirect (BL-14-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a just-opened account menu survives the post-login onboarding redirect (BL-14-07 reproduction)', async () => {
    const user = setupUser();
    mockedRefresh.mockRejectedValue(new Error('401'));
    mockedLogin.mockResolvedValue({
      accessToken: 'token-1',
      user: { ...sessionUser },
    } as AuthResponse);
    // The onboarding read stays in flight until the test resolves it — the
    // window in which a real student (or Playwright) opens the account menu.
    let resolveState!: (state: OnboardingState) => void;
    mockedGetState.mockImplementation(
      () =>
        new Promise<OnboardingState>((resolve) => {
          resolveState = resolve;
        })
    );

    render(
      <Providers store={makeTestStore()} initialEntries={['/login']}>
        <AuthProvider>
          <Header />
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route path="/today" element={<div>Today content</div>} />
            <Route path="/onboarding" element={<div>Onboarding content</div>} />
            <Route path="*" element={<div />} />
          </Routes>
        </AuthProvider>
      </Providers>
    );

    // Boot restore fails silently → the login form renders.
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    // Pathname change #1: PublicRoute replaces /login with /today.
    expect(await screen.findByText('Today content')).toBeInTheDocument();

    // The student opens the account menu while the onboarding read is in flight.
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();

    // Pathname change #2: the orphaned onSubmit resolves and redirects again.
    await act(async () => {
      resolveState({ step: 1, completed: false, completedAt: null, semesterId: null });
    });

    expect(await screen.findByText('Onboarding content')).toBeInTheDocument();
    // The programmatic REPLACE redirect must not close the menu (D-D5).
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
  });
});
