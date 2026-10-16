import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from 'axios';
import { tokenStore } from './tokenStore';
import {
  isRecoveryBarrierActive,
  onRecoveryBarrierReleased,
  sanitizeRecoveryError,
  setInFlightRefresh,
} from './recovery';
import { ApiError, AuthResponse } from '../types';

// Create axios instance with base URL
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// The two SP-105 recovery routes (public entries; SP-105A/B/F).
const RECOVERY_PATHS = ['/auth/forgot-password', '/auth/reset-password'];

const AUTH_PATHS = [
  '/auth/login', '/auth/refresh', '/auth/logout', '/auth/register',
  '/auth/verify-email', '/auth/resend-verification',
  ...RECOVERY_PATHS,
];

function isAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((path) => url.includes(path));
}

function isRecoveryPath(url: string | undefined): boolean {
  if (!url) return false;
  return RECOVERY_PATHS.some((path) => url.includes(path));
}

export type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  sessionExpiredHandler = handler;
}

// Backwards-compatible alias
export const setAuthFailureHandler = setSessionExpiredHandler;

let refreshPromise: Promise<AuthResponse> | null = null;

export function refreshAccessToken(): Promise<AuthResponse> {
  if (refreshPromise) {
    return refreshPromise;
  }
  if (isRecoveryBarrierActive()) {
    // A recovery operation owns the session while its barrier is active.
    // Defer — never drop — this rotation; it starts after release.
    return onRecoveryBarrierReleased().then(() => refreshAccessToken());
  }
  const promise = api
    .post<AuthResponse>('/auth/refresh')
    .then((response) => {
      tokenStore.setToken(response.data.accessToken);
      return response.data;
    })
    .finally(() => {
      refreshPromise = null;
      setInFlightRefresh(null);
    });
  refreshPromise = promise;
  setInFlightRefresh(promise);
  return promise;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStore.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthPath(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        const refreshed = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        }
        return api(originalRequest);
      } catch {
        tokenStore.clearToken();
        if (sessionExpiredHandler) {
          sessionExpiredHandler();
        }
        const message = 'Your session has expired. Please sign in again.';
        return Promise.reject({ ...error, message });
      }
    }

    if (status === 401 && originalRequest?._retry) {
      tokenStore.clearToken();
      if (sessionExpiredHandler) {
        sessionExpiredHandler();
      }
    }

    if (isRecoveryPath(originalRequest?.url)) {
      // Recovery request bodies carry the raw link token — never propagate
      // the raw Axios error (config/body/headers) from these paths.
      return Promise.reject(sanitizeRecoveryError(error));
    }

    // Extract error message
    const message =
      (error.response?.data?.message as string) ||
      error.message ||
      'An unexpected error occurred';

    // Return rejected promise with custom error
    return Promise.reject({
      ...error,
      message,
    });
  },
);

export default api;

// Helper functions
export const apiGet = <T>(url: string, config?: AxiosRequestConfig) =>
  api.get<T>(url, config);
export const apiPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.post<T>(url, data, config);
export const apiPut = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.put<T>(url, data, config);
export const apiPatch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.patch<T>(url, data, config);
export const apiDelete = <T>(url: string, config?: AxiosRequestConfig) =>
  api.delete<T>(url, config);
