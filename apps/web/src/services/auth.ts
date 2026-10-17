import api, { refreshAccessToken } from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import { runRecoveryReset, type ResetPasswordResult } from '@/shared/api/recovery';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordRequest,
  VerificationResponse,
} from '@/features/auth/model/types';
import type { RegisteredUser, User } from '@/entities/user/model/types';

export const authService = {
  // Do not propagate Axios request configuration: it contains the link token.
  async verifyEmail(token: string): Promise<VerificationResponse> {
    try {
      const response = await api.post<VerificationResponse>('/auth/verify-email', { token });
      return response.data;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      throw Object.assign(new Error(status === 400
        ? 'This verification link is invalid or has expired. Request a new email.'
        : 'We could not verify your email. Check your connection and try again.'), { statusCode: status });
    }
  },

  async resendVerification(email: string): Promise<VerificationResponse> {
    try {
      const response = await api.post<VerificationResponse>('/auth/resend-verification', { email: email.trim().toLowerCase() });
      return response.data;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      throw new Error(status === 400
        ? 'Please enter a valid email address'
        : 'We could not request a verification email. Check your connection and try again.');
    }
  },

  // SP-105C — POST /auth/forgot-password. The shared instance's recovery path
  // (SP-105G) sanitizes every failure into a RecoveryError, so this method
  // stays a thin forwarder and never re-derives messages.
  async requestPasswordReset(email: string): Promise<VerificationResponse> {
    const response = await api.post<VerificationResponse>('/auth/forgot-password', {
      email: email.trim().toLowerCase(),
    });
    return response.data;
  },

  // SP-105C — POST /auth/reset-password inside the SP-105G recovery boundary:
  // it drains the in-flight refresh before sending, commits the session clear
  // (generation first) on success, and re-sanitizes every failure. The raw
  // link token appears only in this request body — nothing returned or
  // thrown carries it beyond the sanitized RecoveryError / ResetPasswordResult.
  async resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResult> {
    return runRecoveryReset(() =>
      api.post<ResetPasswordResult>('/auth/reset-password', request).then((response) => response.data),
    );
  },

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

  // Update user profile — PATCH (SP-106C, D106-2): partial update via the
  // SP-106B endpoint (PUT was removed there; a tokened PUT now 404s).
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch<User>('/users/me', data);
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
