import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarCheck,
  ClipboardList,
  Home,
  LogOut,
  Sun,
  MailCheck,
  User,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shared navigation contract (EP11A), consumed by the desktop header now and by
 * the mobile drawer in EP11B. Keep link/group data here so both surfaces render
 * the same routes (no drift).
 *
 * Invariant: a `NavSection` is either a single link (`to` set, `items` omitted)
 * or a group (`items` set, `to` omitted) — never both, never neither. Renderers
 * branch on the presence of `items`.
 */
export interface NavItem {
  /** Stable key, e.g. 'assignments'. */
  id: string;
  /** Display + accessible name, e.g. 'Assignments'. */
  label: string;
  /** Component reference; always rendered aria-hidden. */
  icon: LucideIcon;
  /** Route, e.g. '/assignments'. */
  to: string;
}

export interface NavSection {
  /** 'home' | 'today' | 'plan' | 'calendar' | 'work'. */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Present for single links (Today, Plan, Calendar). Omit for groups. */
  to?: string;
  /** Present for groups (Work). Omit for single links. */
  items?: NavItem[];
}

export interface AccountMenuItem {
  /** 'profile' | 'verify-email' | 'logout'. */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Link target. Omit for action items (logout). */
  to?: string;
  /** Action discriminator. Omit for link items. */
  action?: 'logout';
  /** Render only when the user is unverified (`!user.emailVerifiedAt`). */
  requiresUnverified?: boolean;
}

// EP16D (D16-6 (a)): four places to go — Today, Plan, Calendar, Work ▾.
// Semesters, Study history and Plan health lost their entries; each removed
// destination is reachable from the page a student would look for it on
// (Courses → Semesters, Focus → Study history, /plan/health redirects).
export const authenticatedNavGroups: NavSection[] = [
  { id: 'today', label: 'Today', icon: Sun, to: '/today' },
  { id: 'plan', label: 'Plan', icon: CalendarCheck, to: '/plan' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, to: '/calendar' },
  {
    id: 'work',
    label: 'Work',
    icon: Briefcase,
    items: [
      { id: 'assignments', label: 'Assignments', icon: ClipboardList, to: '/assignments' },
      { id: 'courses', label: 'Courses', icon: BookOpen, to: '/courses' },
    ],
  },
];

// EP16E (▲ D-E1 (b)): the bottom tab bar flattens the same contract to five
// tabs — Work's children become top-level. Derived, so phone and desktop
// cannot drift.
export const mobileTabItems: NavItem[] = authenticatedNavGroups.flatMap(
  (section) =>
    section.items ?? [
      { id: section.id, label: section.label, icon: section.icon, to: section.to as string },
    ]
);

export const unauthenticatedNavGroups: NavSection[] = [
  { id: 'home', label: 'Home', icon: Home, to: '/' },
];

export function getNavGroups(isAuthenticated: boolean): NavSection[] {
  return isAuthenticated ? authenticatedNavGroups : unauthenticatedNavGroups;
}

export const accountMenuItems: AccountMenuItem[] = [
  { id: 'profile', label: 'Profile', icon: User, to: '/profile' },
  {
    id: 'verify-email',
    label: 'Verify email',
    icon: MailCheck,
    to: '/verify-email',
    requiresUnverified: true,
  },
  { id: 'logout', label: 'Logout', icon: LogOut, action: 'logout' },
];
