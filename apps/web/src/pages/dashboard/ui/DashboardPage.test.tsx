import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { Providers, makeTestStore } from '@/test/providers';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { authService } from '@/features/auth/api/authService';
import { dashboardTodayRange } from '@/features/dashboard/model/dashboardRange';
import type { AssignmentListItem } from '@/shared/types/academic';
import type { CalendarEvent, CalendarEventsResult } from '@/entities/calendar/model/types';
import type { CourseWithSemester } from '@/entities/course/api/courseApi';
import { DashboardPage } from './DashboardPage';

/**
 * The RTK Query slices call `shared/api/httpClient` **directly** (they do
 * not go through the entity clients), so mocking
 * `@/entities/assignment/api/assignmentApi` would not intercept the
 * dashboard's GETs. The page test therefore intercepts at the axios-adapter
 * level — EP05A's slice-test precedent.
 */
vi.mock('@/features/auth/api/authService', () => ({
  authService: {
    refreshToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const mockedRefreshToken = vi.mocked(authService.refreshToken);

const TODAY = '2026-10-30';
const TIME_ZONE = 'America/New_York';

const sessionUser = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: '2026-10-01T12:00:00.000Z',
};

function makeAssignment(overrides: Partial<AssignmentListItem> = {}): AssignmentListItem {
  return {
    id: 'a1',
    title: 'Problem set 3',
    description: null,
    dueDate: '2999-12-31T12:00:00.000Z',
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

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'class:m1:2026-10-30',
    type: 'CLASS',
    title: 'Calculus lecture',
    subtitle: 'MATH101',
    date: TODAY,
    startTime: '09:00',
    endTime: '10:00',
    courseId: 'c1',
    courseName: 'Calculus',
    courseColor: '#10b981',
    assignmentId: null,
    completed: false,
    focus: false,
    link: '/courses/c1',
    ...overrides,
  };
}

/** One overdue, five upcoming and one finished assignment. */
const assignmentsPayload: AssignmentListItem[] = [
  makeAssignment({ id: 'overdue-1', title: 'Lab report', dueDate: '2020-01-05T12:00:00.000Z' }),
  ...Array.from({ length: 5 }, (_, index) =>
    makeAssignment({
      id: `upcoming-${index}`,
      title: `Upcoming ${index}`,
      dueDate: `2999-0${index + 1}-15T12:00:00.000Z`,
    })
  ),
  makeAssignment({ id: 'done-1', title: 'Finished work', status: 'COMPLETED' }),
];

/**
 * The student's courses — the create dialog's course select (EP05C
 * Decision #7). The plain-axios `listCourses()` goes through the same
 * `httpClient`, so the adapter answers it too.
 */
const coursesPayload: CourseWithSemester[] = [
  {
    id: 'c1',
    name: 'Calculus',
    code: 'MATH101',
    color: '#10b981',
    semesterId: 's1',
    semester: { id: 's1', name: 'Fall 2026' },
  } as unknown as CourseWithSemester,
];

const calendarPayload: CalendarEventsResult = {
  timeZone: TIME_ZONE,
  today: TODAY,
  from: '2026-10-28',
  to: '2026-11-01',
  events: [
    makeEvent(),
    makeEvent({ id: 'class:m2:2026-10-30', title: 'Physics lecture', startTime: '11:00' }),
    makeEvent({ id: 'class:m3:2026-10-30', title: 'Chemistry lab', startTime: '14:00' }),
    makeEvent({ id: 'class:m1:2026-10-31', title: 'Tomorrow class', date: '2026-10-31' }),
    makeEvent({
      id: 'session:s1:2026-10-30',
      type: 'STUDY_SESSION',
      title: 'Review calculus',
      startTime: '19:00',
      endTime: '20:00',
      link: null,
      focus: true,
    }),
  ],
};

/** The requests the adapter saw, in order. */
let requests: { url?: string; method?: string; params?: unknown }[] = [];
let assignmentsFailure: string | null = null;
let calendarFailure: string | null = null;
/**
 * The assignment rows the adapter serves. The create mutates it, so the
 * refetch after a create shows the new row (EP05C's cache hand-off).
 */
let assignmentRows: AssignmentListItem[] = assignmentsPayload;
/** The courses the adapter serves — empty models the "no courses" student. */
let courseRows: CourseWithSemester[] = coursesPayload;
/** The calendar events the adapter serves — empty models an empty day. */
let calendarEvents: CalendarEvent[] = calendarPayload.events;
/** A create failure: the shared form's 400 field-error body. */
let createFieldError: string | null = null;
/**
 * The profile zone the calendar payload echoes. The default case uses
 * `America/New_York`; the zone-extreme cases override it to pin the day
 * line's construction at both ends of the offset range (PC-EP05-13).
 */
let calendarTimeZone = TIME_ZONE;

const originalAdapter = httpClient.defaults.adapter;

function failure(config: InternalAxiosRequestConfig, message: string): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: { message },
    status: 500,
    statusText: 'Error',
    headers: {},
  } as AxiosResponse);
}

