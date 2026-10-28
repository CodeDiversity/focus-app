import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { DeleteAvailabilitySlotDialog } from './DeleteAvailabilitySlotDialog';
import { deleteAvailabilitySlot } from '@/entities/availability/api/availabilityApi';
import type { AvailabilitySlot } from '@/entities/availability/model/types';

vi.mock('@/entities/availability/api/availabilityApi', () => ({
  listAvailabilitySlots: vi.fn(),
  createAvailabilitySlot: vi.fn(),
  updateAvailabilitySlot: vi.fn(),
  deleteAvailabilitySlot: vi.fn(),
}));

const mockedDelete = vi.mocked(deleteAvailabilitySlot);

const timestamps = { createdAt: '2026-10-28T12:00:00.000Z', updatedAt: '2026-10-28T12:00:00.000Z' };

/** The slot the dialog deletes (Mon 09:00–10:30 — the D128B-4/9 example). */
const mondayWindow: AvailabilitySlot = {
  id: 'slot-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  isAvailable: true,
  ...timestamps,
};

const validUser = setupUser();

const renderDialog = () => {
  const onDeleted = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <DeleteAvailabilitySlotDialog slot={mondayWindow} onDeleted={onDeleted} onCancel={onCancel} />
  );
  return { onDeleted, onCancel, unmount: view.unmount };
};

const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const confirmButton = () => screen.getByRole('button', { name: /delete available mon 09:00/i });

describe('DeleteAvailabilitySlotDialog (AC 4, D128B-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the time range and states the effect on the availability list and the calendar', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Delete Mon 09:00–10:30?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'This permanently deletes that recurring time. It will stop appearing on your availability list and your calendar.'
    );
  });

  it('focuses the safe action (Cancel) first on open', () => {
    renderDialog();

    expect(cancelButton()).toHaveFocus();
  });

  it('issues DELETE on the top-level route and reports success', async () => {
    const { onDeleted } = renderDialog();

    await validUser.click(confirmButton());

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('slot-1'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('closes on Cancel without sending a request (a cancelled confirmation sends nothing)', async () => {
    const { onCancel } = renderDialog();

    await validUser.click(cancelButton());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('closes on Escape without sending a request (keyboard)', async () => {
    const { onCancel } = renderDialog();

    await validUser.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('the backdrop click cancels without a request', () => {
    const { onCancel } = renderDialog();

    fireEvent.click(screen.getByRole('dialog').previousElementSibling as Element);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('returns focus to the trigger on close', () => {
    // Simulate the trigger (the row's Delete button) holding focus.
    const trigger = document.createElement('button');
    trigger.textContent = 'Row delete trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = renderDialog();

    // The dialog took focus from the trigger (the safe action holds it)…
    expect(cancelButton()).toHaveFocus();

    // …and the parent unmounts the dialog after the close: the cleanup
    // returns focus to the trigger that opened it.
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('traps Tab focus inside the dialog (no escape past the Delete confirm)', async () => {
    const user = setupUser();
    renderDialog();

    // Opened focused on Cancel (the safe action). Tab reaches the confirm…
    await user.tab();
    expect(confirmButton()).toHaveFocus();
    // …and wraps back to the first control instead of leaving the dialog.
    await user.tab();
    expect(cancelButton()).toHaveFocus();
    // Shift+Tab from the first wraps to the last.
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(confirmButton()).toHaveFocus();
  });

  it('shows a failed delete as a role="alert" inside the dialog and re-enables confirm', async () => {
    mockedDelete.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Request failed with status code 404',
    });
    const { onDeleted, onCancel } = renderDialog();

    await validUser.click(confirmButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Resource not found');
    // The dialog stays open for the retry (the parent does not unmount).
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    // The confirm re-enables (resubmit is the retry).
    expect(confirmButton()).toBeEnabled();
  });

  it('freezes the dialog while the delete is in flight', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedDelete.mockImplementation(() => new Promise(() => undefined));
    const { onCancel } = renderDialog();

    await validUser.click(confirmButton());

    await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
    expect(cancelButton()).toBeDisabled();
    expect(confirmButton()).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
