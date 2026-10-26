import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { DeleteAssignmentDialog } from './DeleteAssignmentDialog';
import { deleteAssignment } from '@/entities/assignment/api/assignmentApi';
import type { CourseAssignment } from '@/shared/types/academic';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
}));

const mockedDeleteAssignment = vi.mocked(deleteAssignment);

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

const assignment: CourseAssignment = {
  id: 'assignment-1',
  title: 'Problem Set 4',
  description: 'Math exercises',
  dueDate: '2026-10-24T12:00:00.000Z',
  estimatedHours: 3,
  actualHours: null,
  status: 'PENDING',
  priority: 'MEDIUM',
  type: null,
  subtasks: [],
  ...timestamps,
};

const validUser = setupUser();

const renderDialog = () => {
  const onDeleted = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <DeleteAssignmentDialog assignment={assignment} onDeleted={onDeleted} onCancel={onCancel} />
  );
  return { onDeleted, onCancel, unmount: view.unmount };
};

const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const deleteButton = () => screen.getByRole('button', { name: 'Delete Problem Set 4' });

describe('DeleteAssignmentDialog (AC 6, AC 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeleteAssignment.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders confirmation copy with assignment title', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Delete Problem Set 4?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'This permanently deletes the assignment. Any subtasks will remain without an assignment.'
    );
  });

  it('focuses Cancel button on mount', () => {
    renderDialog();

    expect(cancelButton()).toHaveFocus();
  });

  it('traps Tab key between Cancel and Delete buttons', async () => {
    renderDialog();

    await validUser.tab();
    expect(deleteButton()).toHaveFocus();
    await validUser.tab();
    expect(cancelButton()).toHaveFocus();

    await validUser.keyboard('{Shift>}{Tab}{/Shift}');
    expect(deleteButton()).toHaveFocus();
  });

  it('cancels on Escape and backdrop click', async () => {
    const { onCancel } = renderDialog();

    await validUser.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDeleteAssignment).not.toHaveBeenCalled();

    // Click backdrop (aria-hidden overlay)
    const backdrop = document.querySelector('.bg-secondary-900\\/50') as HTMLElement;
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('calls deleteAssignment on confirm', async () => {
    const { onDeleted } = renderDialog();

    await validUser.click(deleteButton());

    await waitFor(() => expect(mockedDeleteAssignment).toHaveBeenCalledWith('assignment-1'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('disables buttons and shows spinner while request in flight', async () => {
    mockedDeleteAssignment.mockImplementation(() => new Promise(() => undefined));
    renderDialog();

    await validUser.click(deleteButton());

    await waitFor(() => expect(deleteButton()).toBeDisabled());
    expect(cancelButton()).toBeDisabled();

    // Escape is ignored while the request is in flight
    await validUser.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('contains Tab and Shift+Tab while delete is pending, ignores Escape, and recovers after rejection', async () => {
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'Background action';
    document.body.appendChild(outside);

    let rejectDelete!: (reason: unknown) => void;
    mockedDeleteAssignment.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDelete = reject;
        })
    );
    const { onCancel, onDeleted } = renderDialog();

    await validUser.click(deleteButton());
    await waitFor(() => expect(deleteButton()).toBeDisabled());

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();

    await validUser.tab();
    expect(outside).not.toHaveFocus();
    expect(dialog).toHaveFocus();

    await validUser.keyboard('{Shift>}{Tab}{/Shift}');
    expect(outside).not.toHaveFocus();
    expect(dialog).toHaveFocus();

    // Focus that has already left is pulled back on the next Tab.
    outside.focus();
    expect(outside).toHaveFocus();
    await validUser.tab();
    expect(outside).not.toHaveFocus();
    expect(dialog).toHaveFocus();

    await validUser.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();
    expect(mockedDeleteAssignment).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectDelete(new Error('Network Error'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');
    expect(deleteButton()).toBeEnabled();
    expect(cancelButton()).toBeEnabled();
    expect(onDeleted).not.toHaveBeenCalled();

    outside.focus();
    await validUser.tab();
    expect(outside).not.toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await validUser.keyboard('{Shift>}{Tab}{/Shift}');
    expect(outside).not.toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    mockedDeleteAssignment.mockResolvedValueOnce(undefined);
    await validUser.click(deleteButton());
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    outside.remove();
  });

  it('displays error alert and permits retry on failure', async () => {
    mockedDeleteAssignment.mockRejectedValueOnce({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Resource not found',
    });
    const { onDeleted } = renderDialog();

    await validUser.click(deleteButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Resource not found');
    expect(deleteButton()).toBeEnabled();
    expect(cancelButton()).toBeEnabled();
    expect(onDeleted).not.toHaveBeenCalled();

    // Retry succeeds
    mockedDeleteAssignment.mockResolvedValueOnce(undefined);
    await validUser.click(deleteButton());
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('returns focus to the trigger element on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Delete trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const view = renderDialog();
    expect(cancelButton()).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(view.onCancel).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('does not restore focus to the trigger after a successful delete', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Delete trigger';
    document.body.appendChild(trigger);
    trigger.focus();
    mockedDeleteAssignment.mockResolvedValueOnce(undefined);

    const view = renderDialog();
    expect(cancelButton()).toHaveFocus();

    await validUser.click(deleteButton());
    await waitFor(() => expect(view.onDeleted).toHaveBeenCalledTimes(1));
    view.unmount();
    expect(trigger).not.toHaveFocus();
    trigger.remove();
  });
});
