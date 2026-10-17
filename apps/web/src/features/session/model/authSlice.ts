import { createSlice } from '@reduxjs/toolkit';
import type { SessionUser } from '@/entities/user/model/types';
import type { PayloadAction } from '@reduxjs/toolkit';

/* ---- State ---- */

export interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  error: string | null;
  isVerificationBannerDismissed: boolean;
}

const initialState: AuthState = {
  user: null,
  // Boot starts in the "restoring session" state: the route guards hold their
  // spinner until the silent refresh settles (pre-migration `useState(true)`,
  // SP-105G boot contract). The AuthProvider boot effect clears it in `finally`.
  isLoading: true,
  error: null,
  isVerificationBannerDismissed: false,
};

/* ---- Reducer actions (pure — no service imports) ---- */

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SessionUser | null>) => {
      const prevId = state.user?.id;
      const nextId = action.payload?.id;
      // Banner resets only when user identity changes (same behavior as applyUser)
      if (prevId !== nextId) {
        state.isVerificationBannerDismissed = false;
      }
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setBannerDismissed: (state) => {
      state.isVerificationBannerDismissed = true;
    },
  },
  // login, updateProfile handled via createAsyncThunk auto-cases
});

export const { setUser, clearUser, setLoading, setError, clearError, setBannerDismissed } = authSlice.actions;
export default authSlice.reducer;
