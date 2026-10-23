import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { setupUser } from '@/test/user';
import { Providers } from '@/test/providers';
import { CourseDetailPage } from './CourseDetailPage';
import {
  getCourse,
  updateCourse,
  createMeeting,
  type CourseDetail,
} from '@/entities/course/api/courseApi';
import { listSemesters } from '@/entities/semester/api/semesterApi';
import toast from 'react-hot-toast';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';
import type { ClassMeeting, CourseAssignment } from '@/shared/types/academic';

vi.mock('@/entities/course/api/courseApi', () => ({
  getCourse: vi.fn(),
  listCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  listMeetings: vi.fn(),
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
}));

vi.mock('@/entities/semester/api/semesterApi', () => ({
  listSemesters: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedGetCourse = vi.mocked(getCourse);
const mockedUpdateCourse = vi.mocked(updateCourse);
const mockedCreateMeeting = vi.mocked(createMeeting);
const mockedListSemesters = vi.mocked(listSemesters);
const mockedToast = vi.mocked(toast);

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

const monday: ClassMeeting = {
  id: 'meeting-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  ...timestamps,
};

const homework: CourseAssignment = {
  id: 'asgn-1',
  title: 'Problem Set 3',
  description: null,
  dueDate: '2026-10-12T12:00:00.000Z',
  estimatedHours: 3,
  actualHours: null,
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  ...timestamps,
};

/** The detail the ready-state tests render (14-key `CourseDetail`). */
const cs101: CourseDetail = {
  id: 'course-1',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: 'An introduction to programming.',
  color: '#6366f1',
  credits: 4,
  instructor: 'Ada Lovelace',
  isActive: true,
  semesterId: 'sem-1',
  semester: { id: 'sem-1', name: 'Fall 2026' },
  meetings: [monday],
  assignments: [homework],
  ...timestamps,
};

/** The uniform 404 body the API sends for a missing/foreign course. */
const notFoundFailure = {
  response: {
    status: 404,
    data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
  },
  message: 'Request failed with status code 404',
};

/**
 * Renders the page inside a matching route so `useParams` resolves `:id`
 * (a page rendered outside a `<Route>` gets `{}` params — `id` would be
 * `undefined` and every meeting call would hit the API with no course).
 */
const renderPage = () =>
  render(
    <Providers initialEntries={['/courses/course-1']}>
      <Routes>
        <Route path="/courses/:id" element={<CourseDetailPage />} />
      </Routes>
    </Providers>
  );

describe('CourseDetailPage page states (AC 1/5, DoD 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the loading state (generic h1 + spinner copy) while the single fetch is in flight', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedGetCourse.mockImplementation(() => new Promise(() => undefined));
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Course');
    expect(await screen.findByText('Loading your course…')).toBeInTheDocument();
    // The sections are driven by the same fetch — neither renders yet.
    expect(screen.queryByRole('heading', { level: 2, name: 'Meetings' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Assignments' })
    ).not.toBeInTheDocument();
    // The live region is present from first render (DoD 6).
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a 404 (missing or foreign course) as the fixed error card with a Back to courses action and no retry (AC 1)', async () => {
    mockedGetCourse.mockRejectedValue(notFoundFailure);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't find this course. It may no longer exist.");
    // The recovery is leaving the page — a 404 does not self-heal, so no retry.
    expect(screen.getByRole('link', { name: /back to courses/i })).toHaveAttribute(
      'href',
      '/courses'
    );
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    // The stable h1 stays the generic "Course" in the error state (AC 6).
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Course');
  });

  it('renders any other fetch failure as an alert with a Try again that re-fetches (DoD 5)', async () => {
    const user = setupUser();
    mockedGetCourse.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(cs101);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Network Error');
    expect(screen.queryByRole('link', { name: /back to courses/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedGetCourse).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' })
    ).toHaveTextContent('Intro to Computer Science');
  });
});

describe('CourseDetailPage header (AC 2, D112B-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the color chip, h1 name, monospace code, the meta line, and the course actions', async () => {
    mockedGetCourse.mockResolvedValue(cs101);
    renderPage();

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });
    expect(h1).toHaveTextContent('Intro to Computer Science');
    // The code is monospace and muted…
    const code = screen.getByText('CS101');
    expect(code).toHaveClass('font-mono');
    // …and the meta line carries instructor · semester · credits.
    const meta = screen.getByText('Ada Lovelace').closest('p');
    expect(meta).toHaveTextContent('Fall 2026');
    expect(meta).toHaveTextContent('4 credits');
    // The actions mirror the list row's, with per-course labels.
    expect(
      screen.getByRole('button', { name: /edit intro to computer science/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /archive intro to computer science/i })
    ).toBeInTheDocument();
  });

  it('falls back to a muted "—" for a null instructor, "No semester" for a null semester, and omits null credits', async () => {
    mockedGetCourse.mockResolvedValue({
      ...cs101,
      instructor: null,
      semesterId: null,
      semester: null,
      credits: null,
    });
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });
    const meta = screen.getByText('—').closest('p');
    expect(meta).toHaveTextContent('No semester');
    expect(meta).not.toHaveTextContent(/credits/);
  });

  it('shows the full-width Archived banner above the header card and offers Restore (D112B-5)', async () => {
    mockedGetCourse.mockResolvedValue({ ...cs101, isActive: false });
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });
    expect(screen.getByText(/this course is archived/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /restore intro to computer science/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /archive intro to computer science/i })
    ).not.toBeInTheDocument();
  });

  it('clamps the description to 3 lines and shows Show more/less only when it overflows (D112B-2)', async () => {
    // jsdom reports 0 for both heights → no overflow → no toggle for a
    // short description.
    mockedGetCourse.mockResolvedValue({
      ...cs101,
      description: 'A short description.',
    });
    renderPage();

    await screen.findByText('A short description.');
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('offers the toggle for an overflowing description and expands/collapses it (D112B-2)', async () => {
    // Simulate a real measurement: the clamped element is shorter than its
    // content (jsdom reports 0 for both, so the getters are stubbed).
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40);
    const user = setupUser();
    mockedGetCourse.mockResolvedValue({
      ...cs101,
      description: 'x '.repeat(300).trim(),
    });
    renderPage();

    const description = await screen.findByText('x '.repeat(300).trim());
    expect(description).toHaveClass('line-clamp-3');
    const toggle = screen.getByRole('button', { name: /show more/i });

    await user.click(toggle);
    expect(description).not.toHaveClass('line-clamp-3');
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show less/i }));
    expect(description).toHaveClass('line-clamp-3');
  });

  it('renders the responsive container and the side-by-side section grid (AC 6, D112B-1)', async () => {
    mockedGetCourse.mockResolvedValue(cs101);
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });
    const container = document.querySelector('.max-w-5xl');
    expect(container).not.toBeNull();
    expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8', 'py-12');
    const grid = document.querySelector('.lg\\:grid-cols-2');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('grid', 'grid-cols-1');
  });
});

