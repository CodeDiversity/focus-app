import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { Providers } from '@/test/providers';
import type { AssignmentListItem, Subtask } from '@/shared/types/academic';
import { OverdueAssignmentsSection } from './OverdueAssignmentsSection';

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
    title: 'Lab report',
    description: null,
    dueDate: PAST,
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

const renderSection = (props: Partial<ComponentProps<typeof OverdueAssignmentsSection>> = {}) =>
  render(
    <Providers initialEntries={['/dashboard']}>
      <OverdueAssignmentsSection
        rows={[]}
        timeZone={TIME_ZONE}
        status="ready"
        onRetry={vi.fn()}
        onOpenDetails={vi.fn()}
        emptyState={{ title: 'Nothing overdue.' }}
        {...props}
      />
    </Providers>
  );

describe('OverdueAssignmentsSection (EP05B)', () => {
  it('renders each overdue assignment marked with the text "Overdue"', () => {
    renderSection({
      rows: [
        makeAssignment({ id: 'a1', title: 'Lab report' }),
        makeAssignment({ id: 'a2', title: 'Essay draft', dueDate: '2019-03-02T12:00:00.000Z' }),
      ],
    });

    // The marking is text, not only a colour (DoD 6 / TR-E05-03).
    expect(screen.getAllByText('Overdue')).toHaveLength(2);
    expect(screen.getByText('Lab report')).toBeInTheDocument();
    expect(screen.getByText('Essay draft')).toBeInTheDocument();
  });

  it('does not mark a row that is not overdue', () => {
    renderSection({
      rows: [
        makeAssignment({ id: 'a1', title: 'Past its date' }),
        // Finished work is never overdue, whatever its due date says.
        makeAssignment({ id: 'a2', title: 'Already done', status: 'COMPLETED' }),
        // Not overdue yet — it does not belong in this section at all.
        makeAssignment({ id: 'a3', title: 'Still ahead', dueDate: FUTURE }),
      ],
    });

    expect(screen.getAllByText('Overdue')).toHaveLength(1);
    expect(screen.queryByText('Already done')).not.toBeInTheDocument();
    expect(screen.queryByText('Still ahead')).not.toBeInTheDocument();
  });

  it('shows the due date of the overdue row', () => {
    renderSection({ rows: [makeAssignment()] });

    expect(screen.getByText('Due Jan 5, 2020')).toBeInTheDocument();
  });

  it('renders the subtask progress when the assignment has subtasks', () => {
    renderSection({
      rows: [
        makeAssignment({
          id: 'a1',
          subtasks: [makeSubtask('s1', 'COMPLETED', 0), makeSubtask('s2', 'PENDING', 1)],
        }),
      ],
    });

    expect(screen.getByText('1/2 subtasks')).toBeInTheDocument();
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
      name: 'See all overdue assignments on the assignments page',
    });
    expect(seeAll).toHaveAttribute('href', '/assignments');
    expect(seeAll).toHaveTextContent('See all');
  });

  it('calls the host callback once with the row it rendered and opens no dialog', async () => {
    const onOpenDetails = vi.fn();
    const assignment = makeAssignment({ id: 'a9', title: 'Open me' });
    renderSection({ rows: [assignment], onOpenDetails });

    await userEvent.click(screen.getByRole('button', { name: 'Open me' }));

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onOpenDetails).toHaveBeenCalledWith(assignment);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the loading skeleton instead of rows', () => {
    renderSection({ status: 'loading', rows: [makeAssignment()] });

    const section = screen.getByRole('region', { name: 'Overdue assignments' });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Lab report')).not.toBeInTheDocument();
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

    const title = screen.getByRole('heading', { name: 'Nothing overdue.' });
    expect(title).toBeInTheDocument();
    expect(title.parentElement?.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('exposes the section as a named region and exposes no live region of its own', () => {
    renderSection({ rows: [makeAssignment()] });

    expect(screen.getByRole('region', { name: 'Overdue assignments' })).toBeInTheDocument();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });
});
