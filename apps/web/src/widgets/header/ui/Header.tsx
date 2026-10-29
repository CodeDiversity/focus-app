import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/features/auth/model/AuthContext';
import { Button } from '@/shared/ui/Button';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface NavLinkItem {
  to: string;
  label: string;
}

function navLinkClass(isActive: boolean, mobile: boolean) {
  return clsx(
    'inline-flex items-center transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
    mobile ? 'min-h-[44px] px-2 w-full' : 'py-1 border-b-2',
    isActive
      ? 'text-accent font-semibold border-accent'
      : 'text-text-muted hover:text-text border-transparent'
  );
}

export function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

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

  // Close the drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Focus trap, scroll lock, restore focus for the mobile drawer.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
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
  const showVerify = isAuthenticated && !user?.emailVerifiedAt;

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
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => navLinkClass(isActive, false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop auth area */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-text-muted truncate max-w-[12rem]">Hi, {name}</span>
                {showVerify && (
                  <Link
                    to="/verify-email"
                    className="text-sm text-accent hover:text-accent-hover underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded"
                  >
                    Verify email
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={() => void logout()}>
                  Logout
                </Button>
              </>
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
