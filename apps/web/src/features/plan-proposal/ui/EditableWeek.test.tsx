import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import type { PlanConflict, ProposedSession } from '@/entities/study-plan/model/types';
import { expectNoForbiddenWords, renderedStrings } from '@/test/forbiddenWords';
import { EditableWeek } from './EditableWeek';

vi.mock('react-hot-toast', () => {
  const fn = vi.fn();
  return { default: Object.assign(fn, { dismiss: vi.fn(), success: vi.fn(), error: vi.fn() }) };
});

const DAYS = [
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
];

function session(partial: Partial<ProposedSession>): ProposedSession {
  return {
    assignmentId: 'a-1',
    assignmentTitle: 'Essay',
    date: '2026-10-30',
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 60,
    anchor: 'FIXED',
    windowHint: null,
    ...partial,
  };
}

/** Stateful harness: `onChange` round-trips like `useProposal.setEdited`. */
function Harness({
  initial,
  conflicts,
}: {
  initial: ProposedSession[];
  conflicts?: PlanConflict[];
}) {
  const [sessions, setSessions] = useState(initial);
  return (
    <EditableWeek
      sessions={sessions}
      days={DAYS}
      onChange={setSessions}
      conflicts={conflicts}
      timeZone="America/New_York"
    />
  );
}

const twoSessions = () => [
  session({ assignmentTitle: 'Essay' }),
  session({
    assignmentId: 'a-2',
    assignmentTitle: 'Reading',
    startTime: '11:00',
    endTime: '12:00',
  }),
];

