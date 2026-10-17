import api from '@/shared/api/httpClient';
import type { User } from '@/entities/user/model/types';

// Extracted from features/auth/model/authService.ts (SP-109D).
// These two profile endpoints live under entities/user so /users/me calls
// are not nested inside an auth feature folder. Behavior and typing are
// byte-for-byte identical to the original authService methods.

export const userService = {
  // Get current user profile
  async getProfile(): Promise<User> {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  // Update user profile — PATCH (SP-106C, D106-2): partial update via the
  // SP-106B endpoint (PUT was removed there; a tokened PUT now 404s).
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch<User>('/users/me', data);
    return response.data;
  },
};
