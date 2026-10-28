import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { AvailabilitySlotForm } from './AvailabilitySlotForm';
import {
  createAvailabilitySlot,
  updateAvailabilitySlot,
} from '@/entities/availability/api/availabilityApi';
import type { AvailabilitySlot } from '@/entities/availability/model/types';
import toast from 'react-hot-toast';

vi.mock('@/entities/availability/api/availabilityApi', () => ({
  listAvailabilitySlots: vi.fn(),
  createAvailabilitySlot: vi.fn(),
  updateAvailabilitySlot: vi.fn(),
  deleteAvailabilitySlot: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedCreate = vi.mocked(createAvailabilitySlot);
const mockedUpdate = vi.mocked(updateAvailabilitySlot);
const mockedToast = vi.mocked(toast);

const timestamps = { createdAt: '2026-10-28T12:00:00.000Z', updatedAt: '2026-10-28T12:00:00.000Z' };

/** The slot the edit-mode tests pre-fill (Available Mon 09:00–10:30). */
const mondayWindow: AvailabilitySlot = {
  id: 'slot-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  isAvailable: true,
  ...timestamps,
};

/** The blocked variant (Blocked Wed 20:00–22:00) for the kind flip tests. */
const blockedWednesday: AvailabilitySlot = {
  id: 'slot-2',
  dayOfWeek: 3,
  startTime: '20:00',
  endTime: '22:00',
  isAvailable: false,
  ...timestamps,
};

const renderForm = (props: Partial<Parameters<typeof AvailabilitySlotForm>[0]> = {}) => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const view = render(<AvailabilitySlotForm onSuccess={onSuccess} onClose={onClose} {...props} />);
  return { onSuccess, onClose, unmount: view.unmount };
};

const daySelect = () => screen.getByLabelText('Day');
const startInput = () => screen.getByLabelText('Start time');
const endInput = () => screen.getByLabelText('End time');
const kindRadio = (name: string) => screen.getByRole('radio', { name });

describe('AvailabilitySlotForm fields (D128B-5, D128B-6)', () => {
  it('create mode: "Add a time slot" title, the kind radio pair with captions (default "Available window"), the Sun–Sat day select default Monday, empty time inputs', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add a time slot');

    // The radiogroup is labeled "Kind" and offers the two choices…
    expect(screen.getByRole('radiogroup', { name: 'Kind' })).toBeInTheDocument();
    // …with the create-mode default "Available window" (isAvailable: true).
    expect(kindRadio('Available window')).toBeChecked();

    const dayOptions = Array.from((daySelect() as HTMLSelectElement).options).map(
      (option) => option.textContent
    );
    expect(dayOptions).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]);
    // Create-mode default day Monday (the MeetingForm recorded default).
    expect(daySelect()).toHaveValue('1');

    // The times are native 24-hour time inputs, empty in create mode.
    expect(startInput()).toHaveAttribute('type', 'time');
    expect(endInput()).toHaveAttribute('type', 'time');
    expect(startInput()).toHaveValue('');
    expect(endInput()).toHaveValue('');

    expect(screen.getByRole('button', { name: 'Create time slot' })).toBeInTheDocument();
  });

  it('create mode: the kind pair exposes the captions ("You can study then" / "You are unavailable then")', () => {
    renderForm();

    expect(screen.getByText('You can study then')).toBeInTheDocument();
    expect(screen.getByText('You are unavailable then')).toBeInTheDocument();
  });

  it("edit mode: the row's full name in the title and the prefilled kind/day/times", () => {
    renderForm({ slot: mondayWindow });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Edit Available Mon 09:00–10:30'
    );
    expect(kindRadio('Available window')).toBeChecked();
    expect(daySelect()).toHaveValue('1');
    expect(startInput()).toHaveValue('09:00');
    expect(endInput()).toHaveValue('10:30');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('edit mode: a blocked slot opens with "Blocked time" checked', () => {
    renderForm({ slot: blockedWednesday });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Edit Blocked Wed 20:00–22:00'
    );
    expect(kindRadio('Blocked time')).toBeChecked();
    expect(daySelect()).toHaveValue('3');
    expect(startInput()).toHaveValue('20:00');
    expect(endInput()).toHaveValue('22:00');
  });
});

