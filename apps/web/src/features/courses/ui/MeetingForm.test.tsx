import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { MeetingForm } from './MeetingForm';
import { createMeeting, updateMeeting } from '@/entities/course/api/courseApi';
import toast from 'react-hot-toast';
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

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedCreateMeeting = vi.mocked(createMeeting);
const mockedUpdateMeeting = vi.mocked(updateMeeting);
const mockedToast = vi.mocked(toast);

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** The meeting the edit-mode tests pre-fill (Mon 09:00–10:30). */
const monday: ClassMeeting = {
  id: 'meeting-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  ...timestamps,
};

/**
 * The form's 404 branch renders a `Link` → the test renders inside the
 * `Providers` helper (store + `MemoryRouter` with `initialEntries`, D112B-15).
 */
const renderForm = (props: Partial<Parameters<typeof MeetingForm>[0]> = {}) => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <Providers initialEntries={['/courses/course-1']}>
      <MeetingForm courseId="course-1" onSuccess={onSuccess} onClose={onClose} {...props} />
    </Providers>
  );
  return { onSuccess, onClose, ...view };
};

const daySelect = () => screen.getByLabelText('Day');
const startInput = () => screen.getByLabelText('Start time');
const endInput = () => screen.getByLabelText('End time');
const submitButton = () => screen.getByRole('button', { name: /create meeting|save changes/i });

describe('MeetingForm fields (AC 3, D112B-3)', () => {
  it('create mode: "Add a meeting" title, the full Sun–Sat day select, default day Monday, time inputs', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add a meeting');

    // The Day select offers all seven weekdays (full names, D112-1)…
    const options = within(daySelect()).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]);
    // …and create mode defaults to Monday (recorded decision).
    expect(daySelect()).toHaveValue('1');

    // The times are native 24-hour time inputs, empty in create mode.
    expect(startInput()).toHaveAttribute('type', 'time');
    expect(endInput()).toHaveAttribute('type', 'time');
    expect(startInput()).toHaveValue('');
    expect(endInput()).toHaveValue('');
  });

  it('edit mode: the meeting label in the title and pre-filled fields', () => {
    renderForm({ meeting: monday });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Edit Mon 09:00–10:30');
    expect(daySelect()).toHaveValue('1');
    expect(startInput()).toHaveValue('09:00');
    expect(endInput()).toHaveValue('10:30');
  });
});

