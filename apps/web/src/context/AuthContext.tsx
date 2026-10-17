import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { SessionUser, User } from '../types';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import { setSessionExpiredHandler } from '../services/api';
import { registerLocalSessionClearer, snapshotSessionGeneration } from '../services/recovery';
import {
  setBannerDismissed,
  clearError,
  setLoading,
  setError,
  setUser,
  clearUser,
} from '../store/authSlice';
import {
  login,
  updateProfile,
} from '../store/authSlice.thunks';
import { getErrorMessage } from '../utils/errors';
import { selectUser, selectIsLoading, selectError, selectIsVerificationBannerDismissed } from '../store/authSlice.selectors';
import { useAppDispatch } from '../store/hooks';

interface AuthContextType {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  refreshProfile: (options?: { fresh?: boolean }) => Promise<void>;
  isVerificationBannerDismissed: boolean;
  dismissVerificationBanner: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A rejected thunk carries the sanitized message in `payload`
// (`rejectWithValue(getErrorMessage(err))`); fall back to the raw error.
function thunkErrorMessage(payload: unknown, error: unknown): string {
  return typeof payload === 'string' ? payload : getErrorMessage(error);
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const isVerificationBannerDismissed = useSelector(selectIsVerificationBannerDismissed);
  const navigate = useNavigate();
  const location = useLocation();

  // Local refs retained in the adapter (not in the slice) — decisions D1/D2
  const sessionVersion = useRef(0);
  const profileFlight = useRef<{ version: number; promise: Promise<void>; needsFresh: boolean } | null>(null);
  const restoreFlight = useRef<Promise<void> | null>(null);
  const userRef = useRef<SessionUser | null>(null);

  // Keep userRef in sync with Redux state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Derived state (same as current: isAuthenticated = !!user)
  const isAuthenticated = !!user;

  // applyUser equivalent: advances sessionVersion and dispatches setUser
  const applyUser = useCallback((next: SessionUser | null) => {
    const currentId = userRef.current?.id;
    const nextId = next?.id;
    if (currentId !== nextId) {
      sessionVersion.current += 1;
    }
    userRef.current = next;
    dispatch(setUser(next));
  }, [dispatch]);

  // Reconcile only this session's profile. Transient failures leave access usable.
  const refreshProfile = useCallback((options?: { fresh?: boolean }): Promise<void> => {
    const current = userRef.current;
    const version = sessionVersion.current;
    const generation = snapshotSessionGeneration();
    if (!current) {
      // The public page can confirm before boot has restored its existing session.
      if (options?.fresh && restoreFlight.current) {
        return restoreFlight.current.then(() => refreshProfile({ fresh: true }));
      }
      return Promise.resolve();
    }
    if (profileFlight.current?.version === version) {
      // A pre-confirmation read cannot establish the state after confirmation.
      if (options?.fresh) profileFlight.current.needsFresh = true;
      return profileFlight.current.promise;
    }
    const promise = authService.getProfile().then((profile) => {
      // A flight that predates a successful reset is a no-op (SP-105G R3).
      if (
        sessionVersion.current === version &&
        userRef.current?.id === current.id &&
        profile.id === current.id &&
        generation === snapshotSessionGeneration()
      ) {
        applyUser(profile);
      }
    }).catch(() => {
      // A real 401 still follows the API interceptor's existing refresh semantics.
    }).finally(() => {
      if (profileFlight.current?.promise !== promise) return;
      const needsFresh = profileFlight.current.needsFresh;
      profileFlight.current = null;
      if (
        needsFresh &&
        sessionVersion.current === version &&
        userRef.current?.id === current.id &&
        generation === snapshotSessionGeneration()
      ) {
        return refreshProfile();
      }
    });
    profileFlight.current = { version, promise, needsFresh: false };
    return promise;
  }, [applyUser]);

  useEffect(() => {
    const onFocus = () => {
      if (userRef.current?.emailVerifiedAt === null) void refreshProfile();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshProfile]);

  const dismissVerificationBanner = useCallback(() => {
    if (userRef.current?.emailVerifiedAt === null) {
      dispatch(setBannerDismissed());
    }
  }, [dispatch]);

  // When a mid-session refresh fails, the api interceptor calls this
  // handler: clear local state and go to /login with the attempted page
  // saved, without a hard reload.
  useEffect(() => {
    // Snapshotted at registration: a successful reset advances the shared
    // generation, and a registration that predates it must skip the clear
    // and the /login navigation (SP-105G R3).
    const generation = snapshotSessionGeneration();
    setSessionExpiredHandler(() => {
      if (generation !== snapshotSessionGeneration()) return;
      // tokenStore.clearToken() stays in the api interceptor (unchanged)
      applyUser(null);
      navigate('/login', {
        replace: true,
        state: { from: location, sessionExpired: true },
      });
    });
    return () => setSessionExpiredHandler(null);
  }, [navigate, location, applyUser]);

  // Session restore on boot: one silent refresh via the httpOnly cookie.
  // Failure just means logged out — no redirect or toast on public pages.
  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    const generation = snapshotSessionGeneration();
    // A restore that predates a successful reset is a no-op (SP-105G R3).
    const isStale = () =>
      !active ||
      sessionVersion.current !== version ||
      generation !== snapshotSessionGeneration();
    const initializeAuth = async () => {
      try {
        const response = await authService.refreshToken();
        if (!isStale()) applyUser(response.user);
      } catch {
        if (!isStale()) {
          // tokenStore.clearToken() handled by api interceptor
          applyUser(null);
        }
      } finally {
        if (active) {
          dispatch(setLoading(false));
        }
      }
    };

    const promise = initializeAuth();
    restoreFlight.current = promise;
    void promise.finally(() => {
      if (restoreFlight.current === promise) restoreFlight.current = null;
    });
    return () => { active = false; };
  }, [applyUser, dispatch]);