describe('AvailabilitySlotForm client validation (DoD 2, D128B-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('catches empty times before the request', async () => {
    const user = setupUser();
    const { onClose } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Create time slot' }));
    expect(await screen.findByText('Start time is required')).toBeInTheDocument();
    expect(screen.getByText('End time is required')).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rejects an end time that does not follow the start with the inline error under the End field', async () => {
    const user = setupUser();
    const { onClose } = renderForm();

    await user.type(startInput(), '10:00');
    await user.type(endInput(), '09:30');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    expect(await screen.findByText('End time must be after the start time.')).toBeInTheDocument();
    // Equal times are rejected too (strictly after, no midnight wrap).
    await user.clear(endInput());
    await user.type(endInput(), '10:00');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));
    expect(await screen.findByText('End time must be after the start time.')).toBeInTheDocument();

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the day select makes out-of-range days unselectable (the API stays the authority on 0–6)', () => {
    renderForm();

    const dayValues = Array.from((daySelect() as HTMLSelectElement).options).map((option) =>
      Number(option.value)
    );
    expect(dayValues).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('AvailabilitySlotForm submissions (AC 2, AC 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits a create with only the editable fields, kind included (isAvailable true by default)', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    mockedCreate.mockResolvedValue(mondayWindow);

    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:30');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        isAvailable: true,
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('created', mondayWindow));
  });

  it('flipping the kind to "Blocked time" submits isAvailable: false (AC-E04-05 blocked times)', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    mockedCreate.mockResolvedValue(blockedWednesday);

    await user.click(kindRadio('Blocked time'));
    await user.selectOptions(daySelect(), '3');
    await user.type(startInput(), '20:00');
    await user.type(endInput(), '22:00');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        dayOfWeek: 3,
        startTime: '20:00',
        endTime: '22:00',
        isAvailable: false,
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('created', blockedWednesday));
  });

  it('submits an update against PATCH /availability-slots/:id', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm({ slot: mondayWindow });
    const updated: AvailabilitySlot = { ...mondayWindow, endTime: '12:00' };
    mockedUpdate.mockResolvedValue(updated);

    await user.clear(endInput());
    await user.type(endInput(), '12:00');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('slot-1', {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
        isAvailable: true,
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('updated', updated));
  });

  it('freezes the form while the request is in flight (no duplicate submit, Escape ignored)', async () => {
    const user = setupUser();
    // Never resolves during the test; unmount cleans up.
    mockedCreate.mockImplementation(() => new Promise(() => undefined));
    const { onClose } = renderForm();

    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:30');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create time slot' })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('AvailabilitySlotForm API failure branches (D128B-8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps a 400 field-level errors map under the matching fields (no toast, no form-level alert), preserving the input', async () => {
    const user = setupUser();
    mockedCreate.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['endTime must be strictly after startTime (same day)'],
          error: 'Bad Request',
          errors: { endTime: ['endTime must be strictly after startTime (same day)'] },
        },
      },
      message: 'Request failed with status code 400',
    });
    renderForm();

    await user.type(startInput(), '10:00');
    await user.type(endInput(), '09:30');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    // The client mirror catches it first (DoD 2 — no request is sent).
    const clientCaught = await screen.findByText('End time must be after the start time.');
    expect(clientCaught).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();

    // Bypass the client mirror: submit a pair the client accepts that the API
    // rejects (the client is a convenience, the API the authority).
    mockedCreate.mockRejectedValueOnce({
      response: {
        data: {
          statusCode: 400,
          message: ['startTime must be a valid 24-hour time (hour 00-23, minute 00-59)'],
          error: 'Bad Request',
          errors: {
            startTime: ['startTime must be a valid 24-hour time (hour 00-23, minute 00-59)'],
          },
        },
      },
      message: 'Request failed with status code 400',
    });
    await user.clear(endInput());
    await user.type(endInput(), '23:30');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    expect(
      await screen.findByText('startTime must be a valid 24-hour time (hour 00-23, minute 00-59)')
    ).toBeInTheDocument();
    // Under the matching field (the start input is described by the message).
    expect(startInput()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockedToast.error).not.toHaveBeenCalled();
    // The values are preserved (nothing is written on a rejection).
    expect(startInput()).toHaveValue('10:00');
    expect(endInput()).toHaveValue('23:30');
  });

  it("renders a 409 duplicate as a form-level alert with the API's message, values preserved", async () => {
    const user = setupUser();
    mockedCreate.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          message: 'An availability slot already exists at this time.',
          error: 'Conflict',
        },
      },
      message: 'Request failed with status code 409',
    });
    renderForm();

    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:30');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('An availability slot already exists at this time.');
    // The recovery is in-form (change the slot) — no toast.
    expect(mockedToast.error).not.toHaveBeenCalled();
    // The values are preserved for the retry.
    expect(startInput()).toHaveValue('09:00');
    expect(endInput()).toHaveValue('10:30');
  });

  it('renders a 404 during edit as a form-level alert and asks the page to re-read the list on cancel', async () => {
    const user = setupUser();
    mockedUpdate.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Request failed with status code 404',
    });
    const { onClose } = renderForm({ slot: mondayWindow });

    await user.type(startInput(), '09:00');
    await user.type(endInput(), '10:30');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Resource not found — this time slot may no longer exist.');
    // The dialog's cancel reloads the list (the only recovery — D128B-8).
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledWith({ requestRefetch: true });
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('cancelling without a failure closes without a refetch request', async () => {
    const user = setupUser();
    const { onClose } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledWith(undefined);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('toasts the sanitized message for any other failure, preserving the form values', async () => {
    const user = setupUser();
    mockedCreate.mockRejectedValue(new Error('Network Error'));
    renderForm();

    await user.type(startInput(), '16:00');
    await user.type(endInput(), '17:00');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    // No form-level alert for a network failure…
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // …the values are preserved and the submit re-enables (resubmit is the retry).
    expect(startInput()).toHaveValue('16:00');
    expect(endInput()).toHaveValue('17:00');
    expect(screen.getByRole('button', { name: 'Create time slot' })).toBeEnabled();
  });
});

