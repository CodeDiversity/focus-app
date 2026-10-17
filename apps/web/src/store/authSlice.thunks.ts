import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import { getErrorMessage } from '../utils/errors';
import type { SessionUser } from '../types';
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
      dispatch(setError(getErrorMessage(err)));
      return rejectWithValue(getErrorMessage(err));
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
