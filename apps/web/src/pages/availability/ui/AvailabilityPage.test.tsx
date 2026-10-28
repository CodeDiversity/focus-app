import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { AvailabilityPage } from './AvailabilityPage';
import {
  listAvailabilitySlots,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  type AvailabilitySlot,
} from '@/entities/availability/api/availabilityApi';

vi.mock('@/entities/availability/api/availabilityApi', () => ({
  listAvailabilitySlots: vi.fn(),
  createAvailabilitySlot: vi.fn(),
  updateAvailabilitySlot: vi.fn(),
  deleteAvailabilitySlot: vi.fn(),
}));

const mockedList = vi.mocked(listAvailabilitySlots);
const mockedCreate = vi.mocked(createAvailabilitySlot);
const mockedUpdate = vi.mocked(updateAvailabilitySlot);
const mockedDelete = vi.mocked(deleteAvailabilitySlot);

const timestamps = { createdAt: '2026-10-28T12:00:00.000Z', updatedAt: '2026-10-28T12:00:00.000Z' };

/** A Monday available window (the "Available Mon 09:00–10:30" example, D128B-4). */
const mondayWindow: AvailabilitySlot = {
  id: 'slot-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  isAvailable: true,
  ...timestamps,
};

/** An available Sunday window — the API's Sunday-first day ordering probe (D128B-3). */
const sundayWindow: AvailabilitySlot = {
  id: 'slot-sun',
  dayOfWeek: 0,
  startTime: '18:00',
  endTime: '19:00',
  isAvailable: true,
  ...timestamps,
};

/** A blocked Wednesday time — the kind vocabulary's second side (D127B-5). */
const blockedWednesday: AvailabilitySlot = {
  id: 'slot-wed',
  dayOfWeek: 3,
  startTime: '20:00',
  endTime: '22:00',
  isAvailable: false,
  ...timestamps,
};

/** Two slots on the same weekday — same-day ordering comes from the API. */
const createdEvening: AvailabilitySlot = {
  id: 'slot-2',
  dayOfWeek: 1,
  startTime: '19:00',
  endTime: '21:00',
  isAvailable: false,
  ...timestamps,
};

const renderPage = () =>
  render(
    <Providers initialEntries={['/availability']}>
      <AvailabilityPage />
    </Providers>
  );

const statusRegion = () => screen.getByRole('status');

describe('AvailabilityPage loading, empty, and error states (AC 6, D128B-10)', () => {
  it('renders the loading state ("Loading your availability…") then the refetched rows', async () => {
    mockedList.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([mondayWindow]), 50))
    );
    renderPage();

    expect(await screen.findByText(/loading your availability/i)).toBeInTheDocument();
    expect(await screen.findByText('Mon 09:00–10:30')).toBeInTheDocument();
  });

  it('renders the empty state ("No availability yet.") with the working add CTA and the calendar link', async () => {
    const user = setupUser();
    mockedList.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No availability yet.')).toBeInTheDocument();
    expect(screen.getByText(/add when you can study/i)).toBeInTheDocument();

    // The secondary action navigates to the calendar.
    expect(screen.getByRole('link', { name: 'View your week' })).toHaveAttribute(
      'href',
      '/calendar'
    );

    // The empty-state CTA opens the same dialog the header button opens.
    await user.click(screen.getByRole('button', { name: 'Add your first time slot' }));
    expect(await screen.findByRole('heading', { name: 'Add a time slot' })).toBeInTheDocument();
  });

  it('renders the error state with a working retry (a rejected list request then a successful one)', async () => {
    const user = setupUser();
    // An error with no actionable message → the page's fallback copy.
    mockedList.mockRejectedValueOnce(new Error());
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your availability. Try again.');

    mockedList.mockResolvedValueOnce([mondayWindow]);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Mon 09:00–10:30')).toBeInTheDocument();
    expect(await screen.findByText('Showing 1 time slot.')).toBeInTheDocument();
  });
});

describe('AvailabilityPage grouping and kind labels (AC 1, D128B-3, D128B-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue([mondayWindow, blockedWednesday, sundayWindow]);
    mockedCreate.mockResolvedValue(mondayWindow);
    mockedUpdate.mockResolvedValue(mondayWindow);
    mockedDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('groups the API slots under weekday headings Monday → Sunday with counts, rows in API order', async () => {
    renderPage();

    await screen.findByText('Mon 09:00–10:30');

    // The card headings exist; the API's Sunday-first `dayOfWeek 0` group is
    // placed last (presentation grouping only — the rows keep API order).
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent?.split(' ')[0]);
    expect(headings).toEqual(['Monday', 'Wednesday', 'Sunday']);

    // Slot counts per group ("1 slot"), presentation-only — one per group.
    expect(screen.getAllByText('1 slot')).toHaveLength(3);

    // The kind distinction is textual with the matching text label (the
    // CalendarEventChip vocabulary verbatim), not color-only: two available
    // windows and one blocked time carry their labels.
    expect(screen.getAllByText('Available')).toHaveLength(2);
    expect(screen.getAllByText('Blocked')).toHaveLength(1);

    // A weekday with no slots renders no group.
    expect(screen.queryByRole('heading', { name: /^Tuesday/ })).not.toBeInTheDocument();
  });

  it('keeps API order within a group (both Monday rows in the response order)', async () => {
    mockedList.mockResolvedValue([mondayWindow, createdEvening]);
    renderPage();

    const mondayList = await screen.findByText('Mon 09:00–10:30');
    const tuesday = screen.getByText('Mon 19:00–21:00');
    expect(
      mondayList.compareDocumentPosition(tuesday) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Two rows in one group → the "2 slots" count.
    expect(screen.getByText('2 slots')).toBeInTheDocument();
  });
});

