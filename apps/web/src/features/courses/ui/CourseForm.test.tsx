import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { CourseForm } from './CourseForm';
import {
  createCourse,
  updateCourse,
  type CourseWithSemester,
} from '@/entities/course/api/courseApi';
import type { SemesterWithCount } from '@/entities/semester/api/semesterApi';

vi.mock('@/entities/course/api/courseApi', () => ({
  createCourse: vi.fn(),
  listCourses: vi.fn(),
  getCourse: vi.fn(),
  updateCourse: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedCreateCourse = vi.mocked(createCourse);
const mockedUpdateCourse = vi.mocked(updateCourse);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** The student's own semesters for the picker (the active one marked). */
const semesters: SemesterWithCount[] = [
  {
    id: 'sem-1',
    name: 'Fall 2026',
    startDate: '2026-09-01',
    endDate: '2026-12-15',
    isActive: true,
    courseCount: 2,
    ...timestamps,
  },
  {
    id: 'sem-2',
    name: 'Spring 2026',
    startDate: '2026-01-05',
    endDate: '2026-05-10',
    isActive: false,
    courseCount: 1,
    ...timestamps,
  },
];

/** A fully-populated course (the edit prefill fixture). */
const editingCourse: CourseWithSemester = {
  id: 'course-1',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: 'Algorithms.',
  color: '#6366f1',
  credits: 4,
  instructor: 'Ada Lovelace',
  isActive: true,
  semesterId: 'sem-1',
  semester: { id: 'sem-1', name: 'Fall 2026' },
  ...timestamps,
};

const validUser = userEvent.setup();

const codeInput = () => screen.getByLabelText(/course code/i);
const nameInput = () => screen.getByLabelText(/course name/i);
const semesterSelect = () => screen.getByLabelText(/semester/i);
const instructorInput = () => screen.getByLabelText(/instructor/i);
const creditsInput = () => screen.getByLabelText(/credits/i);
const colorInput = () => screen.getByLabelText(/color/i);
const descriptionInput = () => screen.getByLabelText(/description/i);
const submitButton = () => screen.getByRole('button', { name: /create course|save changes/i });
const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });

const renderForm = (mode: 'create' | 'edit' = 'create') => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  render(
    mode === 'create' ? (
      <CourseForm mode="create" semesters={semesters} onSuccess={onSuccess} onClose={onClose} />
    ) : (
      <CourseForm
        mode="edit"
        course={editingCourse}
        semesters={semesters}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    )
  );
  return { onSuccess, onClose };
};

/** Fills the (create) form with valid values. */
const fillValidForm = async () => {
  await validUser.type(codeInput(), 'CS101');
  await validUser.type(nameInput(), 'Intro to Computer Science');
  await validUser.selectOptions(semesterSelect(), 'sem-1');
  await validUser.type(instructorInput(), 'Ada Lovelace');
  await validUser.type(creditsInput(), '4');
  // Color is prefilled with the indigo default on create — left untouched.
};

