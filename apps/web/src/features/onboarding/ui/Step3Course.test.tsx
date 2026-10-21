import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { Step3Course } from '@/features/onboarding/ui/Step3Course';
import { createCourse } from '@/entities/course/api/courseApi';
import { onboardingService } from '@/features/onboarding/api/onboardingApi';
import { applyOnboardingState } from '@/features/onboarding/model/onboardingSlice';
import { makeTestStore } from '@/test/providers';
// RD7: sanctioned features → app import for typed AppStore
// eslint-disable-next-line import/no-restricted-paths
import type { AppStore } from '@/app/store/store';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/entities/course/api/courseApi', () => ({
  createCourse: vi.fn(),
}));

vi.mock('@/features/onboarding/api/onboardingApi', () => ({
  onboardingService: {
    getState: vi.fn(),
    updateState: vi.fn(),
  },
}));

const mockedCreateCourse = vi.mocked(createCourse);
const mockedUpdateState = vi.mocked(onboardingService.updateState);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

/**
 * The 201 body `POST /courses` returns (SP-111A, D111-4: the 13-key
 * `CourseWithSemester` shape — the SP-107B 8 keys plus `instructor`,
 * `semesterId`, and the `semester` projection; the wizard ignores the extras).
 */
const createdCourse = {
  id: 'course-1',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: null,
  color: '#6366f1',
  credits: null,
  instructor: null,
  isActive: true,
  semesterId: 'sem-1',
  semester: { id: 'sem-1', name: 'Fall 2026' },
  createdAt: '2026-10-18T12:00:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
};

/** The updated onboarding state after a successful completion. */
const completedState = {
  step: 3,
  completed: true,
  completedAt: '2026-10-18T12:30:00.000Z',
  semesterId: 'sem-1',
};

/**
 * Renders step 3 inside the real provider stack with the onboarding slice
 * seeded at step 3 (the student completed step 2). No `AuthProvider` is
 * needed — step 3 reads no profile data (unlike step 1's pre-fill).
 */
const renderStep3 = (semesterId: string | null = 'sem-1'): AppStore => {
  const store = makeTestStore();
  store.dispatch(
    applyOnboardingState({ step: 3, completed: false, completedAt: null, semesterId })
  );
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Step3Course />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

const validUser = userEvent.setup();

const codeInput = () => screen.getByLabelText(/course code/i);
const nameInput = () => screen.getByLabelText(/course name/i);
const addButton = () => screen.getByRole('button', { name: /add course/i });
const finishButton = () => screen.getByRole('button', { name: /finish without a course/i });
const retryButton = () => screen.getByRole('button', { name: /retry finishing/i });

/** Fills the form with valid values. */
const fillValidForm = async () => {
  await validUser.type(codeInput(), 'CS101');
  await validUser.type(nameInput(), 'Intro to Computer Science');
};

describe('Step3Course optional label and finish-without-a-course (AC-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the visible optional label and both exit paths', () => {
    renderStep3();

    expect(screen.getByText('This step is optional')).toBeInTheDocument();
    expect(finishButton()).toBeInTheDocument();
    expect(addButton()).toBeInTheDocument();
  });

  it('finishes without a course: only the completion PATCH (no POST /courses), and the terminal state flips (the page redirects on it)', async () => {
    const store = renderStep3();
    mockedUpdateState.mockResolvedValue(completedState);

    await validUser.click(finishButton());

    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledWith({ completed: true }));
    expect(mockedUpdateState).toHaveBeenCalledTimes(1);
    expect(mockedCreateCourse).not.toHaveBeenCalled();
    // The slice's `completed` flip is what drives the page's redirect to
    // /dashboard (SP-107C) — the component never navigates itself.
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
  });

  it('disables the controls while the finish-without-a-course write is in flight', async () => {
    // The completion write never resolves during the test; unmount cleans up.
    mockedUpdateState.mockImplementation(() => new Promise(() => undefined));
    renderStep3();

    const finish = finishButton();
    await validUser.click(finish);

    await waitFor(() => expect(finish).toBeDisabled());
    expect(codeInput()).toBeDisabled();
    expect(nameInput()).toBeDisabled();
    expect(addButton()).toBeDisabled();
  });
});

