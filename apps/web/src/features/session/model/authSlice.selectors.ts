// RD7: sanctioned features → app import for typed RootState
// eslint-disable-next-line import/no-restricted-paths
import type { RootState } from '@/app/store/store';

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectError = (state: RootState) => state.auth.error;
export const selectIsVerificationBannerDismissed = (state: RootState) =>
  state.auth.isVerificationBannerDismissed;
