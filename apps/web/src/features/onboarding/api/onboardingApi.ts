import api from '@/shared/api/httpClient';

/**
 * Onboarding state contract (SP-107C; the shared API contract in
 * `docs/stories/EP01/SP-107/README.md`, implemented by SP-107A).
 *
 * `GET /onboarding` and `PATCH /onboarding` (partial body) return this shape.
 * The route is authenticated by the global JWT guard and self-scoped to the
 * principal — there is no id parameter and no cross-student access.
 */
export interface OnboardingState {
  /** First incomplete step, 1–3 (meaningless once `completed`). */
  step: number;
  /** True iff `completedAt` is set (completed or skipped) — terminal. */
  completed: boolean;
  /** ISO timestamp of completion/skip; null while in progress. */
  completedAt: string | null;
  /** Semester created in step 2; null until then, and null again if that
   * semester no longer exists. */
  semesterId: string | null;
}

/** Partial `PATCH /onboarding` body (the shared API contract). */
export interface UpdateOnboardingRequest {
  step?: number;
  completed?: boolean;
  semesterId?: string | null;
}

/**
 * Onboarding state service (SP-107C). Thin axios forwarders on the shared
 * `httpClient` instance, mirroring the `entities/user/api/userService.ts`
 * pattern (not RTK Query): the onboarding slice owns the state machine, so a
 * plain service + `createAsyncThunk` keeps the write path testable and
 * matches the SP-106 `updateProfile` pattern the wizard step 1 reuses.
 */
export const onboardingService = {
  /** GET /onboarding — the current onboarding state. */
  async getState(): Promise<OnboardingState> {
    const response = await api.get<OnboardingState>('/onboarding');
    return response.data;
  },

  /** PATCH /onboarding — partial update; returns the updated state. */
  async updateState(data: UpdateOnboardingRequest): Promise<OnboardingState> {
    const response = await api.patch<OnboardingState>('/onboarding', data);
    return response.data;
  },
};
