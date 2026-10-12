import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User, AuthResponse } from '../types';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import { getErrorMessage } from '../utils/errors';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
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

  // Tokens live in memory only, so a fresh page load starts logged out.
  // The profile is fetched only when a token already exists in this session.
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (tokenStore.getToken()) {
          const profile = await authService.getProfile();
          setUser(profile);
        }
      } catch {
        tokenStore.clearToken();
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

  const register = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response: AuthResponse = await authService.register({
          email,
          password,
          firstName,
          lastName,
        });
        setUser(response.user);
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
