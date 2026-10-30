import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { useLocation } from 'react-router-dom';
import { CourseCard } from './CourseCard';
import type { CourseWithSemester } from '@/entities/course/api/courseApi';

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

const activeCourse: CourseWithSemester = {
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

const archivedCourse: CourseWithSemester = {
  id: 'course-2',
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

const minimalCourse: CourseWithSemester = {
  id: 'course-3',
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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const renderCard = (
  course: CourseWithSemester,
  overrides: {
    onEdit?: (c: CourseWithSemester) => void;
    onArchiveRestore?: (c: CourseWithSemester) => void;
  } = {}
) => {
  const onEdit = overrides.onEdit ?? vi.fn();
  const onArchiveRestore = overrides.onArchiveRestore ?? vi.fn();
  return render(
    <Providers initialEntries={['/']}>
      <CourseCard course={course} onEdit={onEdit} onArchiveRestore={onArchiveRestore} />
      <LocationProbe />
    </Providers>
  );
};

describe('CourseCard (SP-126)', () => {
  it('renders name as a heading, code, color indicator, semester, instructor, and credits', () => {
    renderCard(activeCourse);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Intro to Computer Science'
    );
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('Fall 2026')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('4 credits')).toBeInTheDocument();

    const chip = screen
      .getByText('CS101')
      .parentElement?.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(chip).toHaveStyle({ backgroundColor: '#6366f1' });
  });

  it('shows "No semester" and omits credits when absent', () => {
    renderCard(minimalCourse);
    expect(screen.getByText('No semester')).toBeInTheDocument();
    expect(screen.queryByText(/credits/)).not.toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('shows the text Archived pill only for archived courses', () => {
    const { unmount } = renderCard(activeCourse);
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    unmount();
    renderCard(archivedCourse);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('uses consistent-height classes on the card', () => {
    renderCard(activeCourse);
    const article = screen.getByRole('heading', { level: 3 }).closest('article') as HTMLElement;
    expect(article).toHaveClass('h-full', 'flex', 'flex-col');
  });

  it('navigates to /courses/:id when the non-interactive card area is clicked', async () => {
    const user = setupUser();
    renderCard(activeCourse);
    await user.click(screen.getByText('CS101'));
    expect(screen.getByTestId('location')).toHaveTextContent('/courses/course-1');
  });

  it('navigates to /courses/:id when the name link is clicked', async () => {
    const user = setupUser();
    renderCard(activeCourse);
    await user.click(screen.getByRole('link', { name: 'Intro to Computer Science' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/courses/course-1');
  });

  it('does not navigate when the actions menu trigger is clicked', async () => {
    const user = setupUser();
    renderCard(activeCourse);
    await user.click(
      screen.getByRole('button', { name: /actions for intro to computer science/i })
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('exposes per-course action accessible names via the menu', async () => {
    const user = setupUser();
    renderCard(activeCourse);
    await user.click(
      screen.getByRole('button', { name: /actions for intro to computer science/i })
    );
    expect(
      screen.getByRole('menuitem', { name: /edit intro to computer science/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /archive intro to computer science/i })
    ).toBeInTheDocument();
  });
});
