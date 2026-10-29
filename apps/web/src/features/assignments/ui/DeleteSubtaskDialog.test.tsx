import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { DeleteSubtaskDialog } from './DeleteSubtaskDialog';
import { deleteSubtask } from '@/entities/assignment/api/assignmentApi';
import type { Subtask } from '@/shared/types/academic';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  deleteSubtask: vi.fn(),
}));

const mockedDelete = vi.mocked(deleteSubtask);

const subtask: Subtask = {
  id: 'sub-1',
  title: 'Read chapter 1',
  status: 'PENDING',
  orderIndex: 0,
  createdAt: '2026-10-25T12:00:00.000Z',
  updatedAt: '2026-10-25T12:00:00.000Z',
};

const user = setupUser();

const renderDialog = () => {
  const onDeleted = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <DeleteSubtaskDialog
      assignmentId="asgn-1"
      subtask={subtask}
      onDeleted={onDeleted}
      onCancel={onCancel}
    />
  );
  return { onDeleted, onCancel, unmount: view.unmount };
};

const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const deleteButton = () => screen.getByRole('button', { name: 'Delete Read chapter 1' });

describe('DeleteSubtaskDialog (SP-120J AC 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the subtask and states the effect', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'Delete Read chapter 1?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('This permanently deletes the subtask.');
    expect(screen.getByRole('dialog')).not.toHaveTextContent('without an assignment');
  });

  it('focuses Cancel first and sends nothing on Cancel or Escape', async () => {
    const { onCancel } = renderDialog();
    expect(cancelButton()).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDelete).not.toHaveBeenCalled();

    const backdrop = document.querySelector('.bg-text\\/50') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('calls deleteSubtask and onDeleted only after confirm', async () => {
    const { onDeleted } = renderDialog();
    await user.click(deleteButton());
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('asgn-1', 'sub-1'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('disables both buttons while the request is in flight', async () => {
    mockedDelete.mockImplementation(() => new Promise(() => undefined));
    renderDialog();
    await user.click(deleteButton());
    await waitFor(() => expect(deleteButton()).toBeDisabled());
    expect(cancelButton()).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders a role=alert on failure and does not call onDeleted', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('Network Error'));
    const { onDeleted } = renderDialog();
    await user.click(deleteButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');
    expect(onDeleted).not.toHaveBeenCalled();
    expect(deleteButton()).toBeEnabled();
    expect(cancelButton()).toBeEnabled();
  });

  it('uses the fallback sentence when the error message is empty', async () => {
    mockedDelete.mockRejectedValueOnce(new Error(''));
    renderDialog();
    await user.click(deleteButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not delete the subtask. Try again.'
    );
  });

  it('keeps Tab inside the dialog while delete is pending', async () => {
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'Background action';
    document.body.appendChild(outside);
    let rejectDelete!: (reason: unknown) => void;
    mockedDelete.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDelete = reject;
        })
    );
    const { onCancel, onDeleted } = renderDialog();
    await user.click(deleteButton());
    await waitFor(() => expect(deleteButton()).toBeDisabled());
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
    await user.tab();
    expect(outside).not.toHaveFocus();
    expect(dialog).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => {
      rejectDelete(new Error('Network Error'));
    });
    expect(onDeleted).not.toHaveBeenCalled();
    outside.remove();
  });
});