describe('CourseForm create mode (AC 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateCourse.mockResolvedValue(editingCourse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the create heading with empty optional fields (color prefilled with the indigo default)', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add a course');
    expect(codeInput()).toHaveValue('');
    expect(nameInput()).toHaveValue('');
    expect(semesterSelect()).toHaveValue('');
    expect(instructorInput()).toHaveValue('');
    expect(creditsInput()).toHaveValue('');
    expect(colorInput()).toHaveValue('#6366f1');
    expect(descriptionInput()).toHaveValue('');
  });

  it('marks the active semester in the picker (only the student own semesters are offered)', () => {
    renderForm();

    const options = Array.from(semesterSelect().querySelectorAll('option'));
    expect(options).toHaveLength(3); // "No semester" + the two semesters
    expect(options[0]).toHaveTextContent('No semester');
    expect(options[1]).toHaveTextContent('Fall 2026 (active)');
    expect(options[2]).toHaveTextContent('Spring 2026');
    expect(options[0]).not.toBeDisabled(); // create: unaffiliated is allowed
  });

  it('submits POST /courses with the form values (blanks become null) and reports success', async () => {
    const { onSuccess } = renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    await waitFor(() =>
      expect(mockedCreateCourse).toHaveBeenCalledWith({
        code: 'CS101',
        name: 'Intro to Computer Science',
        semesterId: 'sem-1',
        instructor: 'Ada Lovelace',
        description: null,
        credits: 4,
        color: '#6366f1',
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Intro to Computer Science'));
  });

  it('creates a course without a semester when the picker stays on "No semester"', async () => {
    const { onSuccess } = renderForm();
    await validUser.type(codeInput(), 'MATH101');
    await validUser.type(nameInput(), 'Calculus I');
    await validUser.click(submitButton());

    await waitFor(() =>
      expect(mockedCreateCourse).toHaveBeenCalledWith({
        code: 'MATH101',
        name: 'Calculus I',
        semesterId: null,
        instructor: null,
        description: null,
        credits: null,
        color: '#6366f1',
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Calculus I'));
  });

  it.each([
    [
      'an empty code',
      async () => {
        await fillValidForm();
        await validUser.clear(codeInput());
      },
      'Course code is required',
    ],
    [
      'a code over 20 characters',
      async () => {
        await fillValidForm();
        await validUser.clear(codeInput());
        await validUser.type(codeInput(), 'x'.repeat(21));
      },
      'Course code must be 20 characters or fewer',
    ],
    [
      'an empty name',
      async () => {
        await fillValidForm();
        await validUser.clear(nameInput());
      },
      'Course name is required',
    ],
    [
      'a name over 100 characters',
      async () => {
        await fillValidForm();
        await validUser.clear(nameInput());
        await validUser.type(nameInput(), 'x'.repeat(101));
      },
      'Course name must be 100 characters or fewer',
    ],
    [
      'credits of 0',
      async () => {
        await fillValidForm();
        await validUser.clear(creditsInput());
        await validUser.type(creditsInput(), '0');
      },
      'Credits must be greater than 0 and at most 30',
    ],
    [
      'credits over 30',
      async () => {
        await fillValidForm();
        await validUser.clear(creditsInput());
        await validUser.type(creditsInput(), '31');
      },
      'Credits must be greater than 0 and at most 30',
    ],
    [
      'non-numeric credits',
      async () => {
        await fillValidForm();
        await validUser.clear(creditsInput());
        await validUser.type(creditsInput(), 'abc');
      },
      'Credits must be greater than 0 and at most 30',
    ],
    [
      'a color that is not #rrggbb',
      async () => {
        await fillValidForm();
        await validUser.clear(colorInput());
        await validUser.type(colorInput(), 'red');
      },
      'Color must be a #rrggbb hex color',
    ],
    [
      'a short hex color',
      async () => {
        await fillValidForm();
        await validUser.clear(colorInput());
        await validUser.type(colorInput(), '#ff00');
      },
      'Color must be a #rrggbb hex color',
    ],
    [
      'a whitespace-only instructor',
      async () => {
        await fillValidForm();
        await validUser.clear(instructorInput());
        await validUser.type(instructorInput(), '   ');
      },
      'Instructor must not be empty and must be 100 characters or fewer',
    ],
    [
      'an instructor over 100 characters',
      async () => {
        await fillValidForm();
        await validUser.clear(instructorInput());
        await validUser.type(instructorInput(), 'x'.repeat(101));
      },
      'Instructor must not be empty and must be 100 characters or fewer',
    ],
    [
      'a description over 2000 characters',
      async () => {
        await fillValidForm();
        await validUser.type(descriptionInput(), 'x'.repeat(2001));
      },
      'Description must be 2000 characters or fewer',
    ],
  ])('rejects %s client-side and never calls the API', async (_label, setup, message) => {
    renderForm();
    await setup();
    await validUser.click(submitButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mockedCreateCourse).not.toHaveBeenCalled();
  });

  it('renders a 400 `errors` map under the matching fields without a toast (AC 3)', async () => {
    mockedCreateCourse.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['code must not be empty and must be 20 characters or fewer'],
          error: 'Bad Request',
          errors: { code: ['code must not be empty and must be 20 characters or fewer'] },
        },
      },
      message: ['code must not be empty and must be 20 characters or fewer'],
    });
    renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    expect(
      await screen.findByText('code must not be empty and must be 20 characters or fewer')
    ).toBeInTheDocument();
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('renders a 409 duplicate code as an actionable form-level message without a toast (AC 3)', async () => {
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
    renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A course with this code already exists.'
    );
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('renders a 404 (the semester vanished) as an actionable form-level message with recovery guidance (AC 3)', async () => {
    mockedCreateCourse.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Resource not found',
    });
    renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Resource not found');
    expect(alert).toHaveTextContent(/choose a different semester/i);
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('toasts a sanitized message on a network failure and keeps the form values for a resubmit', async () => {
    mockedCreateCourse.mockRejectedValue(new Error('Network Error'));
    const { onSuccess } = renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(codeInput()).toHaveValue('CS101');
    expect(nameInput()).toHaveValue('Intro to Computer Science');

    // Resubmit is the retry.
    mockedCreateCourse.mockResolvedValue(editingCourse);
    await validUser.click(submitButton());
    await waitFor(() => expect(mockedCreateCourse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Intro to Computer Science'));
  });

  it('disables the controls while the request is in flight (no duplicate submission)', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedCreateCourse.mockImplementation(() => new Promise(() => undefined));
    renderForm();
    await fillValidForm();

    const submit = submitButton();
    await validUser.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(cancelButton()).toBeDisabled();
    expect(codeInput()).toBeDisabled();
    expect(nameInput()).toBeDisabled();
    expect(semesterSelect()).toBeDisabled();
    expect(instructorInput()).toBeDisabled();
    expect(creditsInput()).toBeDisabled();
    expect(colorInput()).toBeDisabled();
    expect(descriptionInput()).toBeDisabled();
  });

  it('closes without a request on Cancel', async () => {
    const { onClose } = renderForm();
    await validUser.click(cancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedCreateCourse).not.toHaveBeenCalled();
  });
});

describe('CourseForm edit mode (AC 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateCourse.mockResolvedValue(editingCourse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills every field from the course (incl. instructor and semester) and PATCHes the partial merge', async () => {
    const { onSuccess } = renderForm('edit');

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Edit Intro to Computer Science'
    );
    expect(codeInput()).toHaveValue('CS101');
    expect(nameInput()).toHaveValue('Intro to Computer Science');
    expect(semesterSelect()).toHaveValue('sem-1');
    expect(instructorInput()).toHaveValue('Ada Lovelace');
    expect(creditsInput()).toHaveValue('4');
    expect(colorInput()).toHaveValue('#6366f1');
    expect(descriptionInput()).toHaveValue('Algorithms.');

    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'Intro to CS (updated)');
    await validUser.click(submitButton());

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith('course-1', {
        code: 'CS101',
        name: 'Intro to CS (updated)',
        semesterId: 'sem-1',
        instructor: 'Ada Lovelace',
        description: 'Algorithms.',
        credits: 4,
        color: '#6366f1',
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Intro to CS (updated)'));
  });

  it('sends null for blanked optional fields (the backend keeps the stored value — F111B-1)', async () => {
    const { onSuccess } = renderForm('edit');

    await validUser.clear(instructorInput());
    await validUser.clear(creditsInput());
    await validUser.clear(colorInput());
    await validUser.click(submitButton());

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith('course-1', {
        code: 'CS101',
        name: 'Intro to Computer Science',
        semesterId: 'sem-1',
        instructor: null,
        description: 'Algorithms.',
        credits: null,
        color: null,
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Intro to Computer Science'));
  });

  it('sends an empty string for a blanked description (the backend clears it — F111B-1)', async () => {
    renderForm('edit');

    await validUser.clear(descriptionInput());
    await validUser.click(submitButton());

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ description: '' })
      )
    );
  });

  it('disables "No semester" when the course is attached (the backend cannot detach — D111B-3)', () => {
    renderForm('edit');

    const noSemester = semesterSelect().querySelector('option[value=""]') as HTMLOptionElement;
    expect(noSemester).toBeDisabled();
  });

  it('keeps "No semester" selectable for an unaffiliated course', () => {
    const { unmount } = render(
      <CourseForm
        mode="edit"
        course={{ ...editingCourse, semesterId: null, semester: null }}
        semesters={semesters}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const noSemester = screen
      .getByLabelText(/semester/i)
      .querySelector('option[value=""]') as HTMLOptionElement;
    expect(noSemester).not.toBeDisabled();
    unmount();
  });

  it('applies the same client validation as create (a whitespace-only instructor)', async () => {
    mockedUpdateCourse.mockReset();
    renderForm('edit');

    await validUser.clear(instructorInput());
    await validUser.type(instructorInput(), '   ');
    await validUser.click(submitButton());

    expect(
      await screen.findByText('Instructor must not be empty and must be 100 characters or fewer')
    ).toBeInTheDocument();
    expect(mockedUpdateCourse).not.toHaveBeenCalled();
  });
});

describe('CourseForm dialog behavior (AC 6, D111B-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateCourse.mockResolvedValue(editingCourse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a modal dialog that takes focus on open and returns it to the trigger on close', () => {
    // Simulate the trigger (the "New course" button) holding focus.
    const trigger = document.createElement('button');
    trigger.textContent = 'New course trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const view = render(
      <CourseForm mode="create" semesters={semesters} onSuccess={vi.fn()} onClose={vi.fn()} />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // The first focusable (the code input) receives focus on open.
    expect(codeInput()).toHaveFocus();

    // Close through the component's own Escape handler…
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    // …and the parent unmounts the dialog: the effect cleanup returns focus
    // to the trigger that opened it.
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('traps Tab focus inside the dialog (focus trap)', async () => {
    renderForm();

    // From the first focusable (code), Shift+Tab wraps to the last (submit)…
    codeInput().focus();
    await validUser.keyboard('{Shift>}{Tab}{/Shift}');
    expect(submitButton()).toHaveFocus();
    // …and Tab from the last wraps back to the first.
    await validUser.tab();
    expect(codeInput()).toHaveFocus();
  });

  it('closes on Escape without sending a request', async () => {
    const { onClose } = renderForm();
    await validUser.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedCreateCourse).not.toHaveBeenCalled();
  });

  it('completes with the keyboard only: tab to each field, type, tab to submit, Enter', async () => {
    const { onSuccess } = renderForm();

    // Focus is on the code input after open.
    expect(codeInput()).toHaveFocus();
    await validUser.type(codeInput(), 'CS101');
    await validUser.tab();
    expect(nameInput()).toHaveFocus();
    await validUser.type(nameInput(), 'Intro to Computer Science');
    await validUser.tab();
    expect(semesterSelect()).toHaveFocus();
    await validUser.tab();
    expect(instructorInput()).toHaveFocus();
    await validUser.tab();
    expect(creditsInput()).toHaveFocus();
    await validUser.tab();
    expect(colorInput()).toHaveFocus();
    await validUser.tab();
    expect(descriptionInput()).toHaveFocus();
    await validUser.tab();
    expect(cancelButton()).toHaveFocus();
    await validUser.tab();
    expect(submitButton()).toHaveFocus();
    await validUser.keyboard('{Enter}');

    await waitFor(() => expect(mockedCreateCourse).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Intro to Computer Science'));
  });

  it('exposes labeled, focusable controls with visible focus styling', () => {
    renderForm();
    for (const input of [
      codeInput(),
      nameInput(),
      instructorInput(),
      creditsInput(),
      colorInput(),
    ]) {
      input.focus();
      expect(input).toHaveFocus();
      expect(input).toHaveClass('focus:ring-2');
    }
    expect(semesterSelect()).toBeEnabled();
    expect(descriptionInput()).toBeEnabled();
    expect(submitButton()).toBeEnabled();
  });

  it('stacks the action buttons on mobile and places them side-by-side on desktop (responsive class contract)', () => {
    renderForm();

    const actionRow = submitButton().closest('[class*="sm:flex-row"]') as HTMLElement;
    expect(actionRow).toHaveClass('flex', 'flex-col-reverse', 'sm:flex-row');
  });
});
