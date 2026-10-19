import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  onboardingService,
  type OnboardingState,
  type UpdateOnboardingRequest,
} from '../api/onboardingApi';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
// RD7: sanctioned features → app import for typed store types
// eslint-disable-next-line import/no-restricted-paths
import type { AppStore, RootState } from '@/app/store/store';

type AppDispatch = AppStore['dispatch'];

/**
 * Onboarding slice (SP-107C).
 *
 * The state machine for the wizard's onboarding state (SP-107A endpoints):
 * `status` tracks the *state fetch* lifecycle only — `advanceOnboarding` and
 * `completeOnboarding` never flip it (a flip to `loading` would make the
 * shell swap the form for a spinner mid-submit; the busy state for those
 * writes is component-local). They update the fields on success and set
 * `error` on failure, keeping the previous step (the step-1 data is already
 * persisted, so retrying the write is idempotent).
 */
export type OnboardingStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface OnboardingSliceState {
  status: OnboardingStatus;
  /** First incomplete step, 1–3 (meaningless once `completed`). */
  step: number;
  /** True iff `completedAt` is set (completed or skipped) — terminal. */
  completed: boolean;
  completedAt: string | null;
  /** Semester created in step 2 (SP-107D/E consume it for step-3 resume). */
  semesterId: string | null;
  /** Last actionable error (fetch failure, or a failed advance/complete). */
  error: string | null;
}

const initialState: OnboardingSliceState = {
  status: 'idle',
  step: 1,
  completed: false,
  completedAt: null,
  semesterId: null,
  error: null,
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    applyOnboardingState: (state, action: PayloadAction<OnboardingState>) => {
      state.status = 'ready';
      state.step = action.payload.step;
      state.completed = action.payload.completed;
      state.completedAt = action.payload.completedAt;
      state.semesterId = action.payload.semesterId;
      state.error = null;
    },
    // Fetch lifecycle only — see the module comment for why the write
    // thunks do not use this.
    setOnboardingLoading: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    // Fetch failure: the page renders the error + retry screen.
    setOnboardingError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
    },
    // Failed advance/complete: the last known step is kept (the fields are
    // untouched) and the message is surfaced for the retry affordance.
    setOnboardingActionError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const {
  applyOnboardingState,
  setOnboardingLoading,
  setOnboardingError,
  setOnboardingActionError,
} = onboardingSlice.actions;

/**
 * Sanitizes a rejected onboarding request into a human message. The
 * `httpClient` interceptor rejects with `{ ...error, message }`; the message
 * is a string for service 400s but the stock constraint *array* for
 * `FieldValidationPipe` 400s (D106-6), so the parsed `ApiError` is joined
 * when present (same pattern as the SP-106C `updateProfile` thunk).
 */
function rejectionMessage(err: unknown): string {
  const apiError = extractApiError(err);
  return apiError ? apiErrorMessage(apiError) : getErrorMessage(err);
}

export const fetchOnboardingState = createAsyncThunk<
  OnboardingState,
  void,
  { rejectValue: string; dispatch: AppDispatch }
>('onboarding/fetchState', async (_arg, { dispatch, rejectWithValue }) => {
  dispatch(setOnboardingLoading());
  try {
    const state = await onboardingService.getState();
    dispatch(applyOnboardingState(state));
    return state;
  } catch (err: unknown) {
    const message = rejectionMessage(err);
    dispatch(setOnboardingError(message));
    return rejectWithValue(message);
  }
});

/**
 * `advanceOnboarding` payload: the next step, plus (from step 2 onward) the
 * semester to persist in the onboarding state for step-3 resume (D107-8).
 */
export interface AdvanceOnboardingArgs {
  /** The next step, 1–3 (the backend moves the pointer forward only). */
  step: number;
  /** Semester created in step 2; omitted for step-1 advances. */
  semesterId?: string | null;
}

/**
 * Advances the onboarding pointer to `step` (`PATCH /onboarding { step,
 * semesterId? }`). The backend only moves the pointer forward (regression →
 * 400) and rejects any write to a completed state (409) — the slice keeps the
 * previous step on failure.
 */
export const advanceOnboarding = createAsyncThunk<
  OnboardingState,
  AdvanceOnboardingArgs,
  { rejectValue: string; dispatch: AppDispatch }
>('onboarding/advance', async ({ step, semesterId }, { dispatch, rejectWithValue }) => {
  try {
    const body: UpdateOnboardingRequest = { step };
    if (semesterId) {
      body.semesterId = semesterId;
    }
    const state = await onboardingService.updateState(body);
    dispatch(applyOnboardingState(state));
    return state;
  } catch (err: unknown) {
    const message = rejectionMessage(err);
    dispatch(setOnboardingActionError(message));
    return rejectWithValue(message);
  }
});

/**
 * Records terminal completion (`PATCH /onboarding { completed: true }`) —
 * the "Skip for now" path (D107-4) and the step-3 finish (SP-107E). The
 * page redirects to `/dashboard` once `completed` is set.
 */
export const completeOnboarding = createAsyncThunk<
  OnboardingState,
  void,
  { rejectValue: string; dispatch: AppDispatch }
>('onboarding/complete', async (_arg, { dispatch, rejectWithValue }) => {
  try {
    const state = await onboardingService.updateState({ completed: true });
    dispatch(applyOnboardingState(state));
    return state;
  } catch (err: unknown) {
    const message = rejectionMessage(err);
    dispatch(setOnboardingActionError(message));
    return rejectWithValue(message);
  }
});

/* ---- Selectors (field-level, per the RTK selector guidance) ---- */

export const selectOnboarding = (state: RootState) => state.onboarding;
export const selectOnboardingStatus = (state: RootState) => state.onboarding.status;
export const selectOnboardingStep = (state: RootState) => state.onboarding.step;
export const selectOnboardingCompleted = (state: RootState) => state.onboarding.completed;
export const selectOnboardingError = (state: RootState) => state.onboarding.error;

export default onboardingSlice.reducer;