describe('CourseDetailPage sections (AC 3/4, D112-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
    mockedGetCourse.mockResolvedValue(cs101);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the meetings section in API order with the read-only assignments section', async () => {
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });
    // Meetings: the "Mon 09:00–10:30" row (D112B-7) + the Add meeting action.
    expect(screen.getByRole('heading', { level: 2, name: 'Meetings' })).toBeInTheDocument();
    expect(screen.getByText('Mon 09:00–10:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add meeting' })).toBeInTheDocument();
    // Assignments: title + due (browser time zone) + status/priority badges.
    expect(screen.getByRole('heading', { level: 2, name: 'Assignments' })).toBeInTheDocument();
    expect(screen.getByText('Problem Set 3')).toBeInTheDocument();
    expect(
      screen.getByText(`Due ${formatDate(new Date(homework.dueDate), getBrowserTimeZone())}`)
    ).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders the empty states for a course with no meetings and no assignments', async () => {
    mockedGetCourse.mockResolvedValue({ ...cs101, meetings: [], assignments: [] });
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });
    expect(screen.getByText('No meetings yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first meeting/i })).toBeInTheDocument();
    expect(screen.getByText('No assignments yet.')).toBeInTheDocument();
  });
});

describe('CourseDetailPage course mutations (AC 2/5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
    mockedGetCourse.mockResolvedValue(cs101);
    mockedUpdateCourse.mockResolvedValue(cs101);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the pre-filled CourseForm from Edit; on success it re-fetches and announces', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });

    await user.click(screen.getByRole('button', { name: /edit intro to computer science/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Edit Intro to Computer Science'
    );
    // Pre-filled from the detail.
    expect(within(dialog).getByLabelText(/course name/i)).toHaveValue('Intro to Computer Science');
    expect(within(dialog).getByLabelText(/instructor/i)).toHaveValue('Ada Lovelace');

    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ name: 'Intro to Computer Science' })
      )
    );
    // The dialog closes, the detail re-fetches in the background…
    await waitFor(() => expect(mockedGetCourse).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // …and the change is announced through the live region.
    expect(screen.getByRole('status')).toHaveTextContent('Intro to Computer Science updated.');
  });

  it('archives through the confirmation dialog; on success it re-fetches and announces', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });

    await user.click(screen.getByRole('button', { name: /archive intro to computer science/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Archive Intro to Computer Science?');

    await user.click(
      within(dialog).getByRole('button', { name: /archive intro to computer science/i })
    );

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith('course-1', { isActive: false })
    );
    await waitFor(() => expect(mockedGetCourse).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Intro to Computer Science archived. You can restore it at any time.'
    );
  });

  it('closes the archive dialog on Cancel without a request or a re-fetch', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });

    await user.click(screen.getByRole('button', { name: /archive intro to computer science/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedUpdateCourse).not.toHaveBeenCalled();
    expect(mockedGetCourse).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('CourseDetailPage meeting mutations (AC 3/5, D112B-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([]);
    mockedGetCourse.mockResolvedValue(cs101);
    mockedCreateMeeting.mockResolvedValue({ ...monday, id: 'meeting-2', dayOfWeek: 2 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('announces a successful meeting add and re-fetches the detail (the list re-derives from the API)', async () => {
    const user = setupUser();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });

    await user.click(screen.getByRole('button', { name: 'Add meeting' }));
    await screen.findByRole('dialog');
    await user.selectOptions(screen.getByLabelText('Day'), '2');
    await user.type(screen.getByLabelText('Start time'), '13:00');
    await user.type(screen.getByLabelText('End time'), '14:30');
    await user.click(screen.getByRole('button', { name: 'Create meeting' }));

    await waitFor(() =>
      expect(mockedCreateMeeting).toHaveBeenCalledWith('course-1', {
        dayOfWeek: 2,
        startTime: '13:00',
        endTime: '14:30',
      })
    );
    // The page re-fetches the detail (one fetch drives both sections)…
    await waitFor(() => expect(mockedGetCourse).toHaveBeenCalledTimes(2));
    // …and announces through the live region (D112B-10).
    expect(screen.getByRole('status')).toHaveTextContent('Meeting added.');
  });

  it('toasts a failed post-mutation re-fetch and keeps the last known detail (AC 5)', async () => {
    const user = setupUser();
    mockedGetCourse.mockResolvedValueOnce(cs101).mockRejectedValueOnce(new Error('Network Error'));
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Intro to Computer Science' });

    await user.click(screen.getByRole('button', { name: 'Add meeting' }));
    await screen.findByRole('dialog');
    await user.selectOptions(screen.getByLabelText('Day'), '2');
    await user.type(screen.getByLabelText('Start time'), '13:00');
    await user.type(screen.getByLabelText('End time'), '14:30');
    await user.click(screen.getByRole('button', { name: 'Create meeting' }));

    await waitFor(() => expect(mockedGetCourse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    // No full-page error — the last known detail stays on screen…
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Intro to Computer Science'
    );
    // …including the meetings list.
    expect(screen.getByText('Mon 09:00–10:30')).toBeInTheDocument();
  });
});
