import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setUser, clearUser } from '@/features/session/model/authSlice';
import { resetOnboarding } from '@/features/onboarding/model/onboardingSlice';
import { api } from '@/features/session/api/sessionApi';
import { assignmentsApi } from '@/features/assignments/api/assignmentsApi';
import { calendarApi } from '@/features/calendar/api/calendarApi';
import { todayPlanApi } from '@/features/today-plan/api/todayPlanApi';
import { planHealthApi } from '@/features/plan-health/api/planHealthApi';
import { momentumApi } from '@/features/momentum/api/momentumApi';

/**
 * EP16G (D16-19; D-G1 (a), D-G2 (a)) — the per-student cache registry.
 *
 * Every RTK Query slice that holds a student's data is listed here, and the
 * listener below empties each one whenever the signed-in student becomes
 * nobody (`clearUser`) or somebody else (`setUser` with a different `id`).
 * Without this, a cache entry lives on for `keepUnusedDataFor` seconds after
 * logout, and the next student to sign in on the same tab could be served
 * the previous student's Today plan, calendar, assignments or momentum.
 *
 * `resetOnUserChange.test.ts` (EP16G-AC4) fails if a slice in the store is
 * missing from this list, so a future slice cannot skip the reset silently.
 */
export const PER_STUDENT_APIS = [
  api,
  assignmentsApi,
  calendarApi,
  todayPlanApi,
  planHealthApi,
  momentumApi,
] as const;

export const resetOnUserChange = createListenerMiddleware();

resetOnUserChange.startListening({
  matcher: isAnyOf(clearUser, setUser),
  effect: (action, listenerApi) => {
    type AuthState = { auth: { user: { id: string } | null } };
    const previousId = (listenerApi.getOriginalState() as AuthState).auth.user?.id;
    const nextId = setUser.match(action) ? action.payload?.id : undefined;
    // A profile refresh for the same student keeps every cache (EP16G-AC2).
    if (setUser.match(action) && previousId === nextId) return;
    for (const slice of PER_STUDENT_APIS) {
      listenerApi.dispatch(slice.util.resetApiState());
    }
    listenerApi.dispatch(resetOnboarding());
  },
});
