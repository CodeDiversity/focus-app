import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteSemesterDialog } from './DeleteSemesterDialog';
import { deleteSemester, type SemesterWithCount } from '@/entities/semester/api/semesterApi';

vi.mock('@/entities/semester/api/semesterApi', () => ({
  deleteSemester: vi.fn(),
}));

const mockedDeleteSemester = vi.mocked(deleteSemester);

const semester: SemesterWithCount = {
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

const renderDialog = () => {
  const onDeleted = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <DeleteSemesterDialog semester={semester} onDeleted={onDeleted} onCancel={onCancel} />
  );
  return { onDeleted, onCancel, unmount: view.unmount };
};

const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const confirmButton = () => screen.getByRole('button', { name: /delete fall 2026/i });

describe('DeleteSemesterDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeleteSemester.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the semester and warns that its courses remain, unaffiliated (D110-2)', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Delete Fall 2026?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(/its courses will not be deleted/i);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      /remain in your account, unaffiliated with any semester/i
    );
  });

  it('moves focus into the dialog on open (the safe action) and returns it to the trigger on close', () => {
    // Simulate the trigger (the row's Delete button) holding focus.
    const trigger = document.createElement('button');
    trigger.textContent = 'Row delete trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const view = renderDialog();

    expect(cancelButton()).toHaveFocus();

    // Close through the component's own Escape handler…
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(view.onCancel).toHaveBeenCalledTimes(1);

    // …and the parent unmounts the dialog: the effect cleanup returns focus
    // to the trigger that opened it.
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('closes on Cancel without sending a request (AC 3)', async () => {
    const { onCancel } = renderDialog();
    await validUser.click(cancelButton());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDeleteSemester).not.toHaveBeenCalled();
  });

  it('sends DELETE /semesters/:id on confirm and reports success', async () => {
    const { onDeleted } = renderDialog();
    await validUser.click(confirmButton());

    await waitFor(() => expect(mockedDeleteSemester).toHaveBeenCalledWith('sem-1'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('closes on Escape without sending a request (keyboard)', async () => {
    const { onCancel } = renderDialog();
    await validUser.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDeleteSemester).not.toHaveBeenCalled();
  });

  it('traps Tab focus inside the dialog (focus trap)', async () => {
    renderDialog();

    // Opened with focus on Cancel (first). Tab → Delete (last); Tab again
    // wraps back to Cancel instead of escaping the dialog.
    await validUser.tab();
    expect(confirmButton()).toHaveFocus();
    await validUser.tab();
    expect(cancelButton()).toHaveFocus();
    // Shift+Tab from the first wraps to the last.
    await validUser.keyboard('{Shift>}{Tab}{/Shift}');
    expect(confirmButton()).toHaveFocus();
  });

  it('freezes the dialog while the delete is in flight (no duplicate request)', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedDeleteSemester.mockImplementation(() => new Promise(() => undefined));
    renderDialog();

    const confirm = confirmButton();
    await validUser.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    expect(cancelButton()).toBeDisabled();

    // Escape is ignored while the request is in flight.
    await validUser.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an actionable error and allows a retry when the delete fails', async () => {
    mockedDeleteSemester.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Resource not found',
    });
    const { onDeleted } = renderDialog();
    await validUser.click(confirmButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Resource not found');
    expect(onDeleted).not.toHaveBeenCalled();

    // The Delete button re-enables — the retry is a re-click.
    const confirm = confirmButton();
    expect(confirm).toBeEnabled();
    mockedDeleteSemester.mockResolvedValue(undefined);
    await validUser.click(confirm);
    await waitFor(() => expect(mockedDeleteSemester).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });
});