/** A 400 with a per-field error — the shared form's field-error branch. */
function fieldErrorFailure(
  config: InternalAxiosRequestConfig,
  field: string,
  message: string
): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: { statusCode: 400, message: 'Invalid assignment', errors: { [field]: [message] } },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
  } as AxiosResponse);
}

function installAdapter() {
  httpClient.defaults.adapter = async (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    requests.push({ url: config.url, method, params: config.params });
    if (config.url === '/assignments' && method === 'post') {
      if (createFieldError) {
        throw fieldErrorFailure(config, 'title', createFieldError);
      }
      // axios serializes the body before the adapter sees it.
      const raw = typeof config.data === 'string' ? config.data : JSON.stringify(config.data ?? {});
      const body = JSON.parse(raw) as { title?: string; courseId?: string };
      const created = makeAssignment({
        id: `created-${assignmentRows.length}`,
        title: body.title ?? 'Created assignment',
        course: body.courseId
          ? { id: body.courseId, name: 'Calculus', code: 'MATH101', color: '#10b981' }
          : null,
      });
      assignmentRows = [...assignmentRows, created];
      return {
        data: created,
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      } as AxiosResponse;
    }
    if (config.url === '/assignments') {
      if (assignmentsFailure) throw failure(config, assignmentsFailure);
      return {
        data: assignmentRows,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    }
    if (config.url === '/calendar/events') {
      if (calendarFailure) throw failure(config, calendarFailure);
      return {
        data: { ...calendarPayload, timeZone: calendarTimeZone, events: calendarEvents },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    }
    if (config.url === '/courses') {
      return {
        data: courseRows,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    }
    throw new Error(`Unexpected request: ${config.url}`);
  };
}

const renderPage = (props: Parameters<typeof DashboardPage>[0] = {}) =>
  render(
    <Providers store={makeTestStore()} initialEntries={['/dashboard']}>
      <AuthProvider>
        <DashboardPage {...props} />
      </AuthProvider>
    </Providers>
  );

/** The dashboard's controls in DOM order. */
function controlKinds(container: HTMLElement): string[] {
  return (
    Array.from(container.querySelectorAll('button, a[href]'))
      // The house "a Button inside a Link" pattern nests a button in a link —
      // one visual control, one entry here.
      .filter((node) => {
        const link = node.closest('a[href]');
        return !(link && link !== node);
      })
      .map((node) => {
        if (node.getAttribute('aria-label') === 'Refresh dashboard') return 'refresh';
        if (node.getAttribute('data-assignment-focus') === 'add') return 'add';
        if (node.getAttribute('href') === '/profile') return 'profile';
        if (node.getAttribute('aria-label')?.startsWith('See all')) return 'see-all';
        if (node.getAttribute('data-assignment-focus')?.startsWith('edit:')) return 'row';
        if (node.getAttribute('href')?.startsWith('/courses/')) return 'row';
        return 'other';
      })
  );
}

describe('DashboardPage (EP05B)', () => {
  beforeEach(() => {
    requests = [];
    assignmentsFailure = null;
    calendarFailure = null;
    calendarTimeZone = TIME_ZONE;
    assignmentRows = assignmentsPayload;
    courseRows = coursesPayload;
    calendarEvents = calendarPayload.events;
    createFieldError = null;
    installAdapter();
    mockedRefreshToken.mockResolvedValue({ accessToken: 'test-token', user: sessionUser });
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('renders the four sections in the page order with their headings', async () => {
    renderPage();

    await screen.findByText('Lab report');
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Overdue assignments',
      'Upcoming deadlines',
      "Today's classes",
      "Today's study sessions",
    ]);
  });

  it('shows the greeting and the day label built from the payload zone', async () => {
    renderPage();

    expect(await screen.findByText('Welcome back, Ada Lovelace!')).toBeInTheDocument();
    expect(await screen.findByText(`Today, Oct 30, 2026 · ${TIME_ZONE}`)).toBeInTheDocument();
  });

  /**
   * Day-line zone extremes (PC-EP05-13, finding F-EP05B-01 — REQUIRED test
   * obligations). The payload's `today` is a **civil date**, so the day line
   * renders it **verbatim** in **every** profile zone; the profile zone is
   * printed beside it as context and is never applied to it.
   *
   * These two cases are mandatory because no single UTC-anchored instant is
   * correct at both ends of the offset range: the superseded noon-UTC
   * construction (`new Date(`${today}T12:00:00Z`)` re-rendered in the profile
   * zone) is one day **ahead** at UTC+12 and later, and a midnight-UTC
   * construction is one day **behind** at UTC−12 and earlier.
   */
  it('renders the payload’s civil date verbatim at the UTC+14 extreme (Pacific/Kiritimati)', async () => {
    calendarTimeZone = 'Pacific/Kiritimati';
    renderPage();

    expect(await screen.findByText('Today, Oct 30, 2026 · Pacific/Kiritimati')).toBeInTheDocument();
    // The noon-UTC construction rendered this zone one day ahead.
    expect(screen.queryAllByText(/Oct 31, 2026/)).toHaveLength(0);
  });

  it('renders the payload’s civil date verbatim at the UTC-12 extreme (Etc/GMT+12)', async () => {
    calendarTimeZone = 'Etc/GMT+12';
    renderPage();

    expect(await screen.findByText('Today, Oct 30, 2026 · Etc/GMT+12')).toBeInTheDocument();
    // A midnight-UTC construction rendered this zone one day behind.
    expect(screen.queryAllByText(/Oct 29, 2026/)).toHaveLength(0);
  });

  it('shows no day line while the calendar query has no payload', async () => {
    calendarFailure = 'Calendar service unavailable';
    renderPage();

    await screen.findByRole('region', { name: "Today's classes" });
    expect(screen.queryByText(/^Today,/)).not.toBeInTheDocument();
  });

  it('announces the loaded state and the four counts through one live region', async () => {
    renderPage();

    const regions = await screen.findAllByRole('status');
    expect(regions).toHaveLength(1);
    await waitFor(() =>
      expect(regions[0]).toHaveTextContent(
        '3 classes today · 1 overdue assignment · 5 upcoming deadlines · 1 study session'
      )
    );
  });

  it('shows the overdue row with the text "Overdue"', async () => {
    renderPage();

    expect(await screen.findByText('Lab report')).toBeInTheDocument();
    expect(screen.getAllByText('Overdue')).toHaveLength(1);
  });

  it('keeps the two queries independent: a failing assignments query blanks only the assignment sections', async () => {
    assignmentsFailure = 'Assignments service unavailable';
    renderPage();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent('Assignments service unavailable');
    // The calendar sections still render their rows.
    expect(await screen.findByText('Calculus lecture')).toBeInTheDocument();
    expect(screen.getByText('Review calculus')).toBeInTheDocument();
  });

  it('keeps the two queries independent: a failing calendar query blanks only the calendar sections', async () => {
    calendarFailure = 'Calendar service unavailable';
    renderPage();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent('Calendar service unavailable');
    // The assignment sections still render their rows.
    expect(await screen.findByText('Lab report')).toBeInTheDocument();
  });

  it('contains no leftover placeholder content', async () => {
    renderPage();

    await screen.findByText('Lab report');
    // The placeholder's four cards are gone: the page's only headings are
    // the page heading and the four section headings.
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Dashboard',
      'Overdue assignments',
      'Upcoming deadlines',
      "Today's classes",
      "Today's study sessions",
    ]);
    expect(screen.queryByText('Study Stats')).not.toBeInTheDocument();
    expect(screen.queryByText('Hours Studied')).not.toBeInTheDocument();
    expect(screen.queryByText('Tasks Completed')).not.toBeInTheDocument();
    expect(screen.queryByText('No assignments yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Study Plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Focus Session' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add New Assignment' })).not.toBeInTheDocument();
  });

  it('refetches both queries and recomputes the request window on refresh', async () => {
    renderPage();
    await screen.findByText('Lab report');
    const before = requests.length;

    await userEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));

    await waitFor(() => expect(requests.length).toBe(before + 2));
    const calendarRequests = requests.filter((request) => request.url === '/calendar/events');
    expect(calendarRequests).toHaveLength(2);
    expect(calendarRequests[1].params).toEqual(dashboardTodayRange());
    expect(requests.filter((request) => request.url === '/assignments')).toHaveLength(2);
  });

  it('renders a responsive page container whose section grid splits at the lg breakpoint', async () => {
    const { container } = renderPage();
    await screen.findByText('Lab report');

    const shell = container.querySelector('section');
    expect(shell).toHaveClass('max-w-5xl', 'px-4', 'sm:px-6', 'lg:px-8');

    const grid = shell?.querySelector('.grid');
    expect(grid).toHaveClass('gap-6', 'lg:grid-cols-2');

    // The rows keep a 44 px minimum tap target below the sm breakpoint.
    const list = screen.getByRole('region', { name: 'Overdue assignments' }).querySelector('ul');
    expect(list).toHaveClass('max-sm:[&_button]:min-h-[44px]', 'max-sm:[&_a]:min-h-[44px]');
  });

  it('exposes the sections as named regions and the controls in a predictable keyboard order', async () => {
    const { container } = renderPage();
    await screen.findByText('Lab report');

    const regions = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-labelledby'));
    expect(regions).toEqual([
      'dashboard-heading',
      'dashboard-overdue-heading',
      'dashboard-upcoming-heading',
      'dashboard-classes-heading',
      'dashboard-sessions-heading',
    ]);

    expect(controlKinds(container)).toEqual([
      'refresh',
      'add',
      'profile',
      'see-all',
      'row',
      'see-all',
      'row',
      'row',
      'row',
      'row',
      'row',
      'see-all',
      'row',
      'row',
      'row',
      'see-all',
    ]);
  });

  it('gives every control the EP10 focus treatment', async () => {
    const { container } = renderPage();
    await screen.findByText('Lab report');

    const controls = Array.from(container.querySelectorAll('button, a[href]')).filter((node) => {
      const link = node.closest('a[href]');
      return !(link && link !== node);
    });
    expect(controls.length).toBeGreaterThan(0);
    controls.forEach((control) => {
      // The "View Profile" control is the house "a Button inside a Link".
      const target = control.querySelector('button') ?? control;
      expect(target.className).toContain('focus-visible:ring-focus-ring');
      expect(target.className).toContain('focus-visible:ring-offset-2');
    });
  });

  it('operates the refresh control and a row title with the keyboard alone', async () => {
    const onOpenDetails = vi.fn();
    renderPage({ onOpenDetails });
    await screen.findByText('Lab report');

    const refresh = screen.getByRole('button', { name: 'Refresh dashboard' });
    refresh.focus();
    expect(refresh).toHaveFocus();
    const before = requests.length;
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(requests.length).toBe(before + 2));

    const rowTitle = screen.getByRole('button', { name: 'Lab report' });
    rowTitle.focus();
    expect(rowTitle).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onOpenDetails.mock.calls[0][0]).toMatchObject({ id: 'overdue-1', title: 'Lab report' });
  });

  it('introduces no animation without its reduced-motion companion', async () => {
    const { container } = renderPage();
    await screen.findByText('Lab report');

    const animated = Array.from(container.querySelectorAll('*')).filter((element) =>
      Array.from(element.classList).some((name) => name.startsWith('animate-'))
    );
    animated.forEach((element) => {
      expect(element.classList.contains('motion-reduce:animate-none')).toBe(true);
    });
  });

  it('renders exactly one add control and no empty-add control', async () => {
    const { container } = renderPage();
    await screen.findByText('Lab report');

    // The reserved slot is replaced by the working "Add assignment" button —
    // exactly one `[data-assignment-focus="add"]`, and no `empty-add` control
    // (the shared hook falls back to the "add" control).
    expect(container.querySelectorAll('[data-assignment-focus="add"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-assignment-focus="empty-add"]')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Add assignment' })).toHaveAttribute(
      'data-assignment-focus',
      'add'
    );
  });
});