describe('Step3Course add-course submit (AC-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateCourse.mockResolvedValue(createdCourse);
    mockedUpdateState.mockResolvedValue(completedState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the course attached to the onboarding semester, then records completion (in order)', async () => {
    const store = renderStep3('sem-1');

    // The read-only attachment context (D107-8: no semester picker in M1).
    expect(screen.getByText('Adding to your first semester')).toBeInTheDocument();

    await fillValidForm();
    await validUser.click(addButton());

    await waitFor(() => expect(mockedCreateCourse).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledWith({ completed: true }));

    // The create strictly precedes the completion write.
    const createCall = mockedCreateCourse.mock.invocationCallOrder[0];
    const completeCall = mockedUpdateState.mock.invocationCallOrder[0];
    expect(createCall).toBeLessThan(completeCall);

    // The request body is the form values plus the onboarding semester id.
    expect(mockedCreateCourse).toHaveBeenCalledWith({
      code: 'CS101',
      name: 'Intro to Computer Science',
      semesterId: 'sem-1',
    });

    // The terminal state flips — the page redirects to /dashboard on it.
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
    expect(store.getState().onboarding.error).toBeNull();
  });

  it('creates the course without a semester and adjusts the context line when the state semesterId is null (D107-8 edge)', async () => {
    const store = renderStep3(null);
    mockedUpdateState.mockResolvedValue({ ...completedState, semesterId: null });

    // The context line says the course will be added without a semester.
    expect(await screen.findByText(/will be added without a semester/i)).toBeInTheDocument();

    await fillValidForm();
    await validUser.click(addButton());

    await waitFor(() =>
      expect(mockedCreateCourse).toHaveBeenCalledWith({
        code: 'CS101',
        name: 'Intro to Computer Science',
        semesterId: null,
      })
    );
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
  });
});

describe('Step3Course client validation (AC-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects an empty code and never calls the API', async () => {
    renderStep3();
    await fillValidForm();
    await validUser.clear(codeInput());
    await validUser.click(addButton());

    expect(await screen.findByText('Course code is required')).toBeInTheDocument();
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedCreateCourse).not.toHaveBeenCalled();
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('rejects a code over 20 characters and never calls the API', async () => {
    renderStep3();
    await fillValidForm();
    await validUser.clear(codeInput());
    await validUser.type(codeInput(), 'x'.repeat(21));
    await validUser.click(addButton());

    expect(
      await screen.findByText('Course code must be 20 characters or fewer')
    ).toBeInTheDocument();
    expect(mockedCreateCourse).not.toHaveBeenCalled();
  });

  it('rejects an empty name and never calls the API', async () => {
    renderStep3();
    await fillValidForm();
    await validUser.clear(nameInput());
    await validUser.click(addButton());

    expect(await screen.findByText('Course name is required')).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedCreateCourse).not.toHaveBeenCalled();
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('rejects a name over 100 characters and never calls the API', async () => {
    renderStep3();
    await fillValidForm();
    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'x'.repeat(101));
    await validUser.click(addButton());

    expect(
      await screen.findByText('Course name must be 100 characters or fewer')
    ).toBeInTheDocument();
    expect(mockedCreateCourse).not.toHaveBeenCalled();
  });
});

