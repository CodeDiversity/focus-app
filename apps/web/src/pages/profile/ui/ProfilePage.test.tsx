import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { ProfilePage } from '@/pages/profile/ui/ProfilePage';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/entities/user/api/userService';
import { makeTestStore } from '@/test/providers';
import { setUser } from '@/features/session/model/authSlice';
import {
  FALLBACK_TIME_ZONES,
  formatDateTime,
  getBrowserTimeZone,
  isValidTimeZone,
} from '@/shared/lib/datetime';
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
    </Provider>
  );
  return store;
};

/** The boot restore settles in a microtask; settle before interacting. */
const waitForBoot = async () => {
  await waitFor(() => expect(mockedRefreshToken).toHaveBeenCalled());
};

const timeZoneSelect = () => screen.getByLabelText(/time zone/i) as HTMLSelectElement;

const fillValidForm = async () => {
  await validUser.clear(screen.getByLabelText(/display name/i));
  await validUser.type(screen.getByLabelText(/display name/i), 'Ada Lovelace');
  await validUser.selectOptions(timeZoneSelect(), 'America/New_York');
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
    expect(timeZoneSelect()).toHaveValue('America/New_York');
  });

  it('pre-fills the browser-detected zone when the stored value is "UTC" (D106-3)', async () => {
    const resolvedOptionsSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({
        timeZone: 'Europe/Paris',
      } as unknown as Intl.ResolvedDateTimeFormatOptions);
    renderProfilePage({ ...storedStudent, timeZone: 'UTC' });

    await waitForBoot();
    expect(timeZoneSelect()).toHaveValue('Europe/Paris');
    resolvedOptionsSpy.mockRestore();
  });

  it('falls back to the browser zone for a session user without a stored zone (login shape)', async () => {
    renderProfilePage({ ...storedStudent, timeZone: undefined });
    expect(await screen.findByLabelText(/display name/i)).toHaveValue('Ada Lovelace');
    expect(timeZoneSelect()).toHaveValue(getBrowserTimeZone());
  });

  it('renders all runtime-supported zones sorted by offset then region (AC-106E-1, AC-106E-2)', async () => {
    renderProfilePage();
    await waitForBoot();

    const select = timeZoneSelect();
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(values.length).toBeGreaterThan(0);

    // Structural access: the app compiles against lib ES2020.
    const intl = Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] };

    // AC-106E-1 / IR-106-11a: on modern runtimes the select renders the
    // *runtime* list (beyond the curated fallback), not ~112 fallback
    // entries. The pre-fix helper always fell back — these two assertions
    // fail on it.
    if (typeof intl.supportedValuesOf === 'function') {
      expect(values.length).toBeGreaterThan(FALLBACK_TIME_ZONES.length);
      expect(values).toContain('Europe/Vatican'); // runtime list; absent from the fallback
    } else {
      expect(values.length).toBeLessThanOrEqual(FALLBACK_TIME_ZONES.length);
    }

    // AC-106E-2 / IR-106-11b: sorted by UTC offset, not alphabetically.
    // London (UTC+1 in June) must precede Tokyo (UTC+9); an alphabetical
    // list would flip them ('Asia' < 'Europe'), which is what the broken
    // offset parser produced.
    expect(values.indexOf('Europe/London')).toBeLessThan(values.indexOf('Asia/Tokyo'));

    // Offset extremes at the fixed June reference date (runtime list only —
    // the fallback does not include Midway/Kiritimati).
    if (typeof intl.supportedValuesOf === 'function') {
      expect(values[0]).toBe('Pacific/Midway'); // UTC-11 — most negative offset
      expect(values[values.length - 1]).toBe('Pacific/Kiritimati'); // UTC+14 — most positive
    }

    // Every option must be a valid IANA zone, with no duplicates.
    expect(values.every((v) => isValidTimeZone(v))).toBe(true);
    expect(new Set(values).size).toBe(values.length);
  });

  it('offers a stored non-canonical alias that is absent from the runtime list (IR-106-15c)', async () => {
    // US/Pacific is a valid IANA alias (Intl accepts it) but is not part of
    // the canonical supportedValuesOf list. Without the guard it silently
    // resolves to the first option on save; the page now offers it explicitly.
    renderProfilePage({ ...storedStudent, timeZone: 'US/Pacific' });
    await waitForBoot();

    const values = Array.from(timeZoneSelect().querySelectorAll('option')).map((o) => o.value);
    expect(values).toContain('US/Pacific');
    expect(timeZoneSelect()).toHaveValue('US/Pacific');
  });

  it('updates the display line in real time when the selection changes, without saving (AC-106E-4)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-17T18:30:00.000Z'));

    renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    // Flush the mocked boot microtasks (fake timers freeze waitFor polling).
    await act(async () => undefined);

    expect(screen.getByText(/your time zone/i)).toHaveTextContent('America/New_York');

    fireEvent.change(timeZoneSelect(), { target: { value: 'Pacific/Auckland' } });

    // IR-106-09: the line follows the live form value — no save required.
    expect(screen.getByText(/your time zone/i)).toHaveTextContent('Pacific/Auckland');
    expect(screen.getByText(/your time zone/i)).toHaveTextContent(
      formatDateTime(new Date('2026-10-17T18:30:00.000Z'), 'Pacific/Auckland')
    );
    expect(mockedUpdateProfile).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('is keyboard reachable as a native combobox, with keys left to the browser (AC-106E-6)', async () => {
    renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    await waitForBoot();

    // Tab order: Email is disabled (skipped), Display Name first, then the
    // time-zone select.
    await validUser.tab();
    expect(screen.getByLabelText(/display name/i)).toHaveFocus();
    await validUser.tab();
    expect(timeZoneSelect()).toHaveFocus();

    // Implicit combobox role of a single-select <select> (AT contract).
    expect(screen.getByRole('combobox')).toBe(timeZoneSelect());

    // Arrow/Enter/Space/Escape on a native select are the browser's built-in
    // menu behavior; jsdom cannot emulate the open menu (user-event
    // implements arrow walking only for radio inputs). Pin that the app does
    // not intercept these keys: the selection is untouched and focus stays.
    await validUser.keyboard('{ArrowDown}{Enter}{Escape}');
    expect(timeZoneSelect()).toHaveValue('America/New_York');
    expect(timeZoneSelect()).toHaveFocus();

    // The selection a menu produces (change event) drives the form value
    // and the AC-106E-4 display line without a save.
    fireEvent.change(timeZoneSelect(), { target: { value: 'Pacific/Auckland' } });
    expect(screen.getByText(/your time zone/i)).toHaveTextContent('Pacific/Auckland');
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it('fits the card layout with responsive container classes (AC-106E-8)', async () => {
    renderProfilePage();
    await waitForBoot();

    const select = timeZoneSelect();
    // Same full-width treatment as Input inside the existing card, which
    // sits in the responsive page container (jsdom cannot measure real
    // layout — the real-browser dimension is the IR-106-14 pass).
    expect(select).toHaveClass('w-full');
    expect(select.closest('.w-full')).not.toBeNull(); // Select's own wrapper
    expect(select.closest('.card')).not.toBeNull();

    const container = document.querySelector('.max-w-2xl');
    expect(container).not.toBeNull();
    expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
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
      })
    );
    expect(mockedToast.success).toHaveBeenCalledWith('Profile updated successfully!');
    // The thunk's setUser round-trips the PATCH response into the session.
    await waitFor(() => expect(store.getState().auth.user?.timeZone).toBe('Pacific/Auckland'));
  });

  it('renders an API 400 with errors.timeZone under the select and keeps the message-array toast silent (AC-106-06, D106-6)', async () => {
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
      await screen.findByText('timeZone must be a valid IANA time zone, e.g. America/New_York')
    ).toBeInTheDocument();
    expect(timeZoneSelect()).toHaveAttribute('aria-invalid', 'true');
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
    expect(timeZoneSelect()).toBeDisabled();
  });

  it('shows the sanitized error toast when a non-400 failure occurs', async () => {
    mockedUpdateProfile.mockRejectedValue(new Error('Network failure occurred'));
    renderProfilePage({ ...storedStudent, timeZone: 'America/New_York' });
    await waitForBoot();

    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network failure occurred'));
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
      formatDateTime(new Date('2026-10-17T18:30:00.000Z'), 'America/New_York')
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
    await waitFor(() => expect(timeZoneSelect()).toHaveValue('America/New_York'));
    // The stored-zone display line follows the hydrated value too.
    await waitFor(() =>
      expect(screen.getByText(/your time zone/i)).toHaveTextContent('America/New_York')
    );
  });

  it('hydrates before the student edits: a name-only save re-sends the stored zone, not a fallback', async () => {
    renderProfilePage(loginShapeUser, storedNewYork);
    await waitFor(() => expect(timeZoneSelect()).toHaveValue('America/New_York'));
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
        })
    );
    renderProfilePage(loginShapeUser);
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled());

    // For the select: change the selected option instead of typing.
    await validUser.selectOptions(timeZoneSelect(), 'Europe/Berlin');

    await act(async () => {
      releaseProfile(storedNewYork);
    });

    // The late hydration settles state, but the unsaved edit wins.
    expect(timeZoneSelect()).toHaveValue('Europe/Berlin');
  });

  it('still lets the student choose a zone when the stored zone is unknown', async () => {
    renderProfilePage(loginShapeUser);
    await waitForBoot();
    mockedUpdateProfile.mockResolvedValue(storedNewYork);

    await validUser.selectOptions(timeZoneSelect(), 'Europe/Berlin');
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockedUpdateProfile).toHaveBeenCalled());
    expect(mockedUpdateProfile.mock.calls[0][0]).toEqual({
      name: 'Ada Lovelace',
      timeZone: 'Europe/Berlin',
    });
  });
});
