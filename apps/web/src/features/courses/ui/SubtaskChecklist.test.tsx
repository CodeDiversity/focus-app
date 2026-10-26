import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import toast from 'react-hot-toast';
import { setupUser } from '@/test/user';
import { SubtaskChecklist } from './SubtaskChecklist';
import {
  createSubtask,
  deleteSubtask,
  updateSubtask,
} from '@/entities/assignment/api/assignmentApi';
import type { Subtask } from '@/shared/types/academic';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedCreate = vi.mocked(createSubtask);
const mockedUpdate = vi.mocked(updateSubtask);
const mockedDelete = vi.mocked(deleteSubtask);
const mockedToast = vi.mocked(toast);

const timestamps = { createdAt: '2026-10-25T12:00:00.000Z', updatedAt: '2026-10-25T12:00:00.000Z' };

function subtask(overrides: Partial<Subtask> & Pick<Subtask, 'id' | 'title'>): Subtask {
  return {
    status: 'PENDING',
    orderIndex: 0,
    ...timestamps,
    ...overrides,
  };
}

const first = subtask({ id: 's1', title: 'Read chapter', orderIndex: 0 });
const second = subtask({ id: 's2', title: 'Outline notes', orderIndex: 2 });

function renderChecklist(subtasks: Subtask[] = [first, second]) {
  const onChanged = vi.fn();
  const onRefresh = vi.fn();
  const view = render(
    <SubtaskChecklist
      assignmentId="asgn-1"
      assignmentTitle="Problem Set 4"
      subtasks={subtasks}
      onChanged={onChanged}
      onRefresh={onRefresh}
    />
  );
  return { ...view, onChanged, onRefresh };
}

const titleInput = () => screen.getByLabelText('Subtask title');
const addButton = () => screen.getByRole('button', { name: 'Add subtask to Problem Set 4' });