  // A successful password reset clears the local user through the recovery
  // boundary (the access token is cleared there first); navigation is C's.
  useEffect(() => {
    registerLocalSessionClearer(() => applyUser(null));
    return () => registerLocalSessionClearer(null);
  }, [applyUser]);

  // The thunks swallow the service rejection into `rejectWithValue` (the
  // sanitized message). Re-throw it here so `await login(...)` still rejects —
  // callers render the error and must not navigate on a failed sign-in.
  const loginFn = useCallback(async (email: string, password: string) => {
    sessionVersion.current += 1;
    const result = await dispatch(login({ email, password }));
    if (login.rejected.match(result)) {
      throw new Error(thunkErrorMessage(result.payload, result.error));
    }
  }, [dispatch]);

  // Registration issues no token and signs nobody in — the student is
  // redirected to login (SP-102's flow) to authenticate.
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        await authService.register({ name, email, password });
      } catch (err: unknown) {
        dispatch(setError(getErrorMessage(err)));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    try {
      await authService.logout();
    } catch (err: unknown) {
      console.error('Logout error:', getErrorMessage(err));
    } finally {
      tokenStore.clearToken();
      dispatch(clearUser());
    }
  }, [dispatch]);

  const updateProfileFn = useCallback(async (data: Partial<User>) => {
    const result = await dispatch(updateProfile(data));
    if (updateProfile.rejected.match(result)) {
      const payload = result.payload;
      // SP-106C: the structured rejection pairs the sanitized message with
      // the parsed ApiError; rethrow with the ApiError attached so the
      // Profile form can render field-level 400 messages (AC-106-06) while
      // `getErrorMessage` still sees the sanitized string.
      if (payload && typeof payload === 'object' && 'message' in payload) {
        const record = payload as {
          message?: unknown;
          apiError?: unknown;
        };
        throw Object.assign(
          new Error(
            typeof record.message === 'string'
              ? record.message
              : getErrorMessage(result.error),
          ),
          { apiError: record.apiError },
        );
      }
      throw new Error(thunkErrorMessage(result.payload, result.error));
    }
  }, [dispatch]);

  const clearErrorFn = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: loginFn,
    register,
    logout,
    updateProfile: updateProfileFn,
    clearError: clearErrorFn,
    refreshProfile,
    isVerificationBannerDismissed,
    dismissVerificationBanner,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
