import {
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Clock,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
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
  /** Stable key, e.g. 'semesters'. */
  id: string;
  /** Display + accessible name, e.g. 'Semesters'. */
  label: string;
  /** Component reference; always rendered aria-hidden. */
  icon: LucideIcon;
  /** Route, e.g. '/semesters'. */
  to: string;
}

export interface NavSection {
  /** 'home' | 'dashboard' | 'academics' | 'planning'. */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Present for single links (Home, Dashboard). Omit for groups. */
  to?: string;
  /** Present for groups (Academics, Planning). Omit for single links. */
  items?: NavItem[];
}

export interface AccountMenuItem {
  /** 'profile' | 'availability' | 'verify-email' | 'logout'. */
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

export const authenticatedNavGroups: NavSection[] = [
  { id: 'home', label: 'Home', icon: Home, to: '/' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  {
    id: 'academics',
    label: 'Academics',
    icon: GraduationCap,
    items: [
      { id: 'semesters', label: 'Semesters', icon: CalendarRange, to: '/semesters' },
      { id: 'courses', label: 'Courses', icon: BookOpen, to: '/courses' },
      { id: 'assignments', label: 'Assignments', icon: ClipboardList, to: '/assignments' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: CalendarDays,
    items: [
      { id: 'calendar', label: 'Calendar', icon: Calendar, to: '/calendar' },
      // Canonical home is the Planning group; the account menu also exposes a
      // secondary shortcut to the same route (D11-8).
      { id: 'availability', label: 'Availability', icon: Clock, to: '/availability' },
      { id: 'plan', label: 'Plan', icon: CalendarCheck, to: '/plan' },
    ],
  },
];

export const unauthenticatedNavGroups: NavSection[] = [
  { id: 'home', label: 'Home', icon: Home, to: '/' },
];

export function getNavGroups(isAuthenticated: boolean): NavSection[] {
  return isAuthenticated ? authenticatedNavGroups : unauthenticatedNavGroups;
}

export const accountMenuItems: AccountMenuItem[] = [
  { id: 'profile', label: 'Profile', icon: User, to: '/profile' },
  { id: 'availability', label: 'Availability', icon: Clock, to: '/availability' },
  {
    id: 'verify-email',
    label: 'Verify email',
    icon: MailCheck,
    to: '/verify-email',
    requiresUnverified: true,
  },
  { id: 'logout', label: 'Logout', icon: LogOut, action: 'logout' },
];
