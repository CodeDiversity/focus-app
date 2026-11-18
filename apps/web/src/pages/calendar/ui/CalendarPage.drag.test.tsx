import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { CalendarPage, FOLLOW_UP_MS, PARTIAL_SAVE_COPY } from './CalendarPage';
import { EDIT_CALLBACKS, type WeekGridProps } from '@/features/calendar/ui/WeekGrid';
import { listCalendarEvents } from '@/entities/calendar/api/calendarApi';

vi.mock('@/entities/calendar/api/calendarApi', () => ({ listCalendarEvents: vi.fn() }));
vi.mock('@/entities/day-bounds/api/dayBoundsApi', () => ({
  getDayBounds: vi.fn(),
  putDayBounds: vi.fn(),
}));
vi.mock('@/entities/schedule-block/api/scheduleBlockApi', () => ({
  listScheduleBlocks: vi.fn(),
  createScheduleBlock: vi.fn(),
  updateScheduleBlock: vi.fn(),
  deleteScheduleBlock: vi.fn(),
  cancelOccurrence: vi.fn(),
  restoreOccurrence: vi.fn(),
}));
vi.mock('@/entities/course/api/courseApi', () => ({ listCourses: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
import { getDayBounds } from '@/entities/day-bounds/api/dayBoundsApi';
import {
  cancelOccurrence,
  createScheduleBlock,
  deleteScheduleBlock,
  listScheduleBlocks,
  restoreOccurrence,
  updateScheduleBlock,
} from '@/entities/schedule-block/api/scheduleBlockApi';
import toast from 'react-hot-toast';

const mocked = vi.mocked(listCalendarEvents);
const mockedCreate = vi.mocked(createScheduleBlock);
const mockedUpdate = vi.mocked(updateScheduleBlock);
const mockedCancel = vi.mocked(cancelOccurrence);
const mockedRestore = vi.mocked(restoreOccurrence);
const mockedDelete = vi.mocked(deleteScheduleBlock);
const mockedList = vi.mocked(listScheduleBlocks);

// ---- viewport harness (same shape as CalendarPage.test.tsx) ----
let narrow = false;
function installMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(max-width: 639px)' ? narrow : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const WEEK = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
];
const days = WEEK.map((date) => ({ date, wakeTime: '08:00', sleepTime: '23:00', free: [] }));

const weeklyBusy = {
  id: 'event:b1:2026-10-28',
  type: 'EVENT' as const,
  title: 'Work shift',
  subtitle: null,
  date: '2026-10-28', // Wednesday
  startTime: '09:00',
  endTime: '10:00',
  courseId: null,
  courseName: null,
  courseColor: null,
  assignmentId: null,
  completed: false,
  focus: false,
  link: null,
  blockId: 'b1',
  recurring: true, // Mon/Wed/Fri series — the payload carries only the flag
  energy: null,
};
const oneOffBusy = {
  ...weeklyBusy,
  id: 'event:b2:2026-10-29',
  title: 'Errand',
  date: '2026-10-29', // Thursday
  startTime: '13:00',
  endTime: '14:00',
  blockId: 'b2',
  recurring: false,
};

const payload = {
  timeZone: 'America/New_York',
  today: '2026-10-28',
  from: '2026-10-26',
  to: '2026-11-01',
  days,
  events: [weeklyBusy, oneOffBusy],
};

const blockRow = {
  id: 'b1',
  kind: 'BUSY' as const,
  title: 'Work shift',
  courseId: null,
  energy: null,
  startDate: '2026-10-01',
  endDate: null,
  weekdays: [1, 3, 5],
  startTime: '09:00',
  endTime: '10:00',
  createdAt: 'x',
  updatedAt: 'x',
};

// Range is 07:00–24:00 for these bounds → minute m sits at y = m − 420.
const Y = (minute: number) => minute - 420;

type PointerOpts = { clientX: number; clientY: number; pointerType?: string };
function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  o: PointerOpts
) {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: o.clientX,
    clientY: o.clientY,
  });
  Object.defineProperty(ev, 'pointerId', { value: 1 });
  Object.defineProperty(ev, 'pointerType', { value: o.pointerType ?? 'mouse' });
  fireEvent(el, ev);
}

