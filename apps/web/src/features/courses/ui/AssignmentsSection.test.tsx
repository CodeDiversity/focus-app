import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { AssignmentsSection as Section } from './AssignmentsSection';
import {
  createSubtask,
  deleteAssignment,
  updateAssignment,
} from '@/entities/assignment/api/assignmentApi';
import toast from 'react-hot-toast';
import type { Subtask } from '@/shared/types/academic';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  listSubtasks: vi.fn(),
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
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
  type: 'HOMEWORK',
  subtasks: [],
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
  type: null,
  subtasks: [],
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
  type: null,
  subtasks: [],
  ...timestamps,
};

const all = [problemSet, essay, labReport];

const dueLabel = (dueDate: string | null) =>
  `Due ${formatDate(new Date(dueDate!), getBrowserTimeZone())}`;
const AssignmentsSection = ({
  assignments,
  onAssignmentChanged = vi.fn(),
  onAssignmentFormOpen = vi.fn(),
  onSubtaskChanged = vi.fn(),
  onSubtaskRefresh = vi.fn(),
}: {
  assignments: CourseAssignment[];
  onAssignmentChanged?: (action: 'added' | 'updated' | 'deleted') => void;
  onAssignmentFormOpen?: () => void;
  onSubtaskChanged?: (action: 'added' | 'completed' | 'reopened' | 'moved' | 'deleted') => void;
  onSubtaskRefresh?: () => void;
}) => (
  <Providers initialEntries={['/courses/course-1']}>
    <Section
      courseId="course-1"
      assignments={assignments}
      onAssignmentChanged={onAssignmentChanged}
      onAssignmentFormOpen={onAssignmentFormOpen}
      onSubtaskChanged={onSubtaskChanged}
      onSubtaskRefresh={onSubtaskRefresh}
    />
  </Providers>
);

