import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { Providers } from '@/test/providers';
import type { AssignmentListItem, Subtask } from '@/shared/types/academic';
import { UpcomingDeadlinesSection } from './UpcomingDeadlinesSection';

const TIME_ZONE = 'America/New_York';

/** A due date far in the past — overdue (the shared predicate reads the clock). */
const PAST = '2020-01-05T12:00:00.000Z';
/** A due date far in the future — not overdue. */
const FUTURE = '2999-12-31T12:00:00.000Z';

function makeSubtask(id: string, status: Subtask['status'], orderIndex: number): Subtask {
  return {
    id,
    title: `Subtask ${id}`,
    status,
    orderIndex,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  };
}

function makeAssignment(overrides: Partial<AssignmentListItem> = {}): AssignmentListItem {
  return {
    id: 'a1',
    title: 'Problem set 3',
    description: null,
    dueDate: FUTURE,
    estimatedHours: null,
    actualHours: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    type: 'HOMEWORK',
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    course: { id: 'c1', name: 'Calculus', code: 'MATH101', color: '#10b981' },
    subtasks: [],
    ...overrides,
  };
}

const renderSection = (props: Partial<ComponentProps<typeof UpcomingDeadlinesSection>> = {}) =>
  render(
    <Providers initialEntries={['/dashboard']}>
      <UpcomingDeadlinesSection
        rows={[]}
        timeZone={TIME_ZONE}
        status="ready"
        onRetry={vi.fn()}
        onOpenDetails={vi.fn()}
        emptyState={{ title: 'No upcoming deadlines.' }}
        {...props}
      />
    </Providers>
  );

describe('UpcomingDeadlinesSection (EP05B)', () => {
  it('renders each unfinished, not-overdue assignment with its title, course and due date', () => {
    renderSection({
      rows: [
        makeAssignment({ id: 'a1', title: 'Problem set 3' }),
        makeAssignment({
          id: 'a2',
          title: 'Reading response',
          dueDate: '2999-06-01T12:00:00.000Z',
          course: { id: 'c2', name: 'Physics', code: 'PHYS201', color: '#3b82f6' },
        }),
      ],
    });

    expect(screen.getByText('Problem set 3')).toBeInTheDocument();
    expect(screen.getByText('MATH101 · Calculus')).toBeInTheDocument();
    expect(screen.getByText('Due Dec 31, 2999')).toBeInTheDocument();
    expect(screen.getByText('Reading response')).toBeInTheDocument();
    expect(screen.getByText('PHYS201 · Physics')).toBeInTheDocument();
  });

  it('labels a null-dueDate row "No due date" and keeps it last', () => {
    renderSection({
      rows: [
        makeAssignment({ id: 'a1', title: 'Has a deadline' }),
        makeAssignment({ id: 'a2', title: 'No deadline', dueDate: null }),
      ],
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('No deadline');
    expect(rows[1]).toHaveTextContent('No due date');
    expect(rows[0]).not.toHaveTextContent('No due date');
  });

  it('does not render a finished assignment and does not render an overdue one', () => {
    renderSection({
      rows: [
        makeAssignment({ id: 'a1', title: 'Still to do' }),
        makeAssignment({ id: 'a2', title: 'Already done', status: 'COMPLETED' }),
        makeAssignment({ id: 'a3', title: 'Past its date', dueDate: PAST }),
      ],
    });

    expect(screen.getByText('Still to do')).toBeInTheDocument();
    expect(screen.queryByText('Already done')).not.toBeInTheDocument();
    expect(screen.queryByText('Past its date')).not.toBeInTheDocument();
  });

  it('keeps the endpoint order (no client-side re-sort)', () => {
    renderSection({
      rows: [
        makeAssignment({ id: 'a1', title: 'Bravo' }),
        makeAssignment({ id: 'a2', title: 'Alpha' }),
      ],
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Bravo');
    expect(rows[1]).toHaveTextContent('Alpha');
  });

  it('renders the subtask progress when the assignment has subtasks and omits it otherwise', () => {
    renderSection({
      rows: [
        makeAssignment({
          id: 'a1',
          title: 'With a checklist',
          subtasks: [makeSubtask('s1', 'COMPLETED', 0), makeSubtask('s2', 'PENDING', 1)],
        }),
        makeAssignment({ id: 'a2', title: 'Without a checklist' }),
      ],
    });

    expect(screen.getByText('1/2 subtasks')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows[1]).not.toHaveTextContent('subtasks');
  });

  it('caps the rows at five and shows the remainder', () => {
    renderSection({
      rows: Array.from({ length: 7 }, (_, index) =>
        makeAssignment({ id: `a${index}`, title: `Assignment ${index}` })
      ),
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('renders a "See all" link to the assignments page with a section-specific name', () => {
    renderSection({ rows: [makeAssignment()] });

    const seeAll = screen.getByRole('link', {
      name: 'See all upcoming deadlines on the assignments page',
    });
    expect(seeAll).toHaveAttribute('href', '/assignments');
    expect(seeAll).toHaveTextContent('See all');
  });

  it('renders the compact row, not the shared AssignmentRow', () => {
    renderSection({ rows: [makeAssignment()] });

    // No status select, no overflow menu, no status badge, no priority or
    // type label and no "Due soon" badge (Decision #4).
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actions for/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Medium')).not.toBeInTheDocument();
    expect(screen.queryByText('Homework')).not.toBeInTheDocument();
    expect(screen.queryByText('Due soon')).not.toBeInTheDocument();
    // The compact row is the only button in the row.
    const row = screen.getByRole('listitem');
    expect(row.querySelectorAll('button')).toHaveLength(1);
  });

  it('calls the host callback once with the row it rendered and opens no dialog', async () => {
    const onOpenDetails = vi.fn();
    const assignment = makeAssignment({ id: 'a7', title: 'Open me' });
    renderSection({ rows: [assignment], onOpenDetails });

    await userEvent.click(screen.getByRole('button', { name: 'Open me' }));

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onOpenDetails).toHaveBeenCalledWith(assignment);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the loading skeleton instead of rows', () => {
    renderSection({ status: 'loading', rows: [makeAssignment()] });

    const section = screen.getByRole('region', { name: 'Upcoming deadlines' });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Problem set 3')).not.toBeInTheDocument();
    const bars = section.querySelectorAll('.animate-pulse');
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((bar) => expect(bar).toHaveClass('motion-reduce:animate-none'));
  });

  it('renders the error message and a retry action that calls the callback once', async () => {
    const onRetry = vi.fn();
    renderSection({
      status: 'error',
      error: { message: 'Assignments service unavailable' },
      onRetry,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Assignments service unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state with the section icon and the supplied title', () => {
    renderSection({ rows: [] });

    const title = screen.getByRole('heading', { name: 'No upcoming deadlines.' });
    expect(title).toBeInTheDocument();
    expect(title.parentElement?.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('exposes the section as a named region and exposes no live region of its own', () => {
    renderSection({ rows: [makeAssignment()] });

    expect(screen.getByRole('region', { name: 'Upcoming deadlines' })).toBeInTheDocument();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });
});
