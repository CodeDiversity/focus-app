import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { mobileTabItems } from '@/widgets/header/ui/navGroups';

/**
 * EP16E (AC-E16-11; ▲ D-E1 (b), D-E7) — the narrow-viewport bottom tab bar:
 * five flat tabs from the shared contract, prefix-matched (`NavLink` without
 * `end`) so a nested page still shows where the student is. The caller
 * (`Layout` via `useTabBarVisible`) decides whether it renders at all, so
 * exactly one "Primary" landmark exists at any width (D-E2). No entrance or
 * exit animation — the bar mounts and unmounts instantly (reduced motion).
 */
export function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {mobileTabItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[0.6875rem] leading-tight whitespace-nowrap',
                    'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring',
                    isActive
                      ? 'border-t-2 border-accent font-semibold text-accent'
                      : 'border-t-2 border-transparent font-medium text-text-muted hover:text-text'
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
