import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/auth';
import { tokenStore } from '@/shared/api/tokenStore';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import type { SessionUser } from '@/entities/user/model/types';
import { setUser, clearUser, setLoading, setError } from './authSlice';
import type { AppStore } from './store';

type AppDispatch = AppStore['dispatch'];

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await authService.login(credentials);
      dispatch(setUser(response.user));
      return response.user;
    } catch (err: unknown) {
      dispatch(setError(getErrorMessage(err)));
      return rejectWithValue(getErrorMessage(err));
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<SessionUser>, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const updatedUser = await authService.updateProfile(data);
      dispatch(setUser(updatedUser));
      return updatedUser;
    } catch (err: unknown) {
      // SP-106C — forward the parsed ApiError the api response interceptor
      // already extracted from the rejection (`response.data`) so the SP-106B
      // field-level 400 map (D106-6) survives to the Profile form. The
      // `message` stays a plain sanitized string for the slice/error surface.
      const apiError = extractApiError(err);
      const message = apiError ? apiErrorMessage(apiError) : getErrorMessage(err);
      dispatch(setError(message));
      return rejectWithValue({ message, apiError });
    } finally {
      dispatch(setLoading(false));
    }
  },
);

// Plain async dispatch for register (no user set on success)
export const registerThunk = async (
  dispatch: AppDispatch,
  name: string,
  email: string,
  password: string,
) => {
  dispatch(setLoading(true));
  dispatch(setError(null));
  try {
    await authService.register({ name, email, password });
  } catch (err: unknown) {
    dispatch(setError(getErrorMessage(err)));
    throw err;
  } finally {
    dispatch(setLoading(false));
  }
};

// Plain async dispatch for logout (always clears token regardless of server response)
// Returns a no-op action to satisfy Redux's plain object check after thunk middleware
export const logoutThunk = (dispatch: AppDispatch): { type: string } => {
  authService.logout().catch((err: unknown) => {
    console.error('Logout error:', getErrorMessage(err));
  }).finally(() => {
    tokenStore.clearToken();
    dispatch(clearUser());
  });
  return { type: '@@logout/no-op' };
};
