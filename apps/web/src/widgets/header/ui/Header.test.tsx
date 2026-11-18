import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Header } from '@/widgets/header/ui/Header';
import { CurrentSessionProvider } from '@/widgets/session-indicator/model/CurrentSessionProvider';
import { useAuth } from '@/features/auth/model/AuthContext';
import { getCurrentStudySession } from '@/entities/study-session/api/studySessionApi';
import { setupUser } from '@/test/user';
import type { SessionUser } from '@/entities/user/model/types';
import type { StudySession } from '@/entities/study-session/model/types';

type AuthContextType = ReturnType<typeof useAuth>;

vi.mock('@/features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  getCurrentStudySession: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedGetCurrent = vi.mocked(getCurrentStudySession);

const sessionUser: SessionUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: null,
};

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

/** Drives router navigation without a mouse event (an outside mousedown would
 *  close the menus by itself and mask the pathname effect under test). */
function NavigationProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    const fire = (event: Event) => {
      const detail = (event as CustomEvent<{ to?: string; replace?: boolean; delta?: number }>)
        .detail;
      if (typeof detail.delta === 'number') navigate(detail.delta);
      else navigate(detail.to ?? '/', { replace: detail.replace ?? false });
    };
    window.addEventListener('test:navigate', fire);
    return () => window.removeEventListener('test:navigate', fire);
  }, [navigate]);
  return null;
}

function fireNavigate(detail: { to?: string; replace?: boolean; delta?: number }) {
  act(() => {
    window.dispatchEvent(new CustomEvent('test:navigate', { detail }));
  });
}

