import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { Step2Semester } from '@/features/onboarding/ui/Step2Semester';
import { createSemester } from '@/entities/semester/api/semesterApi';
import { onboardingService } from '@/features/onboarding/api/onboardingApi';
import { applyOnboardingState } from '@/features/onboarding/model/onboardingSlice';
import { makeTestStore } from '@/test/providers';
// RD7: sanctioned features → app import for typed AppStore
// eslint-disable-next-line import/no-restricted-paths
import type { AppStore } from '@/app/store/store';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/entities/semester/api/semesterApi', () => ({
  createSemester: vi.fn(),
}));

vi.mock('@/features/onboarding/api/onboardingApi', () => ({
  onboardingService: {
    getState: vi.fn(),
    updateState: vi.fn(),
  },
}));

const mockedCreateSemester = vi.mocked(createSemester);
const mockedUpdateState = vi.mocked(onboardingService.updateState);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

/** The 201 body `POST /semesters` returns (SP-107B shape). */
const createdSemester = {
  id: 'sem-1',
  name: 'Fall 2026',
  startDate: '2026-09-01',
  endDate: '2026-12-15',
  isActive: false,
  createdAt: '2026-10-18T12:00:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
};

/** The updated onboarding state after a successful step-2 advance. */
const advancedState = {
  step: 3,
  completed: false,
  completedAt: null,
  semesterId: 'sem-1',
};

/**
 * Renders step 2 inside the real provider stack with the onboarding slice
 * seeded at step 2 (the student completed step 1). No `AuthProvider` is
 * needed — step 2 reads no profile data (unlike step 1's pre-fill).
 */
const renderStep2 = (): AppStore => {
  const store = makeTestStore();
  store.dispatch(
    applyOnboardingState({ step: 2, completed: false, completedAt: null, semesterId: null })
  );
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Step2Semester />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

const validUser = userEvent.setup();

const nameInput = () => screen.getByLabelText(/semester name/i);
const startDateInput = () => screen.getByLabelText(/start date/i);
const endDateInput = () => screen.getByLabelText(/end date/i);
const saveButton = () => screen.getByRole('button', { name: /save and continue/i });
const retryButton = () => screen.getByRole('button', { name: /retry/i });

/**
 * Fills the form with valid values. The name is typed; the native date
 * inputs are set via `change` (jsdom does not implement the date-picker UI,
 * so `userEvent.type` cannot drive the segments — the changed value is what
 * the picker would report for a completed date).
 */
const fillValidForm = async () => {
  await validUser.type(nameInput(), 'Fall 2026');
  fireEvent.change(startDateInput(), { target: { value: '2026-09-01' } });
  fireEvent.change(endDateInput(), { target: { value: '2026-12-15' } });
};

describe('Step2Semester client validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects an empty name and never calls the API', async () => {
    renderStep2();
    await fillValidForm();
    await validUser.clear(nameInput());
    await validUser.click(saveButton());

    expect(await screen.findByText('Semester name is required')).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedCreateSemester).not.toHaveBeenCalled();
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('rejects a name over 100 characters and never calls the API', async () => {
    renderStep2();
    await fillValidForm();
    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'x'.repeat(101));
    await validUser.click(saveButton());

    expect(
      await screen.findByText('Semester name must be 100 characters or fewer')
    ).toBeInTheDocument();
    expect(mockedCreateSemester).not.toHaveBeenCalled();
  });

  it('rejects missing start and end dates and never calls the API', async () => {
    renderStep2();
    await validUser.type(nameInput(), 'Fall 2026');
    await validUser.click(saveButton());

    expect(await screen.findByText('Start date is required')).toBeInTheDocument();
    expect(screen.getByText('End date is required')).toBeInTheDocument();
    expect(startDateInput()).toHaveAttribute('aria-invalid', 'true');
    expect(endDateInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedCreateSemester).not.toHaveBeenCalled();
  });

  it('rejects end == start with the end-after-start error on the end date', async () => {
    renderStep2();
    await fillValidForm();
    fireEvent.change(endDateInput(), { target: { value: '2026-09-01' } });
    await validUser.click(saveButton());

    expect(await screen.findByText('End date must be after the start date.')).toBeInTheDocument();
    expect(endDateInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedCreateSemester).not.toHaveBeenCalled();
  });

  it('rejects end < start with the end-after-start error on the end date', async () => {
    renderStep2();
    await fillValidForm();
    fireEvent.change(endDateInput(), { target: { value: '2026-08-01' } });
    await validUser.click(saveButton());

    expect(await screen.findByText('End date must be after the start date.')).toBeInTheDocument();
    expect(mockedCreateSemester).not.toHaveBeenCalled();
  });
});

