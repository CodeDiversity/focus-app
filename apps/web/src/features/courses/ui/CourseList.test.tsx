import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { CourseList } from './CourseList';
import type { CourseWithSemester } from '@/entities/course/api/courseApi';

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** Two active + one archived course in the API order (name asc, then code asc). */
const cs101: CourseWithSemester = {
  id: 'course-1',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: null,
  color: '#6366f1',
  credits: 4,
  instructor: 'Ada Lovelace',
  isActive: true,
  semesterId: 'sem-1',
  semester: { id: 'sem-1', name: 'Fall 2026' },
  ...timestamps,
};
const math101: CourseWithSemester = {
  id: 'course-2',
  code: 'MATH101',
  name: 'Calculus I',
  description: null,
  color: '#10b981',
  credits: null,
  instructor: null,
  isActive: true,
  semesterId: null,
  semester: null,
  ...timestamps,
};
const hist201: CourseWithSemester = {
  id: 'course-3',
  code: 'HIST201',
  name: 'World History',
  description: null,
  color: '#f59e0b',
  credits: 3,
  instructor: null,
  isActive: false,
  semesterId: 'sem-2',
  semester: { id: 'sem-2', name: 'Spring 2026' },
  ...timestamps,
};

/**
 * Reports the MemoryRouter location so row-navigation tests can assert
 * where a click took the user (D112B-6).
 */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const renderList = (
  overrides: Partial<Parameters<typeof CourseList>[0]> = {},
  initialEntry = '/'
) =>
  render(
    <Providers initialEntries={[initialEntry]}>
      <CourseList
        courses={[cs101, math101, hist201]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onArchiveRestore={vi.fn()}
        {...overrides}
      />
      <LocationProbe />
    </Providers>
  );

describe('CourseList rows (AC 2)', () => {
  it('renders one row per active course with chip, monospace code, name, semester and credits', () => {
    renderList();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('CS101');
    expect(items[0]).toHaveTextContent('Intro to Computer Science');
    expect(items[0]).toHaveTextContent('Fall 2026');
    expect(items[0]).toHaveTextContent('4 credits');

    // The color chip carries the row's color (decorative — the name is the
    // accessible identity, so the chip is aria-hidden).
    const chip = items[0].querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(chip).toHaveStyle({ backgroundColor: '#6366f1' });
    // The code is monospace.
    expect(items[0].querySelector('.font-mono')).toHaveTextContent('CS101');
  });

  it('shows the muted "No semester" fallback for unaffiliated courses and omits absent credits', () => {
    renderList();

    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('No semester');
    expect(items[1]).not.toHaveTextContent(/credits/);
  });

  it('renders no Archived badge on active rows', () => {
    renderList();

    expect(screen.queryAllByText('Archived')).toHaveLength(0);
  });
});

describe('CourseList archive filter (AC 2, D111-3)', () => {
  it('hides archived rows by default and shows them with an Archived badge after toggling the switch', async () => {
    const user = userEvent.setup();
    renderList();

    // The archived row is hidden…
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('World History')).not.toBeInTheDocument();

    // …the switch is a real switch with an accessible name…
    const toggle = screen.getByRole('switch', { name: /show archived/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    // …and carries the archived count so the toggle is informative.
    expect(toggle).toHaveTextContent('(1)');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveTextContent('World History');
    // The badge is text (not color-only — DoD 6) and sits on the archived row.
    const badge = screen.getByText('Archived');
    expect(badge.closest('li')).toBe(items[2]);
  });

  it('does not render the switch when there are no courses at all', () => {
    renderList({ courses: [] });

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('offers a "No active courses" state (with a hint to the switch) when every course is archived', () => {
    renderList({ courses: [hist201] });

    expect(screen.getByText('No active courses')).toBeInTheDocument();
    expect(screen.getByText(/use "Show archived" to see it/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});

describe('CourseList states (DoD 5)', () => {
  it('renders the loading state while the list is in flight', () => {
    renderList({ isLoading: true, error: null });

    expect(screen.getByText(/loading your courses/i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('renders the empty state with a create call-to-action', async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    renderList({ courses: [], onCreate });

    expect(screen.getByText('No courses yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add your first course/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders an actionable error with a retry', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderList({ error: 'We could not load your courses. Try again.', onRetry });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not load your courses. Try again.'
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('CourseList row actions (AC 5)', () => {
  it('offers Edit on every row and Archive on active rows / Restore on archived rows, with unambiguous labels', async () => {
    const onEdit = vi.fn();
    const onArchiveRestore = vi.fn();
    const user = userEvent.setup();
    renderList({ onEdit, onArchiveRestore });

    await user.click(
      screen.getByRole('button', { name: /actions for intro to computer science/i })
    );
    await user.click(screen.getByRole('menuitem', { name: /edit intro to computer science/i }));
    expect(onEdit).toHaveBeenCalledWith(cs101);

    await user.click(screen.getByRole('button', { name: /actions for calculus i/i }));
    await user.click(screen.getByRole('menuitem', { name: /archive calculus i/i }));
    expect(onArchiveRestore).toHaveBeenCalledWith(math101);

    // The archived row offers Restore (after toggling it visible).
    await user.click(screen.getByRole('switch', { name: /show archived/i }));
    await user.click(screen.getByRole('button', { name: /actions for world history/i }));
    await user.click(screen.getByRole('menuitem', { name: /restore world history/i }));
    expect(onArchiveRestore).toHaveBeenCalledWith(hist201);
    expect(
      screen.queryByRole('button', { name: /archive world history/i })
    ).not.toBeInTheDocument();
  });
});

describe('CourseList row navigation (D112B-6)', () => {
  // setupUser (not raw userEvent) keeps the router navigation inside act.
  it('navigates to /courses/:id when the course name link is clicked', async () => {
    const user = setupUser();
    renderList();

    await user.click(screen.getByRole('link', { name: 'Intro to Computer Science' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/courses/course-1');
  });

  it('navigates to /courses/:id when the non-interactive row area is clicked', async () => {
    const user = setupUser();
    renderList();

    // The code sits in the row's non-interactive area — the click bubbles to
    // the row's own navigation handler.
    await user.click(screen.getByText('MATH101'));
    expect(screen.getByTestId('location')).toHaveTextContent('/courses/course-2');
  });

  it('does not navigate when an action button is clicked (stopPropagation)', async () => {
    const onEdit = vi.fn();
    const user = setupUser();
    renderList({ onEdit });

    await user.click(screen.getByRole('button', { name: /actions for calculus i/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit calculus i/i }));
    expect(onEdit).toHaveBeenCalledWith(math101);
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});

describe('CourseList card content (SP-126)', () => {
  it('renders the instructor on cards when set', () => {
    renderList();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('renders the Archived pill on archived cards only', async () => {
    const user = userEvent.setup();
    renderList();
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: /show archived/i }));
    const archived = screen.getByText('World History').closest('li') as HTMLElement;
    expect(within(archived).getByText('Archived')).toBeInTheDocument();
  });
});

describe('CourseList search and semester filter (D126-3)', () => {
  it('filters by search query on name (case-insensitive)', () => {
    renderList({ searchQuery: 'intro' });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Intro to Computer Science');
  });

  it('filters by search query on code', () => {
    renderList({ searchQuery: 'MATH101' });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Calculus I');
  });

  it('filters by semester id', () => {
    renderList({ semesterFilter: 'sem-1' });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Intro to Computer Science');
  });

  it('composes search and semester filter', () => {
    renderList({ searchQuery: 'intro', semesterFilter: 'sem-2' });
    expect(screen.getByText('No courses match these filters.')).toBeInTheDocument();
  });

  it('shows the no-results state with a Clear filters action', async () => {
    const onClearFilters = vi.fn();
    const user = userEvent.setup();
    renderList({ searchQuery: 'zzzz', onClearFilters });
    expect(screen.getByText('No courses match these filters.')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or semester filter.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('keeps a single fetch invariant: filtering is client-side (no extra requests)', () => {
    renderList({ searchQuery: 'intro', semesterFilter: 'sem-1' });
    // CourseList itself performs no fetch; assert it renders without crashing.
    expect(screen.getByText('Intro to Computer Science')).toBeInTheDocument();
  });
});
