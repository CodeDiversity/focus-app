import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Providers } from '@/test/providers';
import App from './App';

vi.mock('@/features/auth/model/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/model/AuthContext')>()),
  useAuth: vi.fn(),
}));
vi.mock('@/entities/calendar/api/calendarApi', () => ({
  listCalendarEvents: vi.fn().mockRejectedValue(new Error('not stubbed')),
}));
vi.mock('@/entities/day-bounds/api/dayBoundsApi', () => ({
  getDayBounds: vi.fn().mockRejectedValue(new Error('not stubbed')),
  putDayBounds: vi.fn(),
}));
// EP16D: Layout mounts CurrentSessionProvider, which reads the current
// session for a signed-in user on every pathname change.
vi.mock('@/entities/study-session/api/studySessionApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/study-session/api/studySessionApi')>()),
  getCurrentStudySession: vi.fn().mockResolvedValue(null),
}));
import { useAuth } from '@/features/auth/model/AuthContext';

type AuthContextType = ReturnType<typeof useAuth>;

const authed: Partial<AuthContextType> = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    emailVerified: true,
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  } as AuthContextType['user'],
};

describe('App routes (EP15I)', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.mocked(useAuth).mockReturnValue({
      ...({} as AuthContextType),
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
      isVerificationBannerDismissed: false,
      dismissVerificationBanner: vi.fn(),
      ...authed,
    } as AuthContextType);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('EP15I-AC3: /availability redirects to /calendar (D-I1 — bookmarks land on the one editor)', async () => {
    render(
      <Providers initialEntries={['/availability']}>
        <App />
      </Providers>
    );
    expect(await screen.findByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Availability' })).toBeNull();
  });
});
