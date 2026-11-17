import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { CalendarEventDetails } from './CalendarEventDetails';
import type { CalendarEvent } from '@/entities/calendar/model/types';

const event: CalendarEvent = {
  id: 'e1',
  type: 'ASSIGNMENT_DEADLINE',
  title: 'Essay',
  subtitle: 'ENG101',
  date: '2026-10-27',
  startTime: '09:00',
  endTime: null,
  courseId: 'c1',
  courseName: 'English',
  courseColor: '#6366f1',
  assignmentId: 'a1',
  completed: false,
  focus: false,
  link: '/courses/c1',
};

describe('CalendarEventDetails (SP-127B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDialog = () =>
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={event} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );

  it('renders fields, completed state, and course link', () => {
    renderDialog();
    expect(screen.getByText('Essay')).toBeInTheDocument();
    expect(screen.getByText('Assignment')).toBeInTheDocument();
    expect(screen.getByText('Not completed')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'English' });
    expect(link).toHaveAttribute('href', '/courses/c1');
  });

  it('closes on Escape and returns focus to trigger', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={event} timeZone="America/New_York" onClose={onClose} />
      </Providers>
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('renders without crashing', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // ============ EP13H2 (F-EP13H-03) — flex planned sessions ============

  it('a FLEX_DAY planned session reads Time: Anytime with a labelled suggestion row', () => {
    const flex: CalendarEvent = {
      ...event,
      type: 'PLANNED_SESSION',
      title: 'Problem set 3',
      endTime: '10:00',
      anchor: 'FLEX_DAY',
    };
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={flex} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );
    expect(screen.getByText('Anytime')).toBeInTheDocument();
    // The engine's slot survives, but only under an honest label.
    expect(screen.getByText('Suggested')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
  });

  it('a FIXED planned session and every other type keep the plain time row', () => {
    const fixed: CalendarEvent = {
      ...event,
      type: 'PLANNED_SESSION',
      endTime: '10:00',
      anchor: 'FIXED',
    };
    const { unmount } = render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={fixed} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );
    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(screen.queryByText('Anytime')).not.toBeInTheDocument();
    expect(screen.queryByText('Suggested')).not.toBeInTheDocument();
    unmount();

    renderDialog(); // the ASSIGNMENT_DEADLINE base event (no anchor at all)
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('Anytime')).not.toBeInTheDocument();
  });

  // ============ EP15E — schedule blocks and the actions slot ============

  const busy: CalendarEvent = {
    ...event,
    id: 'event:b1:2026-10-27',
    type: 'EVENT',
    title: 'Dentist',
    subtitle: null,
    endTime: '10:30',
    courseId: null,
    courseName: null,
    courseColor: null,
    assignmentId: null,
    link: null,
    blockId: 'b1',
    recurring: false,
    energy: null,
  };

  it("EP15E-AC1: EVENT shows Type 'Busy', Date, Time and 'Repeats: Weekly' only when recurring", () => {
    const { unmount } = render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={busy} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );
    expect(screen.getByText('Busy')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:30')).toBeInTheDocument();
    expect(screen.queryByText('Repeats')).toBeNull();
    expect(screen.queryByText('Status')).toBeNull();
    unmount();
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails
          event={{ ...busy, recurring: true }}
          timeZone="America/New_York"
          onClose={vi.fn()}
        />
      </Providers>
    );
    expect(screen.getByText('Repeats')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.queryByText(/recurrence|series|exception/i)).toBeNull();
  });

  it("EP15E-AC1: STUDY_BLOCK shows Type 'Study block', Course link when tied, Energy text, and 'Repeats' when recurring", () => {
    const block: CalendarEvent = {
      ...busy,
      type: 'STUDY_BLOCK',
      title: 'Deep work',
      subtitle: 'CS101',
      courseId: 'c1',
      courseName: 'Algorithms',
      courseColor: '#123456',
      recurring: true,
      energy: 'LOW',
    };
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={block} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );
    expect(screen.getByText('Study block')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Algorithms' })).toHaveAttribute('href', '/courses/c1');
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText('Low energy')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('EP15E-AC1: an actions slot renders inside the footer when provided (EP15G hook); Close stays last', () => {
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails
          event={busy}
          timeZone="America/New_York"
          onClose={vi.fn()}
          actions={<button type="button">Edit</button>}
        />
      </Providers>
    );
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toContain('Edit');
    expect(buttons.at(-1)).toBe('Close');
    expect(screen.getByTestId('details-actions')).toContainElement(
      screen.getByRole('button', { name: 'Edit' })
    );
  });

  // ============ EP15G — Edit / Remove in the actions slot (D-G5) ============

  it('EP15G-AC2: EVENT/STUDY_BLOCK details show Edit and Remove; other kinds show neither', () => {
    const view = render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails
          event={busy}
          timeZone="America/New_York"
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </Providers>
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Remove', 'Edit', 'Close']);
    view.unmount();
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails
          event={event}
          timeZone="America/New_York"
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </Providers>
    );
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  it("EP15G-AC2: Remove on a one-off swaps the footer to 'Remove this? Yes, remove / No' (D-G5); Yes calls onDelete({ mode: 'all' }); No restores the footer", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onEdit = vi.fn();
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails
          event={{ ...busy, recurring: false }}
          timeZone="America/New_York"
          onClose={vi.fn()}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Providers>
    );
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const confirm = screen.getByTestId('details-confirm');
    expect(confirm).toHaveTextContent('Remove this?');
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull(); // one footer at a time
    expect(screen.getAllByRole('dialog')).toHaveLength(1); // never a stacked dialog
    expect(screen.getByRole('button', { name: 'No' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(screen.queryByTestId('details-confirm')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toHaveFocus());
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Yes, remove' }));
    expect(onDelete).toHaveBeenCalledWith('all');
    // Edit hands off to the page.
    await waitFor(() => expect(screen.queryByTestId('details-confirm')).toBeNull());
  });

  it("EP15G-AC2: Remove on a weekly item swaps the footer to the prompt 'This repeats weekly. Remove it for:'; the two answers call onDelete with 'this-day' / 'following'", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails
          event={{ ...busy, recurring: true }}
          timeZone="America/New_York"
          onClose={onClose}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />
      </Providers>
    );
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const prompt = screen.getByTestId('weekly-choice-prompt');
    expect(prompt).toHaveTextContent('This repeats weekly. Remove it for:');
    expect(screen.getByRole('button', { name: 'Just this day' })).toHaveFocus();
    // Escape on the prompt is Back, not close.
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('weekly-choice-prompt')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Just this day' }));
    expect(onDelete).toHaveBeenLastCalledWith('this-day');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'This and following' }));
    expect(onDelete).toHaveBeenLastCalledWith('following');
    expect(onDelete).toHaveBeenCalledTimes(2);
  });
});
