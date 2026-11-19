import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { SessionIndicator } from './SessionIndicator';
import {
  CurrentSessionContext,
  defaultCurrentSessionValue,
  type CurrentSessionValue,
} from '../model/useCurrentSession';
import { useAuth } from '@/features/auth/model/AuthContext';
import { anchorFor } from '@/entities/study-session/model/elapsed';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';
import type { StudySession } from '@/entities/study-session/model/types';

vi.mock('@/features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
type AuthContextType = ReturnType<typeof useAuth>;

const session: StudySession = {
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

function contextValue(
  s: StudySession | null,
  overrides: Partial<CurrentSessionValue> = {}
): CurrentSessionValue {
  return {
    ...defaultCurrentSessionValue,
    session: s,
    anchor: s ? anchorFor(s, Date.now()) : null,
    ownerId: 'user-1',
    settled: true,
    ...overrides,
  };
}

function NavigationProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    const fire = (event: Event) => {
      navigate((event as CustomEvent<{ to: string }>).detail.to);
    };
    window.addEventListener('test:navigate', fire);
    return () => window.removeEventListener('test:navigate', fire);
  }, [navigate]);
  return null;
}

function renderIndicator(value: CurrentSessionValue, path = '/today') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationProbe />
      <CurrentSessionContext.Provider value={value}>
        <SessionIndicator />
      </CurrentSessionContext.Provider>
    </MemoryRouter>
  );
}

function liveSpan() {
  return document.querySelector('[aria-live="polite"]');
}

describe('SessionIndicator (EP16D-AC2, AC-E16-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00.000Z'));
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: null },
      isAuthenticated: true,
    } as unknown as AuthContextType);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Running · 00:42" and a Back to session link for an ACTIVE session', () => {
    renderIndicator(contextValue(session));
    expect(screen.getByText(/Running ·/)).toBeInTheDocument();
    expect(screen.getByText('00:42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to session' })).toBeInTheDocument();
  });

  it('ticks once per second while ACTIVE', () => {
    renderIndicator(contextValue(session));
    expect(screen.getByText('00:42')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:43')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('00:45')).toBeInTheDocument();
  });

  it('shows "Paused · 12:34" and does not tick for a PAUSED session', () => {
    renderIndicator(
      contextValue({
        ...session,
        status: 'PAUSED',
        elapsedSeconds: 754,
        updatedAt: new Date().toISOString(),
      })
    );
    expect(screen.getByText(/Paused ·/)).toBeInTheDocument();
    expect(screen.getByText('12:34')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('12:34')).toBeInTheDocument();
  });

  it('renders nothing for null', () => {
    renderIndicator(contextValue(null));
    expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Running|Paused/)).not.toBeInTheDocument();
  });

  it('renders nothing for a COMPLETED session', () => {
    renderIndicator(contextValue({ ...session, status: 'COMPLETED' }));
    expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
  });

  it('renders nothing when the read fails', () => {
    // D-D4: a failed read settles as null — the header never carries an error.
    renderIndicator(contextValue(null, { settled: true }));
    expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
    expect(liveSpan()).toHaveTextContent('');
  });

  it('renders nothing on /focus and shows on /focus/history', () => {
    const { unmount } = renderIndicator(contextValue(session), '/focus');
    expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
    unmount();

    renderIndicator(contextValue(session), '/focus/history');
    expect(screen.getByRole('link', { name: 'Back to session' })).toBeInTheDocument();
  });

  it('Back to session links to /focus', () => {
    renderIndicator(contextValue(session));
    expect(screen.getByRole('link', { name: 'Back to session' })).toHaveAttribute('href', '/focus');
  });

  it('the time is aria-hidden and the live text is the sentence only', () => {
    renderIndicator(contextValue(session));
    const time = screen.getByText('00:42');
    expect(time.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(liveSpan()).toHaveTextContent('Your focus session is running.');
    expect(liveSpan()?.textContent).not.toMatch(/\d/);
  });

  it('announces once on appearance and stays silent on ticks and route changes', () => {
    renderIndicator(contextValue(session));
    const span = liveSpan();
    expect(span).toHaveTextContent('Your focus session is running.');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(span?.textContent).toBe('Your focus session is running.');

    act(() => {
      window.dispatchEvent(new CustomEvent('test:navigate', { detail: { to: '/plan' } }));
    });
    // Same persistent span, same text: nothing new for the live region to announce.
    expect(liveSpan()).toBe(span);
    expect(span?.textContent).toBe('Your focus session is running.');
  });

  it('uses h:mm:ss past one hour', () => {
    renderIndicator(contextValue({ ...session, elapsedSeconds: 4512 }));
    expect(screen.getByText('1:15:12')).toBeInTheDocument();
  });

  it('Back to session has a 44px target', () => {
    renderIndicator(contextValue(session));
    expect(screen.getByRole('link', { name: 'Back to session' })).toHaveClass('min-h-[44px]');
  });

  describe('paused-session nudge (EP16H, D-H2/D-H3)', () => {
    const pausedSince = (minutesAgo: number) =>
      contextValue({
        ...session,
        status: 'PAUSED',
        elapsedSeconds: 754,
        updatedAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
      });

    it('shows the EP16D paused copy under the threshold', () => {
      renderIndicator(pausedSince(14));
      expect(screen.getByText(/^Paused ·/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to session' })).toHaveAttribute(
        'href',
        '/focus'
      );
      expect(liveSpan()).toHaveTextContent('Your focus session is paused.');
    });

    it('switches to "Paused a while" and Resume at the threshold', () => {
      renderIndicator(pausedSince(14));
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.getByText(/^Paused a while ·/)).toBeInTheDocument();
      // The time itself stays the static paused elapsed, not the wait.
      expect(screen.getByText('12:34')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/focus');
      expect(liveSpan()).toHaveTextContent(
        'Your session has been paused for a while — ready when you are.'
      );
    });

    it('announces the long-pause sentence once and stays silent afterwards', () => {
      renderIndicator(pausedSince(15));
      const span = liveSpan();
      const sentence = 'Your session has been paused for a while — ready when you are.';
      expect(span?.textContent).toBe(sentence);
      act(() => {
        vi.advanceTimersByTime(5 * 60_000);
      });
      expect(liveSpan()).toBe(span);
      expect(span?.textContent).toBe(sentence);
    });

    it('returns to Running when the session resumes', () => {
      const { rerender } = renderIndicator(pausedSince(20));
      expect(screen.getByText(/^Paused a while ·/)).toBeInTheDocument();
      rerender(
        <MemoryRouter initialEntries={['/today']}>
          <NavigationProbe />
          <CurrentSessionContext.Provider
            value={contextValue({ ...session, updatedAt: new Date().toISOString() })}
          >
            <SessionIndicator />
          </CurrentSessionContext.Provider>
        </MemoryRouter>
      );
      expect(screen.getByText(/^Running ·/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to session' })).toBeInTheDocument();
      expect(liveSpan()).toHaveTextContent('Your focus session is running.');
    });

    it('passes the copy audit in the long-pause state', () => {
      const { container } = renderIndicator(pausedSince(30));
      expectNoForbiddenWords(container);
      expect(container.textContent).not.toMatch(/stopped|abandoned|idle/i);
    });
  });

  it('passes the copy audit', () => {
    const { container } = renderIndicator(contextValue(session));
    expectNoForbiddenWords(container);
    const { container: paused } = renderIndicator(
      contextValue({ ...session, status: 'PAUSED', updatedAt: new Date().toISOString() })
    );
    expectNoForbiddenWords(paused);
  });
});
