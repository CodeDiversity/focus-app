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
let todaySessions = [session];
let requests: string[] = [];
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
        events: [],
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
      return ok(config, { id: 'new-1', title: 'Reading list' }, 201);
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
    todaySessions = [session];
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

  it('EP16A-AC1: heading "Today", title, the hero first, and no other region', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    expect(await screen.findByText('Problem set 3')).toBeInTheDocument();
    expect(document.title).toBe('Today — StudyPilot');
    // Only the hero's own heading — no overdue, deadlines, classes, sessions or momentum.
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      "Today's plan",
    ]);
    expect(screen.getByRole('button', { name: 'Start focus' })).toBeInTheDocument();
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'View Profile' })).toBeNull();
    expect(requests.some((r) => r.includes('/assignments') && r.startsWith('get'))).toBe(false);
    expect(requests).not.toContain('get /study-sessions/momentum');
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
    expect(link).toHaveAttribute('href', '/plan');
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