function headerTree(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <NavigationProbe />
      <Routes>
        <Route path="*" element={<Header />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderHeader(path: string, auth: Partial<AuthContextType>) {
  mockedUseAuth.mockReturnValue(authValue(auth));
  return render(headerTree(path));
}

function renderAuthenticated(path: string, user: SessionUser = sessionUser) {
  return renderHeader(path, { isAuthenticated: true, user });
}

// jsdom has no matchMedia; without a stub useMediaQuery falls back to the
// desktop layout (EP16E, D-E2). Stub narrow/desktop per test and restore
// after unmounting (EP15F flake note).
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

function restoreViewport() {
  window.matchMedia = originalMatchMedia;
}

describe('Header desktop navigation (EP11A, EP16D-AC1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrent.mockResolvedValue(null);
  });

  it('renders Today, Plan and Calendar as links plus the Work menu trigger', () => {
    renderAuthenticated('/today');

    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/plan');
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar');

    const work = screen.getByRole('button', { name: 'Work menu' });
    expect(work).toHaveAttribute('aria-haspopup', 'menu');
    expect(work).toHaveAttribute('aria-expanded', 'false');

    const account = screen.getByRole('button', { name: 'Open account menu' });
    expect(account).toHaveAttribute('aria-haspopup', 'menu');
    expect(account).toHaveAttribute('aria-expanded', 'false');

    // Grouped children stay unmounted until their menu opens.
    expect(screen.queryByRole('link', { name: 'Assignments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
  });

  it('shows no Home, Dashboard, Academics, Planning, Focus, Focus session, Study history, Semesters or Plan health entry when signed in', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    for (const name of [
      'Home',
      'Dashboard',
      'Semesters',
      'Plan health',
      'Focus session',
      'Study history',
    ]) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    }
    for (const name of ['Academics menu', 'Planning menu', 'Focus menu']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }

    // Nor inside the one remaining dropdown.
    await user.click(screen.getByRole('button', { name: 'Work menu' }));
    const menu = screen.getByRole('menu', { name: 'Work' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual(['Assignments', 'Courses']);
  });

  it('renders only Home and auth buttons when unauthenticated', () => {
    renderHeader('/', { isAuthenticated: false, user: null });

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Work menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open account menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Today' })).not.toBeInTheDocument();
  });

  it('opens the Work menu on click with menu semantics', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    const trigger = screen.getByRole('button', { name: 'Work menu' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Work' });
    expect(within(menu).getByRole('menuitem', { name: 'Assignments' })).toHaveAttribute(
      'href',
      '/assignments'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
  });

  it('keeps only one menu open at a time', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    const work = screen.getByRole('button', { name: 'Work menu' });
    const account = screen.getByRole('button', { name: 'Open account menu' });

    await user.click(work);
    expect(screen.getByRole('menu', { name: 'Work' })).toBeInTheDocument();

    await user.click(account);
    expect(work).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
  });

  it('closes on outside mousedown', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    await user.click(screen.getByRole('button', { name: 'Work menu' }));
    expect(screen.getByRole('menu', { name: 'Work' })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    const trigger = screen.getByRole('button', { name: 'Work menu' });
    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Assignments' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('toggles the menu with Enter and Space on the trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    const trigger = screen.getByRole('button', { name: 'Work menu' });
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
    const { unmount } = renderAuthenticated('/today');

    const trigger = screen.getByRole('button', { name: 'Work menu' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Assignments' })).toHaveFocus();

    unmount();
    renderAuthenticated('/today');
    const work = screen.getByRole('button', { name: 'Work menu' });
    work.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Courses' })).toHaveFocus();
  });

  it('cycles items with ArrowUp/ArrowDown and supports Home/End', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    await user.click(screen.getByRole('button', { name: 'Work menu' }));
    const assignments = screen.getByRole('menuitem', { name: 'Assignments' });
    const courses = screen.getByRole('menuitem', { name: 'Courses' });

    expect(assignments).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(courses).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(assignments).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(courses).toHaveFocus();
    await user.keyboard('{Home}');
    expect(assignments).toHaveFocus();
    await user.keyboard('{End}');
    expect(courses).toHaveFocus();
  });

  it('activates the focused item with Enter and Space', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    await user.click(screen.getByRole('button', { name: 'Work menu' }));
    expect(screen.getByRole('menuitem', { name: 'Assignments' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Work menu' }));
    expect(screen.getByRole('menuitem', { name: 'Assignments' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();
  });

  it('closes when Tab moves focus out without restoring the trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    const trigger = screen.getByRole('button', { name: 'Work menu' });
    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Assignments' })).toHaveFocus();

    await user.tab();
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
  });

  it('shows account menu contents for an unverified user', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    const trigger = screen.getByRole('button', { name: 'Open account menu' });
    expect(trigger).toHaveTextContent('A');
    await user.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(within(menu).getByText('Signed in as Ada Lovelace')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Verify email' })).toHaveAttribute(
      'href',
      '/verify-email'
    );
    expect(within(menu).getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
  });

  it('hides Verify email in the account menu for a verified user', async () => {
    const user = setupUser();
    renderAuthenticated('/today', {
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
    renderAuthenticated('/today');

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();
  });

  it('marks the active dropdown item and its group trigger', async () => {
    const user = setupUser();
    renderAuthenticated('/assignments');

    const trigger = screen.getByRole('button', { name: 'Work menu' });
    expect(trigger).toHaveClass('text-accent');
    expect(trigger).toHaveClass('font-semibold');

    await user.click(trigger);
    const assignments = screen.getByRole('menuitem', { name: 'Assignments' });
    expect(assignments).toHaveAttribute('aria-current', 'page');
    expect(assignments).toHaveClass('text-accent');
    expect(screen.getByRole('menuitem', { name: 'Courses' })).not.toHaveClass('text-accent');
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveClass('text-accent');
  });

  it('highlights the Work trigger for /courses/:id and /assignments', () => {
    let view = renderAuthenticated('/courses/abc');
    expect(screen.getByRole('button', { name: 'Work menu' })).toHaveClass('text-accent');
    expect(screen.getByRole('button', { name: 'Work menu' })).toHaveClass('font-semibold');

    view.unmount();
    view = renderAuthenticated('/assignments');
    expect(screen.getByRole('button', { name: 'Work menu' })).toHaveClass('text-accent');

    view.unmount();
    renderAuthenticated('/today');
    expect(screen.getByRole('button', { name: 'Work menu' })).not.toHaveClass('text-accent');
  });

  it('marks the active single link', () => {
    renderAuthenticated('/plan');

    const plan = screen.getByRole('link', { name: 'Plan' });
    expect(plan).toHaveAttribute('aria-current', 'page');
    expect(plan).toHaveClass('text-accent');
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveClass('text-accent');
  });

  it('renders the desktop nav and account trigger only at md and above (EP16E, D-E2)', () => {
    stubViewport(false);
    const { unmount } = renderAuthenticated('/today');

    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Work menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Plan' })).not.toBeInTheDocument();
    // Below md the only "Open account menu" control is the drawer button.
    const trigger = screen.getByRole('button', { name: 'Open account menu' });
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-nav');
    unmount();

    stubViewport(true);
    renderAuthenticated('/today');
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    const desktopTrigger = screen.getByRole('button', { name: 'Open account menu' });
    expect(desktopTrigger).toHaveAttribute('aria-controls', 'account-menu');
    restoreViewport();
  });

  it('existing desktop cases still pass with matchMedia absent (fallback = desktop)', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    renderAuthenticated('/today');
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Work menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open account menu' })).toHaveAttribute(
      'aria-controls',
      'account-menu'
    );
    restoreViewport();
  });
});

describe('Header session strip (EP16D-AC2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrent.mockResolvedValue(null);
  });

  it('places the session strip before the logo and the account trigger in tab order', async () => {
    mockedGetCurrent.mockResolvedValue(activeSession);
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: sessionUser }));
    render(
      <MemoryRouter initialEntries={['/today']}>
        <CurrentSessionProvider>
          <Routes>
            <Route path="*" element={<Header />} />
          </Routes>
        </CurrentSessionProvider>
      </MemoryRouter>
    );

    const back = await screen.findByRole('link', { name: 'Back to session' });
    const logo = screen.getByRole('link', { name: /StudyPilot/ });
    const account = screen.getByRole('button', { name: 'Open account menu' });
    expect(back.compareDocumentPosition(logo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(back.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders no strip and empty live text when there is no session', () => {
    renderAuthenticated('/today');

    expect(screen.queryByRole('link', { name: 'Back to session' })).not.toBeInTheDocument();
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live).toHaveTextContent('');
  });
});

describe('Header route-change close rule (EP16D-AC5, D-D5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrent.mockResolvedValue(null);
  });

  it('keeps the account menu open when a redirect replaces the route (BL-14-07)', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();

    fireNavigate({ to: '/onboarding', replace: true });
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
  });

  it('closes menus and the drawer on a link navigation (PUSH) and on Back (POP)', async () => {
    const user = setupUser();
    renderAuthenticated('/today');

    // PUSH closes an open desktop menu.
    await user.click(screen.getByRole('button', { name: 'Work menu' }));
    expect(screen.getByRole('menu', { name: 'Work' })).toBeInTheDocument();
    fireNavigate({ to: '/plan' });
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();

    // POP (Back) closes it too.
    await user.click(screen.getByRole('button', { name: 'Work menu' }));
    expect(screen.getByRole('menu', { name: 'Work' })).toBeInTheDocument();
    fireNavigate({ delta: -1 });
    expect(screen.queryByRole('menu', { name: 'Work' })).not.toBeInTheDocument();
  });

  it('closes the drawer on a link navigation (PUSH)', async () => {
    // EP16E: the signed-in drawer button renders below md only.
    stubViewport(false);
    const user = setupUser();
    renderAuthenticated('/today');

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeInTheDocument();
    fireNavigate({ to: '/calendar' });
    expect(screen.queryByRole('dialog', { name: 'Account' })).not.toBeInTheDocument();
    restoreViewport();
  });

  it('closes menus and the drawer when the signed-in user changes', async () => {
    const user = setupUser();
    const view = renderAuthenticated('/today');

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();

    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: { ...sessionUser, id: 'user-2' } })
    );
    view.rerender(headerTree('/today'));
    expect(screen.queryByRole('menu', { name: 'Account' })).not.toBeInTheDocument();
    view.unmount();

    // The drawer closes too (below md, where the signed-in drawer lives).
    stubViewport(false);
    const narrowView = renderAuthenticated('/today');
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeInTheDocument();
    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: { ...sessionUser, id: 'user-3' } })
    );
    narrowView.rerender(headerTree('/today'));
    expect(screen.queryByRole('dialog', { name: 'Account' })).not.toBeInTheDocument();
    narrowView.unmount();
    restoreViewport();
  });
});

