import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Header } from '@/widgets/header/ui/Header';
import { useAuth } from '@/features/auth/model/AuthContext';
import { setupUser } from '@/test/user';
import type { SessionUser } from '@/entities/user/model/types';

type AuthContextType = ReturnType<typeof useAuth>;

vi.mock('@/features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const sessionUser: SessionUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: null,
};

function authValue(overrides: Partial<AuthContextType>): AuthContextType {
  return {
    user: null,
    isAuthenticated: false,
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
    ...overrides,
  };
}

function renderHeader(path: string, auth: Partial<AuthContextType>) {
  mockedUseAuth.mockReturnValue(authValue(auth));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Header />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Header semesters navigation (F110B-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Semesters link for an authenticated user', () => {
    renderHeader('/dashboard', { isAuthenticated: true, user: sessionUser });

    const link = screen.getByRole('link', { name: 'Semesters' });
    expect(link).toHaveAttribute('href', '/semesters');
    // The other authenticated links remain alongside it.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('shows the Courses link for an authenticated user (SP-111B)', () => {
    renderHeader('/dashboard', { isAuthenticated: true, user: sessionUser });

    const link = screen.getByRole('link', { name: 'Courses' });
    expect(link).toHaveAttribute('href', '/courses');
    // The other authenticated links remain alongside it.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Semesters' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('hides the Semesters link (and other protected links) when unauthenticated', () => {
    renderHeader('/', { isAuthenticated: false, user: null });

    expect(screen.queryByRole('link', { name: 'Semesters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
    // Public navigation is unaffected.
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });

  it('applies the active highlight to the Semesters link only on /semesters', () => {
    const { unmount } = renderHeader('/semesters', {
      isAuthenticated: true,
      user: sessionUser,
    });

    const semesters = screen.getByRole('link', { name: 'Semesters' });
    expect(semesters.className).toContain('text-accent');
    expect(semesters).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('text-accent');
    expect(screen.getByRole('link', { name: 'Courses' })).not.toHaveClass('text-accent');
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveClass('text-accent');

    unmount();
    renderHeader('/profile', { isAuthenticated: true, user: sessionUser });

    expect(screen.getByRole('link', { name: 'Semesters' })).not.toHaveClass('text-accent');
    expect(screen.getByRole('link', { name: 'Courses' })).not.toHaveClass('text-accent');
    const profile = screen.getByRole('link', { name: 'Profile' });
    expect(profile).toHaveClass('text-accent');
    expect(profile).toHaveAttribute('aria-current', 'page');
  });
});

describe('Header mobile drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens and closes the drawer via the hamburger', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: false, user: null });

    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: 'Primary navigation' })).not.toBeInTheDocument();

    await user.click(hamburger);
    expect(screen.getByRole('dialog', { name: 'Primary navigation' })).toBeInTheDocument();

    const openHamburger = document.querySelector(
      'button[aria-controls="mobile-nav"]'
    ) as HTMLElement;
    expect(openHamburger).toHaveAttribute('aria-expanded', 'true');

    await user.click(openHamburger);
    expect(screen.queryByRole('dialog', { name: 'Primary navigation' })).not.toBeInTheDocument();
  });

  it('closes the drawer on Escape and restores focus to the hamburger', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: false, user: null });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog', { name: 'Primary navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Primary navigation' })).not.toBeInTheDocument();
  });

  it('closes the drawer when a nav link is clicked', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: true, user: sessionUser });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Primary navigation' });
    expect(dialog).toBeInTheDocument();

    // Click a link inside the drawer
    const dashboardLinks = screen.getAllByRole('link', { name: 'Dashboard' });
    const drawerLink = dashboardLinks.find((l) => dialog.contains(l))!;
    await user.click(drawerLink);
    expect(screen.queryByRole('dialog', { name: 'Primary navigation' })).not.toBeInTheDocument();
  });

  it('locks body scroll while open and restores it on close', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: false, user: null });

    const prev = document.body.style.overflow;
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe(prev);
  });

  it('drawer contains auth actions on mobile', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: false, user: null });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Primary navigation' });
    expect(within(dialog).getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });
});
