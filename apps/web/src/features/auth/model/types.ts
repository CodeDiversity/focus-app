// Auth Types — feature-layer home
import type { SessionUser } from '@/entities/user/model/types';

export interface AuthResponse {
  accessToken: string;
  user: SessionUser;
}

export interface VerificationResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}
