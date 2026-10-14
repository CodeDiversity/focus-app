import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, SessionUser, AuthResponse } from '../types';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import { setSessionExpiredHandler } from '../services/api';
import { getErrorMessage } from '../utils/errors';

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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const userRef = useRef<SessionUser | null>(null);
  const sessionVersion = useRef(0);
  const profileFlight = useRef<{ version: number; promise: Promise<void>; needsFresh: boolean } | null>(null);
  const restoreFlight = useRef<Promise<void> | null>(null);
  const [isVerificationBannerDismissed, setBannerDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const applyUser = useCallback((next: SessionUser | null) => {
    if (userRef.current?.id !== next?.id) {
      sessionVersion.current += 1;
      setBannerDismissed(false);
    }
    userRef.current = next;
    setUser(next);
  }, []);

  // Reconcile only this session's profile. Transient failures leave access usable.
  const refreshProfile = useCallback((options?: { fresh?: boolean }): Promise<void> => {
    const current = userRef.current;
    const version = sessionVersion.current;
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
      if (sessionVersion.current === version && userRef.current?.id === current.id && profile.id === current.id) {
        applyUser(profile);
      }
    }).catch(() => {
      // A real 401 still follows the API interceptor's existing refresh semantics.
    }).finally(() => {
      if (profileFlight.current?.promise !== promise) return;
      const needsFresh = profileFlight.current.needsFresh;
      profileFlight.current = null;
      if (needsFresh && sessionVersion.current === version && userRef.current?.id === current.id) {
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
    if (userRef.current?.emailVerifiedAt === null) setBannerDismissed(true);
  }, []);

  // When a mid-session refresh fails, the api interceptor calls this
  // handler: clear local state and go to /login with the attempted page
  // saved, without a hard reload.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      tokenStore.clearToken();
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
    const initializeAuth = async () => {
      try {
        const response = await authService.refreshToken();
        if (active && sessionVersion.current === version) applyUser(response.user);
      } catch {
        if (active && sessionVersion.current === version) {
          tokenStore.clearToken();
          applyUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const promise = initializeAuth();
    restoreFlight.current = promise;
    void promise.finally(() => {
      if (restoreFlight.current === promise) restoreFlight.current = null;
    });
    return () => { active = false; };
  }, [applyUser]);

  const login = useCallback(async (email: string, password: string) => {
    sessionVersion.current += 1;
    setIsLoading(true);
    setError(null);

    try {
      const response: AuthResponse = await authService.login({ email, password });
      applyUser(response.user);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [applyUser]);

  // Registration issues no token and signs nobody in — the student is
  // redirected to login (SP-102's flow) to authenticate.
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await authService.register({
          name,
          email,
          password,
        });
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    try {
      await authService.logout();
    } catch (err: unknown) {
      console.error('Logout error:', getErrorMessage(err));
    } finally {
      tokenStore.clearToken();
      applyUser(null);
    }
  }, [applyUser]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(data);
      applyUser(updatedUser);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, [applyUser]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
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
