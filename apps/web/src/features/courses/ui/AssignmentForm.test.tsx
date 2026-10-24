import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { createAssignment } from '@/entities/assignment/api/assignmentApi';
import { AssignmentForm } from './AssignmentForm';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({ createAssignment: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const create = vi.mocked(createAssignment);
const submit = () => screen.getByRole('button', { name: 'Create assignment' });
const title = () => screen.getByLabelText('Title');
const duration = () => screen.getByLabelText('Estimated duration (hours)');
const renderForm = () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <Providers initialEntries={['/courses/course-1']}>
      <AssignmentForm courseId="course-1" onSuccess={onSuccess} onClose={onClose} />
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
});
