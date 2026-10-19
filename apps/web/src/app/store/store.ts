import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/session/model/authSlice';
import onboardingReducer from '@/features/onboarding/model/onboardingSlice';
import { api } from '@/features/session/api/sessionApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // SP-107C: wizard onboarding state (SP-107A endpoints)
    onboarding: onboardingReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // RTK's guidance: ignore the RTK Query action paths in the serializability
      // check — its internal cache actions are not plain serializable objects.
      serializableCheck: { ignoredActions: [api.reducerPath] },
    }).concat(api.middleware),
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
