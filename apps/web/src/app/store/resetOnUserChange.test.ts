import { describe, it, expect } from 'vitest';
import { createAppStore } from './createAppStore';
import { PER_STUDENT_APIS } from './resetOnUserChange';
import { setUser, clearUser } from '@/features/session/model/authSlice';
import { applyOnboardingState } from '@/features/onboarding/model/onboardingSlice';
import { todayPlanApi } from '@/features/today-plan/api/todayPlanApi';
import { assignmentsApi } from '@/features/assignments/api/assignmentsApi';
import type { TodayPlan } from '@/entities/study-plan/model/types';

/**
 * EP16G (D16-19, D-G1/D-G2) — every per-student cache is emptied when the
 * signed-in student becomes nobody or somebody else. Seeded through RTK
 * Query's own `upsertQueryData`, asserted on the real store shape.
 */
const studentA = { id: 'u-a', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };
const studentB = { id: 'u-b', name: 'Bob', email: 'bob@example.com', emailVerifiedAt: null };

const planFor = (title: string): TodayPlan => ({
  date: '2026-11-18',
  timeZone: 'UTC',
  sessions: [],
  nextSession: null,
  nextSessionReason: 'NO_PLAN',
  confirmedMinutesToday: 0,
  ...({ marker: title } as object),
});

function seed(store: ReturnType<typeof createAppStore>, marker: string) {
  store.dispatch(todayPlanApi.util.upsertQueryData('todayPlan', undefined, planFor(marker)));
  store.dispatch(assignmentsApi.util.upsertQueryData('assignments', undefined, [] as never));
  store.dispatch(
    applyOnboardingState({ step: 3, completed: true, completedAt: '2026-11-01', semesterId: 's1' })
  );
}

const cached = (store: ReturnType<typeof createAppStore>) =>
  Object.values(store.getState().todayPlanApi.queries).map((q) => q?.data);

describe('resetOnUserChange (EP16G)', () => {
  it('EP16G-AC1: logout empties every RTK Query slice and the onboarding slice', () => {
    const store = createAppStore();
    store.dispatch(setUser(studentA));
    seed(store, 'A');
    expect(cached(store)).toHaveLength(1);
    expect(store.getState().onboarding.completed).toBe(true);

    store.dispatch(clearUser());

    for (const slice of PER_STUDENT_APIS) {
      const state = store.getState()[slice.reducerPath as keyof ReturnType<typeof store.getState>];
      expect(state).toEqual(expect.objectContaining({ queries: {}, mutations: {} }));
    }
    expect(store.getState().onboarding).toEqual({
      status: 'idle',
      step: 1,
      completed: false,
      completedAt: null,
      semesterId: null,
      error: null,
    });
    expect(store.getState().auth.user).toBeNull();
  });

  it('EP16G-AC2: a different signed-in id resets; the same id (profile refresh) does not', () => {
    const store = createAppStore();
    store.dispatch(setUser(studentA));
    seed(store, 'A');

    // Same student, refreshed profile object → caches untouched.
    store.dispatch(setUser({ ...studentA, name: 'Ada L.' }));
    expect(cached(store)).toHaveLength(1);
    expect(store.getState().onboarding.completed).toBe(true);

    // Another student without a logout in between → everything reset.
    store.dispatch(setUser(studentB));
    expect(cached(store)).toHaveLength(0);
    expect(store.getState().onboarding.status).toBe('idle');
    expect(store.getState().auth.user?.id).toBe('u-b');
  });

  it('EP16G-AC4: every RTK Query slice in the store is registered for the reset', () => {
    const store = createAppStore();
    const state = store.getState() as Record<string, unknown>;
    const apiSlices = Object.entries(state)
      .filter(([, v]) => typeof v === 'object' && v !== null && 'queries' in v && 'mutations' in v)
      .map(([k]) => k)
      .sort();
    expect(apiSlices.length).toBeGreaterThan(0);
    expect(PER_STUDENT_APIS.map((a) => a.reducerPath).sort()).toEqual(apiSlices);
  });
});
