import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { CoursesPage } from './CoursesPage';
import {
  listCourses,
  createCourse,
  updateCourse,
  type CourseWithSemester,
} from '@/entities/course/api/courseApi';
import { listSemesters } from '@/entities/semester/api/semesterApi';

vi.mock('@/entities/course/api/courseApi', () => ({
  listCourses: vi.fn(),
  getCourse: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
}));

vi.mock('@/entities/semester/api/semesterApi', () => ({
  listSemesters: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedListCourses = vi.mocked(listCourses);
const mockedCreateCourse = vi.mocked(createCourse);
const mockedUpdateCourse = vi.mocked(updateCourse);
const mockedListSemesters = vi.mocked(listSemesters);

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** Three courses in the API order (name asc, then code asc): two active, one archived. */
const calculus: CourseWithSemester = {
  id: 'course-1',
  code: 'MATH101',
  name: 'Calculus I',
  description: null,
  color: '#10b981',
  credits: 4,
  instructor: null,
  isActive: true,
  semesterId: 'sem-1',
  semester: { id: 'sem-1', name: 'Fall 2026' },
  ...timestamps,
};
const cs101: CourseWithSemester = {
  id: 'course-2',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: null,
  color: '#6366f1',
  credits: null,
  instructor: 'Ada Lovelace',
  isActive: true,
  semesterId: null,
  semester: null,
  ...timestamps,
};
const history: CourseWithSemester = {
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

const allCourses = [calculus, cs101, history];

const validUser = userEvent.setup();

// The page's CourseList uses router hooks (row navigation, D112B-6), so the
// page renders inside a MemoryRouter (Providers with initialEntries).
const renderPage = () =>
  render(
    <Providers initialEntries={['/courses']}>
      <CoursesPage />
    </Providers>
  );

const codeInput = () => screen.getByLabelText(/course code/i);
const nameInput = () => screen.getByLabelText(/course name/i);

/** Fills the (create) form with valid values (no semester, no optional fields). */
const fillValidForm = async () => {
  await validUser.type(codeInput(), 'BIO101');
  await validUser.type(nameInput(), 'Biology I');
};

describe('CoursesPage list (AC 1, AC 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches once with includeArchived (D111B-1) and shows a loading state while in flight', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedListCourses.mockImplementation(() => new Promise(() => undefined));
    renderPage();

    expect(await screen.findByText(/loading your courses/i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('renders the active courses in API order with chip, code, name, semester and credits (AC 2)', async () => {
    mockedListCourses.mockResolvedValue(allCourses);
    renderPage();

    const items = await screen.findAllByRole('listitem');
    // Active by default — the archived row is hidden until the toggle.
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('MATH101');
    expect(items[0]).toHaveTextContent('Calculus I');
    expect(items[0]).toHaveTextContent('Fall 2026');
    expect(items[0]).toHaveTextContent('4 credits');
    expect(items[1]).toHaveTextContent('No semester');
    expect(mockedListCourses).toHaveBeenCalledTimes(1);
    expect(mockedListCourses).toHaveBeenCalledWith({ includeArchived: true });
    // The "New course" action is present once the list is loaded.
    expect(screen.getByRole('button', { name: /add course/i })).toBeInTheDocument();
  });

  it('includes the archived row with an Archived badge after toggling the switch (AC 2, D111-3)', async () => {
    mockedListCourses.mockResolvedValue(allCourses);
    renderPage();
    await screen.findAllByRole('listitem');

    const toggle = screen.getByRole('switch', { name: /show archived/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await validUser.click(toggle);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveTextContent('World History');
    expect(items[2]).toHaveTextContent('Archived');
    // The toggle is client-side only — no extra fetch.
    expect(mockedListCourses).toHaveBeenCalledTimes(1);
  });

  it('offers the empty state with a create call-to-action', async () => {
    mockedListCourses.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No courses yet.')).toBeInTheDocument();
    await validUser.click(screen.getByRole('button', { name: /add your first course/i }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Add a course');
  });

  it('shows an actionable error with a retry that re-reads the list (DoD 5)', async () => {
    mockedListCourses
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(allCourses);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');

    await validUser.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedListCourses).toHaveBeenCalledTimes(2));
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
  });
});

describe('CoursesPage create (AC 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
    mockedListCourses.mockResolvedValue(allCourses);
    mockedCreateCourse.mockResolvedValue({
      ...cs101,
      id: 'course-4',
      code: 'BIO101',
      name: 'Biology I',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the dialog form from "New course"; on success the list re-reads and the success is announced', async () => {
    // Mount reads the pre-create state; the re-read after the create returns
    // the new course (API order: "Biology I" sorts first).
    const created: CourseWithSemester = {
      ...cs101,
      id: 'course-4',
      code: 'BIO101',
      name: 'Biology I',
    };
    mockedListCourses
      .mockResolvedValueOnce(allCourses)
      .mockResolvedValueOnce([created, ...allCourses]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /add course/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Add a course');

    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /create course/i }));

    await waitFor(() =>
      expect(mockedCreateCourse).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'BIO101', name: 'Biology I' })
      )
    );
    await waitFor(() => expect(mockedListCourses).toHaveBeenCalledTimes(2));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Biology I');
    expect(screen.getByRole('status')).toHaveTextContent('Biology I created.');
  });

  it('closes the form without a request on Cancel', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /add course/i }));
    await screen.findByRole('dialog');
    await validUser.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedCreateCourse).not.toHaveBeenCalled();
    expect(mockedListCourses).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('CoursesPage edit (AC 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
    mockedListCourses.mockResolvedValue(allCourses);
    mockedUpdateCourse.mockResolvedValue(cs101);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the pre-filled form from the row Edit; on success the list re-reads and the success is announced', async () => {
    mockedListCourses
      .mockResolvedValueOnce(allCourses)
      .mockResolvedValueOnce([calculus, { ...cs101, name: 'Intro to CS (updated)' }, history]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(
      screen.getByRole('button', { name: /actions for intro to computer science/i })
    );
    await validUser.click(
      screen.getByRole('menuitem', { name: /edit intro to computer science/i })
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Edit Intro to Computer Science'
    );
    // Pre-filled (incl. instructor — D111-1).
    expect(within(dialog).getByLabelText(/instructor/i)).toHaveValue('Ada Lovelace');

    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'Intro to CS (updated)');
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith(
        'course-2',
        expect.objectContaining({ name: 'Intro to CS (updated)' })
      )
    );
    await waitFor(() => expect(mockedListCourses).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByRole('listitem'))[1]).toHaveTextContent('Intro to CS (updated)');
    expect(screen.getByRole('status')).toHaveTextContent('Intro to CS (updated) updated.');
  });
});