describe('AvailabilitySlotForm dialog behavior (D128B-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('takes focus on open (the first kind radio), closes on Escape, and returns focus to the trigger', () => {
    // Simulate the trigger (the page's Add time slot button) holding focus.
    const trigger = document.createElement('button');
    trigger.textContent = 'Add time slot trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { onClose, unmount } = renderForm();

    // The first focusable (the first kind radio) receives focus on open.
    expect(kindRadio('Available window')).toHaveFocus();

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

    // Opened with focus on the first kind radio. Arrow keys move within the
    // radiogroup (D128B-6, AC 8)…
    await user.keyboard('{ArrowRight}');
    expect(kindRadio('Blocked time')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(kindRadio('Available window')).toHaveFocus();

    // …the pair is one Tab stop: leaving it lands on the Day select.
    await user.tab();
    expect(daySelect()).toHaveFocus();
    await user.tab();
    expect(startInput()).toHaveFocus();
    await user.tab();
    expect(endInput()).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Create time slot' })).toHaveFocus();
    // …and wraps back to the first control instead of leaving the dialog.
    await user.tab();
    expect(kindRadio('Available window')).toHaveFocus();
    // Shift+Tab from the first wraps to the last.
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Create time slot' })).toHaveFocus();
  });

  it('the backdrop click closes without a request', async () => {
    const { onClose } = renderForm();

    fireEvent.click(screen.getByRole('dialog').previousElementSibling as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
