import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { OnboardingPage } from '@/pages/onboarding/ui/OnboardingPage';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/entities/user/api/userService';
import { onboardingService, type OnboardingState } from '@/features/onboarding/api/onboardingApi';
import { applyOnboardingState } from '@/features/onboarding/model/onboardingSlice';
import { makeTestStore } from '@/test/providers';
import { setUser } from '@/features/session/model/authSlice';
import type { User } from '@/entities/user/model/types';
// RD7: sanctioned pages → app import for typed AppStore
// eslint-disable-next-line import/no-restricted-paths
import type { AppStore } from '@/app/store/store';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/features/auth/api/authService', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
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

const mockedRefreshToken = vi.mocked(authService.refreshToken);
const mockedLogout = vi.mocked(authService.logout);
const mockedGetProfile = vi.mocked(userService.getProfile);
const mockedUpdateProfile = vi.mocked(userService.updateProfile);
const mockedGetState = vi.mocked(onboardingService.getState);
const mockedUpdateState = vi.mocked(onboardingService.updateState);

const storedStudent: User = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: '2026-10-01T12:00:00.000Z',
  timeZone: 'America/New_York',
  preferences: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

const freshState: OnboardingState = {
  step: 1,
  completed: false,
  completedAt: null,
  semesterId: null,
};

const validUser = userEvent.setup();

/**
 * Renders the page in the real provider stack. `seed` applies a prior
 * onboarding read to the slice (omitted → the page must fetch on mount).
 */
const renderPage = (seed?: Partial<OnboardingState>, user: User = storedStudent): AppStore => {
  const store = makeTestStore();
  store.dispatch(setUser(user));
  if (seed) {
    store.dispatch(applyOnboardingState({ ...freshState, ...seed }));
  }
  mockedRefreshToken.mockResolvedValue({ accessToken: 'test-token', user });
  mockedGetProfile.mockResolvedValue(user);
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <AuthProvider>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </Provider>
  );
  return store;
};

/** The boot restore settles in a microtask; settle before interacting. */
const waitForBoot = async () => {
  await waitFor(() => expect(mockedRefreshToken).toHaveBeenCalled());
};

describe('OnboardingPage state loading (AC 1, 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLogout.mockResolvedValue();
  });

  it('fetches the onboarding state on mount when the slice is idle', async () => {
    let resolveFetch!: (value: OnboardingState) => void;
    mockedGetState.mockImplementation(
      () =>
        new Promise<OnboardingState>((resolve) => {
          resolveFetch = resolve;
        })
    );
    renderPage(); // no seed → idle

    // The page dispatches the fetch and the shell renders its spinner.
    expect(await screen.findByRole('status')).toHaveTextContent(/loading your setup/i);
    expect(mockedGetState).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(freshState);
    });

    expect(await screen.findByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it('reuses an already-fetched state instead of re-fetching', async () => {
    renderPage({ step: 1 }); // ready
    await waitForBoot();

    expect(await screen.findByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(mockedGetState).not.toHaveBeenCalled();
  });

  it('shows the fetch failure with an actionable retry and recovers on success', async () => {
    mockedGetState.mockRejectedValue({ message: 'Network failure occurred' });
    renderPage(); // no seed → idle → fetch fails

    // `alert` is a name-from-author role — query by role, then assert the
    // announced content.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load your setup");
    expect(alert).toHaveTextContent('Network failure occurred');

    // Retry: the state fetch goes out again and the wizard renders.
    mockedGetState.mockResolvedValue(freshState);
    await validUser.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(mockedGetState).toHaveBeenCalledTimes(2);
  });
});

describe('OnboardingPage resume and terminal redirect (AC 1, 5, 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLogout.mockResolvedValue();
  });

  it('redirects a completed student to /dashboard and never renders the wizard', async () => {
    renderPage({
      step: 2,
      completed: true,
      completedAt: '2026-10-18T12:00:00.000Z',
    });

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText(/set up studypilot/i)).not.toBeInTheDocument();
  });

  it('resumes at the stored step (step 2 renders step 2 with the announced step)', async () => {
    renderPage({ step: 2 });
    await waitForBoot();

    expect(await screen.findByText(/step 2 of 3/i)).toBeInTheDocument();
    // The SP-107D form stands in for the step-2 content.
    expect(screen.getByLabelText(/semester name/i)).toBeInTheDocument();
    // The step indicator marks the current step for assistive tech.
    const indicator = screen.getByRole('list', { name: /setup progress/i });
    const items = Array.from(indicator.querySelectorAll('li'));
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });

  it('renders the step-3 placeholder at the last step', async () => {
    renderPage({ step: 3 });
    await waitForBoot();

    expect(await screen.findByText(/step 3 of 3/i)).toBeInTheDocument();
    expect(screen.getByText('Your first course')).toBeInTheDocument();
  });
});

