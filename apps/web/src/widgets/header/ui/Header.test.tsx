import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

function renderAuthenticated(path: string, user: SessionUser = sessionUser) {
  return renderHeader(path, { isAuthenticated: true, user });
}

describe('Header desktop grouped navigation (EP11A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Home and Dashboard as single links plus Academics/Planning menu triggers', () => {
    renderAuthenticated('/dashboard');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');

    const academics = screen.getByRole('button', { name: 'Academics menu' });
    expect(academics).toHaveAttribute('aria-haspopup', 'menu');
    expect(academics).toHaveAttribute('aria-expanded', 'false');

    const planning = screen.getByRole('button', { name: 'Planning menu' });
    expect(planning).toHaveAttribute('aria-haspopup', 'menu');
    expect(planning).toHaveAttribute('aria-expanded', 'false');

    const account = screen.getByRole('button', { name: 'Open account menu' });
    expect(account).toHaveAttribute('aria-haspopup', 'menu');
    expect(account).toHaveAttribute('aria-expanded', 'false');

    // Grouped children stay unmounted until their menu opens.
    expect(screen.queryByRole('link', { name: 'Semesters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Assignments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Calendar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Availability' })).not.toBeInTheDocument();
  });

  it('renders only Home and auth buttons when unauthenticated', () => {
    renderHeader('/', { isAuthenticated: false, user: null });

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Academics menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Planning menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open account menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('opens the Academics menu on click with menu semantics', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    const trigger = screen.getByRole('button', { name: 'Academics menu' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Academics' });
    expect(within(menu).getByRole('menuitem', { name: 'Semesters' })).toHaveAttribute(
      'href',
      '/semesters'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Assignments' })).toHaveAttribute(
      'href',
      '/assignments'
    );
  });

  it('keeps only one menu open at a time', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    const academics = screen.getByRole('button', { name: 'Academics menu' });
    const planning = screen.getByRole('button', { name: 'Planning menu' });

    await user.click(academics);
    expect(screen.getByRole('menu', { name: 'Academics' })).toBeInTheDocument();

    await user.click(planning);
    expect(academics).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu', { name: 'Academics' })).not.toBeInTheDocument();
    expect(planning).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Calendar' })).toBeInTheDocument();
  });

  it('closes on outside mousedown', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    await user.click(screen.getByRole('button', { name: 'Academics menu' }));
    expect(screen.getByRole('menu', { name: 'Academics' })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu', { name: 'Academics' })).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    const trigger = screen.getByRole('button', { name: 'Academics menu' });
    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Semesters' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: 'Academics' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('toggles the menu with Enter and Space on the trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    const trigger = screen.getByRole('button', { name: 'Academics menu' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    trigger.focus();
    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens with ArrowDown focusing the first item and ArrowUp focusing the last', async () => {
    const user = setupUser();
    const { unmount } = renderAuthenticated('/dashboard');

    const trigger = screen.getByRole('button', { name: 'Academics menu' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Semesters' })).toHaveFocus();

    unmount();
    renderAuthenticated('/dashboard');
    const planning = screen.getByRole('button', { name: 'Planning menu' });
    planning.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Plan' })).toHaveFocus();
  });

  it('cycles items with ArrowUp/ArrowDown and supports Home/End', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    await user.click(screen.getByRole('button', { name: 'Academics menu' }));
    const semesters = screen.getByRole('menuitem', { name: 'Semesters' });
    const courses = screen.getByRole('menuitem', { name: 'Courses' });
    const assignments = screen.getByRole('menuitem', { name: 'Assignments' });

    expect(semesters).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(courses).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(assignments).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(semesters).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(assignments).toHaveFocus();
    await user.keyboard('{Home}');
    expect(semesters).toHaveFocus();
    await user.keyboard('{End}');
    expect(assignments).toHaveFocus();
  });

  it('activates the focused item with Enter and Space', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    await user.click(screen.getByRole('button', { name: 'Academics menu' }));
    expect(screen.getByRole('menuitem', { name: 'Semesters' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('menu', { name: 'Academics' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Academics menu' }));
    expect(screen.getByRole('menuitem', { name: 'Semesters' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.queryByRole('menu', { name: 'Academics' })).not.toBeInTheDocument();
  });

  it('closes when Tab moves focus out without restoring the trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    const trigger = screen.getByRole('button', { name: 'Academics menu' });
    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Semesters' })).toHaveFocus();

    await user.tab();
    expect(screen.queryByRole('menu', { name: 'Academics' })).not.toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
  });

  it('shows account menu contents for an unverified user', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    const trigger = screen.getByRole('button', { name: 'Open account menu' });
    expect(trigger).toHaveTextContent('A');
    await user.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(within(menu).getByText('Signed in as Ada Lovelace')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Availability' })).toHaveAttribute(
      'href',
      '/availability'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Verify email' })).toHaveAttribute(
      'href',
      '/verify-email'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
  });

  it('hides Verify email in the account menu for a verified user', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard', {
      ...sessionUser,
      emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    });

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    const menu = screen.getByRole('menu', { name: 'Account' });

    expect(within(menu).queryByRole('menuitem', { name: 'Verify email' })).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
  });

  it('supports keyboard navigation inside the account menu', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();
  });

  it('marks the active dropdown item and its group trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/semesters');

    const trigger = screen.getByRole('button', { name: 'Academics menu' });
    expect(trigger).toHaveClass('text-accent');
    expect(trigger).toHaveClass('font-semibold');

    await user.click(trigger);
    const semesters = screen.getByRole('menuitem', { name: 'Semesters' });
    expect(semesters).toHaveAttribute('aria-current', 'page');
    expect(semesters).toHaveClass('text-accent');
    expect(screen.getByRole('menuitem', { name: 'Courses' })).not.toHaveClass('text-accent');
    expect(screen.getByRole('menuitem', { name: 'Assignments' })).not.toHaveClass('text-accent');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('text-accent');
  });

  it('highlights the Academics trigger for nested course routes only', () => {
    const { unmount } = renderAuthenticated('/courses/abc');
    expect(screen.getByRole('button', { name: 'Academics menu' })).toHaveClass('text-accent');
    expect(screen.getByRole('button', { name: 'Academics menu' })).toHaveClass('font-semibold');

    unmount();
    renderAuthenticated('/dashboard');
    expect(screen.getByRole('button', { name: 'Academics menu' })).not.toHaveClass('text-accent');
  });

  it('marks the active single link and keeps Home for authenticated users', () => {
    renderAuthenticated('/dashboard');

    const dashboard = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboard).toHaveAttribute('aria-current', 'page');
    expect(dashboard).toHaveClass('text-accent');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-accent');
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
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('closes the drawer when a nav link is clicked', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: true, user: sessionUser });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Primary navigation' });
    expect(dialog).toBeInTheDocument();

    // Click a link inside the drawer (scoped: the CSS-hidden desktop nav also
    // renders a Dashboard link in jsdom).
    await user.click(within(dialog).getByRole('link', { name: 'Dashboard' }));
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

describe('Header mobile drawer grouped sections (EP11B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The desktop nav is only CSS-hidden in jsdom, so every drawer assertion is
  // scoped to the dialog (or a named region within it).
  function getDrawer() {
    return screen.getByRole('dialog', { name: 'Primary navigation' });
  }

  it('renders grouped sections, headings, single links and the Account section for an authenticated user', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const dialog = getDrawer();
    // Responsiveness is class-only in jsdom (no media-query evaluation).
    expect(dialog.parentElement).toHaveClass('md:hidden');

    expect(
      within(dialog).getByRole('heading', { level: 2, name: 'Academics' })
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Planning' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Account' })).toBeInTheDocument();

    // Single links render directly in the drawer.
    expect(within(dialog).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(dialog).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard'
    );

    const academics = within(dialog).getByRole('region', { name: 'Academics' });
    expect(within(academics).getByRole('link', { name: 'Semesters' })).toHaveAttribute(
      'href',
      '/semesters'
    );
    expect(within(academics).getByRole('link', { name: 'Courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
    expect(within(academics).getByRole('link', { name: 'Assignments' })).toHaveAttribute(
      'href',
      '/assignments'
    );

    const planning = within(dialog).getByRole('region', { name: 'Planning' });
    expect(within(planning).getByRole('link', { name: 'Calendar' })).toHaveAttribute(
      'href',
      '/calendar'
    );
    expect(within(planning).getByRole('link', { name: 'Availability' })).toHaveAttribute(
      'href',
      '/availability'
    );
    // Ratified EP06F contract entry (plan-review PR-001); drawer/desktop parity.
    expect(within(planning).getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/plan');

    const account = within(dialog).getByRole('region', { name: 'Account' });
    expect(within(account).getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile'
    );
    expect(within(account).getByRole('link', { name: 'Verify email' })).toHaveAttribute(
      'href',
      '/verify-email'
    );
    expect(within(account).getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  it('renders Home and auth buttons with no grouped or Account sections when unauthenticated', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: false, user: null });
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const dialog = getDrawer();
    expect(within(dialog).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(dialog).getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Get Started' })).toBeInTheDocument();

    for (const label of ['Academics', 'Planning', 'Account']) {
      expect(
        within(dialog).queryByRole('heading', { level: 2, name: label })
      ).not.toBeInTheDocument();
    }
    expect(within(dialog).queryByRole('region', { name: 'Account' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Signed in as/)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('shows Verify email only for an unverified user', async () => {
    const user = setupUser();
    const { unmount } = renderAuthenticated('/dashboard');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const account = within(getDrawer()).getByRole('region', { name: 'Account' });
    expect(within(account).getByRole('link', { name: 'Verify email' })).toHaveAttribute(
      'href',
      '/verify-email'
    );

    unmount();
    renderAuthenticated('/dashboard', {
      ...sessionUser,
      emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    });
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const verifiedAccount = within(getDrawer()).getByRole('region', { name: 'Account' });
    expect(
      within(verifiedAccount).queryByRole('link', { name: 'Verify email' })
    ).not.toBeInTheDocument();
    expect(within(verifiedAccount).getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(within(verifiedAccount).getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  it('shows the identity row with avatar initials and name', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const account = within(getDrawer()).getByRole('region', { name: 'Account' });
    expect(within(account).getByText('Signed in as Ada Lovelace')).toBeInTheDocument();
    const avatar = within(account).getByText('A');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks the active drawer item with aria-current and keeps nested routes off the parent', async () => {
    const user = setupUser();
    const { unmount } = renderAuthenticated('/semesters');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    let dialog = getDrawer();
    const semesters = within(dialog).getByRole('link', { name: 'Semesters' });
    expect(semesters).toHaveAttribute('aria-current', 'page');
    expect(semesters).toHaveClass('text-accent');
    expect(within(dialog).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current'
    );
    expect(within(dialog).getByRole('link', { name: 'Courses' })).not.toHaveAttribute(
      'aria-current'
    );

    // Settled D10-13 behavior: every drawer item uses `NavLink end`, so a
    // nested detail route marks nothing (and headings have no active state).
    unmount();
    renderAuthenticated('/courses/abc');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    dialog = getDrawer();
    expect(within(dialog).getByRole('link', { name: 'Courses' })).not.toHaveAttribute(
      'aria-current'
    );
    expect(dialog.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  it('keeps account actions out of the primary list and headings non-interactive', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const dialog = getDrawer();
    const nav = within(dialog).getByRole('navigation', { name: 'Primary' });

    expect(within(nav).queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Verify email' })).not.toBeInTheDocument();
    expect(within(nav).getAllByRole('link', { name: 'Availability' })).toHaveLength(1);
    // D11-8 duplicate pair asserted deliberately: Planning canonical + Account shortcut.
    expect(within(dialog).getAllByRole('link', { name: 'Availability' })).toHaveLength(2);

    // No dropdown triggers in the drawer; headings are labels only.
    expect(
      within(dialog).queryByRole('button', { name: 'Academics menu' })
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Planning menu' })).not.toBeInTheDocument();
    for (const label of ['Academics', 'Planning', 'Account']) {
      const heading = within(dialog).getByRole('heading', { level: 2, name: label });
      expect(heading).not.toHaveAttribute('aria-expanded');
      expect(heading).not.toHaveAttribute('aria-haspopup');
    }
  });

  it('applies 44px rows and 20px aria-hidden icons in the drawer', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const dialog = getDrawer();
    const dashboard = within(dialog).getByRole('link', { name: 'Dashboard' });
    expect(dashboard).toHaveClass('min-h-[44px]');
    const dashboardIcon = dashboard.querySelector('svg') as SVGSVGElement;
    expect(dashboardIcon).toHaveClass('h-5', 'w-5');
    expect(dashboardIcon).toHaveAttribute('aria-hidden', 'true');

    const account = within(dialog).getByRole('region', { name: 'Account' });
    const logout = within(account).getByRole('button', { name: 'Logout' });
    expect(logout).toHaveClass('min-h-[44px]');
    const logoutIcon = logout.querySelector('svg') as SVGSVGElement;
    expect(logoutIcon).toHaveClass('h-5', 'w-5');
    expect(logoutIcon).toHaveAttribute('aria-hidden', 'true');
  });

  it('traps focus inside the drawer after the grouped sections were added', async () => {
    const user = setupUser();
    renderAuthenticated('/dashboard');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const dialog = getDrawer();
    // Trap order guard (story risk note): close, Home, Dashboard, Academics ×3,
    // Planning ×3 (incl. Plan), Profile, Availability, Verify email, Logout.
    const focusables = dialog.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    expect(focusables).toHaveLength(13);
    const logout = within(dialog).getByRole('button', { name: 'Logout' });
    expect(focusables[focusables.length - 1]).toBe(logout);

    logout.focus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Close menu' })).toHaveFocus();
  });
});
