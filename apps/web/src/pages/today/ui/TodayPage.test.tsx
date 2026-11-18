import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { Providers, makeTestStore } from '@/test/providers';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { authService } from '@/features/auth/api/authService';
import { TodayPage } from './TodayPage';
import type { AssignmentListItem } from '@/shared/types/academic';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';

/**
 * EP16A (TR-E16-01) — the Today page. The RTK Query slices call the shared
 * `httpClient` directly, so the page is exercised at the axios-adapter level
 * (the EP05B dashboard test's precedent).
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

const TODAY = '2026-10-30';
const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const OTHER_ZONE = BROWSER_ZONE === 'Pacific/Kiritimati' ? 'Europe/London' : 'Pacific/Kiritimati';

const session = {
  id: 'ps-1',
  assignmentId: 'a1',
  assignmentTitle: 'Problem set 3',
  date: TODAY,
  startTime: '09:00',
  endTime: '10:00',
  durationMinutes: 60,
  status: 'SCHEDULED' as const,
  locked: false,
  anchor: 'FIXED' as const,
  windowHint: null,
};

let profileZone = BROWSER_ZONE;
let todayFailure: string | null = null;
let assignmentsFailure: string | null = null;
let todaySessions = [session];
let assignmentRows: AssignmentListItem[] = [];
let classEvents: CalendarEvent[] = [];
let momentum: Record<string, unknown> = { hasHistory: false };
let rolledForwardCount = 0;
let requests: string[] = [];

function makeAssignment(
  overrides: Partial<AssignmentListItem> & { id: string }
): AssignmentListItem {
  return {
    title: `Task ${overrides.id}`,
    description: null,
    dueDate: '2999-01-01T12:00:00.000Z',
    estimatedHours: null,
    actualHours: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    type: 'HOMEWORK',
    hard: null,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    course: { id: 'c1', name: 'Calculus', code: 'MATH101', color: '#10b981' },
    subtasks: [],
    ...overrides,
  };
}
const classAt = (id: string, startTime: string): CalendarEvent => ({
  id,
  type: 'CLASS',
  title: 'Calculus',
  subtitle: 'MATH101',
  date: TODAY,
  startTime,
  endTime: '10:00',
  courseId: 'c1',
  courseName: 'Calculus',
  courseColor: null,
  assignmentId: null,
  completed: false,
  focus: false,
  link: '/courses/c1',
});
const fullMomentum = {
  date: TODAY,
  timeZone: 'UTC',
  today: { confirmedMinutes: 25, goalMinutes: 60, goalMet: false },
  week: {
    startDate: '2026-10-26',
    days: [
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ],
    studyDays: ['2026-10-26'],
    studyDayCount: 1,
    goalDays: 3,
    goalMet: false,
  },
  run: { currentWeeks: 0, bestWeeks: 0, currentWeekCounted: false },
  hasHistory: true,
};
const originalAdapter = httpClient.defaults.adapter;

const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200) =>
  ({ data, status, statusText: 'OK', headers: {}, config }) as AxiosResponse;

function installAdapter() {
  httpClient.defaults.adapter = async (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    requests.push(`${method} ${config.url}`);
    if (config.url === '/calendar/events') {
      return ok(config, {
        timeZone: profileZone,
        today: TODAY,
        from: '2026-10-28',
        to: '2026-11-01',
        days: [],
        events: classEvents,
      });
    }
    if (config.url === '/study-plans/today') {
      if (todayFailure) {
        throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
          config,
          data: { message: todayFailure },
          status: 500,
          statusText: 'Error',
          headers: {},
        } as AxiosResponse);
      }
      return ok(config, {
        date: TODAY,
        timeZone: profileZone,
        sessions: todaySessions,
        nextSession: todaySessions[0] ?? null,
        nextSessionReason: todaySessions.length ? null : 'NO_PLAN',
        confirmedMinutesToday: 0,
      });
    }
    if (config.url === '/courses') return ok(config, []);
    if (config.url === '/assignments' && method === 'post') {
      const created = makeAssignment({ id: 'new-1', title: 'Reading list' });
      assignmentRows = [...assignmentRows, created];
      return ok(config, created, 201);
    }
    if (config.url === '/assignments') {
      if (assignmentsFailure) {
        throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
          config,
          data: { message: assignmentsFailure },
          status: 500,
          statusText: 'Error',
          headers: {},
        } as AxiosResponse);
      }
      return ok(config, assignmentRows);
    }
    if (config.url === '/study-sessions/momentum') return ok(config, momentum);
    if (config.url === '/study-plans/recovery-summary') {
      return ok(config, {
        missedSessions: [],
        missedCount: 0,
        rolledForward: [],
        rolledForwardCount,
        rolledForwardMinutes: rolledForwardCount * 60,
        unfinishedWork: [],
        confirmedMinutes: 0,
        message: '',
      });
    }
    throw new Error(`Unexpected request: ${method} ${config.url}`);
  };
}

const renderPage = () =>
  render(
    <Providers store={makeTestStore()} initialEntries={['/today']}>
      <AuthProvider>
        <TodayPage />
      </AuthProvider>
    </Providers>
  );

describe('TodayPage (EP16A)', () => {
  beforeEach(() => {
    profileZone = BROWSER_ZONE;
    todayFailure = null;
    assignmentsFailure = null;
    todaySessions = [session];
    assignmentRows = [];
    classEvents = [];
    momentum = { hasHistory: false };
    rolledForwardCount = 0;
    requests = [];
    installAdapter();
    vi.mocked(authService.refreshToken).mockResolvedValue({
      accessToken: 'test-token',
      user: { id: 'u1', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: '2026-10-01' },
    } as never);
  });
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('EP16A-AC1 / EP16B: heading "Today", title, the hero first; region order hero → note → momentum → Coming up → Classes today', async () => {
    rolledForwardCount = 1;
    momentum = fullMomentum;
    assignmentRows = [makeAssignment({ id: 'a1', title: 'Problem set 4' })];
    classEvents = [classAt('class-1', '09:00')];
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    expect(await screen.findByText('Problem set 3')).toBeInTheDocument();
    expect(document.title).toBe('Today — StudyPilot');
    await screen.findByText('Problem set 4');
    await screen.findByTestId('classes-today');
    const order = Array.from(
      document.querySelectorAll(
        '[aria-labelledby="today-plan-heading"], [data-testid="plan-note"], [data-testid="momentum-row"], [data-testid="coming-up"], [data-testid="classes-today"]'
      )
    ).map((el) => el.getAttribute('data-testid') ?? 'hero');
    expect(order).toEqual(['hero', 'plan-note', 'momentum-row', 'coming-up', 'classes-today']);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      "Today's plan",
      'Your momentum',
      'Coming up',
      'Classes today',
    ]);
    expect(screen.getByRole('button', { name: 'Start focus' })).toBeInTheDocument();
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'View Profile' })).toBeNull();
  });

  it('EP16B: with nothing to show, only the hero renders (every secondary region renders nothing)', async () => {
    renderPage();
    await screen.findByText('Problem set 3');
    await waitFor(() => expect(requests.some((r) => r.includes('momentum'))).toBe(true));
    await waitFor(() => expect(requests.some((r) => r.includes('recovery-summary'))).toBe(true));
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      "Today's plan",
    ]);
    expect(screen.queryByTestId('plan-note')).toBeNull();
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(screen.queryByTestId('classes-today')).toBeNull();
  });

  it('EP16B-AC4 (D-B9): the live region reads sessions · classes · coming up with uncapped totals, omitting zero parts', async () => {
    assignmentRows = Array.from({ length: 7 }, (_, i) => makeAssignment({ id: `a${i}` }));
    classEvents = [classAt('c1', '09:00'), classAt('c2', '11:00')];
    renderPage();
    const region = await screen.findByRole('status');
    await waitFor(() =>
      expect(region).toHaveTextContent(
        '1 session planned today · 2 classes today · 7 assignments coming up'
      )
    );
    // Capped list, uncapped sentence.
    expect(screen.getAllByText(/^Task a\d$/)).toHaveLength(5);
  });

  it('EP16B: the hero renders while the secondary reads are pending, and a failing assignments read leaves the rest usable', async () => {
    assignmentsFailure = 'Assignments unavailable';
    classEvents = [classAt('c1', '09:00')];
    renderPage();
    expect(await screen.findByText('Problem set 3')).toBeInTheDocument();
    expect(await screen.findByText('Assignments unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull(); // D-B7: not an alert
    expect(screen.getByTestId('classes-today')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start focus' })).toBeEnabled();
  });

  it('EP16B: Refresh refetches plan, calendar, assignments, momentum and recovery summary', async () => {
    renderPage();
    await screen.findByText('Problem set 3');
    await waitFor(() =>
      expect(requests.filter((r) => r.startsWith('get')).length).toBeGreaterThanOrEqual(5)
    );
    const before = requests.length;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh today' }));
    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(before + 5));
    for (const url of [
      '/study-plans/today',
      '/calendar/events',
      '/assignments',
      '/study-sessions/momentum',
      '/study-plans/recovery-summary',
    ]) {
      expect(requests.slice(before).some((r) => r.endsWith(url))).toBe(true);
    }
  });

  it("EP16B-AC3: opening a row's details opens the shared dialog once (D05-17)", async () => {
    assignmentRows = [makeAssignment({ id: 'a1', title: 'Problem set 4' })];
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Problem set 4' }));
    expect(await screen.findAllByRole('dialog')).toHaveLength(1);
  });

  it('EP16B: adding an assignment refetches Coming up and the new row appears', async () => {
    renderPage();
    await screen.findByText('Problem set 3');
    await userEvent.click(screen.getByRole('button', { name: 'Add assignment' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Reading list');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create assignment' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByRole('button', { name: 'Reading list' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Assignment added.');
  });

  it('EP16B-AC5: copy audit — empty, full, and error states; exactly one role="status"', async () => {
    const { container, unmount } = renderPage();
    await screen.findByText('Problem set 3');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expectNoForbiddenWords(container);
    unmount();

    rolledForwardCount = 2;
    momentum = fullMomentum;
    assignmentRows = [
      makeAssignment({ id: 'p1', title: 'Lab report', dueDate: '2020-01-05T12:00:00.000Z' }),
      makeAssignment({ id: 'u1', title: 'Problem set 4' }),
    ];
    classEvents = [classAt('c1', '09:00')];
    const full = renderPage();
    await screen.findByText('Lab report');
    await screen.findByTestId('classes-today');
    expect(screen.getByText('Past due')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expectNoForbiddenWords(full.container);
    full.unmount();

    assignmentsFailure = 'Service unavailable';
    todayFailure = 'Plan unavailable';
    const errored = renderPage();
    await screen.findByText('Service unavailable');
    await screen.findByText('Plan unavailable');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expectNoForbiddenWords(errored.container);
  });

  it('EP16A-AC1 (D-A2): one live region describing the plan’s sessions', async () => {
    renderPage();
    const regions = await screen.findAllByRole('status');
    expect(regions).toHaveLength(1);
    await waitFor(() => expect(regions[0]).toHaveTextContent('1 session planned today'));
  });

  it('EP16A-AC1 (D16-10): the day line omits the zone when it matches the browser', async () => {
    renderPage();
    expect(await screen.findByText('Today, Oct 30, 2026')).toBeInTheDocument();
    expect(screen.queryByText(/Times shown in/)).toBeNull();
  });

  it('EP16A-AC1 (D16-10): the day line names the profile zone when it differs', async () => {
    profileZone = OTHER_ZONE;
    renderPage();
    expect(
      await screen.findByText(`Today, Oct 30, 2026 · Times shown in ${OTHER_ZONE}`)
    ).toBeInTheDocument();
  });

  it('EP16A-AC1: a failing plan read shows the hero’s error while the header stays usable', async () => {
    todayFailure = 'Plan service unavailable';
    renderPage();
    expect(await screen.findByText('Plan service unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add assignment' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Refresh today' })).toBeEnabled();
  });

  it('EP16A-AC3: with no plan the hero offers "Plan my week"', async () => {
    todaySessions = [];
    renderPage();
    const link = await screen.findByRole('link', { name: 'Plan my week' });
    expect(link).toHaveAttribute('href', '/plan/proposal');
    expect(screen.getByText('No plan for today yet')).toBeInTheDocument();
  });

  it('EP16A-AC1 (EP05C kept): Add assignment creates, announces in the single region and returns focus', async () => {
    renderPage();
    await screen.findByText('Problem set 3');
    const add = screen.getByRole('button', { name: 'Add assignment' });
    expect(add.classList.contains('bg-accent')).toBe(false); // D16-12 (8): not a second primary
    await userEvent.click(add);
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Reading list');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create assignment' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Assignment added.'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add assignment' })).toHaveFocus()
    );
  });
});
