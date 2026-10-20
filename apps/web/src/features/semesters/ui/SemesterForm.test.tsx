import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { SemesterForm } from './SemesterForm';
import {
  createSemester,
  updateSemester,
  type SemesterWithCount,
} from '@/entities/semester/api/semesterApi';

vi.mock('@/entities/semester/api/semesterApi', () => ({
  createSemester: vi.fn(),
  updateSemester: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedCreateSemester = vi.mocked(createSemester);
const mockedUpdateSemester = vi.mocked(updateSemester);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const editingSemester: SemesterWithCount = {
  id: 'sem-1',
  name: 'Fall 2026',
  startDate: '2026-09-01',
  endDate: '2026-12-15',
  isActive: true,
  courseCount: 4,
  createdAt: '2026-10-18T12:00:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
};

const validUser = userEvent.setup();

const nameInput = () => screen.getByLabelText(/semester name/i);
const startDateInput = () => screen.getByLabelText(/start date/i);
const endDateInput = () => screen.getByLabelText(/end date/i);
const submitButton = () => screen.getByRole('button', { name: /create semester|save changes/i });
const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });

const renderForm = (mode: 'create' | 'edit' = 'create') => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  render(
    mode === 'create' ? (
      <SemesterForm mode="create" onSuccess={onSuccess} onClose={onClose} />
    ) : (
      <SemesterForm
        mode="edit"
        semester={editingSemester}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    )
  );
  return { onSuccess, onClose };
};

/**
 * Fills the form with valid values. The name is typed; the native date inputs
 * are set via `change` (jsdom does not implement the date-picker UI, so
 * `userEvent.type` cannot drive the segments — the changed value is what the
 * picker would report for a completed date).
 */
const fillValidForm = async () => {
  await validUser.type(nameInput(), 'Fall 2026');
  fireEvent.change(startDateInput(), { target: { value: '2026-09-01' } });
  fireEvent.change(endDateInput(), { target: { value: '2026-12-15' } });
};

describe('SemesterForm create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateSemester.mockResolvedValue({ ...editingSemester, isActive: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the create heading with empty fields and submits the existing POST /semesters (AC 2)', async () => {
    const { onSuccess } = renderForm();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add a semester');
    expect(nameInput()).toHaveValue('');
    expect(startDateInput()).toHaveValue('');
    expect(endDateInput()).toHaveValue('');

    await fillValidForm();
    await validUser.click(submitButton());

    await waitFor(() =>
      expect(mockedCreateSemester).toHaveBeenCalledWith({
        name: 'Fall 2026',
        startDate: '2026-09-01',
        endDate: '2026-12-15',
      })
    );
    // `isActive` is the row-level action, never a form field (D110-5).
    expect(mockedCreateSemester).not.toHaveBeenCalledWith(
      expect.objectContaining({ isActive: expect.anything() })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Fall 2026'));
  });

  it.each([
    [
      'empty name',
      async () => {
        await fillValidForm();
        await validUser.clear(nameInput());
      },
      'Semester name is required',
    ],
    [
      'a name over 100 characters',
      async () => {
        await fillValidForm();
        await validUser.clear(nameInput());
        await validUser.type(nameInput(), 'x'.repeat(101));
      },
      'Semester name must be 100 characters or fewer',
    ],
    [
      'missing start date',
      async () => {
        await fillValidForm();
        fireEvent.change(startDateInput(), { target: { value: '' } });
      },
      'Start date is required',
    ],
    [
      'missing end date',
      async () => {
        await fillValidForm();
        fireEvent.change(endDateInput(), { target: { value: '' } });
      },
      'End date is required',
    ],
    [
      'end == start',
      async () => {
        await fillValidForm();
        fireEvent.change(endDateInput(), { target: { value: '2026-09-01' } });
      },
      'End date must be after the start date.',
    ],
    [
      'end < start',
      async () => {
        await fillValidForm();
        fireEvent.change(endDateInput(), { target: { value: '2026-08-01' } });
      },
      'End date must be after the start date.',
    ],
  ])('rejects %s client-side and never calls the API', async (_label, setup, message) => {
    renderForm();
    await setup();
    await validUser.click(submitButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mockedCreateSemester).not.toHaveBeenCalled();
  });

  it('renders a field-level 400 `errors` map under the matching inputs without a toast', async () => {
    mockedCreateSemester.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['name must not be empty and must be 100 characters or fewer'],
          error: 'Bad Request',
          errors: {
            name: ['name must not be empty and must be 100 characters or fewer'],
          },
        },
      },
      message: ['name must not be empty and must be 100 characters or fewer'],
    });
    renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    expect(
      await screen.findByText('name must not be empty and must be 100 characters or fewer')
    ).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('renders a 409 duplicate name on the name field without a toast', async () => {
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
    renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    expect(
      await screen.findByText('A semester with this name already exists.')
    ).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('toasts a sanitized message on a non-400/409 failure and keeps the form values for a resubmit', async () => {
    mockedCreateSemester.mockRejectedValue(new Error('Network Error'));
    const { onSuccess } = renderForm();
    await fillValidForm();
    await validUser.click(submitButton());

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(nameInput()).toHaveValue('Fall 2026');
    expect(startDateInput()).toHaveValue('2026-09-01');
    expect(endDateInput()).toHaveValue('2026-12-15');

    // Resubmit is the retry.
    mockedCreateSemester.mockResolvedValue({ ...editingSemester, isActive: false });
    await validUser.click(submitButton());
    await waitFor(() => expect(mockedCreateSemester).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Fall 2026'));
  });

  it('disables the controls while the request is in flight (no duplicate submission)', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedCreateSemester.mockImplementation(() => new Promise(() => undefined));
    renderForm();
    await fillValidForm();

    const submit = submitButton();
    await validUser.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(cancelButton()).toBeDisabled();
    expect(nameInput()).toBeDisabled();
    expect(startDateInput()).toBeDisabled();
    expect(endDateInput()).toBeDisabled();
  });

  it('closes without a request on Cancel', async () => {
    const { onClose } = renderForm();
    await validUser.click(cancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedCreateSemester).not.toHaveBeenCalled();
  });
});