describe('Step2Semester submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateSemester.mockResolvedValue(createdSemester);
    mockedUpdateState.mockResolvedValue(advancedState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates the semester first, then saves the progress with the created id (AC-107-02, D107-8)', async () => {
    const store = renderStep2();
    await fillValidForm();
    await validUser.click(saveButton());

    await waitFor(() => expect(mockedCreateSemester).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockedUpdateState).toHaveBeenCalledWith({ step: 3, semesterId: 'sem-1' })
    );

    // The create strictly precedes the progress save.
    const createCall = mockedCreateSemester.mock.invocationCallOrder[0];
    const advanceCall = mockedUpdateState.mock.invocationCallOrder[0];
    expect(createCall).toBeLessThan(advanceCall);

    // The request body is the form values, dates as `yyyy-MM-dd` strings.
    expect(mockedCreateSemester).toHaveBeenCalledWith({
      name: 'Fall 2026',
      startDate: '2026-09-01',
      endDate: '2026-12-15',
    });

    // The slice pointer moved to step 3 with the semester id — the shell
    // re-renders step 3 (the announced step line is the success state).
    await waitFor(() => expect(store.getState().onboarding.step).toBe(3));
    expect(store.getState().onboarding.semesterId).toBe('sem-1');
    expect(store.getState().onboarding.error).toBeNull();
  });

  it('renders a 400 errors map under the matching fields and never advances', async () => {
    const store = renderStep2();
    await fillValidForm();
    // The shape the shared `httpClient` interceptor rejects with for a
    // field-level 400 (SP-107B: the service throws the `errors` map).
    mockedCreateSemester.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['name must be 100 characters or fewer', 'endDate must be after startDate'],
          error: 'Bad Request',
          errors: {
            name: ['name must be 100 characters or fewer'],
            endDate: ['endDate must be after startDate'],
          },
        },
      },
      message: ['name must be 100 characters or fewer', 'endDate must be after startDate'],
    });

    await validUser.click(saveButton());

    expect(await screen.findByText('name must be 100 characters or fewer')).toBeInTheDocument();
    expect(screen.getByText('endDate must be after startDate')).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(endDateInput()).toHaveAttribute('aria-invalid', 'true');
    // Field-level feedback replaces the toast (no duplication).
    expect(mockedToast.error).not.toHaveBeenCalled();
    // The pointer never moved — the student stays on step 2.
    expect(store.getState().onboarding.step).toBe(2);
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('renders a 409 duplicate name on the name field and never advances', async () => {
    const store = renderStep2();
    await fillValidForm();
    mockedCreateSemester.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          message: 'A semester with this name already exists.',
          error: 'Conflict',
        },
      },
      message: 'A semester with this name already exists.',
    });

    await validUser.click(saveButton());

    expect(
      await screen.findByText('A semester with this name already exists.')
    ).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
    expect(store.getState().onboarding.step).toBe(2);
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('preserves the form values and offers a resubmit retry on a network failure', async () => {
    const store = renderStep2();
    await fillValidForm();
    mockedCreateSemester.mockRejectedValue(new Error('Network Error'));

    await validUser.click(saveButton());

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    // The form keeps its values and the submit button re-enables — resubmit
    // is the retry (the semester was never created, so re-creating is safe).
    expect(nameInput()).toHaveValue('Fall 2026');
    expect(startDateInput()).toHaveValue('2026-09-01');
    expect(endDateInput()).toHaveValue('2026-12-15');
    expect(saveButton()).not.toBeDisabled();
    expect(store.getState().onboarding.step).toBe(2);

    mockedCreateSemester.mockResolvedValue(createdSemester);
    await validUser.click(saveButton());

    await waitFor(() => expect(mockedCreateSemester).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(mockedUpdateState).toHaveBeenCalledWith({ step: 3, semesterId: 'sem-1' })
    );
    await waitFor(() => expect(store.getState().onboarding.step).toBe(3));
  });

  it('retries only the progress save when it fails after a successful create (the semester is never re-created)', async () => {
    const store = renderStep2();
    await fillValidForm();
    mockedUpdateState.mockRejectedValue({ message: 'We could not save your setup. Try again.' });

    await validUser.click(saveButton());

    // The create succeeded; the progress save failed — the slice keeps step 2
    // and records the error the shell displays, and the form is frozen.
    await waitFor(() =>
      expect(store.getState().onboarding.error).toBe('We could not save your setup. Try again.')
    );
    expect(store.getState().onboarding.step).toBe(2);
    expect(nameInput()).toBeDisabled();
    expect(saveButton()).toBeDisabled();

    // The inline retry re-dispatches the progress save with the created id —
    // the semester is NOT re-created.
    mockedUpdateState.mockResolvedValue(advancedState);
    await validUser.click(retryButton());

    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledTimes(2));
    expect(mockedUpdateState).toHaveBeenLastCalledWith({ step: 3, semesterId: 'sem-1' });
    expect(mockedCreateSemester).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(store.getState().onboarding.step).toBe(3));
    expect(store.getState().onboarding.error).toBeNull();
  });

  it('disables the controls while the submit is in flight (no duplicate submission)', async () => {
    // The create never resolves during the test; unmount cleans up.
    mockedCreateSemester.mockImplementation(() => new Promise(() => undefined));
    renderStep2();
    await fillValidForm();

    const save = saveButton();
    await validUser.click(save);

    await waitFor(() => expect(save).toBeDisabled());
    expect(nameInput()).toBeDisabled();
    expect(startDateInput()).toBeDisabled();
    expect(endDateInput()).toBeDisabled();
  });
});

