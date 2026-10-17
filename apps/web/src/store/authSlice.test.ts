import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, {
  setUser,
  clearUser,
  setLoading,
  setError,
  clearError,
} from './authSlice';

function makeStore() {
  // authSlice is the default export which IS the reducer function
  return configureStore({
    reducer: { auth: authSlice },
  });
}

const sessionUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: null,
};

describe('authSlice — reducer actions', () => {
  it('setUser with a different id resets the banner', () => {
    const store = makeStore();
    store.dispatch(setUser(sessionUser));
    expect(store.getState().auth.user).toEqual(sessionUser);
    expect(store.getState().auth.isVerificationBannerDismissed).toBe(false);

    const newUser = { ...sessionUser, id: 'user-2', email: 'grace@example.com' };
    store.dispatch(setUser(newUser));
    expect(store.getState().auth.user).toEqual(newUser);
    // Banner resets when id changes
    expect(store.getState().auth.isVerificationBannerDismissed).toBe(false);
  });

  it('setUser with the same id keeps banner state', () => {
    const store = makeStore();
    store.dispatch(setUser(sessionUser));
    store.dispatch(setUser({ ...sessionUser, emailVerifiedAt: '2026-10-14' }));
    // Banner should NOT reset when id is the same
    expect(store.getState().auth.isVerificationBannerDismissed).toBe(false);
  });

  it('setUser(null) does not reset banner when current is also null', () => {
    const store = makeStore();
    store.dispatch(setUser(sessionUser));
    // Set banner dismissed
    store.dispatch(setUser(sessionUser)); // resets banner
    // Setting to null when current is null — prevId undefined, nextId undefined
    // They are equal, so banner should NOT reset
    store.dispatch(setUser(null));
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.isVerificationBannerDismissed).toBe(false);
  });

  it('clearUser dispatches setUser(null)', () => {
    const store = makeStore();
    store.dispatch(setUser(sessionUser));
    store.dispatch(clearUser());
    expect(store.getState().auth.user).toBeNull();
  });

  it('setLoading toggles isLoading', () => {
    const store = makeStore();
    // Boot starts loading (session restore) until the boot effect clears it.
    expect(store.getState().auth.isLoading).toBe(true);
    store.dispatch(setLoading(false));
    expect(store.getState().auth.isLoading).toBe(false);
    store.dispatch(setLoading(true));
    expect(store.getState().auth.isLoading).toBe(true);
  });

  it('setError stores and clears error', () => {
    const store = makeStore();
    store.dispatch(setError('Something went wrong'));
    expect(store.getState().auth.error).toBe('Something went wrong');
    store.dispatch(clearError());
    expect(store.getState().auth.error).toBeNull();
  });

  it('clearError resets error to null', () => {
    const store = makeStore();
    store.dispatch(clearError());
    expect(store.getState().auth.error).toBeNull();
  });

  it('initial state has correct defaults', () => {
    const store = makeStore();
    const state = store.getState().auth;
    expect(state.user).toBeNull();
    // Pre-migration parity: boot holds the session-restoring spinner until the
    // silent refresh settles (SP-108E / review IR-001).
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.isVerificationBannerDismissed).toBe(false);
  });
});