describe('AvailabilityPage add / edit / delete (AC 2–4, D128B-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue([mondayWindow]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a blocked time through the form; the list reflects the API response and the region announces it', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Mon 09:00–10:30');

    // The header CTA (D128B-2) opens the dialog.
    await user.click(screen.getByRole('button', { name: 'Add time slot' }));
    await screen.findByRole('heading', { name: 'Add a time slot' });

    // Blocked time, Wednesday evening.
    await user.click(screen.getByRole('radio', { name: 'Blocked time' }));
    await user.selectOptions(screen.getByLabelText('Day'), '3');
    await user.type(screen.getByLabelText('Start time'), '20:00');
    await user.type(screen.getByLabelText('End time'), '22:00');

    mockedCreate.mockResolvedValueOnce(blockedWednesday);
    mockedList.mockResolvedValueOnce([mondayWindow, blockedWednesday]);
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    // The create call carries only the editable fields.
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        dayOfWeek: 3,
        startTime: '20:00',
        endTime: '22:00',
        isAvailable: false,
      })
    );

    // The list re-reads from the API and shows the new slot in its group.
    expect(await screen.findByText('Wed 20:00–22:00')).toBeInTheDocument();
    // The always-present live region announces the kind-specific sentence…
    expect(
      await screen.findByText('Blocked time added. Showing 2 time slots.')
    ).toBeInTheDocument();
    // …the page stayed mounted with its live region throughout.
    expect(statusRegion()).toBeInTheDocument();
  });

  it('adds an available window with the kind announcement ("Available window added.")', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Mon 09:00–10:30');

    await user.click(screen.getByRole('button', { name: 'Add time slot' }));
    await screen.findByRole('heading', { name: 'Add a time slot' });

    await user.selectOptions(screen.getByLabelText('Day'), '0');
    await user.type(screen.getByLabelText('Start time'), '18:00');
    await user.type(screen.getByLabelText('End time'), '19:00');

    mockedCreate.mockResolvedValueOnce(sundayWindow);
    mockedList.mockResolvedValueOnce([mondayWindow, sundayWindow]);
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    expect(await screen.findByText('Sun 18:00–19:00')).toBeInTheDocument();
    expect(
      await screen.findByText('Available window added. Showing 2 time slots.')
    ).toBeInTheDocument();
  });

  it('edits a slot; the updated values render after the API confirms', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Mon 09:00–10:30');

    // The row action names the row it acts on (AC 8, D128B-4).
    await user.click(screen.getByRole('button', { name: 'Edit Available Mon 09:00–10:30' }));
    await screen.findByRole('heading', { name: 'Edit Available Mon 09:00–10:30' });

    const endInput = screen.getByLabelText('End time');
    await user.clear(endInput);
    await user.type(endInput, '12:00');

    const updated = { ...mondayWindow, endTime: '12:00' };
    mockedUpdate.mockResolvedValueOnce(updated);
    mockedList.mockResolvedValueOnce([updated]);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('slot-1', {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
        isAvailable: true,
      })
    );
    // The updated label replaces the old one, from the API's response.
    expect(await screen.findByText('Mon 09:00–12:00')).toBeInTheDocument();
    expect(await screen.findByText('Time slot updated. Showing 1 time slot.')).toBeInTheDocument();
  });

  it('deletes a slot after confirming, announces, and re-reads (a cancelled confirmation sends no request)', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Mon 09:00–10:30');

    // The row and the confirmation share the full-name label, so the dialog
    // queries are scoped to the dialog (the row Delete opened it).
    const openDelete = async () => {
      await user.click(screen.getByRole('button', { name: 'Delete Available Mon 09:00–10:30' }));
      const dialog = await screen.findByRole('dialog');
      return dialog;
    };

    // Cancel first: the confirmation closes and sends nothing (AC 4).
    await openDelete();
    await screen.findByRole('heading', { name: 'Delete Mon 09:00–10:30?' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: /delete mon/i })).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();

    // Now confirm: the dangerous action is accessible-named with the row's
    // full name (D128B-9/D128B-4).
    const dialog = await openDelete();
    await screen.findByRole('heading', { name: 'Delete Mon 09:00–10:30?' });
    mockedDelete.mockResolvedValueOnce(undefined);
    mockedList.mockResolvedValueOnce([]);
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete Available Mon 09:00–10:30' })
    );

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('slot-1'));
    expect(await screen.findByText('No availability yet.')).toBeInTheDocument();
    expect(await screen.findByText('Time slot deleted. Showing 0 time slots.')).toBeInTheDocument();
  });
});

describe('AvailabilityPage API failure handling (AC 5, D128B-8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue([mondayWindow]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the API's field-level 400 next to the offending field and keeps the input; nothing is written", async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Mon 09:00–10:30');

    await user.click(screen.getByRole('button', { name: 'Add time slot' }));
    await screen.findByRole('heading', { name: 'Add a time slot' });

    // 10:00 → 09:30 is caught client-side first; the API is the authority for
    // the server-verified pair below — the exact in-flight times are the
    // mocked API's 400, whichever pair reaches it.
    mockedCreate.mockRejectedValueOnce({
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

    await user.type(screen.getByLabelText('Start time'), '10:00');
    await user.type(screen.getByLabelText('End time'), '09:30');
    await user.click(screen.getByRole('button', { name: 'Create time slot' }));

    expect(await screen.findByText('End time must be after the start time.')).toBeInTheDocument();
    // The input is preserved; no write happened.
    const endInput = screen.getByLabelText('End time') as HTMLInputElement;
    expect(endInput).toHaveValue('09:30');
    expect(mockedList).toHaveBeenCalledTimes(1); // no refetch after a rejection
    expect(statusRegion()).toBeInTheDocument();
  });
});
