import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { ProfilePage } from './Profile';
import { AuthProvider } from '../context/AuthContext';
import { authService } from '../services/auth';
import { makeTestStore } from '../test/providers';
import { setUser } from '../store/authSlice';
import { formatDateTime, getBrowserTimeZone } from '../utils/datetime';
import type { User } from '../types';
import type { AppStore } from '../store/store';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

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

const mockedRefreshToken = vi.mocked(authService.refreshToken);
const mockedUpdateProfile = vi.mocked(authService.updateProfile);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

/**
 * Stored session user as the SP-106B backend returns it from
 * GET/PATCH /users/me. Login/refresh session users omit the new fields
 * (the auth service selects id/name/email/emailVerifiedAt), so a user
 * without `timeZone` is the other legal shape (fallback test below).
 */
const storedStudent: User = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: '2026-10-01T12:00:00.000Z',
  timeZone: 'UTC',
  preferences: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

const validUser = userEvent.setup();

// The seeded store already holds the signed-in user at first render, so the
// form's default values derive from the stored profile, not from the boot
// refresh (which re-applies the same mocked session user).
const renderProfilePage = (user: User = storedStudent): AppStore => {
  const store = makeTestStore();
  store.dispatch(setUser(user));
  mockedRefreshToken.mockResolvedValue({ accessToken: 'test-token', user });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <ProfilePage />
        </AuthProvider>
      </MemoryRouter>
    </Provider>,
  );
  return store;
};

/** The boot restore settles in a microtask; settle before interacting. */
const waitForBoot = async () => {
  await waitFor(() => expect(mockedRefreshToken).toHaveBeenCalled());
};

const timeZoneInput = () => screen.getByLabelText(/time zone/i);

const fillValidForm = async () => {
  await validUser.clear(screen.getByLabelText(/display name/i));
  await validUser.type(screen.getByLabelText(/display name/i), 'Ada Lovelace');
  await validUser.clear(timeZoneInput());
  await validUser.type(timeZoneInput(), 'America/New_York');
};

describe('ProfilePage time-zone editing (SP-106C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRefreshToken.mockResolvedValue({
      accessToken: 'test-token',
      user: storedStudent,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills the stored time zone when it is not the schema default (D106-3)', async () => {
    renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    expect(await screen.findByLabelText(/display name/i)).toHaveValue('Ada Lovelace');
    expect(timeZoneInput()).toHaveValue('America/New_York');
  });

  it('pre-fills the browser-detected zone when the stored value is "UTC" (D106-3)', async () => {
    const resolvedOptionsSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: 'Europe/Paris' } as unknown as Intl.ResolvedDateTimeFormatOptions);
    renderProfilePage({ ...storedStudent, timeZone: 'UTC' });

    await waitForBoot();
    expect(timeZoneInput()).toHaveValue('Europe/Paris');
    resolvedOptionsSpy.mockRestore();
  });

  it('falls back to the browser zone for a session user without a stored zone (login shape)', async () => {
    renderProfilePage({ ...storedStudent, timeZone: undefined });
    expect(await screen.findByLabelText(/display name/i)).toHaveValue('Ada Lovelace');
    expect(timeZoneInput()).toHaveValue(getBrowserTimeZone());
  });

  it('rejects invalid IANA identifiers client-side and sends no request (AC-106-03, TR-106-01)', async () => {
    renderProfilePage();
    await waitForBoot();

    await validUser.clear(timeZoneInput());
    await validUser.type(timeZoneInput(), 'Mars/Olympus');
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    expect(
      await screen.findByText('Enter a valid IANA time zone, e.g. America/New_York'),
    ).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it('submits { name, timeZone } via PATCH and updates the session user (AC-106-02, TR-106-02)', async () => {
    const store = renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    await waitForBoot();
    mockedUpdateProfile.mockResolvedValue({
      ...storedStudent,
      timeZone: 'Pacific/Auckland',
    });

    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedUpdateProfile).toHaveBeenCalledWith({
        name: 'Ada Lovelace',
        timeZone: 'America/New_York',
      }),
    );
    expect(mockedToast.success).toHaveBeenCalledWith('Profile updated successfully!');
    // The thunk's setUser round-trips the PATCH response into the session.
    await waitFor(() => expect(store.getState().auth.user?.timeZone).toBe('Pacific/Auckland'));
  });

  it('renders an API 400 with errors.timeZone under the input and keeps the message-array toast silent (AC-106-06, D106-6)', async () => {
    const apiError = {
      statusCode: 400,
      message: ['timeZone must be a valid IANA time zone, e.g. America/New_York'],
      error: 'Bad Request',
      errors: {
        timeZone: ['timeZone must be a valid IANA time zone, e.g. America/New_York'],
      },
    };
    // Shape the CE rejected by the api interceptor for a FieldValidationPipe
    // 400: the parsed ApiError rides at response.data (SP-106C error contract).
    mockedUpdateProfile.mockRejectedValue({ response: { data: apiError } });

    renderProfilePage();
    await waitForBoot();
    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    expect(
      await screen.findByText('timeZone must be a valid IANA time zone, e.g. America/New_York'),
    ).toBeInTheDocument();
    expect(timeZoneInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('disables the form and shows the spinner while submitting', async () => {
    // Never resolves during the test; unmount cleans up in afterEach.
    mockedUpdateProfile.mockImplementation(() => new Promise(() => undefined));
    renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    await waitForBoot();

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await fillValidForm();
    await validUser.click(saveButton);

    // While loading the button swaps its label for a spinner; the same
    // element must stay disabled for the whole submission.
    expect(saveButton).toBeDisabled();
    expect(timeZoneInput()).toBeDisabled();
  });

  it('shows the sanitized error toast when a non-400 failure occurs', async () => {
    mockedUpdateProfile.mockRejectedValue(new Error('Network failure occurred'));
    renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    await waitForBoot();

    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith('Network failure occurred'),
    );
  });

  it('displays the stored zone through the shared date/time helper', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-17T18:30:00.000Z'));

    renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    // Flush the mocked boot microtasks (waitFor's polling needs timers that
    // fake timers would have to advance manually).
    await act(async () => undefined);

    expect(screen.getByText(/your time zone/i)).toHaveTextContent('America/New_York');
    // Same shared helper, same frozen instant — the page renders what the
    // helper formats (no local re-implementation).
    expect(screen.getByText(/your time zone/i)).toHaveTextContent(
      formatDateTime(new Date('2026-10-17T18:30:00.000Z'), 'America/New_York'),
    );

    vi.useRealTimers();
  });
});
