import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useTabBarVisible } from './useTabBarVisible';
import {
  CurrentSessionContext,
  defaultCurrentSessionValue,
  type CurrentSessionValue,
} from '@/widgets/session-indicator/model/useCurrentSession';
import { useAuth } from '@/features/auth/model/AuthContext';
import type { StudySession } from '@/entities/study-session/model/types';

vi.mock('@/features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
type AuthContextType = ReturnType<typeof useAuth>;

const originalMatchMedia = window.matchMedia;

function stubViewport(mdUp: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(min-width: 768px)' ? mdUp : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function session(status: StudySession['status']): StudySession {
  return {
    id: 's-1',
    assignmentId: null,
    taskId: null,
    plannedSessionId: null,
    status,
    startTime: '2026-11-18T10:00:00.000Z',
    endTime: null,
    elapsedSeconds: 42,
    durationMinutes: 0,
    plannedMinutes: 25,
    notes: null,
    createdAt: '2026-11-18T10:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
  };
}

function renderVisible(options: {
  path: string;
  signedIn?: boolean;
  value?: Partial<CurrentSessionValue>;
}) {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: options.signedIn ?? true,
    user: options.signedIn === false ? null : { id: 'user-1' },
  } as unknown as AuthContextType);
  const value: CurrentSessionValue = { ...defaultCurrentSessionValue, ...options.value };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[options.path]}>
      <CurrentSessionContext.Provider value={value}>{children}</CurrentSessionContext.Provider>
    </MemoryRouter>
  );
  return renderHook(() => useTabBarVisible(), { wrapper });
}

describe('useTabBarVisible (EP16E-AC4, D-E3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubViewport(false);
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('hidden at md and above', () => {
    stubViewport(true);
    const { result } = renderVisible({ path: '/today', value: { settled: true } });
    expect(result.current).toBe(false);
  });

  it('hidden when signed out', () => {
    const { result } = renderVisible({ path: '/today', signedIn: false });
    expect(result.current).toBe(false);
  });

  it('hidden on /focus while ACTIVE', () => {
    const { result } = renderVisible({
      path: '/focus',
      value: { session: session('ACTIVE'), ownerId: 'user-1', settled: true },
    });
    expect(result.current).toBe(false);
  });

  it('hidden on /focus while PAUSED', () => {
    const { result } = renderVisible({
      path: '/focus',
      value: { session: session('PAUSED'), ownerId: 'user-1', settled: true },
    });
    expect(result.current).toBe(false);
  });

  it('hidden on /focus until the first read for the route settles', () => {
    const { result } = renderVisible({ path: '/focus', value: { settled: false } });
    expect(result.current).toBe(false);
  });

  it('shown on /focus when the read returns null', () => {
    const { result } = renderVisible({
      path: '/focus',
      value: { session: null, ownerId: 'user-1', settled: true },
    });
    expect(result.current).toBe(true);
  });

  it('shown on /focus when the read fails', () => {
    // D-D4: a failed read settles as session null — counted as no session.
    const { result } = renderVisible({
      path: '/focus',
      value: { session: null, ownerId: 'user-1', settled: true },
    });
    expect(result.current).toBe(true);
  });

  it('shown on /focus/history and other pages while a session runs', () => {
    for (const path of ['/focus/history', '/today', '/plan', '/calendar']) {
      const { result, unmount } = renderVisible({
        path,
        value: { session: session('ACTIVE'), ownerId: 'user-1', settled: true },
      });
      expect(result.current).toBe(true);
      unmount();
    }
  });
});