describe('Header mobile drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrent.mockResolvedValue(null);
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
    renderHeader('/profile', { isAuthenticated: false, user: null });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Primary navigation' });
    expect(dialog).toBeInTheDocument();

    // Click a link inside the drawer (scoped: the CSS-hidden desktop nav also
    // renders a Home link in jsdom).
    await user.click(within(dialog).getByRole('link', { name: 'Home' }));
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

describe('Header mobile drawer — Account only when signed in (EP16E-AC3, D-E5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrent.mockResolvedValue(null);
    stubViewport(false);
  });
  afterEach(() => {
    restoreViewport();
  });

  function getAccountDrawer() {
    return screen.getByRole('dialog', { name: 'Account' });
  }

  async function openAccountDrawer(user: ReturnType<typeof setupUser>) {
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    return getAccountDrawer();
  }

  it('below md the signed-in drawer contains only the Account section (Profile, Verify email when unverified, Logout)', async () => {
    const user = setupUser();
    renderAuthenticated('/today');
    const dialog = await openAccountDrawer(user);

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

    // No primary destinations — the tab bar owns them on phones.
    for (const name of ['Today', 'Plan', 'Calendar', 'Assignments', 'Courses', 'Home']) {
      expect(within(dialog).queryByRole('link', { name })).not.toBeInTheDocument();
    }
  });

  it('the signed-in drawer has no Primary navigation and is labelled Account', async () => {
    const user = setupUser();
    renderAuthenticated('/today');
    const dialog = await openAccountDrawer(user);

    expect(within(dialog).queryByRole('navigation')).not.toBeInTheDocument();
    expect(
      within(dialog).getByText('Account', { selector: '#mobile-nav-title' })
    ).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-labelledby', 'mobile-nav-title');
    expect(dialog).not.toHaveAttribute('aria-label');
  });

  it('the menu button reads Open account menu / Close account menu when signed in and Open menu / Close menu when signed out', async () => {
    const user = setupUser();
    const signedIn = renderAuthenticated('/today');

    const trigger = screen.getByRole('button', { name: 'Open account menu' });
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-nav');
    await user.click(trigger);
    expect(
      document.querySelector('button[aria-controls="mobile-nav"][aria-expanded="true"]')
    ).toHaveAccessibleName('Close account menu');
    await user.keyboard('{Escape}');
    signedIn.unmount();

    renderHeader('/', { isAuthenticated: false, user: null });
    const signedOutTrigger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(signedOutTrigger);
    expect(
      document.querySelector('button[aria-controls="mobile-nav"][aria-expanded="true"]')
    ).toHaveAccessibleName('Close menu');
  });

  it('shows Verify email only for an unverified user', async () => {
    const user = setupUser();
    const { unmount } = renderAuthenticated('/today');
    let account = within(await openAccountDrawer(user)).getByRole('region', { name: 'Account' });
    expect(within(account).getByRole('link', { name: 'Verify email' })).toHaveAttribute(
      'href',
      '/verify-email'
    );
    unmount();

    renderAuthenticated('/today', {
      ...sessionUser,
      emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    });
    account = within(await openAccountDrawer(user)).getByRole('region', { name: 'Account' });
    expect(within(account).queryByRole('link', { name: 'Verify email' })).not.toBeInTheDocument();
    expect(within(account).getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(within(account).getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  it('shows the identity row with avatar initials and name', async () => {
    const user = setupUser();
    renderAuthenticated('/today');
    const account = within(await openAccountDrawer(user)).getByRole('region', { name: 'Account' });

    expect(within(account).getByText('Signed in as Ada Lovelace')).toBeInTheDocument();
    const avatar = within(account).getByText('A');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies 44px rows and 20px aria-hidden icons in the drawer', async () => {
    const user = setupUser();
    renderAuthenticated('/today');
    const account = within(await openAccountDrawer(user)).getByRole('region', { name: 'Account' });

    const profile = within(account).getByRole('link', { name: 'Profile' });
    expect(profile).toHaveClass('min-h-[44px]');
    const profileIcon = profile.querySelector('svg') as SVGSVGElement;
    expect(profileIcon).toHaveClass('h-5', 'w-5');
    expect(profileIcon).toHaveAttribute('aria-hidden', 'true');

    const logout = within(account).getByRole('button', { name: 'Logout' });
    expect(logout).toHaveClass('min-h-[44px]');
    const logoutIcon = logout.querySelector('svg') as SVGSVGElement;
    expect(logoutIcon).toHaveClass('h-5', 'w-5');
    expect(logoutIcon).toHaveAttribute('aria-hidden', 'true');
  });

  it('traps focus inside the drawer after the grouped sections were added', async () => {
    const user = setupUser();
    renderAuthenticated('/today');
    const dialog = await openAccountDrawer(user);

    // Trap order over the Account items (EP16E): close, Profile, Verify
    // email, Logout.
    const focusables = dialog.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    expect(focusables).toHaveLength(4);
    const logout = within(dialog).getByRole('button', { name: 'Logout' });
    expect(focusables[focusables.length - 1]).toBe(logout);

    logout.focus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Close account menu' })).toHaveFocus();
  });

  it('renders Home and auth buttons with no grouped or Account sections when unauthenticated', async () => {
    const user = setupUser();
    renderHeader('/', { isAuthenticated: false, user: null });
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const dialog = screen.getByRole('dialog', { name: 'Primary navigation' });
    expect(within(dialog).getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(dialog).getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Get Started' })).toBeInTheDocument();

    expect(within(dialog).queryByRole('region', { name: 'Account' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Signed in as/)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });
});