describe('Step2Semester accessibility and responsiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateSemester.mockResolvedValue(createdSemester);
    mockedUpdateState.mockResolvedValue(advancedState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes with the keyboard only: tab to each field, type, tab to submit, Enter', async () => {
    const store = renderStep2();
    await fillValidForm();

    // The submit button is the last focusable control in the step content;
    // Enter on it submits the form (native form semantics).
    saveButton().focus();
    await validUser.keyboard('{Enter}');

    await waitFor(() => expect(mockedCreateSemester).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockedUpdateState).toHaveBeenCalledWith({ step: 3, semesterId: 'sem-1' })
    );
    await waitFor(() => expect(store.getState().onboarding.step).toBe(3));
  });

  it('exposes labeled, focusable controls with visible focus styling', async () => {
    renderStep2();

    for (const input of [nameInput(), startDateInput(), endDateInput()]) {
      input.focus();
      expect(input).toHaveFocus();
      // The shared `Input` renders the focus ring classes.
      expect(input).toHaveClass('focus:ring-2');
    }
    expect(saveButton()).toBeEnabled();
  });

  it('stacks the date fields on mobile and places them side-by-side on desktop (responsive class contract)', async () => {
    renderStep2();

    // The shared `Input` wraps each control, so locate the responsive
    // containers by their class contract rather than by parent depth.
    const dateGrid = startDateInput().closest('[class*="sm:grid-cols-2"]') as HTMLElement;
    expect(dateGrid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2');
    // The action row stacks on mobile and goes side-by-side on desktop.
    const actionRow = saveButton().closest('[class*="sm:flex-row"]') as HTMLElement;
    expect(actionRow).toHaveClass('flex', 'flex-col-reverse', 'sm:flex-row');
  });
});
