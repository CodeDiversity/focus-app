import type { RootState } from './store';

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectError = (state: RootState) => state.auth.error;
export const selectIsVerificationBannerDismissed = (state: RootState) =>
  state.auth.isVerificationBannerDismissed;