describe('SubtaskChecklist (SP-120J)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreate.mockResolvedValue(subtask({ id: 'new', title: 'Added', orderIndex: 3 }));
    mockedUpdate.mockResolvedValue(first);
    mockedDelete.mockResolvedValue(undefined);
  });

  it('renders subtasks in the given order and does not re-sort', () => {
    renderChecklist([
      subtask({
        id: 'later',
        title: 'Later',
        orderIndex: 5,
        createdAt: '2026-10-25T11:00:00.000Z',
      }),
      subtask({ id: 'earlier', title: 'Earlier', orderIndex: 1 }),
    ]);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Later'),
      expect.stringContaining('Earlier'),
    ]);
    expect(items[0]).toHaveClass('flex', 'flex-col', 'gap-2', 'sm:flex-row', 'sm:items-center');
  });

  it('shows the empty state and the inline add form', () => {
    renderChecklist([]);
    expect(screen.getByText('No subtasks yet.')).toHaveClass('text-sm', 'text-secondary-700');
    expect(titleInput()).toBeInTheDocument();
    expect(addButton()).toBeInTheDocument();
    expect(addButton().closest('form')).toHaveClass(
      'flex',
      'flex-col',
      'gap-2',
      'sm:flex-row',
      'sm:items-end'
    );
  });

  it('adds a trimmed title and omits orderIndex and status', async () => {
    const user = setupUser();
    const { onChanged, onRefresh } = renderChecklist([]);
    await user.type(titleInput(), '  Read chapter  ');
    await user.click(addButton());
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith('asgn-1', { title: 'Read chapter' })
    );
    expect(mockedCreate.mock.calls[0]?.[1]).toEqual({ title: 'Read chapter' });
    expect(onChanged).toHaveBeenCalledWith('added');
    expect(onRefresh).not.toHaveBeenCalled();
    expect(titleInput()).toHaveValue('');
    expect(titleInput()).toHaveFocus();
  });

  it('submits the add form with Enter', async () => {
    const user = setupUser();
    renderChecklist([]);
    await user.type(titleInput(), 'Outline{Enter}');
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith('asgn-1', { title: 'Outline' }));
  });

  it.each([
    ['', 'Title is required'],
    ['   ', 'Title is required'],
    ['a'.repeat(201), 'Title must be 200 characters or fewer'],
  ])('rejects %j before calling the API (%s)', async (value, message) => {
    const user = setupUser();
    renderChecklist([]);
    if (value) fireEvent.change(titleInput(), { target: { value } });
    await user.click(addButton());
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(titleInput()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders a title 400 on the input and does not toast', async () => {
    const user = setupUser();
    mockedCreate.mockRejectedValueOnce({
      response: {
        data: {
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
          errors: { title: ['Title must be 200 characters or fewer'] },
        },
      },
    });
    renderChecklist([]);
    await user.type(titleInput(), 'Read chapter');
    await user.click(addButton());
    expect(await screen.findByText('Title must be 200 characters or fewer')).toBeInTheDocument();
    expect(titleInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('toasts a network failure and the empty-message fallback', async () => {
    const user = setupUser();
    const { onChanged, onRefresh } = renderChecklist([]);
    mockedCreate.mockRejectedValueOnce(new Error('Network Error'));
    await user.type(titleInput(), 'Read chapter');
    await user.click(addButton());
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    expect(onChanged).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();

    mockedCreate.mockRejectedValueOnce(new Error(''));
    await user.click(addButton());
    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith('We could not add the subtask. Try again.')
    );
  });

  it('toggles with a click and with Space, sending only status', async () => {
    const user = setupUser();
    const { onChanged, rerender } = renderChecklist([first]);
    await user.click(screen.getByRole('checkbox', { name: 'Read chapter' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('asgn-1', 's1', { status: 'COMPLETED' })
    );
    expect(onChanged).toHaveBeenCalledWith('completed');
    expect(screen.getByText('Read chapter')).toHaveClass('font-medium', 'text-secondary-900');
    expect(screen.getByText('Read chapter').className).not.toMatch(/line-through/);
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();

    rerender(
      <SubtaskChecklist
        assignmentId="asgn-1"
        assignmentTitle="Problem Set 4"
        subtasks={[{ ...first, status: 'COMPLETED' }]}
        onChanged={onChanged}
        onRefresh={vi.fn()}
      />
    );
    const box = screen.getByRole('checkbox', { name: 'Read chapter' });
    expect(box).toBeChecked();
    box.focus();
    await user.keyboard(' ');
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenLastCalledWith('asgn-1', 's1', { status: 'PENDING' })
    );
    expect(onChanged).toHaveBeenCalledWith('reopened');
  });

  it('swaps orderIndex with two PATCHes and disables the end buttons', async () => {
    const user = setupUser();
    const { onChanged, onRefresh } = renderChecklist();
    expect(screen.getByRole('button', { name: 'Move Read chapter up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Outline notes down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Read chapter down' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Move Read chapter down' }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(2));
    expect(mockedUpdate).toHaveBeenNthCalledWith(1, 'asgn-1', 's1', { orderIndex: 2 });
    expect(mockedUpdate).toHaveBeenNthCalledWith(2, 'asgn-1', 's2', { orderIndex: 0 });
    expect(onChanged).toHaveBeenCalledWith('moved');
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();

    mockedUpdate.mockClear();
    onChanged.mockClear();
    await user.click(screen.getByRole('button', { name: 'Move Outline notes up' }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(2));
    expect(mockedUpdate).toHaveBeenNthCalledWith(1, 'asgn-1', 's2', { orderIndex: 0 });
    expect(mockedUpdate).toHaveBeenNthCalledWith(2, 'asgn-1', 's1', { orderIndex: 2 });
    expect(onChanged).toHaveBeenCalledWith('moved');
  });

  it('disables both move buttons when the subtask is alone', () => {
    renderChecklist([first]);
    expect(screen.getByRole('button', { name: 'Move Read chapter up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Read chapter down' })).toBeDisabled();
  });

  it('places an equal orderIndex on the requested side with one PATCH', async () => {
    const user = setupUser();
    const tied = [
      subtask({ id: 's1', title: 'Read chapter', orderIndex: 1 }),
      subtask({ id: 's2', title: 'Outline notes', orderIndex: 1 }),
    ];
    const up = renderChecklist(tied);
    await user.click(screen.getByRole('button', { name: 'Move Outline notes up' }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate).toHaveBeenCalledWith('asgn-1', 's2', { orderIndex: 0 });
    expect(up.onChanged).toHaveBeenCalledWith('moved');
    up.unmount();

    mockedUpdate.mockClear();
    const zeros = renderChecklist([
      subtask({ id: 's1', title: 'Read chapter', orderIndex: 0 }),
      subtask({ id: 's2', title: 'Outline notes', orderIndex: 0 }),
    ]);
    await user.click(screen.getByRole('button', { name: 'Move Outline notes up' }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate).toHaveBeenCalledWith('asgn-1', 's1', { orderIndex: 1 });
    zeros.unmount();

    mockedUpdate.mockClear();
    renderChecklist(tied);
    await user.click(screen.getByRole('button', { name: 'Move Read chapter down' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('asgn-1', 's1', { orderIndex: 2 })
    );
  });

  it('refetches without a success sentence when the second reorder PATCH fails', async () => {
    const user = setupUser();
    mockedUpdate.mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('Network Error'));
    const { onChanged, onRefresh } = renderChecklist();
    await user.click(screen.getByRole('button', { name: 'Move Read chapter down' }));
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('does not refetch when the first reorder PATCH fails', async () => {
    const user = setupUser();
    mockedUpdate.mockRejectedValueOnce(new Error(''));
    const { onChanged, onRefresh } = renderChecklist();
    await user.click(screen.getByRole('button', { name: 'Move Read chapter down' }));
    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith('We could not move the subtask. Try again.')
    );
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
  });

  it('opens delete and does not call DELETE until confirm', async () => {
    const user = setupUser();
    const { onChanged } = renderChecklist([first]);
    await user.click(screen.getByRole('button', { name: 'Delete Read chapter' }));
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Delete Read chapter?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete Read chapter' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete Read chapter' }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('asgn-1', 's1'));
    expect(onChanged).toHaveBeenCalledWith('deleted');
  });

  it('disables that checklist’s controls while a mutation is in flight', async () => {
    const user = setupUser();
    mockedCreate.mockImplementation(() => new Promise(() => undefined));
    renderChecklist([first]);
    await user.type(titleInput(), 'Next step');
    await user.click(addButton());
    await waitFor(() => expect(addButton()).toBeDisabled());
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('checkbox', { name: 'Read chapter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Read chapter up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Read chapter down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Read chapter' })).toBeDisabled();
    expect(titleInput()).toBeDisabled();
  });

  it('focuses the still-enabled move button after the refetch lands', async () => {
    const user = setupUser();
    const { onChanged, rerender } = renderChecklist();
    await user.click(screen.getByRole('button', { name: 'Move Read chapter down' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('moved'));
    rerender(
      <SubtaskChecklist
        assignmentId="asgn-1"
        assignmentTitle="Problem Set 4"
        subtasks={[second, first]}
        onChanged={onChanged}
        onRefresh={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Move Read chapter up' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Move Read chapter down' })).toBeDisabled();
  });
});
