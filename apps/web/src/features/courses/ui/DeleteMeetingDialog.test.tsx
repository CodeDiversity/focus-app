import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { DeleteMeetingDialog } from './DeleteMeetingDialog';
import { deleteMeeting } from '@/entities/course/api/courseApi';
import type { ClassMeeting } from '@/shared/types/academic';

vi.mock('@/entities/course/api/courseApi', () => ({
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  listMeetings: vi.fn(),
  deleteMeeting: vi.fn(),
  getCourse: vi.fn(),
  listCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
}));

const mockedDeleteMeeting = vi.mocked(deleteMeeting);

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** The meeting the dialog deletes (Mon 09:00–10:30 — the D112B-7/9 example). */
const monday: ClassMeeting = {
  id: 'meeting-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  ...timestamps,
};

const validUser = setupUser();

const renderDialog = () => {
  const onDeleted = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <DeleteMeetingDialog
      courseId="course-1"
      meeting={monday}
      onDeleted={onDeleted}
      onCancel={onCancel}
    />
  );
  return { onDeleted, onCancel, unmount: view.unmount };
};

const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const deleteButton = () => screen.getByRole('button', { name: /delete mon 09:00–10:30/i });

describe('DeleteMeetingDialog (AC 3, D112B-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeleteMeeting.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the meeting and states the effect', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Delete Mon 09:00–10:30?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      "This removes the meeting from the course's weekly schedule."
    );
  });

  it('focuses the safe action (Cancel) first on open', () => {
    renderDialog();

    expect(cancelButton()).toHaveFocus();
  });

  it('issues DELETE on the nested meeting route and reports success', async () => {
    const { onDeleted } = renderDialog();

    await validUser.click(deleteButton());

    await waitFor(() => expect(mockedDeleteMeeting).toHaveBeenCalledWith('course-1', 'meeting-1'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('closes on Cancel without sending a request', async () => {
    const { onCancel } = renderDialog();

    await validUser.click(cancelButton());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDeleteMeeting).not.toHaveBeenCalled();
  });

  it('closes on Escape without sending a request (keyboard)', async () => {
    const { onCancel } = renderDialog();

    await validUser.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedDeleteMeeting).not.toHaveBeenCalled();
  });

  it('returns focus to the trigger on close', () => {
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

  it('traps Tab focus inside the dialog (focus trap)', async () => {
    renderDialog();

    // Opened with focus on Cancel (first). Tab → Delete (last); Tab again
    // wraps back to Cancel instead of escaping the dialog.
    await validUser.tab();
    expect(deleteButton()).toHaveFocus();
    await validUser.tab();
    expect(cancelButton()).toHaveFocus();
    // Shift+Tab from the first wraps to the last.
    await validUser.keyboard('{Shift>}{Tab}{/Shift}');
    expect(deleteButton()).toHaveFocus();
  });

  it('freezes the dialog while the request is in flight (no duplicate request)', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedDeleteMeeting.mockImplementation(() => new Promise(() => undefined));
    renderDialog();

    await validUser.click(deleteButton());

    await waitFor(() => expect(deleteButton()).toBeDisabled());
    expect(cancelButton()).toBeDisabled();

    // Escape is ignored while the request is in flight.
    await validUser.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an actionable error in the dialog and allows a retry (re-click)', async () => {
    mockedDeleteMeeting.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Resource not found',
    });
    const { onDeleted } = renderDialog();

    await validUser.click(deleteButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Resource not found');
    expect(onDeleted).not.toHaveBeenCalled();

    // The Delete button re-enables — the retry is a re-click.
    const deleteBtn = deleteButton();
    expect(deleteBtn).toBeEnabled();
    mockedDeleteMeeting.mockResolvedValue(undefined);
    await validUser.click(deleteBtn);
    await waitFor(() => expect(mockedDeleteMeeting).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });
});
