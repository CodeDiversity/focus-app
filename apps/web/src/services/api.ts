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
  snapshotSessionGeneration,
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

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean; _generation?: number };

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
let deferredRefresh: Promise<AuthResponse> | null = null;

/**
 * Starts the single-flight rotation for `generation` — the session
 * generation snapshotted at the *caller's* entry, so a rotation deferred
 * behind the recovery barrier keeps the pre-reset generation even though it
 * dispatches after release.
 */
function beginRefresh(generation: number): Promise<AuthResponse> {
  const promise = api
    .post<AuthResponse>('/auth/refresh')
    .then((response) => {
      // A successful reset advances the generation and clears the token: a
      // rotation that predates it must not resurrect the cleared session.
      if (generation === snapshotSessionGeneration()) {
        tokenStore.setToken(response.data.accessToken);
      }
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

export function refreshAccessToken(): Promise<AuthResponse> {
  if (refreshPromise) {
    return refreshPromise;
  }
  const generation = snapshotSessionGeneration();
  if (isRecoveryBarrierActive()) {
    // A recovery operation owns the session while its barrier is active.
    // Defer — never drop — this rotation; one deferred flight is shared so
    // the single-flight invariant survives the pause.
    if (!deferredRefresh) {
      deferredRefresh = onRecoveryBarrierReleased().then(() => {
        deferredRefresh = null;
        return refreshPromise ?? beginRefresh(generation);
      });
    }
    return deferredRefresh;
  }
  return beginRefresh(generation);
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: RetriableConfig) => {
    const token = tokenStore.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Snapshot the session generation at dispatch. Retries reuse the config,
    // so a retried 401 is still checked against the ORIGINAL dispatch.
    if (config._generation === undefined) {
      config._generation = snapshotSessionGeneration();
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
      const generation = originalRequest._generation ?? snapshotSessionGeneration();
      if (generation !== snapshotSessionGeneration()) {
        // This request predates a successful password reset. Its session is
        // gone and its local state already cleared: do not refresh, retry,
        // or re-clear — reject quietly (ticket AC2 / decision R3).
        return Promise.reject({
          ...error,
          message: 'Your session has expired. Please sign in again.',
        });
      }
      originalRequest._retry = true;
      try {
        const refreshed = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        }
        return api(originalRequest);
      } catch {
        // Re-check: a rotation deferred behind the barrier runs after release
        // and therefore observes an advanced generation.
        if (generation === snapshotSessionGeneration()) {
          tokenStore.clearToken();
          if (sessionExpiredHandler) {
            sessionExpiredHandler();
          }
        }
        const message = 'Your session has expired. Please sign in again.';
        return Promise.reject({ ...error, message });
      }
    }

    if (status === 401 && originalRequest?._retry) {
      if ((originalRequest._generation ?? snapshotSessionGeneration()) === snapshotSessionGeneration()) {
        tokenStore.clearToken();
        if (sessionExpiredHandler) {
          sessionExpiredHandler();
        }
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
