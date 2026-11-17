import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import type { ScheduleBlock } from '@/entities/schedule-block/model/types';
import { BlockSheet, BOTTOM_SHEET_CLASSES, SERIES_HINT } from './BlockSheet';

vi.mock('@/entities/schedule-block/api/scheduleBlockApi', () => ({
  listScheduleBlocks: vi.fn(),
  createScheduleBlock: vi.fn(),
  updateScheduleBlock: vi.fn(),
  deleteScheduleBlock: vi.fn(),
  cancelOccurrence: vi.fn(),
}));
vi.mock('@/entities/course/api/courseApi', () => ({
  listCourses: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
import {
  cancelOccurrence,
  createScheduleBlock,
  listScheduleBlocks,
  updateScheduleBlock,
} from '@/entities/schedule-block/api/scheduleBlockApi';
import { listCourses } from '@/entities/course/api/courseApi';
import toast from 'react-hot-toast';

const mockedList = vi.mocked(listScheduleBlocks);
const mockedCreate = vi.mocked(createScheduleBlock);
const mockedUpdate = vi.mocked(updateScheduleBlock);
const mockedCancel = vi.mocked(cancelOccurrence);
const mockedCourses = vi.mocked(listCourses);

const user = userEvent.setup();

const row: ScheduleBlock = {
  id: 'b1',
  kind: 'BUSY',
  title: null,
  courseId: null,
  energy: null,
  startDate: '2026-10-14',
  endDate: null,
  weekdays: [3],
  startTime: '09:00',
  endTime: '10:00',
  createdAt: 'x',
  updatedAt: 'x',
};

const weeklyEvent: CalendarEvent = {
  id: 'event:b1:2026-10-28',
  type: 'EVENT',
  title: 'Busy',
  subtitle: null,
  date: '2026-10-28',
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
  recurring: true,
  energy: null,
};
const oneOffEvent: CalendarEvent = {
  ...weeklyEvent,
  id: 'event:b2:2026-10-28',
  blockId: 'b2',
  recurring: false,
};
const oneOffRow: ScheduleBlock = { ...row, id: 'b2', weekdays: null };

const apiError = (statusCode: number, message: string, errors?: Record<string, string[]>) => ({
  response: { data: { statusCode, message, errors } },
});

const renderCreate = (onSaved = vi.fn(), onClose = vi.fn()) => {
  render(
    <BlockSheet
      mode="create"
      initial={{ date: '2026-10-28', startTime: '11:00' }}
      onSaved={onSaved}
      onClose={onClose}
    />
  );
  return { onSaved, onClose };
};
const renderEdit = async (event: CalendarEvent, onSaved = vi.fn(), onClose = vi.fn()) => {
  render(<BlockSheet mode="edit" block={event} onSaved={onSaved} onClose={onClose} />);
  await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
  return { onSaved, onClose };
};
const dialog = () => screen.getByRole('dialog');
const save = () => within(dialog()).getByRole('button', { name: 'Save' });

describe('BlockSheet (EP15G)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedList.mockResolvedValue([row, oneOffRow]);
    mockedCourses.mockResolvedValue([
      { id: 'c1', code: 'CS101', name: 'Algorithms', isActive: true },
      { id: 'c2', code: 'OLD', name: 'Archived', isActive: false },
    ] as never);
    mockedCreate.mockResolvedValue(row);
    mockedUpdate.mockResolvedValue(row);
    mockedCancel.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
  });

  it("EP15G-AC1: create mode shows Busy checked, Title with placeholder 'Busy', Date, Start, End, 'Repeats weekly' off, no chips, and no 'More' for a one-off Busy block", () => {
    renderCreate();
    expect(screen.getByRole('dialog', { name: 'Add to calendar' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Busy' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Study' })).not.toBeChecked();
    expect(screen.getByLabelText('Title (optional)')).toHaveAttribute('placeholder', 'Busy');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-28');
    expect(screen.getByLabelText('Start')).toHaveValue('11:00');
    expect(screen.getByLabelText('End')).toHaveValue('12:00');
    expect(screen.getByRole('switch', { name: 'Repeats weekly' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.queryByRole('group', { name: 'On these days' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Busy' })).toHaveFocus();
  });

  it("EP15G-AC1: switching to Study changes the placeholder to 'Study' and reveals 'More' (Course, Energy default Normal)", async () => {
    renderCreate();
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    expect(screen.getByLabelText('Title (optional)')).toHaveAttribute('placeholder', 'Study');
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(await screen.findByLabelText('Course')).toBeInTheDocument();
    expect(screen.getByLabelText('Energy')).toHaveValue('NORMAL');
  });

  it("EP15G-AC1: 'Repeats weekly' on reveals seven chips Mon…Sun with the date's weekday checked and 'More' gains 'Ends on'; the Date label reads 'Starts on'", async () => {
    renderCreate();
    await user.click(screen.getByRole('switch', { name: 'Repeats weekly' }));
    const group = screen.getByRole('group', { name: 'On these days' });
    const boxes = within(group).getAllByRole('checkbox');
    expect(boxes.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(within(group).getByRole('checkbox', { name: 'Wednesday' })).toBeChecked(); // 2026-10-28
    expect(boxes.filter((b) => (b as HTMLInputElement).checked)).toHaveLength(1);
    expect(screen.getByLabelText('Starts on')).toHaveValue('2026-10-28');
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByLabelText('Ends on')).toBeInTheDocument();
    expect(screen.queryByLabelText('Course')).toBeNull(); // Busy
  });

  it("EP15G-AC1: 'More' is collapsed by default (aria-expanded=false) and its fields are absent from the DOM until expanded", async () => {
    renderCreate();
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    const more = screen.getByRole('button', { name: 'More' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Energy')).toBeNull();
    await user.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Energy')).toBeInTheDocument();
  });

  it("EP15G-AC1: Save with defaults POSTs { kind: 'BUSY', startDate, startTime, endTime } and nothing else", async () => {
    const { onSaved } = renderCreate();
    await user.click(save());
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith({
      kind: 'BUSY',
      startDate: '2026-10-28',
      startTime: '11:00',
      endTime: '12:00',
    });
    expect(onSaved).toHaveBeenCalledWith({ kind: 'BUSY', action: 'created' });
  });

  it('EP15G-AC1: Save of a weekly Study block with course/energy/Ends on POSTs the full body with ascending weekdays', async () => {
    const { onSaved } = renderCreate();
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    await user.type(screen.getByLabelText('Title (optional)'), ' Deep work ');
    await user.click(screen.getByRole('switch', { name: 'Repeats weekly' }));
    await user.click(screen.getByRole('checkbox', { name: 'Monday' }));
    await user.click(screen.getByRole('checkbox', { name: 'Friday' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.change(screen.getByLabelText('Ends on'), { target: { value: '2026-12-16' } });
    await screen.findByRole('option', { name: 'CS101 — Algorithms' });
    await user.selectOptions(screen.getByLabelText('Course'), 'c1');
    await user.selectOptions(screen.getByLabelText('Energy'), 'HIGH');
    await user.click(save());
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith({
      kind: 'STUDY',
      title: 'Deep work',
      startDate: '2026-10-28',
      startTime: '11:00',
      endTime: '12:00',
      weekdays: [1, 3, 5],
      endDate: '2026-12-16',
      courseId: 'c1',
      energy: 'HIGH',
    });
    expect(onSaved).toHaveBeenCalledWith({ kind: 'STUDY', action: 'created' });
  });

  it('EP15G-AC1: a 400 with errors.startTime renders under Start; errors.weekdays under the chips group; errors.courseId under Course', async () => {
    mockedCreate.mockRejectedValue(
      apiError(400, 'Validation failed', {
        startTime: ['startTime must be before endTime'],
        weekdays: ['weekdays must hold at least one day'],
        courseId: ['courseId applies to study blocks only'],
      })
    );
    const { onSaved } = renderCreate();
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    await user.click(screen.getByRole('switch', { name: 'Repeats weekly' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    await screen.findByRole('option', { name: 'No course' });
    await user.click(save());
    expect(await screen.findByText('startTime must be before endTime')).toBeInTheDocument();
    expect(screen.getByLabelText('Start')).toHaveAccessibleDescription(
      'startTime must be before endTime'
    );
    expect(screen.getByRole('group', { name: 'On these days' })).toHaveAccessibleDescription(
      'weekdays must hold at least one day'
    );
    expect(screen.getByLabelText('Course')).toHaveAccessibleDescription(
      'courseId applies to study blocks only'
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('EP15G-AC1: a foreign-course 404 renders the uniform message as a form-level alert and keeps the values', async () => {
    mockedCreate.mockRejectedValue(apiError(404, 'Resource not found'));
    renderCreate();
    await user.type(screen.getByLabelText('Title (optional)'), 'Shift');
    await user.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Resource not found — it may no longer exist.'
    );
    expect(screen.getByLabelText('Title (optional)')).toHaveValue('Shift');
    expect(screen.queryByText(/yours|not yours|another student/i)).toBeNull();
  });

  it("EP15G-AC1: course list — loads once when Study is selected; shows 'Loading courses…' then options 'No course' + 'CODE — Name'; a load failure hides the select with the note (D-G8)", async () => {
    let resolve: (v: never) => void = () => undefined;
    mockedCourses.mockImplementation(() => new Promise((r) => (resolve = r as (v: never) => void)));
    renderCreate();
    expect(mockedCourses).not.toHaveBeenCalled(); // Busy never pays for the request
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(mockedCourses).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('option', { name: 'Loading courses…' })).toBeDisabled();
    resolve([
      { id: 'c1', code: 'CS101', name: 'Algorithms', isActive: true },
      { id: 'c2', code: 'OLD', name: 'Archived', isActive: false },
    ] as never);
    expect(await screen.findByRole('option', { name: 'No course' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CS101 — Algorithms' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Archived/ })).toBeNull();
    // Toggling kind back and forth does not refetch.
    await user.click(screen.getByRole('radio', { name: 'Busy' }));
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    expect(mockedCourses).toHaveBeenCalledTimes(1);
    cleanup();

    mockedCourses.mockReset();
    mockedCourses.mockRejectedValue(new Error('boom'));
    renderCreate();
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(
      await screen.findByText("Couldn't load your courses — you can tie a course later.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Course')).toBeNull();
    expect(screen.getByLabelText('Energy')).toBeInTheDocument();
  });

  it("EP15G-AC2: edit mode hides the kind toggle, pre-fills every field, auto-expands 'More' when any of its values is non-default", async () => {
    mockedList.mockResolvedValue([
      {
        ...row,
        kind: 'STUDY',
        title: 'Deep work',
        courseId: 'c1',
        energy: 'LOW',
        endDate: '2026-12-16',
        weekdays: [1, 3],
      },
    ]);
    await renderEdit({
      ...weeklyEvent,
      type: 'STUDY_BLOCK',
      title: 'Deep work',
      courseId: 'c1',
      courseName: 'Algorithms',
      energy: 'LOW',
    });
    expect(screen.getByRole('dialog', { name: 'Edit Deep work' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByLabelText('Title (optional)')).toHaveValue('Deep work');
    await waitFor(() => expect(screen.getByLabelText('Title (optional)')).toHaveFocus());
    expect(screen.getByLabelText('Starts on')).toHaveValue('2026-10-28');
    expect(screen.getByLabelText('Start')).toHaveValue('09:00');
    expect(screen.getByLabelText('End')).toHaveValue('10:00');
    expect(screen.getByRole('switch', { name: 'Repeats weekly' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wednesday' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Friday' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Ends on')).toHaveValue('2026-12-16');
    expect(screen.getByLabelText('Energy')).toHaveValue('LOW');
    await waitFor(() => expect(screen.getByLabelText('Course')).toHaveValue('c1'));
  });

  it('EP15G-AC2: Save on a one-off PATCHes in place, no prompt', async () => {
    const { onSaved } = await renderEdit(oneOffEvent);
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '11:00' } });
    await user.click(save());
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate).toHaveBeenCalledWith('b2', { startTime: '10:00', endTime: '11:00' });
    expect(screen.queryByTestId('weekly-choice-prompt')).toBeNull();
    expect(onSaved).toHaveBeenCalledWith({ kind: 'BUSY', action: 'updated' });
  });

  it("EP15G-AC2: Save on a weekly item shows the prompt 'This repeats weekly. Apply your change to:' with exactly two choice buttons and a Back button", async () => {
    await renderEdit(weeklyEvent);
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '08:00' } });
    await user.click(save());
    const prompt = await screen.findByTestId('weekly-choice-prompt');
    expect(prompt).toHaveTextContent('This repeats weekly. Apply your change to:');
    const buttons = within(prompt)
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(buttons).toEqual(['Just this day', 'This and following', 'Back']);
    expect(within(prompt).getByRole('button', { name: 'Just this day' })).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Edit Busy' })).toBeInTheDocument(); // same dialog
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("EP15G-AC2: 'Just this day' → POST one-off first, then DELETE occurrence; the sheet closes after both and onSaved reports 'this-day'", async () => {
    const order: string[] = [];
    mockedCreate.mockImplementation(async () => {
      order.push('post');
      return row;
    });
    mockedCancel.mockImplementation(async () => {
      order.push('cancel');
    });
    const { onSaved } = await renderEdit(weeklyEvent);
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '08:00' } });
    await user.click(save());
    await user.click(await screen.findByRole('button', { name: 'Just this day' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ kind: 'BUSY', action: 'this-day' }));
    expect(order).toEqual(['post', 'cancel']);
    expect(mockedCreate).toHaveBeenCalledWith({
      kind: 'BUSY',
      startDate: '2026-10-28',
      startTime: '08:00',
      endTime: '10:00',
    });
    expect(mockedCancel).toHaveBeenCalledWith('b1', '2026-10-28');
  });

  it("EP15G-AC2: 'Just this day' — POST fails → no cancel request, the error shows in the sheet, nothing announced", async () => {
    mockedCreate.mockRejectedValue(
      apiError(400, 'Validation failed', { endTime: ['endTime must be after startTime'] })
    );
    const { onSaved } = await renderEdit(weeklyEvent);
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '08:00' } });
    await user.click(save());
    await user.click(await screen.findByRole('button', { name: 'Just this day' }));
    expect(await screen.findByText('endTime must be after startTime')).toBeInTheDocument();
    expect(mockedCancel).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Start')).toHaveValue('08:00'); // back on the form, values kept
  });

  it("EP15G-AC2: 'Just this day' — cancel fails after POST → onSaved reports 'this-day-partial' and the sheet closes", async () => {
    mockedCancel.mockRejectedValue(new Error('Network Error'));
    const { onSaved } = await renderEdit(weeklyEvent);
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '08:00' } });
    await user.click(save());
    await user.click(await screen.findByRole('button', { name: 'Just this day' }));
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({ kind: 'BUSY', action: 'this-day-partial' })
    );
    expect(toast.error).not.toHaveBeenCalled(); // the page announces the AC2 sentence instead
  });

  it("EP15G-AC2: 'This and following' → one PATCH with effectiveFrom = the item's date", async () => {
    const { onSaved } = await renderEdit(weeklyEvent);
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '08:00' } });
    await user.click(save());
    await user.click(await screen.findByRole('button', { name: 'This and following' }));
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({ kind: 'BUSY', action: 'following' })
    );
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith('b1', {
      startTime: '08:00',
      effectiveFrom: '2026-10-28',
    });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('EP15G-AC2: Back on the prompt returns to the form with values intact; Escape on the prompt does the same; no request', async () => {
    const { onClose } = await renderEdit(weeklyEvent);
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '08:00' } });
    await user.click(save());
    await user.click(await screen.findByRole('button', { name: 'Back' }));
    expect(screen.queryByTestId('weekly-choice-prompt')).toBeNull();
    expect(screen.getByLabelText('Start')).toHaveValue('08:00');
    await waitFor(() => expect(save()).toHaveFocus());
    await user.click(save());
    await screen.findByTestId('weekly-choice-prompt');
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('weekly-choice-prompt')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // the sheet did not close
    expect(onClose).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("EP15G-AC2: a weekly item whose weekdays, Ends on or weekly switch changed saves as 'This and following' without the prompt and shows the hint (D-G10)", async () => {
    const { onSaved } = await renderEdit(weeklyEvent);
    expect(screen.getByRole('group', { name: 'On these days' })).toHaveAccessibleDescription(
      SERIES_HINT
    );
    await user.click(screen.getByRole('checkbox', { name: 'Friday' }));
    await user.click(save());
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({ kind: 'BUSY', action: 'following' })
    );
    expect(screen.queryByTestId('weekly-choice-prompt')).toBeNull();
    expect(mockedUpdate).toHaveBeenCalledWith('b1', {
      weekdays: [3, 5],
      effectiveFrom: '2026-10-28',
    });
    cleanup();

    // Switching "Repeats weekly" off → weekdays/endDate null with effectiveFrom (contracts § PATCH).
    mockedUpdate.mockClear();
    const second = await renderEdit(weeklyEvent);
    await user.click(screen.getByRole('switch', { name: 'Repeats weekly' }));
    await user.click(save());
    await waitFor(() =>
      expect(second.onSaved).toHaveBeenCalledWith({ kind: 'BUSY', action: 'following' })
    );
    expect(mockedUpdate).toHaveBeenCalledWith('b1', {
      weekdays: null,
      endDate: null,
      effectiveFrom: '2026-10-28',
    });
  });

  it('EP15G-AC4: Escape closes (frozen while submitting), focus returns to the trigger, Save is disabled while in flight (duplicate-submit guard)', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    let resolve: (v: ScheduleBlock) => void = () => undefined;
    mockedCreate.mockImplementation(() => new Promise((r) => (resolve = r)));
    const onClose = vi.fn();
    renderCreate(vi.fn(), onClose);
    await user.click(save());
    await waitFor(() => expect(dialog()).toHaveAttribute('aria-busy', 'true'));
    expect(save()).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled(); // frozen
    await user.click(save());
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    resolve(row);
    await waitFor(() => expect(dialog()).not.toHaveAttribute('aria-busy', 'true'));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("EP15G-AC4: chips are a fieldset with legend 'On these days' holding seven checkboxes named Monday…Sunday; Space toggles; tab enters the group once", async () => {
    renderCreate();
    await user.click(screen.getByRole('switch', { name: 'Repeats weekly' }));
    const group = screen.getByRole('group', { name: 'On these days' });
    expect(group.tagName).toBe('FIELDSET');
    const boxes = within(group).getAllByRole('checkbox');
    expect(boxes).toHaveLength(7);
    const monday = within(group).getByRole('checkbox', { name: 'Monday' });
    // Tab from the switch lands on the first chip (Monday).
    screen.getByRole('switch', { name: 'Repeats weekly' }).focus();
    await user.tab();
    expect(monday).toHaveFocus();
    await user.keyboard(' ');
    expect(monday).toBeChecked();
    await user.keyboard(' ');
    expect(monday).not.toBeChecked();
  });

  it('EP15G-AC4: at a narrow viewport every control has min-h-[44px] and the dialog carries the bottom-sheet classes (D-G7)', async () => {
    renderCreate();
    await user.click(screen.getByRole('radio', { name: 'Study' }));
    await user.click(screen.getByRole('switch', { name: 'Repeats weekly' }));
    for (const cls of BOTTOM_SHEET_CLASSES.split(' ')) expect(dialog().className).toContain(cls);
    const controls = [
      screen.getByLabelText('Title (optional)'),
      screen.getByLabelText('Starts on'),
      screen.getByLabelText('Start'),
      screen.getByLabelText('End'),
      screen.getByRole('switch', { name: 'Repeats weekly' }),
      screen.getByRole('button', { name: 'More' }),
      screen.getByRole('button', { name: 'Cancel' }),
      save(),
    ];
    for (const el of controls) expect(el.className).toMatch(/max-sm:min-h-\[44px\]/);
    // Pills: the label wrapping each (sr-only) checkbox carries the height.
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box.closest('label')?.className).toMatch(/max-sm:min-h-\[44px\]/);
    }
  });
});
