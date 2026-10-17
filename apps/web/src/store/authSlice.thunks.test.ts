import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, { setError, setUser } from './authSlice';
import { login, updateProfile } from './authSlice.thunks';
import { authService } from '../services/auth';
import type { AuthResponse, User } from '../types';

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

const mockedLogin = vi.mocked(authService.login);
const mockedUpdateProfile = vi.mocked(authService.updateProfile);

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
      expect(result.payload).toBe('We could not update your profile. Try again.');
    }
    expect(store.getState().auth.error).toBe('We could not update your profile. Try again.');
    expect(store.getState().auth.isLoading).toBe(false);
    // The signed-in account survives a failed profile save.
    expect(store.getState().auth.user).toMatchObject({ id: 'user-1' });
  });
});