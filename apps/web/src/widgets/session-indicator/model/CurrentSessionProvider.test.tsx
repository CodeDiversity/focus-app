import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { CurrentSessionProvider } from './CurrentSessionProvider';
import { useCurrentSession } from './useCurrentSession';
import { SessionIndicator } from '../ui/SessionIndicator';
import { useAuth } from '@/features/auth/model/AuthContext';
import { getCurrentStudySession } from '@/entities/study-session/api/studySessionApi';
import type { StudySession } from '@/entities/study-session/model/types';

vi.mock('@/features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  getCurrentStudySession: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedGetCurrent = vi.mocked(getCurrentStudySession);

type AuthContextType = ReturnType<typeof useAuth>;

function authValue(user: { id: string } | null): AuthContextType {
  return {
    user,
    isAuthenticated: user !== null,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
    isVerificationBannerDismissed: false,
    dismissVerificationBanner: vi.fn(),
  } as unknown as AuthContextType;
}

const activeSession: StudySession = {
  id: 's-1',
  assignmentId: null,
  taskId: null,
  plannedSessionId: null,
  status: 'ACTIVE',
  startTime: '2026-11-18T10:00:00.000Z',
  endTime: null,
  elapsedSeconds: 42,
  durationMinutes: 0,
  plannedMinutes: 25,
  notes: null,
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:00:00.000Z',
};

function Probe() {
  const { session, ownerId, settled, refresh } = useCurrentSession();
  return (
    <div>
      <span data-testid="session">{session ? `${session.id}:${session.status}` : 'none'}</span>
      <span data-testid="owner">{ownerId ?? 'none'}</span>
      <span data-testid="settled">{String(settled)}</span>
      <button onClick={refresh}>refresh</button>
    </div>
  );
}

/** Drives router navigation without a mouse event (menus must stay untouched). */
function NavigationProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    const fire = (event: Event) => {
      const detail = (event as CustomEvent<{ to: string }>).detail;
      navigate(detail.to);
    };
    window.addEventListener('test:navigate', fire);
    return () => window.removeEventListener('test:navigate', fire);
  }, [navigate]);
  return null;
}

function navigateTo(to: string) {
  act(() => {
    window.dispatchEvent(new CustomEvent('test:navigate', { detail: { to } }));
  });
}

function renderProvider(user: { id: string } | null, children = <Probe />) {
  mockedUseAuth.mockReturnValue(authValue(user));
  return render(
    <MemoryRouter initialEntries={['/today']}>
      <NavigationProbe />
      <CurrentSessionProvider>{children}</CurrentSessionProvider>
    </MemoryRouter>
  );
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

const flush = () => act(async () => {});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('CurrentSessionProvider (EP16D-AC2, D-D1/D-D8, D16-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrent.mockResolvedValue(null);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads once on mount when signed in', async () => {
    mockedGetCurrent.mockResolvedValue(activeSession);
    renderProvider({ id: 'user-1' });
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('s-1:ACTIVE'));
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('owner')).toHaveTextContent('user-1');
    expect(screen.getByTestId('settled')).toHaveTextContent('true');
  });

  it('does not read when signed out', async () => {
    renderProvider(null);
    await flush();
    expect(mockedGetCurrent).not.toHaveBeenCalled();
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('settled')).toHaveTextContent('false');
  });

  it('reads again on every pathname change', async () => {
    renderProvider({ id: 'user-1' });
    await flush();
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);

    navigateTo('/plan');
    await flush();
    expect(mockedGetCurrent).toHaveBeenCalledTimes(2);

    navigateTo('/focus');
    await flush();
    expect(mockedGetCurrent).toHaveBeenCalledTimes(3);
  });

  it('reads on visibilitychange to visible, not to hidden', async () => {
    renderProvider({ id: 'user-1' });
    await flush();
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    await flush();
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await flush();
    expect(mockedGetCurrent).toHaveBeenCalledTimes(2);
  });

  it('never reads on an interval', async () => {
    vi.useFakeTimers();
    renderProvider({ id: 'user-1' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);
  });

  it('drops a response that resolves after a newer read', async () => {
    const first = deferred<StudySession | null>();
    const second = deferred<StudySession | null>();
    mockedGetCurrent
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    renderProvider({ id: 'user-1' });
    navigateTo('/plan');
    expect(mockedGetCurrent).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve({ ...activeSession, id: 's-2' });
    });
    expect(screen.getByTestId('session')).toHaveTextContent('s-2:ACTIVE');

    // The stale first response must not clobber the newer one.
    await act(async () => {
      first.resolve({ ...activeSession, id: 's-1' });
    });
    expect(screen.getByTestId('session')).toHaveTextContent('s-2:ACTIVE');
  });

  it('refresh() re-reads', async () => {
    renderProvider({ id: 'user-1' });
    await flush();
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);

    mockedGetCurrent.mockResolvedValue(activeSession);
    screen.getByRole('button', { name: 'refresh' }).click();
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('s-1:ACTIVE'));
    expect(mockedGetCurrent).toHaveBeenCalledTimes(2);
  });

  it('useCurrentSession outside a provider returns no session and a no-op refresh', async () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>
    );
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('owner')).toHaveTextContent('none');
    expect(screen.getByTestId('settled')).toHaveTextContent('false');
    screen.getByRole('button', { name: 'refresh' }).click();
    await flush();
    expect(mockedGetCurrent).not.toHaveBeenCalled();
  });

  describe('logout isolation (EP16D-AC3)', () => {
    function renderWithIndicator(user: { id: string } | null) {
      // A fresh element per (re)render: an identical element reference would
      // let React bail out without re-reading the mocked useAuth value.
      const tree = () => (
        <MemoryRouter initialEntries={['/today']}>
          <CurrentSessionProvider>
            <SessionIndicator />
            <Probe />
          </CurrentSessionProvider>
        </MemoryRouter>
      );
      mockedUseAuth.mockReturnValue(authValue(user));
      const utils = render(tree());
      return {
        ...utils,
        setUser(next: { id: string } | null) {
          mockedUseAuth.mockReturnValue(authValue(next));
          utils.rerender(tree());
        },
      };
    }

    it('after logout and login as another student nothing renders', async () => {
      mockedGetCurrent.mockResolvedValue(activeSession);
      const view = renderWithIndicator({ id: 'user-a' });
      expect(await screen.findByRole('link', { name: 'Back to session' })).toBeInTheDocument();

      // Logout: the indicator and the provider state clear at once.
      mockedGetCurrent.mockResolvedValue(null);
      view.setUser(null);
      expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
      expect(screen.getByTestId('session')).toHaveTextContent('none');

      // Student B without a session: still nothing.
      view.setUser({ id: 'user-b' });
      await flush();
      expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
      expect(screen.getByTestId('session')).toHaveTextContent('none');
      expect(screen.getByTestId('owner')).toHaveTextContent('user-b');
    });

    it('a read started for student A that resolves after logout is discarded', async () => {
      const readForA = deferred<StudySession | null>();
      mockedGetCurrent.mockImplementationOnce(() => readForA.promise);
      const view = renderWithIndicator({ id: 'user-a' });
      expect(mockedGetCurrent).toHaveBeenCalledTimes(1);

      // Logout before A's read resolves.
      view.setUser(null);
      await act(async () => {
        readForA.resolve(activeSession);
      });

      expect(screen.getByTestId('session')).toHaveTextContent('none');
      expect(screen.getByTestId('owner')).toHaveTextContent('none');
      expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
    });
  });
});
