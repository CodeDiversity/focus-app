import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { AssignmentsPage } from './AssignmentsPage';
import { listAssignments } from '@/entities/assignment/api/assignmentApi';
import { listCourses } from '@/entities/course/api/courseApi';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
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
    </Providers>
  );

describe('AssignmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListCourses.mockResolvedValue([course] as never);
    mockedListAssignments.mockResolvedValue([item] as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      screen.getByText('Assignments you create on your courses will show up here.')
    ).toBeInTheDocument();
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