describe('AssignmentsSection (AC 4, D112-6)', () => {
  it('renders the read-only projection in API order: title, due date, status + priority badges', () => {
    render(<AssignmentsSection assignments={all} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Only unfinished assignments render by default (D121-4).
    expect(items[0]).toHaveTextContent('Problem Set 4');
    expect(items[1]).toHaveTextContent('Research Essay');

    // The due line is the medium date in the browser time zone (D112B-16).
    expect(items[0]).toHaveTextContent(dueLabel(problemSet.dueDate));
    expect(items[1]).toHaveTextContent(dueLabel(essay.dueDate));

    // The priority labels are present.
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('pairs each badge with its palette (text + color, D112B-4)', () => {
    render(<AssignmentsSection assignments={[problemSet, essay]} />);

    // Priority palettes (D112B-4): MEDIUM amber / HIGH orange.
    expect(screen.getByText('Medium')).toHaveClass('bg-amber-100', 'text-amber-800');
    expect(screen.getByText('High')).toHaveClass('bg-orange-100', 'text-orange-700');
  });

  it('marks a stored type with the neutral type pill after the priority badge (SP-115H AC 2)', () => {
    render(<AssignmentsSection assignments={[problemSet]} />);

    const badge = screen.getByText('Homework');
    expect(badge).toHaveClass('bg-slate-100', 'text-slate-700');
  });

  it('shows no type category for a null-type row (SP-115H AC 2)', () => {
    render(<AssignmentsSection assignments={[essay, labReport]} />);

    for (const label of ['Homework', 'Paper', 'Project', 'Quiz', 'Exam']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('renders the type badge inside the same wrap cluster as Edit and Delete (SP-115H AC 4)', () => {
    render(<AssignmentsSection assignments={[problemSet]} />);

    const item = screen.getAllByRole('listitem')[0]!;
    const badge = within(item).getByText('Homework');
    const edit = within(item).getByRole('button', { name: 'Edit Problem Set 4' });
    const del = within(item).getByRole('button', { name: 'Delete Problem Set 4' });
    // One flex-wrap cluster wraps all three at narrow widths; the badge
    // displaces neither control.
    expect(badge.parentElement).toBe(edit.parentElement);
    expect(del.parentElement).toBe(badge.parentElement);
    expect(del.parentElement).toHaveClass('flex', 'flex-wrap', 'gap-2');
  });

  it('renders the remaining priority palette entries', () => {
    render(
      <AssignmentsSection
        assignments={[
          { ...problemSet, id: 'a', status: 'PENDING', priority: 'URGENT' },
          { ...problemSet, id: 'b', status: 'IN_PROGRESS', priority: 'LOW' },
        ]}
      />
    );

    expect(screen.getByText('Urgent')).toHaveClass('bg-red-100', 'text-red-700');
    expect(screen.getByText('Low')).toHaveClass('bg-slate-100', 'text-slate-700');
  });

  it('renders Edit and Delete buttons for each assignment row with accessible labels', () => {
    render(<AssignmentsSection assignments={all} />);

    const items = screen.getAllByRole('listitem');
    const visible = [problemSet, essay];
    visible.forEach((assignment, idx) => {
      const item = items[idx];
      expect(
        within(item).getByRole('button', { name: `Edit ${assignment.title}` })
      ).toBeInTheDocument();
      expect(
        within(item).getByRole('button', { name: `Delete ${assignment.title}` })
      ).toBeInTheDocument();
    });
  });

  it('opens AssignmentForm in edit mode with pre-filled fields when Edit clicked', async () => {
    const user = setupUser();
    const onFormOpen = vi.fn();
    render(<AssignmentsSection assignments={all} onAssignmentFormOpen={onFormOpen} />);

    await user.click(screen.getByRole('button', { name: 'Edit Problem Set 4' }));

    expect(onFormOpen).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { level: 2, name: 'Edit assignment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Problem Set 4');
  });

  it('opens DeleteAssignmentDialog when Delete clicked and re-arms status', async () => {
    const user = setupUser();
    const onFormOpen = vi.fn();
    render(<AssignmentsSection assignments={all} onAssignmentFormOpen={onFormOpen} />);

    await user.click(screen.getByRole('button', { name: 'Delete Problem Set 4' }));

    expect(onFormOpen).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Delete Problem Set 4?' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('returns focus to Edit trigger when AssignmentForm closes', async () => {
    const user = setupUser();
    render(<AssignmentsSection assignments={all} />);

    const editBtn = screen.getByRole('button', { name: 'Edit Problem Set 4' });
    await user.click(editBtn);

    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(editBtn).toHaveFocus();
  });

  it('returns focus to Delete trigger when DeleteAssignmentDialog closes', async () => {
    const user = setupUser();
    render(<AssignmentsSection assignments={all} />);

    const deleteBtn = screen.getByRole('button', { name: 'Delete Problem Set 4' });
    await user.click(deleteBtn);

    expect(screen.getByRole('dialog', { name: 'Delete Problem Set 4?' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleteBtn).toHaveFocus();
  });

  it('transitions to empty state when all assignments are removed', () => {
    const { rerender } = render(<AssignmentsSection assignments={[problemSet]} />);

    expect(screen.getByText('Problem Set 4')).toBeInTheDocument();
    expect(screen.queryByText('No assignments yet.')).not.toBeInTheDocument();

    rerender(<AssignmentsSection assignments={[]} />);

    expect(screen.getByText('No assignments yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first assignment' })).toBeInTheDocument();
  });

  it('renders the empty state with a working call-to-action (DoD 5)', async () => {
    const user = setupUser();
    render(<AssignmentsSection assignments={[]} />);

    expect(screen.getByText('No assignments yet.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add your first assignment' }));
    expect(screen.getByRole('dialog', { name: 'Add an assignment' })).toBeInTheDocument();
  });

  it('opens the form from the primary small header button', async () => {
    const user = setupUser();
    render(<AssignmentsSection assignments={all} />);
    const button = screen.getByRole('button', { name: 'Add assignment' });
    expect(button).toHaveClass('bg-primary-600', 'text-sm', 'px-3');
    await user.click(button);
    expect(screen.getByRole('dialog', { name: 'Add an assignment' })).toBeInTheDocument();
  });

  it('renders null dates muted, retains API order and updates rows after refetch', () => {
    const undated = { ...problemSet, dueDate: null, id: 'asgn-u' };
    const { rerender } = render(<AssignmentsSection assignments={[undated, essay]} />);
    expect(screen.getByText('No due date')).toHaveClass('text-secondary-500');
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Problem Set 4');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('Research Essay');
    rerender(<AssignmentsSection assignments={[undated, essay]} />);
    expect(
      screen
        .getAllByRole('listitem')
        .map((item) => within(item).getByText(/Problem Set|Research Essay/).textContent)
    ).toEqual(['Problem Set 4', 'Research Essay']);
  });

  it('focuses the next row Edit control after the deleted assignment leaves the list', async () => {
    const user = setupUser();
    const onAssignmentChanged = vi.fn();
    vi.mocked(deleteAssignment).mockResolvedValue(undefined);
    const view = render(
      <AssignmentsSection
        assignments={[problemSet, essay]}
        onAssignmentChanged={onAssignmentChanged}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Problem Set 4' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Problem Set 4?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete Problem Set 4' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onAssignmentChanged).toHaveBeenCalledWith('deleted');
    expect(screen.getByRole('button', { name: 'Edit Research Essay' })).toHaveFocus();

    view.rerender(
      <AssignmentsSection assignments={[essay]} onAssignmentChanged={onAssignmentChanged} />
    );
    expect(screen.queryByText('Problem Set 4')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Research Essay' })).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it('focuses the previous row Edit control when the deleted assignment was last', async () => {
    const user = setupUser();
    vi.mocked(deleteAssignment).mockResolvedValue(undefined);
    const view = render(<AssignmentsSection assignments={[problemSet, essay]} />);

    await user.click(screen.getByRole('button', { name: 'Delete Research Essay' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Research Essay?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete Research Essay' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Edit Problem Set 4' })).toHaveFocus();

    view.rerender(<AssignmentsSection assignments={[problemSet]} />);
    expect(screen.queryByText('Research Essay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Problem Set 4' })).toHaveFocus();
  });

  it('focuses the empty-state add control after the final assignment leaves the list', async () => {
    const user = setupUser();
    vi.mocked(deleteAssignment).mockResolvedValue(undefined);
    const view = render(<AssignmentsSection assignments={[problemSet]} />);

    await user.click(screen.getByRole('button', { name: 'Delete Problem Set 4' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Problem Set 4?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete Problem Set 4' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Add assignment' })).toHaveFocus();

    view.rerender(<AssignmentsSection assignments={[]} />);
    expect(screen.queryByText('Problem Set 4')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first assignment' })).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });
});

const subtask = (
  id: string,
  title: string,
  status: Subtask['status'],
  orderIndex: number
): Subtask => ({
  id,
  title,
  status,
  orderIndex,
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
});

describe('AssignmentsSection subtask disclosure (SP-120J AC 1, AC 8)', () => {
  it('shows the collapsed summary and keeps Edit/Delete in the badge cluster', () => {
    render(
      <AssignmentsSection
        assignments={[
          { ...problemSet, subtasks: [] },
          { ...essay, subtasks: [subtask('e1', 'Draft', 'PENDING', 0)] },
          {
            ...labReport,
            status: 'PENDING',
            subtasks: [subtask('l1', 'One', 'PENDING', 0), subtask('l2', 'Two', 'PENDING', 1)],
          },
          {
            ...problemSet,
            id: 'asgn-4',
            title: 'Quiz',
            subtasks: [
              subtask('q1', 'A', 'COMPLETED', 0),
              subtask('q2', 'B', 'PENDING', 1),
              subtask('q3', 'C', 'PENDING', 2),
            ],
          },
          {
            ...problemSet,
            id: 'asgn-5',
            title: 'Done once',
            subtasks: [subtask('d1', 'Only', 'COMPLETED', 0)],
          },
        ]}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Subtasks for Problem Set 4: No subtasks' })
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: 'Subtasks for Research Essay: 1 subtask' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Subtasks for Lab Report: 2 subtasks' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Subtasks for Quiz: 3 subtasks, 1 complete' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Subtasks for Done once: 1 subtask, 1 complete' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    const item = screen.getAllByRole('listitem')[0]!;
    const badge = within(item).getByText('Homework');
    const edit = within(item).getByRole('button', { name: 'Edit Problem Set 4' });
    const del = within(item).getByRole('button', { name: 'Delete Problem Set 4' });
    const disclosure = within(item).getByRole('button', {
      name: 'Subtasks for Problem Set 4: No subtasks',
    });
    expect(badge.parentElement).toBe(edit.parentElement);
    expect(del.parentElement).toBe(badge.parentElement);
    expect(del.parentElement).toHaveClass('flex', 'flex-wrap', 'gap-2');
    expect(disclosure.parentElement).not.toBe(badge.parentElement);
  });

  it('expands and collapses the checklist without hiding Edit or Delete', async () => {
    const user = setupUser();
    render(
      <AssignmentsSection
        assignments={[{ ...problemSet, subtasks: [subtask('s1', 'Read chapter', 'PENDING', 0)] }]}
      />
    );
    const open = screen.getByRole('button', { name: 'Subtasks for Problem Set 4: 1 subtask' });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    await user.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(open).toHaveAttribute('aria-controls', 'subtasks-asgn-1');
    expect(
      screen.getByRole('region', { name: 'Subtasks for Problem Set 4: 1 subtask' })
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Read chapter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Problem Set 4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Problem Set 4' })).toBeInTheDocument();
    expect(open).toHaveFocus();

    await user.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('keeps several rows open across a background refetch and drops removed ids', async () => {
    const user = setupUser();
    const withSubs = [
      { ...problemSet, subtasks: [subtask('s1', 'Read chapter', 'PENDING', 0)] },
      { ...essay, subtasks: [subtask('s2', 'Draft', 'PENDING', 0)] },
    ];
    const view = render(<AssignmentsSection assignments={withSubs} />);
    await user.click(screen.getByRole('button', { name: 'Subtasks for Problem Set 4: 1 subtask' }));
    await user.click(
      screen.getByRole('button', { name: 'Subtasks for Research Essay: 1 subtask' })
    );
    expect(screen.getAllByRole('region')).toHaveLength(2);

    view.rerender(<AssignmentsSection assignments={withSubs} />);
    expect(screen.getAllByRole('region')).toHaveLength(2);

    view.rerender(<AssignmentsSection assignments={[withSubs[1]!]} />);
    expect(
      screen.queryByRole('button', { name: 'Subtasks for Problem Set 4: 1 subtask' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Subtasks for Research Essay: 1 subtask' })
    ).toBeInTheDocument();
  });

  it('follows visual tab order and locks the disclosure while that checklist is in flight', async () => {
    const user = setupUser();
    vi.mocked(createSubtask).mockImplementation(() => new Promise(() => undefined));
    render(
      <AssignmentsSection
        assignments={[
          {
            ...problemSet,
            subtasks: [
              subtask('s1', 'Read chapter', 'PENDING', 0),
              subtask('s2', 'Outline notes', 'COMPLETED', 1),
            ],
          },
        ]}
      />
    );
    const toggle = screen.getByRole('button', {
      name: 'Subtasks for Problem Set 4: 2 subtasks, 1 complete',
    });
    toggle.focus();
    await user.click(toggle);
    expect(toggle).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Status for Problem Set 4' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Edit Problem Set 4' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete Problem Set 4' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'Read chapter' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Move Read chapter down' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete Read chapter' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'Outline notes' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Move Outline notes up' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete Outline notes' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Subtask title')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Add subtask to Problem Set 4' })).toHaveFocus();

    await user.type(screen.getByLabelText('Subtask title'), 'Next');
    await user.click(screen.getByRole('button', { name: 'Add subtask to Problem Set 4' }));
    await waitFor(() => expect(toggle).toBeDisabled());
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('AssignmentsSection status control (SP-121B, D121-2/4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a Select with accessible name and all five options in lifecycle order', () => {
    render(<AssignmentsSection assignments={[problemSet]} />);
    const select = screen.getByRole('combobox', { name: 'Status for Problem Set 4' });
    expect(select).toBeInTheDocument();
    const options = within(select as HTMLElement).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Pending',
      'In progress',
      'Completed',
      'Submitted',
      'Graded',
    ]);
    expect(select).toHaveValue(problemSet.status);
  });

  it('PATCHes exactly { status } on change and disables the Select in flight', async () => {
    const user = setupUser();
    let resolvePatch!: (value: CourseAssignment) => void;
    vi.mocked(updateAssignment).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        })
    );
    render(<AssignmentsSection assignments={[problemSet]} />);

    const select = screen.getByRole('combobox', { name: 'Status for Problem Set 4' });
    await user.selectOptions(select, 'COMPLETED');
    expect(vi.mocked(updateAssignment)).toHaveBeenCalledWith(problemSet.id, {
      status: 'COMPLETED',
    });
    expect(select).toBeDisabled();

    resolvePatch({ ...problemSet, status: 'COMPLETED' });
    await waitFor(() => expect(select).not.toBeDisabled());
  });

  it('removes a finished assignment from the rendered list and sends no DELETE', async () => {
    const user = setupUser();
    vi.mocked(updateAssignment).mockResolvedValue({ ...problemSet, status: 'COMPLETED' });
    const view = render(<AssignmentsSection assignments={[problemSet, essay]} />);
    const select = screen.getByRole('combobox', { name: 'Status for Problem Set 4' });
    await user.selectOptions(select, 'COMPLETED');
    await waitFor(() => expect(vi.mocked(updateAssignment)).toHaveBeenCalled());
    view.rerender(<AssignmentsSection assignments={[essay]} />);
    expect(screen.queryByText('Problem Set 4')).not.toBeInTheDocument();
    expect(vi.mocked(deleteAssignment)).not.toHaveBeenCalled();
  });

  it('toasts the settled message and keeps the row on a failed PATCH', async () => {
    const user = setupUser();
    vi.mocked(updateAssignment).mockRejectedValue(new Error('boom'));
    render(<AssignmentsSection assignments={[problemSet]} />);
    const select = screen.getByRole('combobox', { name: 'Status for Problem Set 4' });
    await user.selectOptions(select, 'COMPLETED');
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('We could not update the status. Try again.')
    );
    expect(screen.getByText('Problem Set 4')).toBeInTheDocument();
  });

  it('renders both empty states', () => {
    const { rerender } = render(<AssignmentsSection assignments={[]} />);
    expect(screen.getByText('No assignments yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first assignment' })).toBeInTheDocument();

    const finishedOnly = [{ ...problemSet, status: 'COMPLETED' as const }];
    rerender(<AssignmentsSection assignments={finishedOnly} />);
    expect(screen.getByText('All assignments are complete.')).toBeInTheDocument();
    expect(screen.queryByText('No assignments yet.')).not.toBeInTheDocument();
  });

  it('renders unfinished rows in given order', () => {
    render(<AssignmentsSection assignments={[essay, problemSet]} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Research Essay');
    expect(items[1]).toHaveTextContent('Problem Set 4');
  });

  it('moves focus to the next unfinished row Select when a row finishes', async () => {
    const user = setupUser();
    vi.mocked(updateAssignment).mockResolvedValue({ ...problemSet, status: 'COMPLETED' });
    const view = render(<AssignmentsSection assignments={[problemSet, essay]} />);
    const select = screen.getByRole('combobox', { name: 'Status for Problem Set 4' });
    await user.selectOptions(select, 'COMPLETED');
    view.rerender(<AssignmentsSection assignments={[essay]} />);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Status for Research Essay' })).toHaveFocus()
    );
  });
});