describe('SemesterForm edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateSemester.mockResolvedValue(editingSemester);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills from the semester and PATCHes /semesters/:id with the form values (AC 3)', async () => {
    const { onSuccess } = renderForm('edit');

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Edit Fall 2026');
    expect(nameInput()).toHaveValue('Fall 2026');
    expect(startDateInput()).toHaveValue('2026-09-01');
    expect(endDateInput()).toHaveValue('2026-12-15');

    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'Fall 2026 (updated)');
    await validUser.click(submitButton());

    await waitFor(() =>
      expect(mockedUpdateSemester).toHaveBeenCalledWith('sem-1', {
        name: 'Fall 2026 (updated)',
        startDate: '2026-09-01',
        endDate: '2026-12-15',
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Fall 2026 (updated)'));
  });

  it('applies the same client validation as create (end == start on the pre-filled dates)', async () => {
    mockedUpdateSemester.mockReset();
    const { onSuccess } = renderForm('edit');

    fireEvent.change(endDateInput(), { target: { value: '2026-09-01' } });
    await validUser.click(submitButton());

    expect(await screen.findByText('End date must be after the start date.')).toBeInTheDocument();
    expect(mockedUpdateSemester).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('SemesterForm accessibility and responsiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateSemester.mockResolvedValue({ ...editingSemester, isActive: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes with the keyboard only: tab to each field, type, tab to submit, Enter', async () => {
    const { onSuccess } = renderForm();

    await validUser.tab();
    expect(nameInput()).toHaveFocus();
    await validUser.type(nameInput(), 'Fall 2026');
    await validUser.tab();
    expect(startDateInput()).toHaveFocus();
    fireEvent.change(startDateInput(), { target: { value: '2026-09-01' } });
    await validUser.tab();
    expect(endDateInput()).toHaveFocus();
    fireEvent.change(endDateInput(), { target: { value: '2026-12-15' } });
    // The action row is Cancel → Submit in DOM order (both keyboard stops).
    await validUser.tab();
    expect(cancelButton()).toHaveFocus();
    await validUser.tab();
    expect(submitButton()).toHaveFocus();
    await validUser.keyboard('{Enter}');

    await waitFor(() => expect(mockedCreateSemester).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Fall 2026'));
  });

  it('exposes labeled, focusable controls with visible focus styling', () => {
    renderForm();
    for (const input of [nameInput(), startDateInput(), endDateInput()]) {
      input.focus();
      expect(input).toHaveFocus();
      expect(input).toHaveClass('focus:ring-2');
    }
    expect(submitButton()).toBeEnabled();
  });

  it('stacks the date fields on mobile and places them side-by-side on desktop (responsive class contract)', () => {
    renderForm();

    const dateGrid = startDateInput().closest('[class*="sm:grid-cols-2"]') as HTMLElement;
    expect(dateGrid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2');
    const actionRow = submitButton().closest('[class*="sm:flex-row"]') as HTMLElement;
    expect(actionRow).toHaveClass('flex', 'flex-col-reverse', 'sm:flex-row');
  });
});
