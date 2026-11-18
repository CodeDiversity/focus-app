import { createAppStore } from './createAppStore';

/**
 * The application store. Its reducers, middleware and the EP16G
 * logout/account-switch reset live in `createAppStore` so the test factory
 * (`test/providers.tsx`) builds the very same store.
 *
 * History: SP-107C added `onboarding` beside `auth` and the session RTK Query
 * `api`; EP05A added the per-domain `assignmentsApi` / `calendarApi` slices
 * (D05-1, D05-8); EP13D `todayPlanApi`; EP13E `planHealthApi` (EP16B: `recoverySummaryApi`); EP13K
 * `momentumApi`; EP16G the per-student reset (D16-19).
 */
export const store = createAppStore();

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