describe('Step3Course error handling (AC-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateCourse.mockResolvedValue(createdCourse);
    mockedUpdateState.mockResolvedValue(completedState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a 400 errors map under the matching fields and never completes', async () => {
    const store = renderStep3();
    await fillValidForm();
    // The shape the shared `httpClient` interceptor rejects with for a
    // field-level 400 (SP-107B: the service throws the `errors` map).
    mockedCreateCourse.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['code must be 20 characters or fewer', 'name must be 100 characters or fewer'],
          error: 'Bad Request',
          errors: {
            code: ['code must be 20 characters or fewer'],
            name: ['name must be 100 characters or fewer'],
          },
        },
      },
      message: ['code must be 20 characters or fewer', 'name must be 100 characters or fewer'],
    });

    await validUser.click(addButton());

    expect(await screen.findByText('code must be 20 characters or fewer')).toBeInTheDocument();
    expect(screen.getByText('name must be 100 characters or fewer')).toBeInTheDocument();
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    // Field-level feedback replaces the toast (no duplication).
    expect(mockedToast.error).not.toHaveBeenCalled();
    expect(mockedUpdateState).not.toHaveBeenCalled();
    expect(store.getState().onboarding.completed).toBe(false);
  });

  it('renders a 409 duplicate code on the code field and never completes', async () => {
    const store = renderStep3();
    await fillValidForm();
    mockedCreateCourse.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          message: 'A course with this code already exists.',
          error: 'Conflict',
        },
      },
      message: 'A course with this code already exists.',
    });

    await validUser.click(addButton());

    expect(await screen.findByText('A course with this code already exists.')).toBeInTheDocument();
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
    expect(mockedUpdateState).not.toHaveBeenCalled();
    expect(store.getState().onboarding.completed).toBe(false);
  });

  it('offers an actionable 404 message (the semester vanished) and a resubmit omits the stale semesterId (D107-8)', async () => {
    const store = renderStep3('sem-1');
    await fillValidForm();
    // The uniform 404: missing or another student's semester are
    // indistinguishable (the repo ownership convention).
    mockedCreateCourse.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Resource not found',
    });

    await validUser.click(addButton());

    // The actionable alert offers the finish-without-a-course path.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/finish without a course/i);
    // The context line switches to the no-semester variant.
    expect(screen.getByText(/will be added without a semester/i)).toBeInTheDocument();
    expect(mockedUpdateState).not.toHaveBeenCalled();
    expect(store.getState().onboarding.completed).toBe(false);

    // A resubmit creates the course without the vanished semester.
    mockedCreateCourse.mockResolvedValue(createdCourse);
    await validUser.click(addButton());

    await waitFor(() =>
      expect(mockedCreateCourse).toHaveBeenLastCalledWith({
        code: 'CS101',
        name: 'Intro to Computer Science',
        semesterId: null,
      })
    );
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
  });

  it('preserves the form values and offers a resubmit retry on a network failure', async () => {
    const store = renderStep3();
    await fillValidForm();
    mockedCreateCourse.mockRejectedValue(new Error('Network Error'));

    await validUser.click(addButton());

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    // The form keeps its values and the submit button re-enables — resubmit
    // is the retry (the course was never created, so re-creating is safe).
    expect(codeInput()).toHaveValue('CS101');
    expect(nameInput()).toHaveValue('Intro to Computer Science');
    expect(addButton()).not.toBeDisabled();
    expect(store.getState().onboarding.completed).toBe(false);

    mockedCreateCourse.mockResolvedValue(createdCourse);
    await validUser.click(addButton());

    await waitFor(() => expect(mockedCreateCourse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledWith({ completed: true }));
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
  });

  it('retries only the completion write when it fails after a successful create (the course is never re-created)', async () => {
    const store = renderStep3();
    mockedUpdateState.mockRejectedValue({
      message: 'We could not save your setup. Try again.',
    });

    await fillValidForm();
    await validUser.click(addButton());

    // The create succeeded; the completion write failed — the slice records
    // the error the shell displays and the form is frozen.
    await waitFor(() =>
      expect(store.getState().onboarding.error).toBe('We could not save your setup. Try again.')
    );
    expect(store.getState().onboarding.completed).toBe(false);
    expect(codeInput()).toBeDisabled();
    expect(nameInput()).toBeDisabled();
    expect(addButton()).toBeDisabled();
    expect(finishButton()).toBeDisabled();

    // The inline retry re-dispatches the completion write only — the course
    // is NOT re-created.
    mockedUpdateState.mockResolvedValue(completedState);
    await validUser.click(retryButton());

    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledTimes(2));
    expect(mockedUpdateState).toHaveBeenLastCalledWith({ completed: true });
    expect(mockedCreateCourse).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
    expect(store.getState().onboarding.error).toBeNull();
  });

  it('disables the controls while the add-course submit is in flight (no duplicate submission)', async () => {
    // The create never resolves during the test; unmount cleans up.
    mockedCreateCourse.mockImplementation(() => new Promise(() => undefined));
    renderStep3();
    await fillValidForm();

    const add = addButton();
    await validUser.click(add);

    await waitFor(() => expect(add).toBeDisabled());
    expect(codeInput()).toBeDisabled();
    expect(nameInput()).toBeDisabled();
    expect(finishButton()).toBeDisabled();
  });
});

describe('Step3Course accessibility and responsiveness (AC-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateCourse.mockResolvedValue(createdCourse);
    mockedUpdateState.mockResolvedValue(completedState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes with the keyboard only: Enter on finish-without-a-course', async () => {
    const store = renderStep3();

    finishButton().focus();
    await validUser.keyboard('{Enter}');

    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledWith({ completed: true }));
    expect(mockedCreateCourse).not.toHaveBeenCalled();
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
  });

  it('completes with the keyboard only: tab to each field, type, tab to add course, Enter', async () => {
    const store = renderStep3();

    // The submit button is the last focusable control in the step content;
    // Enter on it submits the form (native form semantics).
    codeInput().focus();
    await validUser.type(codeInput(), 'CS101');
    await validUser.tab();
    expect(nameInput()).toHaveFocus();
    await validUser.type(nameInput(), 'Intro to Computer Science');
    await validUser.tab();
    expect(finishButton()).toHaveFocus();
    await validUser.tab();
    expect(addButton()).toHaveFocus();
    await validUser.keyboard('{Enter}');

    await waitFor(() => expect(mockedCreateCourse).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedUpdateState).toHaveBeenCalledWith({ completed: true }));
    await waitFor(() => expect(store.getState().onboarding.completed).toBe(true));
  });

  it('exposes labeled, focusable controls with visible focus styling', () => {
    renderStep3();

    for (const input of [codeInput(), nameInput()]) {
      input.focus();
      expect(input).toHaveFocus();
      // The shared `Input` renders the focus ring classes.
      expect(input).toHaveClass('focus:ring-2');
    }
    expect(addButton()).toBeEnabled();
    expect(finishButton()).toBeEnabled();
  });

  it('stacks the action buttons on mobile and places them side-by-side on desktop (responsive class contract)', () => {
    renderStep3();

    // The shared `Button` wraps each control, so locate the responsive
    // container by its class contract rather than by parent depth.
    const actionRow = addButton().closest('[class*="sm:flex-row"]') as HTMLElement;
    expect(actionRow).toHaveClass('flex', 'flex-col-reverse', 'sm:flex-row', 'sm:justify-between');
  });
});
