import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { createAssignment, updateAssignment } from '@/entities/assignment/api/assignmentApi';
import type { CourseAssignment } from '@/shared/types/academic';
import { AssignmentForm, type AssignmentFormProps } from './AssignmentForm';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const create = vi.mocked(createAssignment);
const update = vi.mocked(updateAssignment);
const submit = () => screen.getByRole('button', { name: 'Create assignment' });
const editSubmit = () => screen.getByRole('button', { name: 'Save changes' });
const title = () => screen.getByLabelText('Title');
const duration = () => screen.getByLabelText('Estimated duration (hours)');
const description = () => screen.getByLabelText('Description');
const renderForm = (props?: Partial<AssignmentFormProps>) => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <Providers initialEntries={['/courses/course-1']}>
      <AssignmentForm courseId="course-1" onSuccess={onSuccess} onClose={onClose} {...props} />
    </Providers>
  );
  return { ...view, onSuccess, onClose };
};
const failure = (statusCode: number, errors?: Record<string, string[]>) => ({
  response: {
    data: {
      statusCode,
      message: statusCode === 404 ? 'Resource not found' : 'Invalid assignment',
      errors,
    },
  },
});
beforeEach(() => {
  vi.resetAllMocks();
});

describe('AssignmentForm', () => {
  it('supports keyboard-only creation and uses the bounded, stacking dialog layout', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('w-full', 'max-w-md', 'max-h-[90vh]', 'overflow-y-auto');
    expect(duration().closest('.grid')).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
    await user.keyboard('Keyboard homework');
    await user.tab();
    expect(screen.getByLabelText('Due date')).toHaveFocus();
    await user.tab();
    expect(duration()).toHaveFocus();
    await user.keyboard('3');
    await user.tab();
    expect(screen.getByLabelText('Priority')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Description')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(submit()).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(create).toHaveBeenCalledWith({
      title: 'Keyboard homework',
      courseId: 'course-1',
      estimatedHours: 3,
      priority: 'MEDIUM',
    });
  });

  it('labels its fields, defaults priority, focuses title, traps Tab both ways and closes on Escape', async () => {
    const user = setupUser();
    const { onClose } = renderForm();
    expect(screen.getByRole('dialog', { name: 'Add an assignment' })).toHaveAttribute(
      'aria-modal',
      'true'
    );
    expect(title()).toHaveFocus();
    expect(screen.getByLabelText('Due date')).toHaveAttribute('type', 'date');
    expect(duration()).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Priority')).toHaveValue('MEDIUM');
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(submit()).toHaveFocus();
    await user.tab();
    expect(title()).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('restores focus to the opening trigger on close', async () => {
    const user = setupUser();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && (
            <AssignmentForm
              courseId="course-1"
              onSuccess={() => setOpen(false)}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      );
    }
    render(
      <Providers initialEntries={['/courses/course-1']}>
        <Harness />
      </Providers>
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it.each([
    ['   ', 'Title is required'],
    ['x'.repeat(201), 'Title must be 200 characters or fewer'],
  ])('rejects invalid title %s', async (value, message) => {
    const user = setupUser();
    renderForm();
    fireEvent.change(title(), { target: { value } });
    await user.click(submit());
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(title()).toHaveAttribute('aria-invalid', 'true');
    expect(title()).toHaveAccessibleDescription(message);
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['0', '-3', '100000'])('rejects invalid estimated duration %s', async (value) => {
    const user = setupUser();
    renderForm();
    await user.type(title(), 'Homework');
    fireEvent.change(duration(), { target: { value } });
    await user.click(submit());
    expect(
      await screen.findByText('Estimated duration must be greater than 0 and at most 1000 hours')
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts a past date and converts date parts to local midnight ISO, with numeric hours and selected priority', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    await user.type(title(), 'Problem Set 4');
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2020-01-12' } });
    fireEvent.change(duration(), { target: { value: '2.5' } });
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
    await user.click(submit());
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: 'Problem Set 4',
        courseId: 'course-1',
        dueDate: new Date(2020, 0, 12).toISOString(),
        estimatedHours: 2.5,
        priority: 'HIGH',
      })
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('omits blank date and duration', async () => {
    const user = setupUser();
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: 'Homework',
        courseId: 'course-1',
        priority: 'MEDIUM',
      })
    );
  });

  it('maps server 400 errors to all four fields', async () => {
    const user = setupUser();
    create.mockRejectedValue(
      failure(400, {
        title: ['Server title'],
        dueDate: ['Server date'],
        estimatedHours: ['Server duration'],
        priority: ['Server priority'],
      })
    );
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    for (const message of ['Server title', 'Server date', 'Server duration', 'Server priority']) {
      expect(await screen.findByText(message)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Priority')).toHaveAttribute('aria-invalid', 'true');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('toasts a 400 that names no form field', async () => {
    const user = setupUser();
    create.mockRejectedValue(failure(400, { status: ['Not supported'] }));
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid assignment'));
  });

  it('offers the course recovery link on 404', async () => {
    const user = setupUser();
    create.mockRejectedValue(failure(404));
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Resource not found — this course may no longer exist.');
    expect(within(alert).getByRole('link', { name: 'Back to courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
  });

  it.each([new Error('Network Error'), failure(500)])(
    'preserves values and enables retry after network/5xx failure',
    async (error) => {
      const user = setupUser();
      create.mockRejectedValueOnce(error);
      const { onSuccess } = renderForm();
      await user.type(title(), 'Homework');
      await user.click(submit());
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('We could not save the assignment. Try again.')
      );
      expect(title()).toHaveValue('Homework');
      expect(submit()).toBeEnabled();
      await user.click(submit());
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    }
  );

  it('disables fields and prevents duplicate requests while in flight; Tab stays inside', async () => {
    const user = setupUser();
    let resolve!: () => void;
    create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = () => done({} as Awaited<ReturnType<typeof createAssignment>>);
        })
    );
    const { onSuccess } = renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    await waitFor(() => expect(submit()).toBeDisabled());
    for (const label of ['Title', 'Due date', 'Estimated duration (hours)', 'Priority'])
      expect(screen.getByLabelText(label)).toBeDisabled();
    await user.tab();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    await user.click(submit());
    expect(create).toHaveBeenCalledOnce();
    await act(async () => resolve());
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  describe('edit mode (AC 3, AC 4, AC 5, D114E-1…6)', () => {
    const sampleAssignment: CourseAssignment = {
      id: 'assignment-1',
      title: 'Problem Set 4',
      description: 'Chapters 1-3 homework',
      dueDate: '2026-10-24T12:00:00.000Z',
      estimatedHours: 3.5,
      actualHours: null,
      status: 'PENDING',
      priority: 'HIGH',
      createdAt: '2026-10-18T12:00:00.000Z',
      updatedAt: '2026-10-18T12:00:00.000Z',
    };

    it('populates initial values in edit mode and switches title, button, and field hints', () => {
      renderForm({ assignment: sampleAssignment });

      expect(
        screen.getByRole('heading', { level: 2, name: 'Edit assignment' })
      ).toBeInTheDocument();
      expect(editSubmit()).toBeInTheDocument();
      expect(title()).toHaveValue('Problem Set 4');
      const d = new Date(sampleAssignment.dueDate!);
      const expectedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      expect(screen.getByLabelText('Due date')).toHaveValue(expectedDate);
      expect(duration()).toHaveValue(3.5);
      expect(screen.getByLabelText('Priority')).toHaveValue('HIGH');
      expect(description()).toHaveValue('Chapters 1-3 homework');

      // Edit-mode hints (D114E-6)
      expect(
        screen.getByText('Optional — leave blank to keep the current due date.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Optional — leave blank to keep the current duration.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Pick a different value to change the priority.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Optional — up to 2000 characters. Leave blank to clear.')
      ).toBeInTheDocument();
    });

    it('submits PATCH request via updateAssignment on edit and handles null semantics for blanks', async () => {
      const user = setupUser();
      update.mockResolvedValue({ ...sampleAssignment, title: 'Updated PS4' });
      const { onSuccess } = renderForm({ assignment: sampleAssignment });

      await user.clear(title());
      await user.type(title(), 'Updated PS4');
      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-11-01' } });
      fireEvent.change(duration(), { target: { value: '5' } });
      await user.selectOptions(screen.getByLabelText('Priority'), 'URGENT');
      await user.clear(description());
      await user.type(description(), 'New instructions');

      await user.click(editSubmit());

      await waitFor(() =>
        expect(update).toHaveBeenCalledWith('assignment-1', {
          title: 'Updated PS4',
          priority: 'URGENT',
          dueDate: new Date(2026, 10, 1).toISOString(),
          estimatedHours: 5,
          description: 'New instructions',
        })
      );
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('sends null for blank due date/duration and empty string for blanked description', async () => {
      const user = setupUser();
      update.mockResolvedValue(sampleAssignment);
      const { onSuccess } = renderForm({ assignment: sampleAssignment });

      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } });
      fireEvent.change(duration(), { target: { value: '' } });
      await user.clear(description());

      await user.click(editSubmit());

      await waitFor(() =>
        expect(update).toHaveBeenCalledWith('assignment-1', {
          title: 'Problem Set 4',
          priority: 'HIGH',
          dueDate: null,
          estimatedHours: null,
          description: '',
        })
      );
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('handles 400 field validation errors on edit', async () => {
      const user = setupUser();
      update.mockRejectedValue(
        failure(400, {
          title: ['Server title error'],
          dueDate: ['Server due date error'],
          estimatedHours: ['Server estimated hours error'],
          priority: ['Server priority error'],
          description: ['Server description error'],
        })
      );
      renderForm({ assignment: sampleAssignment });

      await user.click(editSubmit());

      for (const msg of [
        'Server title error',
        'Server due date error',
        'Server estimated hours error',
        'Server priority error',
        'Server description error',
      ]) {
        expect(await screen.findByText(msg)).toBeInTheDocument();
      }
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('handles 404 not found error on edit', async () => {
      const user = setupUser();
      update.mockRejectedValue(failure(404));
      renderForm({ assignment: sampleAssignment });

      await user.click(editSubmit());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'Resource not found — this course or assignment may no longer exist.'
      );
      expect(within(alert).getByRole('link', { name: 'Back to courses' })).toHaveAttribute(
        'href',
        '/courses'
      );
    });

    it('traps Tab key and closes on Escape in edit mode', async () => {
      const user = setupUser();
      const { onClose } = renderForm({ assignment: sampleAssignment });

      expect(title()).toHaveFocus();
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(editSubmit()).toHaveFocus();
      await user.tab();
      expect(title()).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
