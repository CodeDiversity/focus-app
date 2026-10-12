import api from './api';
import { tokenStore } from './tokenStore';
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types';

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    tokenStore.setToken(response.data.accessToken);
    return response.data;
  },

  // Register user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    tokenStore.setToken(response.data.accessToken);
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

  // Refresh token
  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await api.post<{ accessToken: string }>('/auth/refresh');
    tokenStore.setToken(response.data.accessToken);
    return response.data;
  },
};
