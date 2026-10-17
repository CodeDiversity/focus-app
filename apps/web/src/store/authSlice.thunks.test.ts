import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, { setError, setUser } from './authSlice';
import { login, updateProfile } from './authSlice.thunks';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/entities/user/api/userService';
import type { AuthResponse } from '@/features/auth/model/types';
import type { User } from '@/entities/user/model/types';

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

const mockedLogin = vi.mocked(authService.login);
const mockedUpdateProfile = vi.mocked(userService.updateProfile);

/** Only the `auth` reducer: these tests exercise the thunks' own dispatch surface. */
function makeStore() {
  return configureStore({ reducer: { auth: authSlice } });
}

const sessionUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: null,
} as unknown as User;

/** A deferred service call so the pending phase can be observed. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('auth thunks — login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login pending sets isLoading and clears error', async () => {
    const call = deferred<AuthResponse>();
    mockedLogin.mockImplementation(() => call.promise);
    const store = makeStore();
    store.dispatch(setError('stale error'));

    const dispatched = store.dispatch(login({ email: 'ada@example.com', password: 'password123' }));

    // Pending phase: loading raised and the previous error cleared.
    expect(store.getState().auth.isLoading).toBe(true);
    expect(store.getState().auth.error).toBeNull();

    call.resolve({ accessToken: 'token-1', user: sessionUser } as AuthResponse);
    await dispatched;

    expect(store.getState().auth.user).toMatchObject({ id: 'user-1' });
    expect(store.getState().auth.isLoading).toBe(false);
  });

  it('login rejection stores the sanitized message, clears loading, and rejects with it', async () => {
    mockedLogin.mockRejectedValue(new Error('Invalid email or password'));
    const store = makeStore();

    const result = await store.dispatch(login({ email: 'ada@example.com', password: 'wrong-password' }));

    expect(login.rejected.match(result)).toBe(true);
    if (login.rejected.match(result)) {
      // rejectWithValue payload carries the sanitized getErrorMessage string.
      expect(result.payload).toBe('Invalid email or password');
    }
    expect(store.getState().auth.error).toBe('Invalid email or password');
    expect(store.getState().auth.isLoading).toBe(false);
    expect(store.getState().auth.user).toBeNull();
  });
});

describe('auth thunks — updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateProfile success sets the updated user and clears loading', async () => {
    const updated = { ...sessionUser, name: 'Ada King' };
    mockedUpdateProfile.mockResolvedValue(updated);
    const store = makeStore();
    store.dispatch(setUser(sessionUser));

    const result = await store.dispatch(updateProfile({ name: 'Ada King' }));

    expect(updateProfile.fulfilled.match(result)).toBe(true);
    expect(store.getState().auth.user).toMatchObject({ name: 'Ada King' });
    expect(store.getState().auth.isLoading).toBe(false);
    expect(store.getState().auth.error).toBeNull();
  });

  it('updateProfile rejection stores the sanitized message, clears loading, and keeps the session', async () => {
    mockedUpdateProfile.mockRejectedValue(new Error('We could not update your profile. Try again.'));
    const store = makeStore();
    store.dispatch(setUser(sessionUser));

    const result = await store.dispatch(updateProfile({ name: 'Ada King' }));

    expect(updateProfile.rejected.match(result)).toBe(true);
    if (updateProfile.rejected.match(result)) {
      // SP-106C: the structured rejection pairs the sanitized message with the
      // parsed ApiError (undefined here — a plain network Error carried none).
      expect(result.payload).toEqual({
        message: 'We could not update your profile. Try again.',
        apiError: undefined,
      });
    }
    expect(store.getState().auth.error).toBe('We could not update your profile. Try again.');
    expect(store.getState().auth.isLoading).toBe(false);
    // The signed-in account survives a failed profile save.
    expect(store.getState().auth.user).toMatchObject({ id: 'user-1' });
  });

  it('updateProfile forwards the parsed ApiError from an interceptor-shaped 400 (D106-6)', async () => {
    const apiError = {
      statusCode: 400,
      message: ['timeZone must be a valid IANA time zone, e.g. America/New_York'],
      error: 'Bad Request',
      errors: {
        timeZone: ['timeZone must be a valid IANA time zone, e.g. America/New_York'],
      },
    };
    // The shape the api response interceptor rejects with: the parsed body
    // stays at response.data, and the 400's `message` array is truthy (B's
    // preserved message array), so the CE `message` prop holds the array.
    mockedUpdateProfile.mockRejectedValue({
      response: { data: apiError },
      message: apiError.message,
    });
    const store = makeStore();
    store.dispatch(setUser(sessionUser));

    const result = await store.dispatch(updateProfile({ timeZone: 'Mars/Olympus' }));

    expect(updateProfile.rejected.match(result)).toBe(true);
    if (updateProfile.rejected.match(result)) {
      expect(result.payload).toEqual({
        // The human message is joined from the 400's message array.
        message: 'timeZone must be a valid IANA time zone, e.g. America/New_York',
        apiError,
      });
    }
    expect(store.getState().auth.error).toBe(
      'timeZone must be a valid IANA time zone, e.g. America/New_York',
    );
    expect(store.getState().auth.user).toMatchObject({ id: 'user-1' });
  });
});