describe('EditableWeek (EP17E, AC-E17-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each day exactly once and renders no PlanWeek or PlanSessionEditor', () => {
    const { container } = render(<Harness initial={twoSessions()} />);
    expect(screen.queryByTestId('plan-week')).toBeNull();
    expect(screen.queryByTestId('plan-session-editor')).toBeNull();
    expect(container.querySelectorAll('[data-testid="editable-week"] > section')).toHaveLength(7);
    // A day with no sessions reads "No sessions" (EP17E-AC7).
    expect(screen.getAllByText('No sessions')).toHaveLength(6);
  });

  it('opens one session panel at a time and closes the previous one', async () => {
    const user = userEvent.setup();
    render(<Harness initial={twoSessions()} />);
    const essay = screen.getByRole('button', { name: /essay 09:00/i });
    const reading = screen.getByRole('button', { name: /reading 11:00/i });

    await user.click(essay);
    expect(essay).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByTestId('session-editor-panel')).toHaveLength(1);
    expect(essay).toHaveAttribute('aria-controls', 'editable-session-panel-0');
    expect(screen.getByTestId('session-editor-panel')).toHaveAttribute(
      'id',
      'editable-session-panel-0'
    );

    await user.click(reading);
    expect(essay).toHaveAttribute('aria-expanded', 'false');
    expect(reading).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByTestId('session-editor-panel')).toHaveLength(1);
  });

  it('Escape closes the open panel and returns focus to its disclosure button (keyboard path)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={twoSessions()} />);
    const essay = screen.getByRole('button', { name: /essay 09:00/i });
    essay.focus();
    await user.keyboard('{Enter}');
    expect(essay).toHaveAttribute('aria-expanded', 'true');

    screen.getByRole('button', { name: 'Move later 15 minutes' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('session-editor-panel')).toBeNull();
    expect(essay).toHaveFocus();
  });

  it('changing the day moves the card to the new day section and keeps focus on its disclosure button; the announcement names the new day in human form', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={twoSessions()} />);
    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    await user.selectOptions(screen.getByLabelText('Day'), '2026-11-02');

    const monday = container.querySelector(
      'section[aria-labelledby="editable-week-day-2026-11-02"]'
    );
    expect(monday).toHaveTextContent('Essay');
    const button = screen.getByRole('button', { name: /essay 09:00/i });
    await waitFor(() => expect(button).toHaveFocus());
    // Still open after the move, and announced with the human label (D-E5).
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('[role="status"]')).toHaveTextContent(
      'Essay moved to Mon, Nov 2'
    );
  });

  it('typing a start time pins a flexible session and announces it', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness initial={[session({ anchor: 'FLEX_DAY', windowHint: 'MORNING' })]} />
    );
    await user.click(screen.getByRole('button', { name: /essay/i }));
    const start = screen.getByLabelText('Start time');
    // One committed value, like a native time-picker commit.
    fireEvent.change(start, { target: { value: '10:30' } });
    expect(container.querySelector('[role="status"]')).toHaveTextContent(
      /Essay pinned to .* — you chose a time/
    );
    // Pinned: the toggle now offers "Make flexible".
    expect(screen.getByRole('button', { name: /make flexible: essay/i })).toBeInTheDocument();
  });

  it('Lengthen and Shorten change the duration and do not change the anchor (resizing never pins)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[session({ anchor: 'FLEX_DAY', windowHint: 'MORNING' })]} />);
    await user.click(screen.getByRole('button', { name: /essay/i }));

    await user.click(screen.getByRole('button', { name: 'Lengthen 15 minutes' }));
    expect(screen.getByLabelText('End time')).toHaveValue('10:15');
    await user.click(screen.getByRole('button', { name: 'Shorten 15 minutes' }));
    expect(screen.getByLabelText('End time')).toHaveValue('10:00');
    // Still flexible — the pin toggle still offers "Pin to this time" (D-H5).
    expect(screen.getByRole('button', { name: /pin to this time/i })).toBeInTheDocument();
  });

  it('Make flexible derives the window hint from the current start (D-H6) — never a stale hint', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[session({ startTime: '14:00', endTime: '15:00' })]} />);
    await user.click(screen.getByRole('button', { name: /essay 14:00/i }));
    await user.click(screen.getByRole('button', { name: /make flexible: essay/i }));
    // 14:00 → afternoon; the card meta now carries the derived hint.
    expect(screen.getByRole('button', { name: /afternoon suggested/i })).toBeInTheDocument();
  });

  it('deleting focuses the next session in the day; deleting the last session in a day focuses the day heading; Undo restores the session at its original position', async () => {
    const user = userEvent.setup();
    render(<Harness initial={twoSessions()} />);

    // Delete the first of two same-day sessions → the next card's button.
    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    await user.click(screen.getByRole('button', { name: 'Delete session' }));
    const reading = screen.getByRole('button', { name: /reading 11:00/i });
    await waitFor(() => expect(reading).toHaveFocus());
    expect(screen.queryByRole('button', { name: /essay 09:00/i })).toBeNull();

    // Undo restores it at its original position with focus on its button.
    const toastRender = vi.mocked(toast).mock.calls[0][0] as (t: { id: string }) => JSX.Element;
    render(toastRender({ id: 't1' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    const essay = await screen.findByRole('button', { name: /essay 09:00/i });
    await waitFor(() => expect(essay).toHaveFocus());

    // Delete both → the emptied day's heading takes focus (tabIndex -1).
    await user.click(essay);
    await user.click(screen.getByRole('button', { name: 'Delete session' }));
    await user.click(screen.getByRole('button', { name: /reading 11:00/i }));
    await user.click(screen.getByRole('button', { name: 'Delete session' }));
    const heading = screen.getByRole('heading', { level: 3, name: 'Fri, Oct 30' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(document.body).not.toBe(document.activeElement);
  });

  it('a conflicted session is open on arrival, names its reason and is marked by text as well as by border', () => {
    const conflicts: PlanConflict[] = [
      { sessionIndex: 1, date: '2026-10-30', startTime: '11:00', reason: 'OVERLAPS_CLASS' },
    ];
    const { container } = render(<Harness initial={twoSessions()} conflicts={conflicts} />);
    const card = container.querySelector('[data-session-index="1"]');
    expect(card).toHaveAttribute('data-conflicted');
    expect(card?.className).toContain('border-danger');
    expect(card).toHaveTextContent('This overlaps a class');
    // Open on arrival (EP17E-AC6).
    expect(screen.getByRole('button', { name: /reading 11:00/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('session-editor-panel')).toBeInTheDocument();
  });

  it('an edit that would move a session past midnight is refused and leaves the session unchanged', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[session({ startTime: '23:30', endTime: '23:50' })]} />);
    await user.click(screen.getByRole('button', { name: /essay 23:30/i }));

    await user.click(screen.getByRole('button', { name: 'Move later 15 minutes' }));
    expect(screen.getByLabelText('Start time')).toHaveValue('23:30');
    expect(screen.getByLabelText('End time')).toHaveValue('23:50');
    await user.click(screen.getByRole('button', { name: 'Lengthen 15 minutes' }));
    expect(screen.getByLabelText('End time')).toHaveValue('23:50');
  });

  it('no rendered string matches an ISO date, including aria-labels except the zone-free group label (EP17E-AC5, V-17-4)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={twoSessions()} />);
    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    for (const text of renderedStrings(container)) {
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    }
    // The in-panel day select's options read as human labels (D-E5).
    expect(screen.getByRole('option', { name: 'Wed, Nov 4' })).toBeInTheDocument();
  });

  it('passes the copy audit', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={twoSessions()} />);
    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    expectNoForbiddenWords(container);
  });

  it('below md the week is a single column stack and at md a seven-column grid (class contract, EP17E-AC8)', () => {
    render(<Harness initial={twoSessions()} />);
    const grid = screen.getByTestId('editable-week');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('md:grid-cols-7');
  });

  it('the open panel spans the full grid width at md (class contract, D-E6)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={twoSessions()} />);
    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    const panel = screen.getByTestId('session-editor-panel');
    expect(panel.className).toContain('md:col-span-7');
    expect(panel.className).toContain('md:order-last');
    // …and it is a grid sibling, not nested inside a ~140px day column.
    expect(panel.parentElement).toBe(screen.getByTestId('editable-week'));
  });
});