describe('MeetingForm client validation (DoD 2)', () => {
  it('requires both times and rejects an end time that does not follow the start (inline, no request)', async () => {
    const user = setupUser();
    renderForm();

    // Empty times → required errors, no request.
    await user.click(submitButton());
    expect(await screen.findByText('Start time is required')).toBeInTheDocument();
    expect(screen.getByText('End time is required')).toBeInTheDocument();
    expect(mockedCreateMeeting).not.toHaveBeenCalled();

    // End before start → the inline error under the end field (ticket AC 3).
    await user.type(startInput(), '10:00');
    await user.type(endInput(), '09:30');
    await user.click(submitButton());
    expect(await screen.findByText('End time must be after the start time.')).toBeInTheDocument();
    expect(mockedCreateMeeting).not.toHaveBeenCalled();
  });

  it('submits a valid create with the 24-hour values', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    mockedCreateMeeting.mockResolvedValue(monday);

    await user.selectOptions(daySelect(), '3');
    await user.type(startInput(), '14:00');
    await user.type(endInput(), '15:30');
    await user.click(submitButton());

    await waitFor(() =>
      expect(mockedCreateMeeting).toHaveBeenCalledWith('course-1', {
        dayOfWeek: 3,
        startTime: '14:00',
        endTime: '15:30',
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('created'));
  });

  it('submits a valid update against the nested meeting route', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm({ meeting: monday });
    mockedUpdateMeeting.mockResolvedValue({ ...monday, startTime: '11:00', endTime: '12:30' });

    // Clear both first (while one is empty the end-after-start refinement
    // passes), then set the new pair.
    await user.clear(endInput());
    await user.clear(startInput());
    await user.type(startInput(), '11:00');
    await user.type(endInput(), '12:30');
    await user.click(submitButton());

    await waitFor(() =>
      expect(mockedUpdateMeeting).toHaveBeenCalledWith('course-1', 'meeting-1', {
        dayOfWeek: 1,
        startTime: '11:00',
        endTime: '12:30',
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('updated'));
  });
});

describe('MeetingForm API failure branches (D112B-8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a 400 field-level errors map under the matching inputs (no toast, no form-level alert)', async () => {
    const user = setupUser();
    mockedCreateMeeting.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['startTime must be a 24-hour HH:mm time (e.g. 09:00)'],
          error: 'Bad Request',
          errors: {
            startTime: ['startTime must be a 24-hour HH:mm time (e.g. 09:00)'],
            endTime: ['endTime must be strictly after startTime (same day)'],
          },
        },
      },
      message: 'Request failed with status code 400',
    });
    renderForm();

    await user.selectOptions(daySelect(), '2');
    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:00');
    await user.click(submitButton());

    // Both fields render their server messages…
    expect(
      await screen.findByText('startTime must be a 24-hour HH:mm time (e.g. 09:00)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('endTime must be strictly after startTime (same day)')
    ).toBeInTheDocument();
    // …and no form-level alert / toast replaces them.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockedToast.error).not.toHaveBeenCalled();
    // The form stays open with its values (resubmit is the retry).
    expect(startInput()).toHaveValue('09:00');
    expect(endInput()).toHaveValue('10:00');
  });

  it('renders a 409 (slot already taken) as a form-level alert with the API message', async () => {
    const user = setupUser();
    mockedCreateMeeting.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          message: 'A meeting already exists at this time.',
          error: 'Conflict',
        },
      },
      message: 'Request failed with status code 409',
    });
    renderForm();

    await user.selectOptions(daySelect(), '1');
    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:30');
    await user.click(submitButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A meeting already exists at this time.');
    // The recovery is in-form (change the slot) — no toast, no back link.
    expect(mockedToast.error).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /back to courses/i })).not.toBeInTheDocument();
    // The values are preserved for the retry.
    expect(startInput()).toHaveValue('09:00');
  });

  it('renders a 404 (the course is gone) as a form-level alert with a Back to courses link', async () => {
    const user = setupUser();
    mockedCreateMeeting.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Request failed with status code 404',
    });
    renderForm();

    await user.selectOptions(daySelect(), '1');
    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:30');
    await user.click(submitButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Resource not found — this course may no longer exist.');
    // The recovery is leaving the page — the back link (no existence hint beyond
    // the uniform message).
    expect(screen.getByRole('link', { name: /back to courses/i })).toHaveAttribute(
      'href',
      '/courses'
    );
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('toasts the sanitized message for any other failure, preserving the form values', async () => {
    const user = setupUser();
    mockedCreateMeeting.mockRejectedValue(new Error('Network Error'));
    renderForm();

    await user.selectOptions(daySelect(), '5');
    await user.type(startInput(), '16:00');
    await user.type(endInput(), '17:00');
    await user.click(submitButton());

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    // No form-level alert for a network failure…
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // …the values are preserved and the submit re-enables (resubmit is the retry).
    expect(startInput()).toHaveValue('16:00');
    expect(endInput()).toHaveValue('17:00');
    expect(submitButton()).toBeEnabled();
  });
});

describe('MeetingForm dialog behavior (D112B-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('takes focus on open (the day select), closes on Escape, and returns focus to the trigger', () => {
    // Simulate the trigger (the section's Add meeting button) holding focus.
    const trigger = document.createElement('button');
    trigger.textContent = 'Add meeting trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { onClose, unmount } = renderForm();

    // The first focusable (the day select) receives focus on open.
    expect(daySelect()).toHaveFocus();

    // Close through the component's own Escape handler…
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // …and the parent unmounts the dialog: the effect cleanup returns focus
    // to the trigger that opened it.
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('traps Tab focus inside the dialog (no escape past the last control)', async () => {
    const user = setupUser();
    renderForm();

    // Opened with focus on the day select (first). Tab walks the fields…
    await user.tab();
    expect(startInput()).toHaveFocus();
    await user.tab();
    expect(endInput()).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(submitButton()).toHaveFocus();
    // …and wraps back to the first control instead of leaving the dialog.
    await user.tab();
    expect(daySelect()).toHaveFocus();
    // Shift+Tab from the first wraps to the last.
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(submitButton()).toHaveFocus();
  });

  it('freezes the form while the request is in flight (no duplicate submit, Escape ignored)', async () => {
    const user = setupUser();
    // Never resolves during the test; unmount cleans up.
    mockedCreateMeeting.mockImplementation(() => new Promise(() => undefined));
    renderForm();

    await user.selectOptions(daySelect(), '1');
    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:30');
    await user.click(submitButton());

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(startInput()).toBeDisabled();
    expect(daySelect()).toBeDisabled();

    // Escape is ignored while the request is in flight.
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Cancel without a request', async () => {
    const user = setupUser();
    const { onClose } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedCreateMeeting).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click without a request', async () => {
    const user = setupUser();
    const { onClose, container } = renderForm();

    // The backdrop is the dimmed layer behind the card (a sibling of the
    // dialog card — clicking the card itself does not close).
    const backdrop = container.querySelector('div[aria-hidden="true"]') as Element;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedCreateMeeting).not.toHaveBeenCalled();
  });
});
