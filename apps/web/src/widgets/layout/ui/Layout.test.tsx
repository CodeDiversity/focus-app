import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '@/widgets/layout/ui/Layout';
import { useAuth } from '@/features/auth/model/AuthContext';
import { getCurrentStudySession } from '@/entities/study-session/api/studySessionApi';

vi.mock('@/features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  getCurrentStudySession: vi.fn(),
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

function setAuth(signedIn: boolean) {
  mockedUseAuth.mockReturnValue({
    user: signedIn
      ? { id: 'user-1', name: 'Ada', email: 'ada@example.com', emailVerifiedAt: '2026-01-01' }
      : null,
    isAuthenticated: signedIn,
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
  } as unknown as AuthContextType);
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/today']}>
      <Layout>
        <div>content</div>
      </Layout>
    </MemoryRouter>
  );
}

const PAD_CLASS = 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]';

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentStudySession).mockResolvedValue(null);
    setAuth(false);
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders a skip-to-main-content link pointing at #main-content', () => {
    renderLayout();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#main-content');
  });

  it('renders header, nav with primary label, and main landmark', () => {
    // No matchMedia stub: the fallback keeps the desktop layout (signed out).
    renderLayout();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  describe('one Primary landmark at any width (EP16E-AC1, D-E2)', () => {
    it('exactly one Primary navigation landmark at 360px when signed in (the bar)', async () => {
      stubViewport(false);
      setAuth(true);
      renderLayout();
      const navs = await screen.findAllByRole('navigation', { name: 'Primary' });
      expect(navs).toHaveLength(1);
      // It is the tab bar, not the header nav.
      expect(navs[0].className).toContain('bottom-0');
      expect(screen.getByRole('link', { name: 'Assignments' })).toBeInTheDocument();
    });

    it('exactly one Primary navigation landmark at 1024px when signed in (the header)', () => {
      stubViewport(true);
      setAuth(true);
      renderLayout();
      const navs = screen.getAllByRole('navigation', { name: 'Primary' });
      expect(navs).toHaveLength(1);
      expect(navs[0].className).not.toContain('bottom-0');
      expect(screen.getByRole('button', { name: 'Work menu' })).toBeInTheDocument();
    });

    it('no tab bar in the DOM at md and above', () => {
      stubViewport(true);
      setAuth(true);
      renderLayout();
      expect(document.querySelector('nav.bottom-0, nav[class*="bottom-0"]')).toBeNull();
    });

    it('no tab bar when signed out below md', () => {
      stubViewport(false);
      setAuth(false);
      renderLayout();
      expect(document.querySelector('nav[class*="bottom-0"]')).toBeNull();
      // The signed-out drawer and auth buttons are the only navigation.
      expect(screen.queryByRole('link', { name: 'Assignments' })).not.toBeInTheDocument();
    });
  });

  describe('main padding for the fixed bar (EP16E-AC2)', () => {
    it('pads main by the bar height plus the safe-area inset when the bar shows', () => {
      stubViewport(false);
      setAuth(true);
      renderLayout();
      expect(screen.getByRole('main')).toHaveClass(PAD_CLASS);
    });

    it('does not pad main at md and above or when signed out', () => {
      stubViewport(true);
      setAuth(true);
      const { unmount } = renderLayout();
      expect(screen.getByRole('main')).not.toHaveClass(PAD_CLASS);
      unmount();

      stubViewport(false);
      setAuth(false);
      renderLayout();
      expect(screen.getByRole('main')).not.toHaveClass(PAD_CLASS);
    });
  });
});
