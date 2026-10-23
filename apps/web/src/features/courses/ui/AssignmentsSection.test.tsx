import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssignmentsSection } from './AssignmentsSection';
import type { CourseAssignment } from '@/shared/types/academic';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/**
 * Three assignments in the API order (dueDate asc, then title).  The due
 * dates are written in UTC so the rendered string is deterministic for the
 * test environment's browser time zone (the component formats with
 * `getBrowserTimeZone()` — D112B-16).
 */
const problemSet: CourseAssignment = {
  id: 'asgn-1',
  title: 'Problem Set 4',
  description: null,
  dueDate: '2026-10-12T12:00:00.000Z',
  estimatedHours: 3,
  actualHours: null,
  status: 'PENDING',
  priority: 'MEDIUM',
  ...timestamps,
};
const essay: CourseAssignment = {
  id: 'asgn-2',
  title: 'Research Essay',
  description: null,
  dueDate: '2026-10-20T12:00:00.000Z',
  estimatedHours: 5,
  actualHours: 4,
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  ...timestamps,
};
const labReport: CourseAssignment = {
  id: 'asgn-3',
  title: 'Lab Report',
  description: null,
  dueDate: '2026-10-20T12:00:00.000Z',
  estimatedHours: 2,
  actualHours: 2,
  status: 'GRADED',
  priority: 'LOW',
  ...timestamps,
};

const all = [problemSet, essay, labReport];

const dueLabel = (dueDate: string) => `Due ${formatDate(new Date(dueDate), getBrowserTimeZone())}`;

describe('AssignmentsSection (AC 4, D112-6)', () => {
  it('renders the read-only projection in API order: title, due date, status + priority badges', () => {
    render(<AssignmentsSection assignments={all} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // API order as-is (dueDate asc, then title — no client re-sort): the two
    // 2026-10-20 rows keep their given order (Lab Report before Research
    // Essay would be alphabetical, so the order proves no re-sort).
    expect(items[0]).toHaveTextContent('Problem Set 4');
    expect(items[1]).toHaveTextContent('Research Essay');
    expect(items[2]).toHaveTextContent('Lab Report');

    // The due line is the medium date in the browser time zone (D112B-16).
    expect(items[0]).toHaveTextContent(dueLabel(problemSet.dueDate));
    expect(items[1]).toHaveTextContent(dueLabel(essay.dueDate));
    expect(items[2]).toHaveTextContent(dueLabel(labReport.dueDate));

    // Status badges pair text with color (DoD 6): the labels are present…
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Graded')).toBeInTheDocument();
    // …and the priority labels are present.
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('pairs each badge with its palette (text + color, D112B-4)', () => {
    render(<AssignmentsSection assignments={[problemSet, essay, labReport]} />);

    // Status palettes (D112B-4): PENDING slate / IN_PROGRESS blue / GRADED teal.
    expect(screen.getByText('Pending')).toHaveClass('bg-slate-100', 'text-slate-700');
    expect(screen.getByText('In progress')).toHaveClass('bg-blue-100', 'text-blue-700');
    expect(screen.getByText('Graded')).toHaveClass('bg-teal-100', 'text-teal-700');
    // Priority palettes (D112B-4): LOW slate / MEDIUM amber / HIGH orange.
    expect(screen.getByText('Medium')).toHaveClass('bg-amber-100', 'text-amber-800');
    expect(screen.getByText('High')).toHaveClass('bg-orange-100', 'text-orange-700');
    expect(screen.getByText('Low')).toHaveClass('bg-slate-100', 'text-slate-700');
  });

  it('renders the remaining status/priority palette entries', () => {
    render(
      <AssignmentsSection
        assignments={[
          { ...problemSet, id: 'a', status: 'SUBMITTED', priority: 'URGENT' },
          { ...problemSet, id: 'b', status: 'COMPLETED', priority: 'LOW' },
        ]}
      />
    );

    expect(screen.getByText('Submitted')).toHaveClass('bg-violet-100', 'text-violet-700');
    expect(screen.getByText('Urgent')).toHaveClass('bg-red-100', 'text-red-700');
    expect(screen.getByText('Completed')).toHaveClass('bg-green-100', 'text-green-700');
  });

  it('offers no management controls (EP03 owns those — D112-6)', () => {
    render(<AssignmentsSection assignments={all} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('renders the empty state without a call-to-action (DoD 5)', () => {
    render(<AssignmentsSection assignments={[]} />);

    expect(screen.getByText('No assignments yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
