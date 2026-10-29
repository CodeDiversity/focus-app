import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronDown, Menu, User, X } from 'lucide-react';
import { useAuth } from '@/features/auth/model/AuthContext';
import { Button } from '@/shared/ui/Button';
import {
  accountMenuItems,
  getNavGroups,
  type AccountMenuItem,
  type NavItem,
  type NavSection,
} from './navGroups';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const MENU_ITEM_SELECTOR = '[role="menuitem"]';

type DesktopMenu = 'academics' | 'planning' | 'account';

interface NavLinkItem {
  to: string;
  label: string;
}

function navLinkClass(isActive: boolean, mobile: boolean) {
  return clsx(
    'inline-flex items-center gap-2 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
    mobile ? 'min-h-[44px] px-2 w-full' : 'py-1 border-b-2',
    isActive
      ? 'text-accent font-semibold border-accent'
      : 'text-text-muted hover:text-text border-transparent'
  );
}

function menuItemClass(isActive: boolean) {
  return clsx(
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
    isActive ? 'text-accent font-semibold' : 'text-text hover:bg-surface-muted'
  );
}

function isGroupActive(section: NavSection, pathname: string) {
  return (section.items ?? []).some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  );
}

/**
 * Shared focus/keyboard model for the desktop menus: opening moves focus to the
 * first item (or last when opened with ArrowUp); arrow keys cycle with wrapping;
 * Home/End jump to the ends; Escape closes and restores trigger focus; Tab moves
 * out and closes without restoring focus. No focus trap — the menus are
 * non-modal (unlike the mobile drawer).
 */
function useMenuFocus(menuRef: RefObject<HTMLDivElement>, open: boolean) {
  const initialFocusRef = useRef<'first' | 'last'>('first');

  const getItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? []);

  const focusAt = (position: 'first' | 'last') => {
    const items = getItems();
    const target = position === 'last' ? items[items.length - 1] : items[0];
    target?.focus();
  };

  const focusCycle = (direction: 1 | -1) => {
    const items = getItems();
    if (items.length === 0) return;
    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const index = current ? items.indexOf(current) : -1;
    items[(index + direction + items.length) % items.length]?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? []
    );
    const target = initialFocusRef.current === 'last' ? items[items.length - 1] : items[0];
    target?.focus();
    initialFocusRef.current = 'first';
  }, [open, menuRef]);

  const onTriggerKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    open: boolean,
    onToggle: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (open) {
        focusAt('first');
      } else {
        initialFocusRef.current = 'first';
        onToggle();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (open) {
        focusAt('last');
      } else {
        initialFocusRef.current = 'last';
        onToggle();
      }
    }
  };

  const onMenuKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    onClose: (restoreFocus: boolean) => void
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusCycle(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusCycle(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusAt('first');
    } else if (event.key === 'End') {
      event.preventDefault();
      focusAt('last');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    } else if (event.key === 'Tab') {
      // Let the browser move focus to the next element; only close the menu.
      onClose(false);
    }
  };

  return { onTriggerKeyDown, onMenuKeyDown };
}

/** Space activates links natively only with Enter; mirror menu-item semantics. */
function handleLinkItemKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.click();
  }
}