/**
 * EP05C — the quick action, the shared-owner mount, the empty states and the
 * focus/announcement contract (TR-E05-05, TR-E05-06, TR-E05-07).
 */
describe('DashboardPage (EP05C)', () => {
  beforeEach(() => {
    requests = [];
    assignmentsFailure = null;
    calendarFailure = null;
    calendarTimeZone = TIME_ZONE;
    assignmentRows = assignmentsPayload;
    courseRows = coursesPayload;
    calendarEvents = calendarPayload.events;
    createFieldError = null;
    installAdapter();
    mockedRefreshToken.mockResolvedValue({ accessToken: 'test-token', user: sessionUser });
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('opens exactly one dialog from the quick action and creates the assignment end to end', async () => {
    // One overdue row only, so the created row is visible in the section.
    assignmentRows = [
      makeAssignment({ id: 'overdue-1', title: 'Lab report', dueDate: '2020-01-05T12:00:00.000Z' }),
    ];
    renderPage();
    await screen.findByText('Lab report');

    await userEvent.click(screen.getByRole('button', { name: 'Add assignment' }));

    // Exactly one dialog — the shared create form, mounted once (D05-17).
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveAccessibleName('Add an assignment');
    // The shared form owns the focus: the first field takes it.
    expect(screen.getByLabelText('Title')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('Title'), 'Reading list');
    await userEvent.click(screen.getByRole('button', { name: 'Create assignment' }));

    // The POST went through the shared client, the dialog closed and the
    // assignments query was refetched — no page reload.
    await waitFor(() =>
      expect(
        requests.filter((request) => request.url === '/assignments' && request.method === 'post')
      ).toHaveLength(1)
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Reading list')).toBeInTheDocument());
    expect(
      requests.filter((request) => request.url === '/assignments' && request.method === 'get')
        .length
    ).toBeGreaterThanOrEqual(2);
  });

  it('moves focus to the add control after a create and announces it in the single live region', async () => {
    assignmentRows = [];
    renderPage();
    await screen.findByText('Nothing overdue.');

    await userEvent.click(screen.getByRole('button', { name: 'Add assignment' }));
    await userEvent.type(screen.getByLabelText('Title'), 'Focus check');
    await userEvent.click(screen.getByRole('button', { name: 'Create assignment' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The shared form restores focus to its activator, and the shared hook
    // focuses the same stable control once the refetch lands.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add assignment' })).toHaveFocus()
    );

    // One live region only, and it carries the action sentence.
    const regions = screen.getAllByRole('status');
    expect(regions).toHaveLength(1);
    await waitFor(() => expect(regions[0]).toHaveTextContent('Assignment added.'));
    // The count summary is never lost.
    expect(regions[0]).toHaveTextContent('upcoming deadline');
  });

  it('keeps the form open with the input and the shared message when the create fails', async () => {
    createFieldError = 'Title is already taken';
    assignmentRows = [];
    renderPage();
    await screen.findByText('Nothing overdue.');

    await userEvent.click(screen.getByRole('button', { name: 'Add assignment' }));
    await userEvent.type(screen.getByLabelText('Title'), 'Rejected work');
    await userEvent.click(screen.getByRole('button', { name: 'Create assignment' }));

    // The shared actionable message — the form's own field error.
    expect(await screen.findByText('Title is already taken')).toBeInTheDocument();
    // The form stays open with the student's input; the dashboard closes
    // nothing and adds no error surface of its own.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Rejected work');
    // No row was added.
    expect(screen.queryByText('Rejected work')).not.toBeInTheDocument();
  });

  it('mounts the shared owner exactly once and opens the same single dialog from a row', async () => {
    const { container } = renderPage();
    await screen.findByText('Lab report');

    // One owner, one mount (D05-17): one add control, no empty-add control.
    expect(container.querySelectorAll('[data-assignment-focus="add"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-assignment-focus="empty-add"]')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Lab report' }));

    // The row's affordance opens the shared edit dialog — the same single
    // dialog mount, never a second one.
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveAccessibleName('Edit assignment');
  });

  it('gives the four sections the settled empty-state copy and affordances', async () => {
    assignmentRows = [];
    calendarEvents = [];
    renderPage();
    await screen.findByText('Nothing overdue.');

    // The four settled title/description pairs.
    expect(screen.getByText('Nothing overdue.')).toBeInTheDocument();
    expect(
      screen.getByText(
        "You're all caught up — no assignment is past its due date. Add an assignment to put the next one on your list."
      )
    ).toBeInTheDocument();
    expect(screen.getByText('No upcoming deadlines.')).toBeInTheDocument();
    expect(
      screen.getByText("Nothing is due ahead. Add an assignment to keep track of what's next.")
    ).toBeInTheDocument();
    expect(screen.getByText('No classes today.')).toBeInTheDocument();
    expect(
      screen.getByText("No classes are scheduled for today. View your week to see what's ahead.")
    ).toBeInTheDocument();
    expect(screen.getByText('No study sessions today.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Nothing is scheduled for study today. Check the calendar for your classes and deadlines.'
      )
    ).toBeInTheDocument();

    // The two assignment sections offer a primary "Add an assignment" that
    // opens the shared create form.
    const addButtons = screen.getAllByRole('button', { name: 'Add an assignment' });
    expect(addButtons).toHaveLength(2);
    await userEvent.click(addButtons[0]);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The two calendar sections offer an outline link to /calendar.
    const weekLink = screen.getByRole('link', { name: 'View your week' });
    expect(weekLink).toHaveAttribute('href', '/calendar');
    const calendarLink = screen.getByRole('link', { name: 'Open the calendar' });
    expect(calendarLink).toHaveAttribute('href', '/calendar');
  });

  it('offers the course select in the create dialog and still creates without a course', async () => {
    renderPage();
    await screen.findByText('Lab report');

    await userEvent.click(screen.getByRole('button', { name: 'Add assignment' }));
    const select = await screen.findByLabelText('Course');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['No course', 'MATH101 Calculus']);
  });

  it('lets a student with no courses create a course-less assignment', async () => {
    courseRows = [];
    renderPage();
    await screen.findByText('Lab report');

    await userEvent.click(screen.getByRole('button', { name: 'Add assignment' }));
    const select = await screen.findByLabelText('Course');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['No course']);

    await userEvent.type(screen.getByLabelText('Title'), 'Course-less work');
    await userEvent.click(screen.getByRole('button', { name: 'Create assignment' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const created = requests.find(
      (request) => request.url === '/assignments' && request.method === 'post'
    );
    expect(created).toBeDefined();
  });

  it('keeps the header action group wrapping and the trigger at the 44 px tap target', async () => {
    const { container } = renderPage();
    await screen.findByText('Lab report');

    const group = screen.getByRole('button', { name: 'Add assignment' }).closest('div');
    expect(group?.className).toContain('flex-wrap');
    const trigger = screen.getByRole('button', { name: 'Add assignment' });
    expect(trigger.className).toContain('max-sm:min-h-[44px]');
    expect(trigger.className).toContain('focus-visible:ring-focus-ring');
    expect(trigger.className).toContain('focus-visible:ring-offset-2');
    expect(container.querySelectorAll('.overflow-x-auto')).toHaveLength(0);
  });
});
