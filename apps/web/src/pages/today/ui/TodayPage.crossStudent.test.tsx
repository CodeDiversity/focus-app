import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { Providers, makeTestStore } from '@/test/providers';
import { setUser, clearUser } from '@/features/session/model/authSlice';
import { TodayPage } from './TodayPage';

/**
 * EP16G-AC3 — two students on one tab. Student A's Today is cached; A logs
 * out; B signs in within the cache window. Today must issue a fresh read for
 * B and never show A's assignment title again. `useAuth` is mocked to the
 * store's user so the page renders without the boot-time refresh.
 */
vi.mock('@/features/auth/model/AuthContext', async () => {
  const { useSelector } = await import('react-redux');
  return {
    useAuth: () => {
      const user = useSelector((s: { auth: { user: unknown } }) => s.auth.user);
      return { user, isAuthenticated: Boolean(user), isLoading: false };
    },
  };
});

const TODAY = '2026-11-18';
const A = { id: 'u-a', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null };
const B = { id: 'u-b', name: 'Bob', email: 'bob@example.com', emailVerifiedAt: null };

let current: 'A' | 'B' = 'A';
let todayReads = 0;
const originalAdapter = httpClient.defaults.adapter;

const ok = (config: InternalAxiosRequestConfig, data: unknown) =>
  ({ data, status: 200, statusText: 'OK', headers: {}, config }) as AxiosResponse;

const planFor = (title: string) => {
  const session = {
    id: `ps-${title}`,
    assignmentId: `a-${title}`,
    assignmentTitle: title,
    date: TODAY,
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 60,
    status: 'SCHEDULED',
    locked: false,
    anchor: 'FIXED',
    windowHint: null,
  };
  return {
    date: TODAY,
    timeZone: 'UTC',
    sessions: [session],
    nextSession: session,
    nextSessionReason: null,
    confirmedMinutesToday: 0,
  };
};

describe('TodayPage across two students (EP16G-AC3)', () => {
  beforeEach(() => {
    current = 'A';
    todayReads = 0;
    httpClient.defaults.adapter = async (config) => {
      if (config.url === '/study-plans/today') {
        todayReads += 1;
        return ok(config, planFor(current === 'A' ? "Ada's thesis chapter" : "Bob's lab report"));
      }
      if (config.url === '/calendar/events') {
        return ok(config, {
          timeZone: 'UTC',
          today: TODAY,
          from: TODAY,
          to: TODAY,
          days: [],
          events: [],
        });
      }
      if (config.url === '/courses') return ok(config, []);
      throw new Error(`Unexpected request: ${config.url}`);
    };
  });
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it("B's Today re-reads and never shows A's cached plan after A logs out", async () => {
    const store = makeTestStore();
    store.dispatch(setUser(A));
    const first = render(
      <Providers store={store} initialEntries={['/today']}>
        <TodayPage />
      </Providers>
    );
    expect(await screen.findByText("Ada's thesis chapter")).toBeInTheDocument();
    expect(todayReads).toBe(1);

    // A logs out (the page unmounts on the redirect to /login) …
    first.unmount();
    store.dispatch(clearUser());
    // … and B signs in on the same tab, well inside the 60 s cache window.
    current = 'B';
    store.dispatch(setUser(B));
    render(
      <Providers store={store} initialEntries={['/today']}>
        <TodayPage />
      </Providers>
    );
    // A's title must never render — not even for one frame from the cache.
    expect(screen.queryByText("Ada's thesis chapter")).toBeNull();
    expect(await screen.findByText("Bob's lab report")).toBeInTheDocument();
    expect(screen.queryByText("Ada's thesis chapter")).toBeNull();
    await waitFor(() => expect(todayReads).toBe(2));
  });
});
