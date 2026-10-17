import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { api } from './api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
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