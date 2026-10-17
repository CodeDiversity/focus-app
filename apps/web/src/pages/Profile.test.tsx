import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { ProfilePage } from './Profile';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/entities/user/api/userService';
import { makeTestStore } from '../test/providers';
import { setUser } from '@/features/session/model/authSlice';
import { formatDateTime, getBrowserTimeZone } from '@/shared/lib/datetime';
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
  },
}));

vi.mock('@/entities/user/api/userService', () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const mockedRefreshToken = vi.mocked(authService.refreshToken);
const mockedGetProfile = vi.mocked(userService.getProfile);
const mockedUpdateProfile = vi.mocked(userService.updateProfile);
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
//
// `profile` is what `GET /users/me` returns when the page hydrates the stored
// profile (IR-106-01); it defaults to the session user, which keeps the
// pre-existing cases at their original pre-fill behavior.
const renderProfilePage = (user: User = storedStudent, profile?: User): AppStore => {
  const store = makeTestStore();
  store.dispatch(setUser(user));
  mockedRefreshToken.mockResolvedValue({ accessToken: 'test-token', user });
  mockedGetProfile.mockResolvedValue(profile ?? user);
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

describe('ProfilePage stored-zone hydration (IR-106-01)', () => {
  // A login/refresh/boot session user: the auth service projects only
  // id/name/email/emailVerifiedAt, so `timeZone` is genuinely absent until
  // GET /users/me hydrates the full profile.
  const loginShapeUser: User = { ...storedStudent, timeZone: undefined };
  const storedNewYork: User = { ...storedStudent, timeZone: 'America/New_York' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedRefreshToken.mockResolvedValue({
      accessToken: 'test-token',
      user: loginShapeUser,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills the stored zone (not the browser zone) once the profile is hydrated', async () => {
    renderProfilePage(loginShapeUser, storedNewYork);

    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled());
    await waitFor(() => expect(timeZoneInput()).toHaveValue('America/New_York'));
    // The stored-zone display line follows the hydrated value too.
    await waitFor(() =>
      expect(screen.getByText(/your time zone/i)).toHaveTextContent('America/New_York'),
    );
  });

  it('hydrates before the student edits: a name-only save re-sends the stored zone, not a fallback', async () => {
    renderProfilePage(loginShapeUser, storedNewYork);
    await waitFor(() => expect(timeZoneInput()).toHaveValue('America/New_York'));
    mockedUpdateProfile.mockResolvedValue(storedNewYork);

    const nameInput = screen.getByLabelText(/display name/i);
    await validUser.clear(nameInput);
    await validUser.type(nameInput, 'Ada Byron');
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockedUpdateProfile).toHaveBeenCalled());
    // The body carries the *stored* zone the student never changed — the
    // stored row is left exactly as it was.
    expect(mockedUpdateProfile.mock.calls[0][0]).toEqual({
      name: 'Ada Byron',
      timeZone: 'America/New_York',
    });
  });

  it('never sends the browser fallback zone when the stored zone is unknown', async () => {
    // GET /users/me cannot supply the zone (login shape, or a failed read):
    // the field keeps the browser default, and a name-only save must not
    // persist that fallback over the student's stored preference.
    renderProfilePage(loginShapeUser);
    await waitForBoot();
    mockedUpdateProfile.mockResolvedValue({ ...storedStudent, timeZone: undefined });

    const nameInput = screen.getByLabelText(/display name/i);
    await validUser.clear(nameInput);
    await validUser.type(nameInput, 'Ada Byron');
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockedUpdateProfile).toHaveBeenCalled());
    // No `timeZone` key at all: the unreadable stored zone stays untouched.
    expect(mockedUpdateProfile.mock.calls[0][0]).toEqual({ name: 'Ada Byron' });
  });

  it('does not clobber keystrokes typed before the stored profile arrives', async () => {
    // A slow profile read: the student starts typing before it lands.
    let releaseProfile: (profile: User) => void = () => undefined;
    mockedGetProfile.mockImplementation(
      () =>
        new Promise<User>((resolve) => {
          releaseProfile = resolve;
        }),
    );
    renderProfilePage(loginShapeUser);
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled());

    await validUser.clear(timeZoneInput());
    await validUser.type(timeZoneInput(), 'Europe/Berlin');

    await act(async () => {
      releaseProfile(storedNewYork);
    });

    // The late hydration settles state, but the unsaved edit wins.
    expect(timeZoneInput()).toHaveValue('Europe/Berlin');
  });

  it('still lets the student choose a zone when the stored zone is unknown', async () => {
    renderProfilePage(loginShapeUser);
    await waitForBoot();
    mockedUpdateProfile.mockResolvedValue(storedNewYork);

    await validUser.clear(timeZoneInput());
    await validUser.type(timeZoneInput(), 'Europe/Berlin');
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockedUpdateProfile).toHaveBeenCalled());
    expect(mockedUpdateProfile.mock.calls[0][0]).toEqual({
      name: 'Ada Lovelace',
      timeZone: 'Europe/Berlin',
    });
  });
});