describe('OnboardingPage footer controls (AC 4, 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLogout.mockResolvedValue();
  });

  it('hides the skip control on step 1 (D107-4: step 1 is required)', async () => {
    renderPage({ step: 1 });
    await waitForBoot();

    await screen.findByText(/step 1 of 3/i);
    expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
  });

  it('offers the skip control on step 2', async () => {
    renderPage({ step: 2 });
    await waitForBoot();
    expect(await screen.findByRole('button', { name: /skip for now/i })).toBeInTheDocument();
  });

  it('offers the skip control on step 3', async () => {
    renderPage({ step: 3 });
    await waitForBoot();
    expect(await screen.findByRole('button', { name: /skip for now/i })).toBeInTheDocument();
  });

  it('records terminal completion on skip and redirects to /dashboard (AC-107-04)', async () => {
    mockedUpdateState.mockResolvedValue({
      step: 2,
      completed: true,
      completedAt: '2026-10-18T12:00:00.000Z',
      semesterId: null,
    });
    const store = renderPage({ step: 2 });
    await waitForBoot();

    await validUser.click(await screen.findByRole('button', { name: /skip for now/i }));

    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledWith({ completed: true }));
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(store.getState().onboarding.completed).toBe(true);
  });

  it('keeps the wizard and shows the actionable error when the skip write fails', async () => {
    mockedUpdateState.mockRejectedValue({
      message: 'We could not save your setup. Try again.',
    });
    const store = renderPage({ step: 2 });
    await waitForBoot();

    await validUser.click(await screen.findByRole('button', { name: /skip for now/i }));

    expect(await screen.findByText('We could not save your setup. Try again.')).toBeInTheDocument();
    // No redirect: the student stays in the wizard to retry.
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
    expect(store.getState().onboarding.completed).toBe(false);
  });

  it('offers sign-out in the wizard footer (the exit + resume path)', async () => {
    renderPage({ step: 1 });
    await waitForBoot();
    await screen.findByText(/step 1 of 3/i);

    const signOut = screen.getByRole('button', { name: /sign out/i });
    expect(signOut).toBeInTheDocument();

    await validUser.click(signOut);
    await waitFor(() => expect(mockedLogout).toHaveBeenCalled());
  });
});

describe('OnboardingPage step 1 (AC 3, 6, 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLogout.mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes step 1 with the keyboard only and advances to step 2', async () => {
    mockedUpdateProfile.mockResolvedValue({ ...storedStudent, name: 'Ada Byron' });
    mockedUpdateState.mockResolvedValue({
      step: 2,
      completed: false,
      completedAt: null,
      semesterId: null,
    });
    const store = renderPage({ step: 1 });
    await waitForBoot();

    // The pre-filled values are valid, so the whole flow is focus + tab +
    // Enter — no pointer anywhere.
    const nameInput = screen.getByLabelText(/display name/i);
    nameInput.focus();
    await validUser.tab(); // → time zone select
    expect(screen.getByLabelText(/time zone/i)).toHaveFocus();
    await validUser.tab(); // → save button
    expect(screen.getByRole('button', { name: /save and continue/i })).toHaveFocus();
    await validUser.keyboard('{Enter}');

    await waitFor(() =>
      expect(mockedUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Ada Lovelace' })
      )
    );
    await waitFor(() => expect(store.getState().onboarding.step).toBe(2));

    // The shell re-renders the SP-107D step 2 with the announced step.
    expect(await screen.findByText(/step 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/semester name/i)).toBeInTheDocument();
  });

  it('fits the responsive wizard container on mobile and desktop widths', async () => {
    renderPage({ step: 1 });
    await waitForBoot();
    await screen.findByText(/step 1 of 3/i);

    // jsdom cannot measure real layout — the responsive treatment is the
    // container class contract (same pattern as the Profile page).
    const wizard = document.querySelector('.max-w-2xl');
    expect(wizard).not.toBeNull();
    expect(wizard).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
  });
});
