import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyOnboardingState,
  fetchOnboardingState,
  advanceOnboarding,
  completeOnboarding,
} from './onboardingSlice';
import { onboardingService, type OnboardingState } from '../api/onboardingApi';
import { makeTestStore } from '@/test/providers';

vi.mock('../api/onboardingApi', () => ({
  onboardingService: {
    getState: vi.fn(),
    updateState: vi.fn(),
  },
}));

const mockedGetState = vi.mocked(onboardingService.getState);
const mockedUpdateState = vi.mocked(onboardingService.updateState);

/**
 * The shared test store (auth + onboarding + api, same middleware as the app
 * store): its state shape matches `RootState`, so the slice's thunks — typed
 * against the app dispatch — type-check when dispatched against it. Only the
 * `onboarding` slice is exercised by these tests.
 */
function makeStore() {
  return makeTestStore();
}

/** The fresh (newly registered) onboarding state — step 1, not completed. */
const freshState: OnboardingState = {
  step: 1,
  completed: false,
  completedAt: null,
  semesterId: null,
};

/** A deferred service call so the pending phase can be observed. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('onboardingSlice — fetchOnboardingState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions idle → loading → ready and stores the fetched state', async () => {
    const call = deferred<OnboardingState>();
    mockedGetState.mockImplementation(() => call.promise);
    const store = makeStore();

    expect(store.getState().onboarding.status).toBe('idle');

    const dispatched = store.dispatch(fetchOnboardingState());

    // Pending phase: loading raised (the page renders its spinner).
    expect(store.getState().onboarding.status).toBe('loading');

    call.resolve({ ...freshState, step: 2 });
    await dispatched;

    const state = store.getState().onboarding;
    expect(state.status).toBe('ready');
    expect(state.step).toBe(2);
    expect(state.completed).toBe(false);
    expect(state.completedAt).toBeNull();
    expect(state.semesterId).toBeNull();
    expect(state.error).toBeNull();
    expect(mockedGetState).toHaveBeenCalledTimes(1);
  });

  it('transitions idle → loading → error and keeps the previous fields on failure', async () => {
    mockedGetState.mockRejectedValue({ message: 'Network failure occurred' });
    const store = makeStore();
    // Seed a previous successful read so the failure keeps meaningful fields.
    store.dispatch(applyOnboardingState({ ...freshState, step: 2 }));

    const result = await store.dispatch(fetchOnboardingState());

    expect(fetchOnboardingState.rejected.match(result)).toBe(true);
    if (fetchOnboardingState.rejected.match(result)) {
      expect(result.payload).toBe('Network failure occurred');
    }
    const state = store.getState().onboarding;
    expect(state.status).toBe('error');
    expect(state.error).toBe('Network failure occurred');
    // The last known step survives the failed re-fetch (the resume pointer).
    expect(state.step).toBe(2);
    expect(state.completed).toBe(false);
  });

  it('joins the FieldValidationPipe message array into the error (D106-6)', async () => {
    // The shape the `httpClient` interceptor rejects with for a validation 400:
    // the parsed body at `response.data`, whose `message` is a string array.
    mockedGetState.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['step must be between 1 and 3'],
          error: 'Bad Request',
        },
      },
      message: ['step must be between 1 and 3'],
    });
    const store = makeStore();

    await store.dispatch(fetchOnboardingState());

    const state = store.getState().onboarding;
    expect(state.status).toBe('error');
    expect(state.error).toBe('step must be between 1 and 3');
  });
});

describe('onboardingSlice — advanceOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advances the step pointer on success (step 1 → 2)', async () => {
    mockedUpdateState.mockResolvedValue({ ...freshState, step: 2 });
    const store = makeStore();
    store.dispatch(applyOnboardingState(freshState));

    const result = await store.dispatch(advanceOnboarding(2));

    expect(advanceOnboarding.fulfilled.match(result)).toBe(true);
    const state = store.getState().onboarding;
    expect(state.step).toBe(2);
    expect(state.status).toBe('ready');
    expect(state.error).toBeNull();
    expect(mockedUpdateState).toHaveBeenCalledWith({ step: 2 });
  });

  it('keeps the previous step, keeps the fetch lifecycle, and records the error on failure', async () => {
    // The terminal 409 the backend returns for any write to a completed state.
    mockedUpdateState.mockRejectedValue({
      message: 'Onboarding is already completed — this state is terminal',
    });
    const store = makeStore();
    store.dispatch(applyOnboardingState(freshState));

    const result = await store.dispatch(advanceOnboarding(2));

    expect(advanceOnboarding.rejected.match(result)).toBe(true);
    if (advanceOnboarding.rejected.match(result)) {
      expect(result.payload).toBe('Onboarding is already completed — this state is terminal');
    }
    const state = store.getState().onboarding;
    expect(state.step).toBe(1); // the previous step is kept
    expect(state.status).toBe('ready'); // the fetch lifecycle is untouched
    expect(state.error).toBe('Onboarding is already completed — this state is terminal');
  });
});

describe('onboardingSlice — completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records terminal completion (skip / finish)', async () => {
    const completedAt = '2026-10-18T12:00:00.000Z';
    mockedUpdateState.mockResolvedValue({
      step: 2,
      completed: true,
      completedAt,
      semesterId: null,
    });
    const store = makeStore();
    store.dispatch(applyOnboardingState(freshState));

    const result = await store.dispatch(completeOnboarding());

    expect(completeOnboarding.fulfilled.match(result)).toBe(true);
    const state = store.getState().onboarding;
    expect(state.completed).toBe(true);
    expect(state.completedAt).toBe(completedAt);
    expect(state.status).toBe('ready');
    expect(state.error).toBeNull();
    expect(mockedUpdateState).toHaveBeenCalledWith({ completed: true });
  });

  it('keeps the previous state and records the error on failure', async () => {
    mockedUpdateState.mockRejectedValue({ message: 'We could not save your setup. Try again.' });
    const store = makeStore();
    store.dispatch(applyOnboardingState(freshState));

    const result = await store.dispatch(completeOnboarding());

    expect(completeOnboarding.rejected.match(result)).toBe(true);
    const state = store.getState().onboarding;
    expect(state.completed).toBe(false);
    expect(state.completedAt).toBeNull();
    expect(state.step).toBe(1);
    expect(state.error).toBe('We could not save your setup. Try again.');
  });
});
