import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, AuthResponse } from '../types';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import { setSessionExpiredHandler } from '../services/api';
import { getErrorMessage } from '../utils/errors';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // When a mid-session refresh fails, the api interceptor calls this
  // handler: clear local state and go to /login with the attempted page
  // saved, without a hard reload.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      tokenStore.clearToken();
      setUser(null);
      navigate('/login', {
        replace: true,
        state: { from: location, sessionExpired: true },
      });
    });
    return () => setSessionExpiredHandler(null);
  }, [navigate, location]);

  // Session restore on boot: one silent refresh via the httpOnly cookie.
  // Failure just means logged out — no redirect or toast on public pages.
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await authService.refreshToken();
        setUser(response.user);
      } catch {
        tokenStore.clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response: AuthResponse = await authService.login({ email, password });
      setUser(response.user);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    try {
      await authService.logout();
    } catch (err: unknown) {
      console.error('Logout error:', getErrorMessage(err));
    } finally {
      tokenStore.clearToken();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(data);
      setUser(updatedUser);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

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