interface NavMenuProps {
  section: NavSection & { items: NavItem[] };
  open: boolean;
  isActive: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function NavMenu({ section, open, isActive, onToggle, onClose }: NavMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { onTriggerKeyDown, onMenuKeyDown } = useMenuFocus(menuRef, open);

  const triggerId = `desktop-nav-${section.id}-trigger`;
  const menuId = `desktop-nav-${section.id}-menu`;
  const Icon = section.icon;

  const closeMenu = useCallback(
    (restoreFocus: boolean) => {
      if (restoreFocus) triggerRef.current?.focus();
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(raf);
      setVisible(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu(true);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, closeMenu]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        aria-label={`${section.label} menu`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={onToggle}
        onKeyDown={(event) => onTriggerKeyDown(event, open, onToggle)}
        className={clsx(
          'inline-flex items-center gap-2 border-b-2 border-transparent py-1 transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          isActive ? 'text-accent font-semibold' : 'text-text-muted hover:text-text'
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        {section.label}
        <ChevronDown
          className={clsx(
            'h-4 w-4 transition-transform duration-fast ease-standard',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label={section.label}
          aria-orientation="vertical"
          onKeyDown={(event) => onMenuKeyDown(event, closeMenu)}
          className={clsx(
            'absolute left-0 top-full z-40 mt-2 min-w-[12rem] w-max max-w-xs rounded-lg border border-border bg-surface p-1 shadow-lg',
            'transition duration-fast ease-standard',
            visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
          )}
        >
          {section.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end
                role="menuitem"
                onClick={() => closeMenu(true)}
                onKeyDown={handleLinkItemKeyDown}
                className={({ isActive: itemActive }) => menuItemClass(itemActive)}
              >
                <ItemIcon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AccountMenuProps {
  open: boolean;
  name: string;
  initials: string;
  items: AccountMenuItem[];
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
}

function AccountMenu({
  open,
  name,
  initials,
  items,
  onToggle,
  onClose,
  onLogout,
}: AccountMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { onTriggerKeyDown, onMenuKeyDown } = useMenuFocus(menuRef, open);

  const closeMenu = useCallback(
    (restoreFocus: boolean) => {
      if (restoreFocus) triggerRef.current?.focus();
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(raf);
      setVisible(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu(true);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, closeMenu]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? 'Close account menu' : 'Open account menu'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={onToggle}
        onKeyDown={(event) => onTriggerKeyDown(event, open, onToggle)}
        className={clsx(
          'inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white',
          'transition-colors duration-fast hover:bg-accent-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2'
        )}
      >
        {initials ? <span>{initials}</span> : <User className="h-4 w-4" aria-hidden="true" />}
      </button>

      {open && (
        <div
          ref={menuRef}
          id="account-menu"
          role="menu"
          tabIndex={-1}
          aria-label="Account"
          aria-orientation="vertical"
          onKeyDown={(event) => onMenuKeyDown(event, closeMenu)}
          className={clsx(
            'absolute left-auto right-0 top-full z-40 mt-2 min-w-[12rem] w-max max-w-xs rounded-lg border border-border bg-surface p-1 shadow-lg',
            'transition duration-fast ease-standard',
            visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
          )}
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm text-text-muted">Signed in as {name}</p>
          </div>
          <div role="separator" className="my-1 border-t border-border" />
          {items.map((item) => {
            const ItemIcon = item.icon;
            if (item.action === 'logout') {
              return (
                <Fragment key={item.id}>
                  <div role="separator" className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(false)}
                    onClick={() => {
                      closeMenu(true);
                      onLogout();
                    }}
                  >
                    <ItemIcon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </button>
                </Fragment>
              );
            }
            return (
              <NavLink
                key={item.id}
                to={item.to ?? '/'}
                end
                role="menuitem"
                onClick={() => closeMenu(true)}
                onKeyDown={handleLinkItemKeyDown}
                className={({ isActive }) => menuItemClass(isActive)}
              >
                <ItemIcon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [openMenu, setOpenMenu] = useState<DesktopMenu | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // EP11B: replace with grouped rendering from `navGroups`; the desktop header
  // already consumes the shared contract, the drawer keeps the legacy flat list.
  const navLinks: NavLinkItem[] = [
    { to: '/', label: 'Home' },
    ...(isAuthenticated
      ? [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/semesters', label: 'Semesters' },
          { to: '/courses', label: 'Courses' },
          { to: '/assignments', label: 'Assignments' },
          { to: '/calendar', label: 'Calendar' },
          { to: '/availability', label: 'Availability' },
          { to: '/profile', label: 'Profile' },
        ]
      : []),
  ];

  const navGroups = getNavGroups(isAuthenticated);

  // Close the drawer and any desktop menu on route change.
  useEffect(() => {
    setOpen(false);
    setOpenMenu(null);
  }, [location.pathname]);

  // Focus trap, scroll lock, restore focus for the mobile drawer.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled')
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !drawer.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !drawer.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const first = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? drawerRef.current)?.focus();
    const raf = requestAnimationFrame(() => setVisible(true));

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
      setVisible(false);
    };
  }, [open]);

  const name = user?.name || user?.email?.split('@')[0] || '';
  const initials = (user?.name?.trim()[0] || user?.email?.split('@')[0]?.[0] || '').toUpperCase();
  const showVerify = isAuthenticated && !user?.emailVerifiedAt;
  const visibleAccountItems = accountMenuItems.filter(
    (item) => !item.requiresUnverified || !user?.emailVerifiedAt
  );

  const toggleMenu = useCallback(
    (menu: DesktopMenu) => setOpenMenu((current) => (current === menu ? null : menu)),
    []
  );

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  return (
    <header className="bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 min-h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded-md"
          >
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-semibold text-text">StudyPilot</span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
            {navGroups.map((section) => {
              const Icon = section.icon;
              if (section.items) {
                const menu = section.id as DesktopMenu;
                return (
                  <NavMenu
                    key={section.id}
                    section={{ ...section, items: section.items }}
                    open={openMenu === menu}
                    isActive={isGroupActive(section, location.pathname)}
                    onToggle={() => toggleMenu(menu)}
                    onClose={closeMenu}
                  />
                );
              }
              return (
                <NavLink
                  key={section.id}
                  to={section.to ?? '/'}
                  end
                  className={({ isActive }) => navLinkClass(isActive, false)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {section.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop auth area */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <AccountMenu
                open={openMenu === 'account'}
                name={name}
                initials={initials}
                items={visibleAccountItems}
                onToggle={() => toggleMenu('account')}
                onClose={closeMenu}
                onLogout={() => void logout()}
              />
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Button
              ref={hamburgerRef}
              variant="ghost"
              size="sm"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className={clsx(
              'absolute inset-0 bg-text/40 transition-opacity duration-base ease-standard',
              visible ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Primary navigation"
            tabIndex={-1}
            className={clsx(
              'absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-surface shadow-lg transition-transform duration-base ease-standard',
              visible ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex flex-col h-full overflow-y-auto p-4 gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-text">Menu</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav aria-label="Primary" className="flex flex-col gap-1">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => navLinkClass(isActive, true)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-text-muted">Hi, {name}</span>
                    {showVerify && (
                      <Link
                        to="/verify-email"
                        onClick={() => setOpen(false)}
                        className="text-sm text-accent hover:text-accent-hover underline"
                      >
                        Verify email
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        void logout();
                      }}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setOpen(false)}>
                      <Button variant="primary" size="sm" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