/** Known geometry: the k-th day column spans x ∈ [56 + 100k, 56 + 100(k+1)). */
function mockColumnRects() {
  const cols = Array.from(document.querySelectorAll<HTMLElement>('[data-day]'));
  cols.forEach((colEl, k) => {
    vi.spyOn(colEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 1020,
      left: 56 + 100 * k,
      right: 56 + 100 * (k + 1),
      width: 100,
      height: 1020,
      x: 56 + 100 * k,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });
}

const user = userEvent.setup();
const colX = (date: string) => 56 + 100 * WEEK.indexOf(date) + 50;

const renderPage = async () => {
  render(
    <Providers initialEntries={['/calendar']}>
      <CalendarPage />
    </Providers>
  );
  await screen.findByText(/Work shift/);
  mockColumnRects();
};

const chipFor = (title: RegExp) => screen.getByRole('button', { name: title });
/** Flush trailing microtasks (refetch, ghost release) inside act. */
const settle = () => act(async () => {});
const status = () => screen.getByRole('status');

const dragChip = (chip: Element, fromY: number, to: { x: number; y: number }) => {
  firePointer(chip, 'pointerdown', { clientX: colX('2026-10-28'), clientY: fromY });
  firePointer(chip, 'pointermove', { clientX: to.x, clientY: to.y });
  firePointer(chip, 'pointerup', { clientX: to.x, clientY: to.y });
};

describe('CalendarPage drag wiring (EP15H)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00'));
    vi.resetAllMocks();
    narrow = false;
    installMatchMedia();
    window.sessionStorage.clear();
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    mocked.mockResolvedValue(payload);
    vi.mocked(getDayBounds).mockResolvedValue({
      configured: true,
      days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        wakeTime: '08:00',
        sleepTime: '23:00',
      })),
    });
    // The "just this day" one-off the drop creates (its id is what Undo /
    // Apply delete).
    mockedCreate.mockResolvedValue({ ...blockRow, id: 'b9', weekdays: null });
    mockedUpdate.mockResolvedValue(blockRow);
    mockedCancel.mockResolvedValue(undefined);
    mockedRestore.mockResolvedValue(undefined);
    mockedDelete.mockResolvedValue(undefined);
    mockedList.mockResolvedValue([blockRow]);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("EP15H-AC1: onCreateRange opens BlockSheet in create mode with the selection pre-filled; Save POSTs; the sheet's keyboard path is unchanged", async () => {
    await renderPage();
    const wed = document.querySelector<HTMLElement>('[data-day="2026-10-28"]')!;
    firePointer(wed, 'pointerdown', { clientX: colX('2026-10-28'), clientY: Y(11 * 60) });
    firePointer(wed, 'pointermove', { clientX: colX('2026-10-28'), clientY: Y(12 * 60 + 30) });
    firePointer(wed, 'pointerup', { clientX: colX('2026-10-28'), clientY: Y(12 * 60 + 30) });
    const sheet = await screen.findByRole('dialog', { name: 'Add to calendar' });
    expect(within(sheet).getByLabelText('Date')).toHaveValue('2026-10-28');
    expect(within(sheet).getByLabelText('Start')).toHaveValue('11:00');
    expect(within(sheet).getByLabelText('End')).toHaveValue('12:30');
    // The keyboard path is the same sheet "Add" opens — same fields, same Save.
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith({
      kind: 'BUSY',
      startDate: '2026-10-28',
      startTime: '11:00',
      endTime: '12:30',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await settle();
  });

  it("EP15H-AC2: one-off move → one PATCH { startDate, startTime, endTime }; one-off resize → one PATCH { endTime }; then refetch and 'Moved to Thu 14:00–15:00' / 'Resized to 13:00–14:30'", async () => {
    await renderPage();
    const chip = chipFor(/Errand/);
    let fetches = mocked.mock.calls.length;
    // Move 60 px down within Thursday.
    firePointer(chip, 'pointerdown', { clientX: colX('2026-10-29'), clientY: Y(13 * 60 + 5) });
    firePointer(chip, 'pointermove', { clientX: colX('2026-10-29'), clientY: Y(14 * 60 + 5) });
    firePointer(chip, 'pointerup', { clientX: colX('2026-10-29'), clientY: Y(14 * 60 + 5) });
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate).toHaveBeenCalledWith('b2', { startTime: '14:00', endTime: '15:00' });
    await waitFor(() => expect(mocked.mock.calls.length).toBe(fetches + 1));
    expect(status()).toHaveTextContent('Moved to Thu 14:00–15:00');

    // Resize +30 px via the handle (the refetched week still shows 13:00–14:00).
    mockedUpdate.mockClear();
    fetches = mocked.mock.calls.length;
    const handle = chipFor(/Errand/).querySelector('[data-resize-handle]')!;
    firePointer(handle, 'pointerdown', { clientX: colX('2026-10-29'), clientY: Y(14 * 60) });
    firePointer(handle, 'pointermove', { clientX: colX('2026-10-29'), clientY: Y(14 * 60 + 30) });
    firePointer(handle, 'pointerup', { clientX: colX('2026-10-29'), clientY: Y(14 * 60 + 30) });
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate).toHaveBeenCalledWith('b2', { endTime: '14:30' });
    await waitFor(() => expect(mocked.mock.calls.length).toBe(fetches + 1));
    expect(status()).toHaveTextContent('Resized to 13:00–14:30');
    await settle();
    // Cross-day move: PATCH carries the new date too.
    mockedUpdate.mockClear();
    const chip2 = chipFor(/Errand/);
    dragChip(chip2, Y(13 * 60 + 5), { x: colX('2026-10-30'), y: Y(13 * 60 + 5) });
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('b2', {
        startDate: '2026-10-30',
        startTime: '13:00',
        endTime: '14:00',
      })
    );
    await settle();
  });

  const strip = () => screen.getByTestId('drop-followup');
  const order = (...mocks: { mock: { invocationCallOrder: number[] } }[]) =>
    mocks.map((m) => m.mock.invocationCallOrder[0]);

  it("EP15K-AC1/AC4: weekly same-day move → no dialog; POST the one-off then cancel the occurrence; one sentence announced; the strip offers 'Apply to every week from here' and 'Undo' outside the live region", async () => {
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('b1', '2026-10-28'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockedCreate).toHaveBeenCalledWith({
      kind: 'BUSY',
      title: 'Work shift',
      startDate: '2026-10-28',
      startTime: '10:00',
      endTime: '11:00',
    });
    const [create, cancel] = order(mockedCreate, mockedCancel);
    expect(create).toBeLessThan(cancel);
    expect(mockedUpdate).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(status()).toHaveTextContent('Moved to Wed 10:00–11:00 for this day')
    );
    const followUp = strip();
    expect(
      within(followUp).getByRole('button', { name: 'Apply to every week from here' })
    ).toBeVisible();
    expect(within(followUp).getByRole('button', { name: 'Undo' })).toBeVisible();
    expect(status().contains(followUp)).toBe(false); // no controls inside the live region
    await settle();
  });

  it('EP15K-AC1: Apply (same-day move) → restore the occurrence, delete the one-off, then PATCH the series from this date (F-EP15K-01 order); announced; the strip closes', async () => {
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('b1', {
        startTime: '10:00',
        endTime: '11:00',
        effectiveFrom: '2026-10-28',
      })
    );
    expect(mockedRestore).toHaveBeenCalledWith('b1', '2026-10-28');
    expect(mockedDelete).toHaveBeenCalledWith('b9');
    const [restore, del, patch] = order(mockedRestore, mockedDelete, mockedUpdate);
    expect(restore).toBeLessThan(del);
    expect(del).toBeLessThan(patch);
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Moved to Wed 10:00–11:00 for this and following weeks, on all its days'
      )
    );
    expect(screen.queryByTestId('drop-followup')).toBeNull();
    await settle();
  });

  it('EP15K-AC1: weekly same-day resize → no dialog; Apply → PATCH { endTime, effectiveFrom }', async () => {
    await renderPage();
    const handle = chipFor(/Work shift/).querySelector('[data-resize-handle]')!;
    firePointer(handle, 'pointerdown', { clientX: colX('2026-10-28'), clientY: Y(10 * 60) });
    firePointer(handle, 'pointermove', { clientX: colX('2026-10-28'), clientY: Y(10 * 60 + 30) });
    firePointer(handle, 'pointerup', { clientX: colX('2026-10-28'), clientY: Y(10 * 60 + 30) });
    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('b1', '2026-10-28'));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(status()).toHaveTextContent('Resized to 09:00–10:30 for this day'));
    await user.click(screen.getByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('b1', {
        endTime: '10:30',
        effectiveFrom: '2026-10-28',
      })
    );
    expect(status()).toHaveTextContent(
      'Resized to 09:00–10:30 for this and following weeks, on all its days'
    );
    await settle();
  });

  it('EP15K-AC1: weekly cross-day drag (Mon/Wed/Fri, Wed → Thu) → no dialog, "just this day" announced; Apply reads the series and swaps Wed for Thu from this week: PATCH { weekdays: [1, 4, 5], startTime, endTime, effectiveFrom }', async () => {
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-29'), y: Y(9 * 60 + 5) });
    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('b1', '2026-10-28'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockedCreate).toHaveBeenCalledWith({
      kind: 'BUSY',
      title: 'Work shift',
      startDate: '2026-10-29',
      startTime: '09:00',
      endTime: '10:00',
    });
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        "Moved this day's Work shift to Thu 09:00–10:00; other weeks unchanged"
      )
    );
    await user.click(screen.getByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('b1', {
        weekdays: [1, 4, 5],
        startTime: '09:00',
        endTime: '10:00',
        effectiveFrom: '2026-10-28',
      })
    );
    const [restore, del, patch] = order(mockedRestore, mockedDelete, mockedUpdate);
    expect(restore).toBeLessThan(del);
    expect(del).toBeLessThan(patch);
    expect(status()).toHaveTextContent('Moved to Thu 09:00–10:00 for this and following weeks');
    await settle();
  });

  it('R-EP15K-04: a single-weekday series keeps the plain "for this and following weeks" sentence', async () => {
    mockedList.mockResolvedValue([{ ...blockRow, weekdays: [3] }]);
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(status()).toHaveTextContent('Moved to Wed 10:00–11:00 for this and following weeks')
    );
    expect(status()).not.toHaveTextContent('on all its days');
    await settle();
  });

  it('R-EP15K-01: cross-day Apply on a series whose first day is the dragged one, onto an earlier day, moves the series start so the dropped-on day keeps the block', async () => {
    // Wed-only series starting this Wednesday; its first occurrence dragged to Tue.
    mockedList.mockResolvedValue([{ ...blockRow, weekdays: [3], startDate: '2026-10-28' }]);
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-27'), y: Y(9 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('b1', {
        weekdays: [2],
        startTime: '09:00',
        endTime: '10:00',
        effectiveFrom: '2026-10-27',
        startDate: '2026-10-27',
      })
    );
    await settle();
  });

  it('R-EP15K-01: cross-day Apply on a series whose last day is the dragged one, onto a later day, extends the series end so the dropped-on day keeps the block', async () => {
    // Wed-only series ending this Wednesday; its last occurrence dragged to Thu.
    mockedList.mockResolvedValue([{ ...blockRow, weekdays: [3], endDate: '2026-10-28' }]);
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-29'), y: Y(9 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('b1', {
        weekdays: [4],
        startTime: '09:00',
        endTime: '10:00',
        effectiveFrom: '2026-10-28',
        endDate: '2026-10-29',
      })
    );
    await settle();
  });

  it('R-EP15K-05: an Apply failure says what state the week is in, per step', async () => {
    await renderPage();
    // Final PATCH fails → restore and delete happened → the day is back where it was.
    mockedUpdate.mockRejectedValueOnce(new Error('Network Error'));
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't change every week — this day is back where it was. Try again."
      )
    );
    await settle();
    // Delete fails after the restore → both show.
    mockedDelete.mockRejectedValueOnce(new Error('Network Error'));
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't change every week — this day shows twice; remove one from its details."
      )
    );
    await settle();
    // Restore fails first → nothing changed; the day's move stands.
    mockedRestore.mockRejectedValueOnce(new Error('Network Error'));
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't change every week — your move for this day still stands."
      )
    );
    await settle();
  });

  it('R-EP15K-03: the strip appears in a row that is always reserved, so the grid does not move', async () => {
    await renderPage();
    const row = screen.getByTestId('calendar-status-row');
    expect(row.className).toContain('min-h-9');
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    const followUp = await screen.findByTestId('drop-followup');
    expect(row.contains(followUp)).toBe(true);
    expect(row.contains(status())).toBe(true);
    await settle();
  });

  it('EP15K-AC1: cross-day Apply onto a weekday the series already has (Wed → Fri) changes nothing and says so in one sentence', async () => {
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-30'), y: Y(9 * 60 + 5) });
    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('b1', '2026-10-28'));
    await user.click(await screen.findByRole('button', { name: 'Apply to every week from here' }));
    await waitFor(() =>
      expect(status()).toHaveTextContent('This already repeats on Fri — change it from its details')
    );
    expect(mockedRestore).not.toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    // The day's move stands, and Undo is still offered.
    expect(within(strip()).getByRole('button', { name: 'Undo' })).toBeVisible();
    await settle();
  });

  it('EP15K-AC2: Undo restores exactly the prior state — one-off move → PATCH back; weekly "just this day" → restore the occurrence, then delete the one-off', async () => {
    await renderPage();
    // One-off move Thu 13:00 → 14:00, then Undo.
    const chip = chipFor(/Errand/);
    firePointer(chip, 'pointerdown', { clientX: colX('2026-10-29'), clientY: Y(13 * 60 + 5) });
    firePointer(chip, 'pointermove', { clientX: colX('2026-10-29'), clientY: Y(14 * 60 + 5) });
    firePointer(chip, 'pointerup', { clientX: colX('2026-10-29'), clientY: Y(14 * 60 + 5) });
    await waitFor(() => expect(status()).toHaveTextContent('Moved to Thu 14:00–15:00'));
    expect(
      within(strip()).queryByRole('button', { name: 'Apply to every week from here' })
    ).toBeNull();
    await user.click(within(strip()).getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenLastCalledWith('b2', { startTime: '13:00', endTime: '14:00' })
    );
    await waitFor(() => expect(status()).toHaveTextContent('Undone — back to Thu 13:00–14:00'));
    expect(screen.queryByTestId('drop-followup')).toBeNull();
    await settle();

    // Weekly "just this day", then Undo.
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('b9'));
    expect(mockedRestore).toHaveBeenCalledWith('b1', '2026-10-28');
    const [restore, del] = order(mockedRestore, mockedDelete);
    expect(restore).toBeLessThan(del);
    await waitFor(() => expect(status()).toHaveTextContent('Undone — back to Wed 09:00–10:00'));
    await settle();
  });

  it('EP15K-AC2: a failed Undo toasts, refetches the week and closes the strip', async () => {
    await renderPage();
    mockedRestore.mockRejectedValueOnce(new Error('Network Error'));
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Network Error'));
    expect(mockedDelete).not.toHaveBeenCalled(); // stop at the first failure — nothing is lost
    expect(screen.queryByTestId('drop-followup')).toBeNull();
    await settle();
  });

  it('EP15K-AC2: the strip closes after 10 seconds, and the timer waits while focus is inside it', async () => {
    await renderPage();
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-28'), y: Y(10 * 60 + 5) });
    await screen.findByTestId('drop-followup');
    // The suite fakes only Date; a second useFakeTimers call is ignored, so
    // swap to a timer-faking install for the countdown checks.
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00'));
    // Re-arm the countdown on the fake clock (hover in and out).
    fireEvent.pointerEnter(strip());
    fireEvent.pointerLeave(strip());
    // Focus inside pauses the countdown.
    act(() => within(strip()).getByRole('button', { name: 'Undo' }).focus());
    act(() => vi.advanceTimersByTime(FOLLOW_UP_MS + 1000));
    expect(screen.getByTestId('drop-followup')).toBeInTheDocument();
    // Focus leaves → a fresh 10 s, then it closes.
    act(() => (document.activeElement as HTMLElement).blur());
    act(() => vi.advanceTimersByTime(FOLLOW_UP_MS - 100));
    expect(screen.getByTestId('drop-followup')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByTestId('drop-followup')).toBeNull();
  });

  it('EP15H-AC2: cross-day POST fails → no cancel, toast, chip reverts; cancel fails after POST → refetch shows both and the EP15G-AC2 partial sentence is announced', async () => {
    await renderPage();
    mockedCreate.mockRejectedValueOnce(new Error('Network Error'));
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-29'), y: Y(9 * 60 + 5) });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Network Error'));
    expect(mockedCancel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('drag-ghost')).toBeNull(); // the ghost reverted
    expect(chipFor(/Work shift/)).toBeInTheDocument();
    await settle();

    // Cancel fails after the POST succeeded → both items show after refetch.
    mockedCancel.mockRejectedValueOnce(new Error('Network Error'));
    const duplicated = {
      ...payload,
      events: [
        weeklyBusy,
        oneOffBusy,
        {
          ...weeklyBusy,
          id: 'event:b9:2026-10-29',
          blockId: 'b9',
          date: '2026-10-29',
          recurring: false,
        },
      ],
    };
    mocked.mockResolvedValue(duplicated);
    dragChip(chipFor(/Work shift/), Y(9 * 60 + 5), { x: colX('2026-10-29'), y: Y(9 * 60 + 5) });
    await waitFor(() => expect(status()).toHaveTextContent(PARTIAL_SAVE_COPY));
    expect(await screen.findAllByRole('button', { name: /Work shift/ })).toHaveLength(2);
    await settle();
  });

  it('EP15H-AC2: a no-op drop (same place) issues no request, no prompt and no strip', async () => {
    await renderPage();
    const chip = chipFor(/Work shift/);
    firePointer(chip, 'pointerdown', { clientX: colX('2026-10-28'), clientY: Y(9 * 60 + 5) });
    firePointer(chip, 'pointermove', { clientX: colX('2026-10-28'), clientY: Y(9 * 60 + 25) });
    firePointer(chip, 'pointermove', { clientX: colX('2026-10-28'), clientY: Y(9 * 60 + 7) });
    firePointer(chip, 'pointerup', { clientX: colX('2026-10-28'), clientY: Y(9 * 60 + 7) });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedCancel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('drop-followup')).toBeNull();
    await settle();
  });

  it('EP15H-AC3: every pointer outcome has a sheet equivalent — the grid exposes exactly the three callbacks and nothing else', () => {
    // The parity table (AC-E15-10): gesture ↔ the form path that produces the
    // identical result. The grid's editable API is exactly these three.
    const parity: Array<{ gesture: (typeof EDIT_CALLBACKS)[number]; sheetPath: string }> = [
      { gesture: 'onCreateRange', sheetPath: 'Add → BlockSheet (date, start, end pre-filled)' },
      { gesture: 'onMove', sheetPath: 'Edit → BlockSheet Date / Start / End fields' },
      { gesture: 'onResize', sheetPath: 'Edit → BlockSheet End field' },
    ];
    expect(parity.map((p) => p.gesture)).toEqual([...EDIT_CALLBACKS]);
    expect(EDIT_CALLBACKS).toEqual(['onCreateRange', 'onMove', 'onResize']);
    // Weekly drops (EP15K D-K1): "just this day" always, with the series change
    // as a follow-up — the same two outcomes the sheet's prompt offers. Pin:
    const pin: ReadonlyArray<keyof WeekGridProps> = EDIT_CALLBACKS;
    expect(pin).toHaveLength(3);
  });

  it('EP15H-AC3: below sm (narrow) editable is false — the agenda has no drag surface (D-H3)', async () => {
    narrow = true;
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarPage />
      </Providers>
    );
    await screen.findByText(/Work shift/);
    expect(screen.getByRole('list', { name: 'Week agenda' })).toBeInTheDocument();
    expect(document.querySelector('[data-day]')).toBeNull(); // the grid is not rendered
    expect(document.querySelector('[data-resize-handle]')).toBeNull();
    expect(document.querySelector('.cursor-crosshair')).toBeNull();
  });
});
