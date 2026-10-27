import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { AssignmentsPage } from './AssignmentsPage';
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
  updateAssignment,
} from '@/entities/assignment/api/assignmentApi';
import { listCourses } from '@/entities/course/api/courseApi';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  listSubtasks: vi.fn(),
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
  listAssignments: vi.fn(),
}));

vi.mock('@/entities/course/api/courseApi', () => ({
  listCourses: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedListAssignments = vi.mocked(listAssignments);
const mockedListCourses = vi.mocked(listCourses);
const mockedCreateAssignment = vi.mocked(createAssignment);
const mockedUpdateAssignment = vi.mocked(updateAssignment);
const mockedDeleteAssignment = vi.mocked(deleteAssignment);

/** Records the current route so tests can prove whether a control navigated. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const timestamps = { createdAt: '2026-10-24T12:00:00.000Z', updatedAt: '2026-10-24T12:00:00.000Z' };

const item = {
  id: 'a-1',
  title: 'Problem Set 4',
  description: 'Read chapter 4',
  dueDate: '2026-10-12T07:00:00.000Z',
  estimatedHours: 2.5,
  actualHours: null,
  status: 'PENDING' as const,
  priority: 'HIGH' as const,
  type: 'QUIZ' as const,
  ...timestamps,
  course: { id: 'course-1', name: 'Calculus I', code: 'MATH101', color: '#10b981' },
  subtasks: [
    { id: 's-1', title: 'Read', status: 'COMPLETED' as const, orderIndex: 0, ...timestamps },
  ],
};

const course = {
  id: 'course-1',
  code: 'MATH101',
  name: 'Calculus I',
  description: null,
  color: '#10b981',
  credits: 4,
  instructor: null,
  isActive: true,
  semesterId: null,
  semester: null,
  ...timestamps,
};

const renderPage = () =>
  render(
    <Providers initialEntries={['/assignments']}>
      <AssignmentsPage />
      <LocationProbe />
    </Providers>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockedListCourses.mockResolvedValue([course] as never);
  mockedListAssignments.mockResolvedValue([item] as never);
  mockedUpdateAssignment.mockResolvedValue({ ...item } as never);
  mockedDeleteAssignment.mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AssignmentsPage', () => {
  it('renders loading then rows from mocked listAssignments', async () => {
    mockedListAssignments.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([item] as never), 50))
    );
    renderPage();
    expect(await screen.findByText(/loading your assignments/i)).toBeInTheDocument();
    expect(await screen.findByText('Problem Set 4')).toBeInTheDocument();
    expect(screen.getByText('MATH101')).toBeInTheDocument();
    expect(screen.getByText('Calculus I')).toBeInTheDocument();
    expect(screen.getByText(/1 subtask, 1 complete/i)).toBeInTheDocument();
  });

  it('search input triggers a re-query with q (debounced)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Problem Set 4');

    const input = screen.getByLabelText('Search assignments');
    await user.type(input, 'problem');

    // Wait for debounce
    await waitFor(
      () => {
        const calls = mockedListAssignments.mock.calls;
        const last = calls[calls.length - 1]?.[0];
        expect(last).toMatchObject({ q: 'problem' });
      },
      { timeout: 1000 }
    );
  });

  it('course filter triggers re-query with courseId; All omits it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Problem Set 4');

    const select = screen.getByLabelText('Course');
    await user.selectOptions(select, 'course-1');
    await waitFor(() => {
      const calls = mockedListAssignments.mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last).toMatchObject({ courseId: 'course-1' });
    });

    await user.selectOptions(select, '');
    await waitFor(() => {
      const calls = mockedListAssignments.mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last).not.toHaveProperty('courseId');
    });
  });

  it('status/priority/type filters trigger re-query with correct param', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Status'), 'COMPLETED');
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.slice(-1)[0]?.[0];
      expect(last).toMatchObject({ status: 'COMPLETED' });
    });

    // Priority and Type live in the secondary panel (SP-125 / D125-7).
    await user.click(screen.getByRole('button', { name: 'Filters' }));

    await user.selectOptions(screen.getByLabelText('Priority'), 'LOW');
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.slice(-1)[0]?.[0];
      expect(last).toMatchObject({ priority: 'LOW' });
    });

    await user.selectOptions(screen.getByLabelText('Type'), 'PAPER');
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.slice(-1)[0]?.[0];
      expect(last).toMatchObject({ type: 'PAPER' });
    });
  });

  it('date filters set dueFrom/dueTo as ISO datetimes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(screen.getByLabelText('Due from'), '2026-10-01');
    await user.type(screen.getByLabelText('Due to'), '2026-10-31');
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.slice(-1)[0]?.[0];
      expect(last).toMatchObject({ dueFrom: '2026-10-01T00:00:00', dueTo: '2026-10-31T23:59:59' });
    });
  });

  it('sort selector + order toggle trigger re-query with sort/order', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.selectOptions(screen.getByLabelText('Sort by'), 'title');
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.slice(-1)[0]?.[0];
      expect(last).toMatchObject({ sort: 'title' });
    });

    await user.click(screen.getByLabelText('Sort ascending'));
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.slice(-1)[0]?.[0];
      expect(last).toMatchObject({ order: 'desc' });
    });
  });

  it('empty state renders when API returns [] (no filters)', async () => {
    mockedListAssignments.mockResolvedValue([] as never);
    renderPage();
    expect(await screen.findByText('No assignments yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Create an assignment directly or browse your courses.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first assignment' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
  });

  it('empty state with filters shows clear filters', async () => {
    const user = userEvent.setup();
    mockedListAssignments.mockResolvedValueOnce([item] as never).mockResolvedValue([] as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Status'), 'COMPLETED');
    await waitFor(() =>
      expect(screen.getAllByText('No assignments match these filters.').length).toBeGreaterThan(0)
    );
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('error state renders on rejected query and retry re-queries', async () => {
    mockedListAssignments
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce([item] as never);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedListAssignments).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Problem Set 4')).toBeInTheDocument();
  });

  it('row renders course context and subtask progress', async () => {
    renderPage();
    await screen.findByText('Problem Set 4');
    expect(screen.getByText('MATH101')).toBeInTheDocument();
    expect(screen.getByText('Calculus I')).toBeInTheDocument();
    expect(screen.getByText(/1 subtask, 1 complete/i)).toBeInTheDocument();
  });

  it('clear filters resets all controls and re-queries with no params', async () => {
    const user = userEvent.setup();
    mockedListAssignments.mockResolvedValue([item] as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Status'), 'COMPLETED');
    await user.click(screen.getAllByRole('button', { name: /clear filters/i })[0]);
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.slice(-1)[0]?.[0];
      expect(last).toEqual({});
    });
  });

  it('null course renders No course without crashing', async () => {
    mockedListAssignments.mockResolvedValue([{ ...item, course: null }] as never);
    renderPage();
    await screen.findByText('Problem Set 4');
    expect(screen.getByText('No course')).toBeInTheDocument();
  });

  it('shows the Overdue pill on an overdue row', async () => {
    renderPage();
    await screen.findByText('Problem Set 4');
    const pill = screen.getByText('Overdue');
    expect(pill).toHaveClass('bg-red-100', 'text-red-700', 'rounded-full');
  });

  it('does not show the Overdue pill on a non-overdue row', async () => {
    mockedListAssignments.mockResolvedValue([
      { ...item, dueDate: '2026-12-01T07:00:00.000Z' },
    ] as never);
    renderPage();
    await screen.findByText('Problem Set 4');
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('does not show the Overdue pill on a finished past-due row', async () => {
    mockedListAssignments.mockResolvedValue([
      { ...item, status: 'COMPLETED', dueDate: '2026-10-12T07:00:00.000Z' },
    ] as never);
    renderPage();
    await screen.findByText('Problem Set 4');
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('keeps the due-date line neutral on an overdue row', async () => {
    renderPage();
    await screen.findByText('Problem Set 4');
    const pill = screen.getByText('Overdue');
    expect(pill.closest('p')).toHaveClass('text-secondary-600');
  });
});

describe('AssignmentsPage shared interaction (SP-124B AC 8)', () => {
  it('opens the edit form from the title button without navigating', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    const titleButton = screen.getByRole('button', { name: 'Problem Set 4' });
    expect(titleButton).toHaveClass('text-left', 'font-medium', 'hover:underline');

    await user.click(titleButton);

    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Problem Set 4');
    expect(screen.getByTestId('location')).toHaveTextContent('/assignments');
  });

  it('opens the edit form from the Edit button', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(screen.getByRole('button', { name: 'Edit Problem Set 4' }));

    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Problem Set 4');
  });

  it('links the course meta slot to the course page', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    const link = screen.getByRole('link', { name: 'View course: Calculus I' });
    expect(link).toHaveAttribute('href', '/courses/course-1');
    expect(link).toHaveClass('focus:ring-2', 'focus:ring-primary-500');
    expect(within(link).getByText('MATH101')).toHaveClass('font-mono');

    await user.click(link);

    expect(screen.getByTestId('location')).toHaveTextContent('/courses/course-1');
  });

  it('renders static No course text without a course link when the course is null', async () => {
    mockedListAssignments.mockResolvedValue([{ ...item, course: null }] as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    expect(screen.getByText('No course')).toHaveClass('text-xs', 'text-secondary-500');
    expect(screen.queryByRole('link', { name: /view course/i })).not.toBeInTheDocument();
  });

  it('PATCHes the status and refetches with the active filters', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Course'), 'course-1');
    await waitFor(() => {
      const last = mockedListAssignments.mock.calls.at(-1)?.[0];
      expect(last).toMatchObject({ courseId: 'course-1' });
    });
    const callsBefore = mockedListAssignments.mock.calls.length;

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status for Problem Set 4' }),
      'COMPLETED'
    );

    expect(mockedUpdateAssignment).toHaveBeenCalledWith('a-1', { status: 'COMPLETED' });
    await waitFor(() =>
      expect(mockedListAssignments.mock.calls.length).toBeGreaterThan(callsBefore)
    );
    expect(mockedListAssignments.mock.calls.at(-1)?.[0]).toMatchObject({ courseId: 'course-1' });
  });

  it('deletes through the shared dialog and removes the row after refetch', async () => {
    const user = setupUser();
    mockedListAssignments.mockResolvedValueOnce([item] as never).mockResolvedValue([] as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(screen.getByRole('button', { name: 'Delete Problem Set 4' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Problem Set 4?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete Problem Set 4' }));

    expect(mockedDeleteAssignment).toHaveBeenCalledWith('a-1');
    await waitFor(() => expect(screen.queryByText('Problem Set 4')).not.toBeInTheDocument());
    expect(await screen.findByText('No assignments yet.')).toBeInTheDocument();
    expect(mockedListAssignments.mock.calls.at(-1)?.[0]).toEqual({});
  });

  it('opens the shared subtask checklist from the row disclosure', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(
      screen.getByRole('button', { name: 'Subtasks for Problem Set 4: 1 subtask, 1 complete' })
    );

    expect(
      screen.getByRole('region', { name: 'Subtasks for Problem Set 4: 1 subtask, 1 complete' })
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Read' })).toBeChecked();
  });

  it('keeps the list visible and marks it busy during a background refetch', async () => {
    const user = setupUser();
    let resolveRefetch!: (value: unknown) => void;
    mockedListAssignments.mockResolvedValueOnce([item] as never).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve;
        }) as never
    );
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status for Problem Set 4' }),
      'COMPLETED'
    );

    await waitFor(() => expect(mockedListAssignments).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelectorAll('.animate-spin').length).toBeGreaterThan(0);
    expect(screen.getByText('Problem Set 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Problem Set 4' })).toBeEnabled();

    resolveRefetch([item]);
    await waitFor(() => expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false'));
  });

  it('toasts an actionable error and keeps the list when the refetch fails', async () => {
    const user = setupUser();
    mockedListAssignments
      .mockResolvedValueOnce([item] as never)
      .mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status for Problem Set 4' }),
      'COMPLETED'
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('We could not load your assignments. Try again.')
    );
    expect(screen.getByText('Problem Set 4')).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false');
  });

  it('follows the visual tab order and closes the edit dialog with Escape', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    screen.getByRole('button', { name: 'Problem Set 4' }).focus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'View course: Calculus I' })).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Subtasks for Problem Set 4: 1 subtask, 1 complete' })
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Status for Problem Set 4' })).toHaveFocus();
    await user.tab();
    const del = screen.getByRole('button', { name: 'Delete Problem Set 4' });
    expect(del).toHaveFocus();
    await user.tab();
    const edit = screen.getByRole('button', { name: 'Edit Problem Set 4' });
    expect(edit).toHaveFocus();

    edit.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(edit).toHaveFocus();
  });
});

describe('AssignmentsPage list creation (SP-124C AC 1–8)', () => {
  it('opens the shared create form from the page header with the course options', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    const add = screen.getByRole('button', { name: 'Add assignment' });
    expect(add).toHaveAttribute('data-assignment-focus', 'add');
    await user.click(add);

    const dialog = screen.getByRole('dialog', { name: 'Add an assignment' });
    const course = within(dialog).getByLabelText('Course');
    expect(course).toHaveValue('');
    expect(
      within(course)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['No course', 'MATH101 Calculus I']);
    expect(within(dialog).getByRole('button', { name: 'Create assignment' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/assignments');
  });

  it('opens the shared create form from the unfiltered empty state', async () => {
    const user = setupUser();
    mockedListAssignments.mockResolvedValue([] as never);
    renderPage();
    await screen.findByText('No assignments yet.');

    const emptyAdd = screen.getByRole('button', { name: 'Add your first assignment' });
    expect(emptyAdd).toHaveAttribute('data-assignment-focus', 'empty-add');
    await user.click(emptyAdd);

    expect(screen.getByRole('dialog', { name: 'Add an assignment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveFocus();
  });

  it('prefills the form course with the active course filter', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Course'), 'course-1');
    await waitFor(() =>
      expect(mockedListAssignments.mock.calls.at(-1)?.[0]).toMatchObject({ courseId: 'course-1' })
    );

    await user.click(screen.getByRole('button', { name: 'Add assignment' }));
    const dialog = screen.getByRole('dialog', { name: 'Add an assignment' });
    expect(within(dialog).getByLabelText('Course')).toHaveValue('course-1');
  });

  it('creates with no course, refetches with the current params and announces the result', async () => {
    const user = setupUser();
    mockedCreateAssignment.mockResolvedValue({ ...item, course: null } as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(screen.getByRole('button', { name: 'Add assignment' }));
    await user.type(screen.getByLabelText('Title'), 'Unowned homework');
    const callsBefore = mockedListAssignments.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Create assignment' }));

    await waitFor(() =>
      expect(mockedCreateAssignment).toHaveBeenCalledWith({
        title: 'Unowned homework',
        priority: 'MEDIUM',
      })
    );
    expect(mockedCreateAssignment.mock.calls[0]?.[0]).not.toHaveProperty('courseId');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(mockedListAssignments.mock.calls.length).toBeGreaterThan(callsBefore)
    );
    expect(mockedListAssignments.mock.calls.at(-1)?.[0]).toEqual({});
    expect(await screen.findByText('Assignment added. Showing 1 assignment.')).toBeInTheDocument();
  });

  it('returns focus to the header Add button after cancelling', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    const add = screen.getByRole('button', { name: 'Add assignment' });
    await user.click(add);
    expect(screen.getByRole('dialog', { name: 'Add an assignment' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(add).toHaveFocus();
  });
});

describe('AssignmentsPage post-review corrections (R-124-001…005)', () => {
  it('refetches with the current filters when a status PATCH resolves after a filter change', async () => {
    const user = setupUser();
    let resolvePatch!: (value: unknown) => void;
    mockedUpdateAssignment.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }) as never
    );
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Course'), 'course-1');
    await waitFor(() =>
      expect(mockedListAssignments.mock.calls.at(-1)?.[0]).toMatchObject({ courseId: 'course-1' })
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status for Problem Set 4' }),
      'COMPLETED'
    );
    await waitFor(() => expect(mockedUpdateAssignment).toHaveBeenCalledTimes(1));

    // Move the live filter while the PATCH is still in flight.
    await user.selectOptions(screen.getByLabelText('Course'), '');
    await waitFor(() => expect(mockedListAssignments.mock.calls.at(-1)?.[0]).toEqual({}));

    const callsBeforeResolve = mockedListAssignments.mock.calls.length;
    resolvePatch({ ...item, status: 'COMPLETED' });
    await waitFor(() =>
      expect(mockedListAssignments.mock.calls.length).toBeGreaterThan(callsBeforeResolve)
    );
    expect(mockedListAssignments.mock.calls.at(-1)?.[0]).toEqual({});
  });

  it('ignores a stale list response that resolves after a newer filter request', async () => {
    const user = setupUser();
    let resolveCourseRequest!: (value: unknown) => void;
    mockedListAssignments
      .mockResolvedValueOnce([item] as never)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCourseRequest = resolve;
          }) as never
      )
      .mockResolvedValueOnce([] as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Course'), 'course-1');
    await waitFor(() => expect(mockedListAssignments).toHaveBeenCalledTimes(2));

    await user.selectOptions(screen.getByLabelText('Course'), '');
    expect(await screen.findByText('No assignments yet.')).toBeInTheDocument();

    resolveCourseRequest([item]);
    await waitFor(() => expect(mockedListAssignments).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByText('Problem Set 4')).not.toBeInTheDocument());
  });

  it('keeps focus on a stable control after creating the first assignment from the empty state', async () => {
    const user = setupUser();
    mockedListAssignments.mockResolvedValueOnce([] as never).mockResolvedValueOnce([item] as never);
    mockedCreateAssignment.mockResolvedValue({ ...item, course: null } as never);
    renderPage();
    await screen.findByText('No assignments yet.');

    const headerAdd = screen.getByRole('button', { name: 'Add assignment' });
    await user.click(screen.getByRole('button', { name: 'Add your first assignment' }));
    await user.type(screen.getByLabelText('Title'), 'First assignment');
    await user.click(screen.getByRole('button', { name: 'Create assignment' }));

    expect(await screen.findByText('Problem Set 4')).toBeInTheDocument();
    await waitFor(() => expect(headerAdd).toHaveFocus());
  });

  it('returns focus to the header Add control after a header-create success', async () => {
    const user = setupUser();
    mockedCreateAssignment.mockResolvedValue({ ...item, course: null } as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    const headerAdd = screen.getByRole('button', { name: 'Add assignment' });
    await user.click(headerAdd);
    await user.type(screen.getByLabelText('Title'), 'Another assignment');
    await user.click(screen.getByRole('button', { name: 'Create assignment' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(headerAdd).toHaveFocus());
  });

  it('keeps the modal and entered values when a list-host create fails', async () => {
    const user = setupUser();
    mockedCreateAssignment.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(screen.getByRole('button', { name: 'Add assignment' }));
    await user.type(screen.getByLabelText('Title'), 'Doomed assignment');
    const callsBefore = mockedListAssignments.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Create assignment' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('We could not save the assignment. Try again.')
    );
    expect(screen.getByRole('dialog', { name: 'Add an assignment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Doomed assignment');
    expect(screen.getByRole('button', { name: 'Create assignment' })).toBeEnabled();
    expect(mockedListAssignments.mock.calls.length).toBe(callsBefore);
    expect(screen.getByRole('status')).not.toHaveTextContent('Assignment added.');
  });

  it('applies the mobile 44 px minimum to create entry points and form controls', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    const headerAdd = screen.getByRole('button', { name: 'Add assignment' });
    expect(headerAdd).toHaveClass('max-sm:min-h-[44px]');
    await user.click(headerAdd);

    const dialog = screen.getByRole('dialog', { name: 'Add an assignment' });
    for (const control of [
      within(dialog).getByLabelText('Title'),
      within(dialog).getByLabelText('Course'),
      within(dialog).getByLabelText('Due date'),
      within(dialog).getByLabelText('Estimated duration (hours)'),
      within(dialog).getByLabelText('Type'),
      within(dialog).getByLabelText('Priority'),
      within(dialog).getByLabelText('Description'),
    ]) {
      expect(control).toHaveClass('max-sm:min-h-[44px]');
    }
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveClass(
      'max-sm:min-h-[44px]'
    );
    expect(within(dialog).getByRole('button', { name: 'Create assignment' })).toHaveClass(
      'max-sm:min-h-[44px]'
    );
  });

  it('applies the mobile 44 px minimum to the empty-state actions', async () => {
    mockedListAssignments.mockResolvedValue([] as never);
    renderPage();
    await screen.findByText('No assignments yet.');

    expect(screen.getByRole('button', { name: 'Add your first assignment' })).toHaveClass(
      'max-sm:min-h-[44px]'
    );
    expect(screen.getByRole('button', { name: 'Browse courses' })).toHaveClass(
      'max-sm:min-h-[44px]'
    );
  });
});

describe('AssignmentsPage presentation (SP-125)', () => {
  it('toggles the secondary filter panel with expanded state and active-filter count', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Problem Set 4');

    const toggle = screen.getByRole('button', { name: 'Filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'advanced-filters-panel');
    expect(screen.queryByLabelText('Due from')).not.toBeInTheDocument();

    await user.click(toggle);

    const panel = screen.getByLabelText('Priority').closest('#advanced-filters-panel');
    expect(screen.getByRole('button', { name: 'Hide filters' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(panel).toBeInstanceOf(HTMLElement);
    expect(panel).toHaveClass('rounded-lg', 'border');

    // Secondary filters carry visible labels next to their controls.
    expect(screen.getByLabelText('Due from')).toBeInTheDocument();
    expect(screen.getByText('Due from')).toBeInTheDocument();
    expect(screen.getByLabelText('Due to')).toBeInTheDocument();
    expect(screen.getByText('Due to')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();

    // The toggle shows how many secondary controls are active.
    await user.selectOptions(screen.getByLabelText('Priority'), 'LOW');
    await user.selectOptions(screen.getByLabelText('Type'), 'PAPER');

    await user.click(screen.getByRole('button', { name: 'Hide filters' }));
    expect(await screen.findByRole('button', { name: 'Filters (2)' })).toBeInTheDocument();

    // Clearing resets the count and the secondary controls.
    await user.click(screen.getAllByRole('button', { name: /clear filters/i })[0]);
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByLabelText('Priority')).toHaveValue('');
    expect(screen.getByLabelText('Due from')).toHaveValue('');
  });

  it('renders the row status selector with the text-plus-color palette (D125-8)', async () => {
    const user = setupUser();
    // Keep the first PATCH in flight so the row renders its pending status.
    let resolvePatch!: (value: unknown) => void;
    mockedUpdateAssignment.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }) as never
    );
    renderPage();
    await screen.findByText('Problem Set 4');

    const select = screen.getByRole('combobox', { name: 'Status for Problem Set 4' });
    expect(select).toHaveClass('bg-slate-100', 'text-slate-700');

    await user.selectOptions(select, 'COMPLETED');
    expect(select).toHaveClass('bg-green-100', 'text-green-700');

    resolvePatch({ ...item, status: 'COMPLETED' });
    await screen.findByText('Assignment marked as completed. Showing 1 assignment.');
    // The refetch (mock data still PENDING) returns the select to its slate
    // pending palette — the pill always reflects the committed item status.
    expect(select).toHaveClass('bg-slate-100', 'text-slate-700');
    expect(select).toHaveValue('PENDING');
  });

  it('frames the expanded subtask checklist with a progress header (D125-9)', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(
      screen.getByRole('button', { name: 'Subtasks for Problem Set 4: 1 subtask, 1 complete' })
    );

    const region = screen.getByRole('region', {
      name: 'Subtasks for Problem Set 4: 1 subtask, 1 complete',
    });
    expect(region).toHaveClass('rounded-lg', 'bg-secondary-50/75', 'p-3');
    expect(screen.getByText('Subtasks')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 complete')).toBeInTheDocument();
  });

  it('widens the create dialog and aligns the action footer (D125-10)', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.click(screen.getByRole('button', { name: 'Add assignment' }));

    const dialog = screen.getByRole('dialog', { name: 'Add an assignment' });
    expect(dialog).toHaveClass('max-w-lg');
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(cancel.closest('div')).toHaveClass('border-t', 'pt-4', 'sm:justify-end');
  });

  it('shows the adjusted-search subtext in the filtered empty state', async () => {
    const user = userEvent.setup();
    mockedListAssignments.mockResolvedValueOnce([item] as never).mockResolvedValue([] as never);
    renderPage();
    await screen.findByText('Problem Set 4');

    await user.selectOptions(screen.getByLabelText('Status'), 'COMPLETED');
    expect(
      (await screen.findAllByText('No assignments match these filters.')).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('Try adjusting your search terms or clearing filters.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });
});
