import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { Step1Preferences } from '@/features/onboarding/ui/Step1Preferences';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/entities/user/api/userService';
import { onboardingService } from '@/features/onboarding/api/onboardingApi';
import { applyOnboardingState } from '@/features/onboarding/model/onboardingSlice';
import { makeTestStore } from '@/test/providers';
import { setUser } from '@/features/session/model/authSlice';
import { getBrowserTimeZone } from '@/shared/lib/datetime';
import type { User } from '@/entities/user/model/types';
// RD7: sanctioned features → app import for typed AppStore
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
const mockedGetProfile = vi.mocked(userService.getProfile);
const mockedUpdateProfile = vi.mocked(userService.updateProfile);
const mockedUpdateState = vi.mocked(onboardingService.updateState);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

/** The stored student as GET/PATCH /users/me returns it (SP-106B shape). */
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

const validUser = userEvent.setup();

/**
 * Renders step 1 inside the real provider stack with the signed-in student
 * seeded (the wizard is a protected route — a session always exists there).
 * The onboarding slice is seeded at the given step so the form's submit can
 * advance the pointer.
 */
const renderStep1 = (user: User = storedStudent, profile?: User, step = 1): AppStore => {
  const store = makeTestStore();
  store.dispatch(setUser(user));
  store.dispatch(
    applyOnboardingState({
      step,
      completed: false,
      completedAt: null,
      semesterId: null,
    })
  );
  mockedRefreshToken.mockResolvedValue({ accessToken: 'test-token', user });
  mockedGetProfile.mockResolvedValue(profile ?? user);
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <AuthProvider>
          <Step1Preferences />
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

const nameInput = () => screen.getByLabelText(/display name/i);
const timeZoneSelect = () => screen.getByLabelText(/time zone/i) as HTMLSelectElement;
const saveButton = () => screen.getByRole('button', { name: /save and continue/i });

describe('Step1Preferences pre-fill (D106-3, SP-106C hydration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills the display name and the stored time zone when it is not the schema default', async () => {
    renderStep1({ ...storedStudent, timeZone: 'America/New_York' });
    expect(await screen.findByLabelText(/display name/i)).toHaveValue('Ada Lovelace');
    expect(timeZoneSelect()).toHaveValue('America/New_York');
  });

  it('pre-fills the browser-detected zone when the stored value is the "UTC" default', async () => {
    const resolvedOptionsSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({
        timeZone: 'Europe/Paris',
      } as unknown as Intl.ResolvedDateTimeFormatOptions);
    renderStep1({ ...storedStudent, timeZone: 'UTC' });
    await waitForBoot();
    expect(timeZoneSelect()).toHaveValue('Europe/Paris');
    resolvedOptionsSpy.mockRestore();
  });

  it('falls back to the browser zone for a session user without a stored zone (login shape)', async () => {
    renderStep1({ ...storedStudent, timeZone: undefined });
    expect(await screen.findByLabelText(/display name/i)).toHaveValue('Ada Lovelace');
    expect(timeZoneSelect()).toHaveValue(getBrowserTimeZone());
  });

  it('re-seeds the stored zone once the profile hydrates (SP-106C IR-106-01)', async () => {
    renderStep1(
      { ...storedStudent, timeZone: undefined },
      {
        ...storedStudent,
        timeZone: 'America/New_York',
      }
    );
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled());
    await waitFor(() => expect(timeZoneSelect()).toHaveValue('America/New_York'));
  });
});

