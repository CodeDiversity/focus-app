import api, { refreshAccessToken } from './api';
import { tokenStore } from './tokenStore';
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  RegisteredUser,
  User,
} from '../types';

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    tokenStore.setToken(response.data.accessToken);
    return response.data;
  },

  // Register user — the API returns the created student with no token;
  // signing in is a separate step.
  async register(credentials: RegisterCredentials): Promise<RegisteredUser> {
    const response = await api.post<RegisteredUser>('/auth/register', credentials);
    return response.data;
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenStore.clearToken();
    }
  },

  // Get current user profile
  async getProfile(): Promise<User> {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  // Update user profile
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put<User>('/users/me', data);
    return response.data;
  },

  // Refresh token — rotates the httpOnly cookie server-side and returns
  // the same shape as login so session restore needs no extra call.
  // Delegates to the api module's single-flight primitive so boot
  // restore and interceptor refreshes share one in-flight rotation.
  async refreshToken(): Promise<AuthResponse> {
    return refreshAccessToken();
  },
};