describe('CoursesPage archive and restore (AC 5, D111-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
    mockedListCourses.mockResolvedValue(allCourses);
    mockedUpdateCourse.mockResolvedValue(cs101);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('archives through the confirmation dialog (which states the operation is reversible); on success the list re-reads and the success is announced', async () => {
    mockedListCourses
      .mockResolvedValueOnce(allCourses)
      .mockResolvedValueOnce([calculus, { ...cs101, isActive: false }, history]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(
      screen.getByRole('button', { name: /actions for intro to computer science/i })
    );
    await validUser.click(
      screen.getByRole('menuitem', { name: /archive intro to computer science/i })
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Archive Intro to Computer Science?');
    expect(dialog).toHaveTextContent(/nothing is deleted/i);

    await validUser.click(
      within(dialog).getByRole('button', { name: /archive intro to computer science/i })
    );

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith('course-2', { isActive: false })
    );
    await waitFor(() => expect(mockedListCourses).toHaveBeenCalledTimes(2));
    // The archived row is hidden again (the switch is off by default — the
    // remaining active row is the only one visible)…
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Calculus I');
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    // …and the success is announced.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Intro to Computer Science archived. You can restore it at any time.'
    );
  });

  it('restores an archived row through the same dialog; on success the row is active again', async () => {
    mockedListCourses
      .mockResolvedValueOnce(allCourses)
      .mockResolvedValueOnce([calculus, cs101, { ...history, isActive: true }]);
    renderPage();
    await screen.findAllByRole('listitem');

    // Make the archived row visible, then restore it.
    await validUser.click(screen.getByRole('switch', { name: /show archived/i }));
    await validUser.click(screen.getByRole('button', { name: /actions for world history/i }));
    await validUser.click(screen.getByRole('menuitem', { name: /restore world history/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Restore World History?');
    await validUser.click(within(dialog).getByRole('button', { name: /restore world history/i }));

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith('course-3', { isActive: true })
    );
    await waitFor(() => expect(mockedListCourses).toHaveBeenCalledTimes(2));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveTextContent('World History');
    expect(items[2]).not.toHaveTextContent('Archived');
    expect(screen.getByRole('status')).toHaveTextContent('World History restored.');
  });

  it('closes the dialog on Cancel without sending a request', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /actions for calculus i/i }));
    await validUser.click(screen.getByRole('menuitem', { name: /archive calculus i/i }));
    await screen.findByRole('dialog');
    await validUser.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedUpdateCourse).not.toHaveBeenCalled();
    expect(mockedListCourses).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('CoursesPage accessibility and responsiveness (AC 6, DoD 6/7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
    mockedListCourses.mockResolvedValue(allCourses);
    mockedUpdateCourse.mockResolvedValue(cs101);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('announces status changes through an always-present live region', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    // Present from first render (before any status exists) so changes are
    // announced, and empty at rest.
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('');
  });

  it('opens the archive dialog with the keyboard and returns focus to the trigger on Escape', async () => {
    renderPage();
    const trigger = await screen.findByRole('button', { name: /actions for calculus i/i });
    trigger.focus();
    await validUser.keyboard('{Enter}');
    await validUser.keyboard('{ArrowDown}');
    await validUser.keyboard('{Enter}');

    // The dialog takes focus (its safe action) — the trap is active.
    const cancel = await screen.findByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();

    await validUser.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedUpdateCourse).not.toHaveBeenCalled();
    // Focus returns to the trigger that opened the dialog.
    expect(trigger).toHaveFocus();
  });

  it('renders a responsive page container with no fixed widths that force horizontal scroll', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    const container = document.querySelector('.max-w-5xl');
    expect(container).not.toBeNull();
    expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
  });
});