describe('Step1Preferences client validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty display name and never calls the API', async () => {
    renderStep1();
    await waitForBoot();

    await validUser.clear(nameInput());
    await validUser.click(saveButton());

    expect(await screen.findByText('Display name is required')).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('rejects a display name over 100 characters', async () => {
    renderStep1();
    await waitForBoot();

    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'x'.repeat(101));
    await validUser.click(saveButton());

    expect(
      await screen.findByText('Display name must be 100 characters or fewer')
    ).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it('rejects a time zone that is not a valid IANA identifier (safety net)', async () => {
    renderStep1();
    await waitForBoot();

    // The select is select-by-construction; force a value the option list
    // never offers to exercise the `isValidTimeZone` refinement.
    fireEvent.change(timeZoneSelect(), { target: { value: 'Not/AZone' } });
    await validUser.click(saveButton());

    expect(
      await screen.findByText('Enter a valid IANA time zone, e.g. America/New_York')
    ).toBeInTheDocument();
    expect(timeZoneSelect()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });
});

describe('Step1Preferences submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateState.mockResolvedValue({
      step: 2,
      completed: false,
      completedAt: null,
      semesterId: null,
    });
  });

  it('saves the profile first, then advances the onboarding pointer (AC-107-02)', async () => {
    const store = renderStep1();
    await waitForBoot();
    mockedUpdateProfile.mockResolvedValue({
      ...storedStudent,
      name: 'Ada Byron',
      timeZone: 'Europe/Berlin',
    });

    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'Ada Byron');
    await validUser.selectOptions(timeZoneSelect(), 'Europe/Berlin');
    await validUser.click(saveButton());

    await waitFor(() => expect(mockedUpdateProfile).toHaveBeenCalled());
    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledWith({ step: 2 }));

    // Profile save strictly precedes the progress save.
    const profileCall = mockedUpdateProfile.mock.invocationCallOrder[0];
    const advanceCall = mockedUpdateState.mock.invocationCallOrder[0];
    expect(profileCall).toBeLessThan(advanceCall);
    expect(mockedUpdateProfile).toHaveBeenCalledWith({
      name: 'Ada Byron',
      timeZone: 'Europe/Berlin',
    });

    // The slice pointer moved to step 2 — the shell will re-render it.
    await waitFor(() => expect(store.getState().onboarding.step).toBe(2));
  });

  it('omits the time zone from a name-only save when the stored zone is unknown and untouched', async () => {
    // Login shape: no stored zone, and the profile read cannot supply one.
    const loginShape = { ...storedStudent, timeZone: undefined };
    renderStep1(loginShape, loginShape);
    await waitForBoot();
    mockedUpdateProfile.mockResolvedValue(loginShape);

    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'Ada Byron');
    await validUser.click(saveButton());

    await waitFor(() => expect(mockedUpdateProfile).toHaveBeenCalled());
    // The browser fallback must not overwrite an unreadable stored preference.
    expect(mockedUpdateProfile).toHaveBeenCalledWith({ name: 'Ada Byron' });
  });

  it('renders a 400 errors.timeZone message under the select and stays on step 1', async () => {
    const store = renderStep1();
    await waitForBoot();
    // The shape the api interceptor rejects with for a FieldValidationPipe 400.
    // (A 101-char name would be caught client-side first; the zone select is
    // select-by-construction, so the server 400 lands on a client-valid form.)
    mockedUpdateProfile.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['timeZone must be a valid IANA time zone, e.g. America/New_York'],
          error: 'Bad Request',
          errors: {
            timeZone: ['timeZone must be a valid IANA time zone, e.g. America/New_York'],
          },
        },
      },
    });

    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'Ada Byron');
    await validUser.selectOptions(timeZoneSelect(), 'Europe/Berlin');
    await validUser.click(saveButton());

    expect(
      await screen.findByText('timeZone must be a valid IANA time zone, e.g. America/New_York')
    ).toBeInTheDocument();
    expect(timeZoneSelect()).toHaveAttribute('aria-invalid', 'true');
    // Field-level feedback replaces the toast (no duplication).
    expect(mockedToast.error).not.toHaveBeenCalled();
    // The pointer never moved — the student stays on step 1.
    expect(store.getState().onboarding.step).toBe(1);
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('shows the sanitized toast for a non-400 profile failure and stays on step 1', async () => {
    const store = renderStep1();
    await waitForBoot();
    mockedUpdateProfile.mockRejectedValue(new Error('Network failure occurred'));

    await validUser.click(saveButton());

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network failure occurred'));
    expect(store.getState().onboarding.step).toBe(1);
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('keeps the form and records the slice error when the progress save fails (retry = resubmit)', async () => {
    const store = renderStep1();
    await waitForBoot();
    mockedUpdateProfile.mockResolvedValue(storedStudent);
    mockedUpdateState.mockRejectedValue({
      message: 'We could not save your setup. Try again.',
    });

    await validUser.click(saveButton());

    // The profile save succeeded; the pointer write failed — the slice keeps
    // step 1, keeps the fetch lifecycle, and records the actionable message.
    await waitFor(() =>
      expect(store.getState().onboarding.error).toBe('We could not save your setup. Try again.')
    );
    expect(store.getState().onboarding.step).toBe(1);
    expect(store.getState().onboarding.status).toBe('ready');

    // The form is still operable (the step-1 data is persisted — resubmitting
    // is idempotent), and the button re-enabled for the retry.
    expect(saveButton()).not.toBeDisabled();
    expect(nameInput()).not.toBeDisabled();

    // The retry: the pointer write goes out again.
    mockedUpdateState.mockResolvedValue({
      step: 2,
      completed: false,
      completedAt: null,
      semesterId: null,
    });
    await validUser.click(saveButton());
    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(store.getState().onboarding.step).toBe(2));
    expect(store.getState().onboarding.error).toBeNull();
  });

  it('disables the form while the submit is in flight', async () => {
    // Never resolves during the test; unmount cleans up in afterEach.
    mockedUpdateProfile.mockImplementation(() => new Promise(() => undefined));
    renderStep1();
    await waitForBoot();

    // While loading the button swaps its label for a spinner, so capture the
    // element before the click and assert on the same node.
    const save = saveButton();
    await validUser.click(save);

    await waitFor(() => expect(save).toBeDisabled());
    expect(nameInput()).toBeDisabled();
    expect(timeZoneSelect()).toBeDisabled();
  });
});
