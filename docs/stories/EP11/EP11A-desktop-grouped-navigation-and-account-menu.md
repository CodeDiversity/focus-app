# EP11A: Desktop Grouped Navigation & Account Menu

**Story ID:** EP11A
**Title:** Frontend — desktop grouped navigation & account/user menu (dropdowns, icons)
**Parent epic:** [EP11: Navigation & Information Architecture (ADHD-friendly)](../../epics/EP11-navigation-and-information-architecture.md)
**Parent:** [EP11 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Implemented — awaiting parent review (2026-10-29).
**Dependencies:** EP10C (app shell refresh — header, layout, navigation, mobile drawer) implemented and parent-reviewed (EP10 parent review PASSED 2026-10-29). `ui-refiner` pass completed 2026-10-29 (D11-3); technical-refine completed 2026-10-29.
**Jira key:** Pending creation
**Refined:** 2026-10-29 (ui-refiner pass — dropdown interaction, icon set, account-menu trigger, copy, availability placement, home-for-authenticated decision settled); 2026-10-29 (technical-refine — codebase grounding, contract types, exact edits, test updates, risks)

## Summary

Redesign the desktop primary navigation from a flat eight-link list into grouped sections (Home, Dashboard; Academics; Planning) rendered as dropdown menus, each entry showing an icon + text, and move personal/account actions (Profile, email-verification, Logout) into a user/avatar dropdown. Reduce top-level link count and cognitive load while preserving every route and auth behavior. Availability stays reachable from the Planning group and is also exposed as a secondary shortcut in the account menu.

## Description & bounded scope

### In scope

1. **Nav groups definition:** introduce a single `navGroups`/`accountMenuItems` definition (in `widgets/header/ui/` or a small module in the same folder) consumed by both desktop and mobile (EP11B reuses it). Authenticated groups: Home (single), Dashboard (single), Academics (Semesters/Courses/Assignments), Planning (Calendar/Availability). Unauthenticated: Home (single).
2. **Desktop primary nav:** render Academics and Planning as dropdown menus (button trigger + menu panel) with icon + text items; Dashboard and Home as single `NavLink`s. Icons from lucide-react.
3. **Account/user menu:** avatar/initials trigger (desktop, md+) opening a dropdown containing a "Signed in as {name}" header, Profile, Verify email (when `!user.emailVerifiedAt`), Logout. Remove the inline welcome text + verify link + Logout button from the desktop auth area in favor of the menu.
4. **Keyboard operability:** button-triggered menus; Enter/Space toggle; Escape closes; arrow keys move between items; focus moves into the menu on open and returns to the trigger on close; `aria-expanded`, `aria-haspopup="menu"`, `role="menu"`/`role="menuitem"`.
5. **Active highlighting:** preserve `aria-current="page"` on the active item (including within a dropdown's items); highlight the group trigger when any child route is active.
6. **Styling:** semantic tokens only (EP10 contract); tap targets ≥ 44px where applicable; visible focus rings; reduced motion via token durations (D10-16).
7. **Tests:** update `Header.test.tsx` for grouped nav by auth state, dropdown open/close/keyboard, account menu, active `aria-current`.

### Out of scope

- Mobile drawer grouped sections (EP11B).
- Token definitions/primitives (EP10A/EP10B) and shell baseline (EP10C).
- Page-level adoption (EP10D–EP10G) — already done.
- Backend/API changes (D11-2).
- New routes.

## Source requirement references

- **Epic AC-E11-01, AC-E11-02, AC-E11-03, AC-E11-05, AC-E11-06, AC-E11-07, AC-E11-08.**
- **Shared DoD** — items 1, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D11-1…D11-9, D10-8, D10-11…D10-16.

## Acceptance criteria

1. Desktop primary nav renders Home and Dashboard (single links), an Academics dropdown, and a Planning dropdown, each item showing an icon + text; the flat Semesters/Courses/Assignments/Calendar/Availability links are no longer rendered inline.
2. The desktop account/user menu contains a "Signed in as {name}" header, Profile, Verify email (when unverified), and Logout; the previous inline welcome/verify/Logout cluster is replaced by the avatar menu. Availability remains reachable via the Planning group and as a secondary shortcut inside the account menu.
3. Dropdowns and the account menu open/close via click and keyboard (Enter/Space toggle, Escape close, arrow-key item navigation, focus management, focus restoration); `aria-expanded`, `aria-haspopup="menu"`, and `role="menu"` are present.
4. Active link highlighting is preserved: the active item has `aria-current="page"` and the active styling; the group trigger is highlighted (accent + semibold) when a child route is active.
5. No functional regression: all routes reachable; auth behavior (login/logout/verify) unchanged; skip link and landmarks unchanged.
6. Component tests cover grouped nav by auth state, dropdown open/close + keyboard, account menu, active `aria-current`; existing tests pass.

## Tests to add / update

- `apps/web/src/widgets/header/ui/Header.test.tsx` (rewrite affected cases; keep mobile-drawer cases):
  - **Auth state — authenticated:** `Home` + `Dashboard` links present (single); `Academics menu` + `Planning menu` buttons present with `aria-haspopup="menu"` and `aria-expanded="false"`; account menu trigger (avatar) present with `aria-label="Open account menu"`; `Semesters`/`Courses`/`Assignments`/`Calendar`/`Availability` are NOT in the document until the relevant dropdown is opened.
  - **Auth state — unauthenticated:** only `Home` link + `Login`/`Get Started` buttons; no `Academics menu`/`Planning menu`/account trigger; no grouped sections.
  - **Dropdown open via click:** clicking `Academics menu` sets `aria-expanded="true"` and reveals `Semesters`, `Courses`, `Assignments` links with `role="menuitem"` inside a `role="menu"` panel labeled "Academics".
  - **Single-open:** opening `Academics menu` while `Planning menu` is open closes Planning (its `aria-expanded` returns to "false" and its items unmount).
  - **Escape + focus restoration:** Escape closes the open menu and returns focus to its trigger.
  - **Outside click:** `mousedown` on `document.body` (or clicking outside) closes the open menu.
  - **Keyboard — trigger:** Enter/Space toggle; ArrowDown opens and focuses first item; ArrowUp opens and focuses last item.
  - **Keyboard — panel:** ArrowDown/ArrowUp cycle (wrapping); Home/End focus first/last; Enter/Space activates the focused item; Tab moves focus out and closes without restoring focus.
  - **Account menu contents (unverified user):** opening reveals "Signed in as Ada Lovelace", `Profile`, `Availability`, `Verify email`, `Logout`. `Verify email` link points to `/verify-email`.
  - **Account menu contents (verified user):** `Verify email` absent; others present. (Use `sessionUser` with `emailVerifiedAt: '2026-...'`.)
  - **Active highlight — item:** on `/semesters`, the `Semesters` item (after opening Academics) has `aria-current="page"` and `text-accent`; other items and the Dashboard link do not.
  - **Active highlight — group trigger:** on `/courses/:id` (use `/courses/abc`), the `Academics menu` trigger has `text-accent` (and `font-semibold`); on `/dashboard`, it does not.
  - **Active highlight — single link:** on `/dashboard`, `Dashboard` link has `aria-current="page"` and active classes; `Home` does not.
  - **Home present for authenticated users.**
  - **Mobile drawer regression:** existing drawer cases (toggle, Escape, scroll lock, close-on-link-click, auth actions) still pass unchanged.
  - **Verification:** `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified codebase facts (inspected 2026-10-29)

- `apps/web/src/widgets/header/ui/Header.tsx`:
  - Exports `Header`; uses `useAuth()` (`isAuthenticated`, `logout`, `user`), `useLocation`, `useState`/`useRef`/`useEffect`.
  - Flat `navLinks: NavLinkItem[]` (`{ to, label }`) rendered both in desktop `<nav aria-label="Primary">` and the mobile drawer; mobile drawer reuses `navLinks` plus an auth area.
  - `navLinkClass(isActive, mobile)` returns `text-accent font-semibold border-accent` (active) vs `text-text-muted hover:text-text border-transparent`; mobile variant adds `min-h-[44px] px-2 w-full`.
  - Auth area (desktop): `Hi, {name}` span + conditional `Verify email` link + `Logout` Button; unauth: Login/Get Started Buttons.
  - Mobile drawer: right-side slide-in, focus trap, scroll lock, Escape, route-change close, `aria-modal` dialog labeled "Primary navigation"; drawer nav `aria-label="Primary"`.
  - `name = user?.name || user?.email?.split('@')[0] || ''`; `showVerify = isAuthenticated && !user?.emailVerifiedAt`.
- `apps/web/src/widgets/header/ui/Header.test.tsx`: mocks `useAuth`; `sessionUser` (Ada Lovelace, unverified). Asserts Semesters/Courses/Dashboard/Profile links, active `text-accent` + `aria-current="page"`, mobile drawer toggle/Escape/scroll lock/auth actions. **These assertions target the flat inline links and must be rewritten to open dropdowns first (see Test cases).**
- Icons: `lucide-react` `^0.312.0`; currently only `Menu`, `X` imported. `type LucideIcon` is exported from `lucide-react` (verified) and is the correct type for icon component references.
- Shared primitives: `Button` (`variant`, `size`, `leftIcon`/`rightIcon`), `Dialog` (focus-trap reference). No menu/dropdown primitive exists (EP10B); inline implementation is required.
- Existing dropdown pattern to mirror: `apps/web/src/features/assignments/ui/RowActionsMenu.tsx` and `apps/web/src/features/courses/ui/CourseActionsMenu.tsx` — `rootRef` + `triggerRef` + `menuRef`, `pointerdown` outside-click, Escape restore focus, `useLayoutEffect` focus first `[role="menuitem"]`, `focusCycle` with ArrowUp/Down, `runAction` restores trigger focus before callback. **Reuse this interaction skeleton; extend with Enter/Space toggle, Home/End, Tab-out, chevron, and `NavLink` items.**
- `SessionUser` (`apps/web/src/entities/user/model/types.ts`): `{ id, email, name, emailVerifiedAt: string | null, ... }`. `emailVerifiedAt` is `string | null`, so `!user.emailVerifiedAt` is the unverified check (matches existing `showVerify`).
- `useAuth()` returns `{ user, isAuthenticated, logout, ... }`; `logout()` is `() => Promise<void>`.
- Routes (from `App.tsx`): `/`, `/dashboard`, `/semesters`, `/courses`, `/courses/:id`, `/assignments`, `/calendar`, `/availability`, `/profile`, `/verify-email`, etc. All stay unchanged.
- `Layout.tsx` provides skip link + landmarks; untouched by this story.
- Tailwind tokens: `duration-fast` (150ms), `ease-standard`, `z-40` available; no new animation library.

### Proposed files

- `apps/web/src/widgets/header/ui/navGroups.ts` (**new**) — shared nav contract data + types (see "Shared nav contract types" below). Single source consumed by desktop now and mobile drawer in EP11B.
- `apps/web/src/widgets/header/ui/Header.tsx` (modify) — desktop dropdowns + account menu; mobile drawer keeps the legacy flat list in EP11A (see Decisions).
- `apps/web/src/widgets/header/ui/Header.test.tsx` (update) — grouped nav by auth state, dropdown keyboard, account menu, active `aria-current`.

### Decisions (ui-refiner, 2026-10-29)

**Dropdown interaction model — click-to-toggle, single-open, outside-click close, focus into menu.**
- Triggers are `<button>` elements (not hover). Hover-only menus are inaccessible and conflict with the ADHD-friendly requirement that affordances be explicit; click matches the existing EP10C drawer pattern.
- Only one desktop menu is open at a time: opening Academics closes Planning and the account menu, and vice versa. Prevents stacked panels and visual noise.
- Outside click (mousedown on `document` outside the trigger+panel) closes the open menu; Escape closes and restores focus to the trigger.
- On open, focus moves to the first menu item; on close (any path), focus returns to the trigger. No focus trap on desktop dropdowns (they are non-modal); Tab moves focus out of the menu and closes it (see keyboard model). Rationale: keeps dropdowns lightweight and consistent with WAI-ARIA Menu Button pattern; the mobile drawer retains its modal trap (EP10C/D10-11).

**Keyboard model — Enter/Space toggle, ArrowUp/Down, Home/End, Escape, Tab moves out.**
- Enter/Space on a trigger toggles its menu.
- ArrowDown on a trigger opens the menu and focuses the first item; ArrowUp opens and focuses the last item.
- Inside an open menu: ArrowDown/ArrowUp move focus between items (wrapping at the ends); Home focuses the first item; End focuses the last item; Enter/Space activates the focused item (navigate for links, invoke for Logout).
- Escape closes the menu and restores focus to its trigger.
- Tab / Shift+Tab move focus out of the menu to the next/previous focusable element in the header and close the menu (no trap). Rationale: desktop dropdowns are non-modal; trapping would break header tab order. The mobile drawer keeps its trap (D10-11).
- Roving tabindex is not used; all items remain in the tab order when the menu is closed? No — items are unmounted/hidden when closed, so only triggers are tabbable. When open, items are tabbable in DOM order; arrow keys move focus but do not change tabindex. Rationale: simpler, matches the repo's existing approach, and avoids tabindex bookkeeping; acceptable for these small menus.

**Account-menu trigger — avatar with initials, no inline name on desktop.**
- Trigger is a circular avatar button (`w-8 h-8`/`w-9 h-9`, `rounded-full bg-accent text-white`) showing the user's initials (first letter of `name`, or first letter of the email local part; fallback `User` icon if neither). `aria-label` = "Open account menu" (closed) / "Close account menu" (open); `aria-expanded`, `aria-haspopup="menu"`.
- The desktop "Hi, {name}" welcome text is removed from the header auth area; identity is preserved inside the menu as a non-interactive "Signed in as {name}" line (`text-sm text-text-muted`, truncated) followed by a divider. Rationale: reduces header noise while keeping identity visible on demand; matches the account-menu pattern and the ADHD-friendly goal.
- Menu alignment: panel right-aligned to the trigger (`right-0`), so it stays within the viewport at the header's right edge.

**Group-trigger active state — highlight trigger + aria-current on active child.**
- When any child route of a group is active, the group trigger receives active styling `text-accent font-semibold` (no underline, since it is a button, not a link) — matching the active link color/weight cue from D10-13 without a link underline.
- The active child link inside the dropdown receives `aria-current="page"` (set by `NavLink`) and active styling `text-accent font-semibold` (plus the existing underline treatment is omitted inside menus; weight + color + `aria-current` suffice; non-color cue = weight).
- Single links (Home, Dashboard) keep the D10-13 active treatment (accent + semibold + 2px underline + `aria-current="page"`).
- The trigger itself is not a link and does not carry `aria-current`.

**Icon set — lucide-react, finalized.**
- Home: `Home`
- Dashboard: `LayoutDashboard`
- Academics (group trigger): `GraduationCap`
  - Semesters: `CalendarRange`
  - Courses: `BookOpen`
  - Assignments: `ClipboardList`
- Planning (group trigger): `CalendarDays`
  - Calendar: `Calendar`
  - Availability: `Clock`
- Account menu: trigger uses initials avatar (fallback `User` icon); items:
  - Profile: `User`
  - Verify email: `MailCheck`
  - Logout: `LogOut`
- Availability is reused with `Clock` in both the Planning group and the account menu (secondary shortcut).
- Icons are supplementary: every icon is `aria-hidden="true"` and sized `h-4 w-4` (`h-5 w-5` for triggers where appropriate); text labels remain primary and always visible (D11-5). No icon-only controls.

**Copy — concise, scannable.**
- Group triggers: "Academics", "Planning".
- Items: "Home", "Dashboard", "Semesters", "Courses", "Assignments", "Calendar", "Availability".
- Account menu: header line "Signed in as {name}" (truncated); items "Profile", "Verify email", "Logout".
- Trigger aria-labels: Academics "Academics menu", Planning "Planning menu", account "Open account menu"/"Close account menu".
- Dropdown panel `aria-label`: "Academics", "Planning", "Account".
- Chevron affordance: `ChevronDown` after the label in group triggers; `aria-hidden`.

**Home for authenticated users — keep Home for all users.**
- Home remains a top-level single link for both authenticated and unauthenticated users (current EP10C behavior). Rationale: removing it would change a familiar entry point and risk confusion; the reduction in link count still holds (8 → Home + Dashboard + 2 group triggers = 4 top-level triggers). Reversible if planner/user later prefers Dashboard-only for authenticated users.

**Availability placement — keep in both (Planning primary, account menu secondary).**
- Availability stays in the Planning group (primary/canonical location) and is also exposed in the account menu as a secondary shortcut (same route `/availability`, same `Clock` icon). Rationale: matches epic AC-E11-02 and decision D11-8; the account menu's shortcut is convenient for settings-adjacent access. Deduplication (removing from the account menu) would contradict the agreed epic acceptance criterion and require an epic/breakdown amendment, which is out of this story's write scope; flagged here for the planner if a single location is preferred. The Planning group is documented as the canonical owner to prevent drift.

**Desktop layout — spacing, panel, z-index, chevron, dividers, reduced motion.**
- Desktop nav: `<nav aria-label="Primary">` with `flex items-center gap-6` (unchanged density); triggers are inline-flex `items-center gap-2`.
- Group trigger button: `inline-flex items-center gap-2 py-1` with the same focus ring as links; active styling per above.
- Dropdown panel: `absolute top-full left-0 mt-2 min-w-[12rem] w-max max-w-xs`, `bg-surface border border-border rounded-lg shadow-lg p-1 z-40`. Account panel: `right-0 left-auto`.
- Panel entrance: opacity + slight translate-y using `duration-fast ease-standard`; global reduced-motion zeroes durations (D10-16). No new animation library.
- Chevron rotates 180° when open (`transition-transform duration-fast`); reduced-motion zeroes it.
- Items: `flex items-center gap-2 w-full px-3 py-2 rounded-md text-body-sm`; hover `bg-surface-muted`; active `text-accent font-semibold`; focus ring standard.
- Dividers: account menu has a `border-t border-border` after the "Signed in as" header and another before Logout. Group menus have no dividers (small item counts).
- z-index: desktop dropdown panels `z-40`; mobile drawer/backdrop remain `z-50` (drawer is `md:hidden`, so no overlap). Header itself is not stacked.
- Outside-click handling: a single `useEffect` attaches a `mousedown` listener on `document` while any menu is open; closes if the click target is outside the open menu's container.

**Responsive switch point — unchanged.**
- `md` (768px) remains the switch: below `md` the mobile drawer (EP10C, adapted by EP11B) is used; at `md+` inline nav + dropdowns. No change to EP10C breakpoints.

**Tap targets & focus rings.**
- Desktop triggers/items use the standard focus ring `focus-visible:ring-2 ring-focus-ring ring-offset-2`; item padding gives comfortable click area. Mobile drawer links keep `min-h-[44px]` (EP10C/D10-11) and are untouched by this story. Tap targets ≥ 44px on mobile are preserved (D11-9).

### Element decisions

- Reuse `Button` (EP10B) for hamburger/close (unchanged) and for dropdown triggers? Triggers are plain `<button>` styled with the nav trigger classes to match link styling; using `Button` would impose button padding/variants that conflict with nav density. Implementer may use `Button variant="ghost" size="sm"` for triggers if it matches visually; either is acceptable. Recommendation: plain `<button>` with shared trigger classes for visual parity with links.
- Reuse `NavLink` (react-router-dom) for single links and for items inside dropdowns so `aria-current="page"` is emitted automatically (D10-13).
- Icons from `lucide-react` (already a dependency); add the finalized set to the existing import.
- No new shared primitive; dropdowns are implemented inline in `widgets/header/ui/Header.tsx` (or extracted to `NavDropdown.tsx`/`AccountMenu.tsx` in the same folder if complexity warrants) — FSD placement, mirroring the EP10C drawer approach.
- `Layout.tsx`, `ProtectedRoute`, `PublicRoute` untouched.
- `navGroups`/`accountMenuItems` are plain typed data (arrays/objects) defined once in the header module (or a sibling `navGroups.ts`) and consumed by both desktop and (EP11B) mobile; icons are component references.

### Layout & hierarchy

- Desktop: single row — logo (left) | nav (center, `flex items-center gap-6`) | account menu trigger (right, replacing the auth cluster). Unauthenticated desktop keeps Login/Get Started buttons on the right.
- Nav order (authenticated): Home, Dashboard, Academics (trigger), Planning (trigger). Unauthenticated: Home.
- Account menu trigger sits in the right auth slot; when unauthenticated, Login + Get Started remain.
- Dropdowns anchor below their trigger; account menu anchors to the right edge.

### States

- No loading/empty/error states at shell level; `ProtectedRoute`/`PublicRoute` handle auth loading. Header consumes `useAuth` synchronously (as today).
- Menu open/closed is local component state; outside-click/Escape/close-on-select reset it.
- Verification-dependent item (Verify email) renders only when `!user.emailVerifiedAt`.

### Accessibility

- Keyboard: as specified in the keyboard model above.
- Visible focus: `focus-visible:ring-2 ring-focus-ring ring-offset-2` on triggers and items.
- Non-color distinction on active item: weight (semibold) + `aria-current="page"`; group trigger active = color + weight.
- Icons are `aria-hidden`; labels are text.
- Reduced motion handled globally (D10-16); no component-level guards.
- Skip link and landmarks unchanged (D10-14).

### Responsive

- `md` (768px) switch unchanged. Below `md` the mobile drawer (EP10C, adapted by EP11B) is used; desktop dropdowns do not render (`hidden md:flex` / `hidden md:block`).
- Container padding responsive (`px-4 sm:px-6 lg:px-8`) unchanged.

### Copy

- Skip link: "Skip to main content" (unchanged).
- Hamburger aria-label: "Open menu" / "Close menu" (unchanged).
- Drawer aria-label: "Primary navigation" (unchanged).
- Buttons: "Login", "Get Started", "Logout" (unchanged).
- Nav labels: "Home", "Dashboard", "Academics", "Semesters", "Courses", "Assignments", "Planning", "Calendar", "Availability".
- Account menu header: "Signed in as {name}".
- Account items: "Profile", "Verify email", "Logout".

### Test cases to add/update

- `Header.test.tsx`:
  - Authenticated: Home + Dashboard links present; Academics/Planning triggers present with `aria-expanded="false"` and `aria-haspopup="menu"`; opening a trigger reveals its items (Semesters, Courses, Assignments / Calendar, Availability) with `role="menuitem"`.
  - Unauthenticated: only Home link + Login/Get Started; no group triggers or account menu.
  - Dropdown toggle via click and Enter/Space; Escape closes and restores focus to trigger; ArrowDown/ArrowUp move focus; outside click closes.
  - Single-open: opening Academics closes Planning.
  - Account menu: avatar trigger present; opening reveals "Signed in as {name}", Profile, Verify email (when unverified), Logout; Verify email absent when verified.
  - Active `aria-current="page"` on the active item inside a dropdown and active styling on the group trigger.
  - Home stays present for authenticated users.
  - Verification: `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

### Shared nav contract types (to define in `navGroups.ts`)

```ts
import type { LucideIcon } from 'lucide-react';
import type { SessionUser } from '@/entities/user/model/types';

export interface NavItem {
  id: string;          // stable key, e.g. 'semesters'
  label: string;       // display + accessible name, e.g. 'Semesters'
  icon: LucideIcon;    // component reference (aria-hidden at render)
  to: string;          // route, e.g. '/semesters'
}

export interface NavSection {
  id: string;          // 'home' | 'dashboard' | 'academics' | 'planning'
  label: string;
  icon: LucideIcon;
  /** Present for single links (Home, Dashboard). Omit for groups. */
  to?: string;
  /** Present for groups (Academics, Planning). Omit for single links. */
  items?: NavItem[];
}

export interface AccountMenuItem {
  id: string;          // 'profile' | 'availability' | 'verify-email' | 'logout'
  label: string;
  icon: LucideIcon;
  /** Link target. Omit for action items (logout). */
  to?: string;
  /** Action discriminator. Omit for link items. */
  action?: 'logout';
  /** Render only when the user is unverified (`!user.emailVerifiedAt`). */
  requiresUnverified?: boolean;
}

export const authenticatedNavGroups: NavSection[] = [ /* Home, Dashboard, Academics, Planning */ ];
export const unauthenticatedNavGroups: NavSection[] = [ /* Home */ ];

export function getNavGroups(isAuthenticated: boolean): NavSection[] {
  return isAuthenticated ? authenticatedNavGroups : unauthenticatedNavGroups;
}

export const accountMenuItems: AccountMenuItem[] = [ /* Profile, Availability, Verify email, Logout */ ];
```

Invariants:
- Every `NavSection` is either a single link (`to` set, `items` omitted) or a group (`items` set, `to` omitted) — never both, never neither. Renderers branch on `'items' in section`.
- Icons are component references (not strings); rendered as `<Icon className="h-4 w-4" aria-hidden="true" />` (triggers use `h-5 w-5` where appropriate per ui-refiner).
- `requiresUnverified` is the only conditional-visibility flag in the contract; all other visibility is auth-state-driven at the section level (`getNavGroups`).
- `accountMenuItems` is always the authenticated set; it is only rendered when `isAuthenticated`. `requiresUnverified` filters Verify email.
- `end` matching: `NavLink` items use `end` (exact) so nested routes (e.g. `/courses/:id`) do not mark the item active (D10-13 preserved).
- Group trigger active state uses **prefix matching**: a trigger is active when `location.pathname === item.to` OR `location.pathname.startsWith(item.to + '/')` for any of its items (or for its own `to` when it is a single link — though single links use `NavLink`'s own active state, not the trigger path). Settled by refiner question 2026-10-29: Yes.

### Decisions (technical-refine, 2026-10-29)

1. **Shared contract file location:** `apps/web/src/widgets/header/ui/navGroups.ts`. Stays inside the header widget (FSD `ui/` segment) because both consumers (desktop now, mobile drawer in EP11B) live in the same widget; no cross-widget import needed. Re-export nothing from a barrel (none exists). EP11B imports from this path.
2. **Mobile drawer in EP11A stays on the legacy flat list.** The drawer keeps rendering `navLinks` (Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Profile) unchanged in EP11A to preserve mobile UX and avoid a regression (Profile is only in the account menu on desktop, but the mobile Account section is EP11B's job). The legacy `navLinks` array is retained as a temporary derived flat list for the drawer only and is marked `// EP11B: replace with grouped rendering`. This is a deliberate, scoped exception to the "no link in one surface but not the other" rule; EP11B removes the legacy list and unifies on `navGroups`/`accountMenuItems`. Rationale: EP11A's out-of-scope is the mobile drawer; touching it risks regression and expands scope.
3. **Dropdown state model:** a single `openMenu: 'academics' | 'planning' | 'account' | null` state. Opening one closes the others (single-open). `null` when none open. This replaces three independent booleans and guarantees single-open without effect chains.
4. **Outside-click:** `mousedown` listener on `document` while `openMenu !== null`, attached in a single `useEffect` keyed on `openMenu`; closes if `event.target` is outside the open menu's container `rootRef`. Matches the ui-refiner wording; `pointerdown` is an acceptable superset but `mousedown` is used for parity with the story text. (Existing `RowActionsMenu` uses `pointerdown`; both close correctly in jsdom.)
5. **Focus restoration policy:** on Escape, outside-click, or item selection → restore focus to the trigger. On Tab/Shift+Tab moving out of the menu → close but **do not** restore focus (let the browser's Tab proceed to the next focusable element). Rationale: restoring on Tab would fight the user's tab direction and re-focus the trigger. This refines the ui-refiner's "focus returns on close (any path)" to exclude the Tab-out path, which is the only path where the user is intentionally leaving.
6. **Focus entry:** `useLayoutEffect` on `openMenu` focuses the first `[role="menuitem"]` in the open panel (mirrors `RowActionsMenu`). For the account menu, the first item is Profile (the "Signed in as" header is non-focusable).
7. **Keyboard handling per menu:** trigger handles Enter/Space/ArrowDown/ArrowUp (toggle/open); panel handles ArrowUp/ArrowDown (cycle, wrapping), Home, End, Enter/Space (activate), Escape (close + restore trigger). Tab/Shift+Tab close without restoring. Roving tabindex is NOT used (items unmounted when closed; when open they are tabbable in DOM order).
8. **Space activation on `NavLink` items:** `NavLink` renders `<a>`, which activates on Enter natively but not on Space. Each item gets `onKeyDown` that calls `event.preventDefault()` + `event.currentTarget.click()` on Space so Space activates the link, matching WAI-ARIA menu item behavior. Enter works natively.
9. **Conditional render:** menus are unmounted when closed (`{openMenu === 'academics' && (...)}`), matching `RowActionsMenu` and keeping closed items out of the tab order and out of `screen` queries unless opened. Tests must open first.
10. **Active highlight:**
    - Single links (Home, Dashboard): `NavLink` with `end`, classes `text-accent font-semibold border-b-2 border-accent` active (D10-13, unchanged).
    - Dropdown items: `NavLink` with `end`, active classes `text-accent font-semibold` (no underline inside menus; weight + color + `aria-current`).
    - Group trigger: button (not a link); active when any descendant route matches (prefix match, settled above) → classes `text-accent font-semibold`. No `aria-current` on the trigger (it is not a link).
11. **Avatar trigger initials:** `initials = (name?.trim()[0] || user?.email?.split('@')[0]?.[0] || '')`. If non-empty, render uppercase letter in the avatar circle; otherwise render `<User className="h-4 w-4" aria-hidden />`. `aria-label` toggles "Open account menu"/"Close account menu". Panel `aria-label="Account"`.
12. **Account menu item rendering:** Profile and Availability and Verify email render as `NavLink` (with `end`) with `role="menuitem"`; Logout renders as a `<button role="menuitem">` that calls `logout()` then closes. Verify email item renders only when `!user.emailVerifiedAt` (`requiresUnverified`).
13. **Availability secondary shortcut:** rendered in both the Planning group and the account menu (same route, same `Clock` icon), per settled decision D11-8. The Planning group is documented as canonical owner in `navGroups.ts` comments.
14. **Chevron:** `ChevronDown` after the label in group triggers, `aria-hidden`, rotates 180° when open (`transition-transform duration-fast`), zeroed by global reduced-motion.
15. **Panel classes:** `absolute top-full left-0 mt-2 min-w-[12rem] w-max max-w-xs bg-surface border border-border rounded-lg shadow-lg p-1 z-40`; account panel `right-0 left-auto`. Entrance: opacity + slight translate-y using `duration-fast ease-standard`. (No new animation library.)
16. **Item classes:** `flex items-center gap-2 w-full px-3 py-2 rounded-md text-body-sm`; hover `bg-surface-muted`; active `text-accent font-semibold`; focus ring `focus-visible:ring-2 ring-focus-ring ring-offset-2`.
17. **Dividers:** account menu has `border-t border-border` after the "Signed in as {name}" header and another before Logout. Group menus have no dividers.
18. **z-index:** dropdown panels `z-40`; mobile drawer/backdrop remain `z-50` (drawer is `md:hidden`, no overlap).
19. **Testing entry point:** `getNavGroups` and `accountMenuItems` are pure data exports, so tests may import them directly for shape assertions; component tests use `screen.getByRole('button', { name: /academics menu/i })` etc.

### Remaining risks / implementation notes (not blockers)

- **No shared menu primitive.** Inline implementation is required (FSD). Mirror `RowActionsMenu`'s skeleton and extend per Decisions 4–9. Do not introduce a new shared primitive in this story (out of scope; EP10B owns primitives).
- **`NavLink` + `role="menuitem"` + Space.** `NavLink` renders `<a>`; Space does not activate links natively. Implement Decision 8 (`onKeyDown` → `click()`). Tests may assert Enter activation only; Space handling is a robustness addition.
- **Focus restoration vs. Tab-out conflict.** Decision 5 resolves it (no restore on Tab-out). Ensure the outside-click/Escape handlers restore focus and that the Tab handler closes without restoring. A regression here would trap or lose focus.
- **Single-open state across desktop menus.** `openMenu` single value guarantees it, but the outside-click effect must re-run when `openMenu` changes (key the effect on `openMenu`, not `[]`).
- **`useLayoutEffect` focus on first open.** Guard against `null` panel (e.g., if `openMenu` is set before paint). Mirror `RowActionsMenu`'s `menuRef.current?.querySelector(...)`.
- **Mobile drawer unchanged.** Decision 2 keeps the legacy flat list; do not delete `navLinks` in EP11A. EP11B owns the migration and removal.
- **`end` matching preserved.** All `NavLink` items use `end` (D10-13). Group trigger uses prefix matching only for its own active styling (Decision 10), not for item highlighting.
- **Test rewrites.** Existing `Header.test.tsx` cases that expect `Semesters`/`Courses`/`Assignments`/`Calendar`/`Availability`/`Profile` links inline must open the relevant dropdown first (`user.click(screen.getByRole('button', { name: /academics menu/i }))`) or query within the panel. `Profile` moves to the account menu. `getByRole('link', { name: 'Profile' })` will only resolve after opening the account menu.
- **jsdom + `mousedown` outside-click.** Tests for outside-click should dispatch a mousedown on `document.body` (or call `user.click` on an element outside) and assert the menu closes. Ensure the listener is attached only while a menu is open (no leaked global listeners).
- **Initials fallback.** If `name` and email are both empty, render the `User` icon. `sessionUser` in tests has `name: 'Ada Lovelace'`, so avatar renders "A". Tests may assert `aria-label="Open account menu"` rather than initials text.
- **No backend/API changes** (D11-2). None required.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Not applicable — no new async states at shell level.
6. Keyboard accessibility + visible focus + dropdown `aria-*` + focus management.
7. Responsive: desktop dropdowns at md+ (mobile drawer untouched here).
8. Automated component tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP11 parent review.
11. Reviewer walkthrough — combined EP11 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** desktop navigation reorganized into grouped dropdowns with icons + text, plus a user/account menu; shared nav-groups definition introduced.
- **Request/token estimate:** ~2–3 requests/tokens — dropdown components + account menu + icons + keyboard/focus logic + tests.
- **Model recommendation:** 3 — moderate interaction/focus-management risk; dropdown a11y needs care.
- **Files:** `apps/web/src/widgets/header/ui/navGroups.ts` (new — shared contract data + types), `apps/web/src/widgets/header/ui/Header.tsx` (modify — desktop dropdowns + account menu; mobile drawer unchanged), `apps/web/src/widgets/header/ui/Header.test.tsx` (update — grouped nav, dropdown keyboard, account menu, active states). Optional extraction of `NavDropdown.tsx`/`AccountMenu.tsx` in the same folder if complexity warrants (implementer's call).
- **Start context:** this story; EP10C story + implementation (`410c343`); `apps/web/src/widgets/header/ui/Header.tsx`; `apps/web/src/widgets/header/ui/Header.test.tsx`; `apps/web/src/widgets/layout/ui/Layout.tsx`; `apps/web/src/app/App.tsx`; shared nav contract in `docs/stories/EP11/README.md`.
- **Verification:** `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10C implemented & reviewed. Excludes mobile drawer adaptation (EP11B), token/primitive definitions (EP10A/EP10B), page adoption (EP10D–EP10G).

## UI/UX gaps for the `ui-refiner` (D11-3 — settled 2026-10-29)

- **Dropdown interaction model:** settled — click-to-toggle, single-open, outside-click + Escape close, focus into menu on open and restore on close; Tab moves out (non-modal). (D11-3)
- **Keyboard model:** settled — Enter/Space toggle; ArrowUp/Down/Home/End within menu; Escape closes + restores focus; Tab moves out and closes. (D11-3)
- **Account-menu trigger:** settled — avatar with initials (fallback `User` icon), no inline "Hi, {name}" on desktop; identity moved into menu as "Signed in as {name}"; panel right-aligned. (D11-3)
- **Group-trigger active state:** settled — group trigger highlighted (accent + semibold) when a child route is active; active child gets `aria-current="page"` + active styling. (D11-3)
- **Icon set:** settled — finalized lucide set (Home, LayoutDashboard, GraduationCap/CalendarRange/BookOpen/ClipboardList, CalendarDays/Calendar/Clock, User/MailCheck/LogOut; avatar fallback User). (D11-3, D11-5)
- **Copy:** settled — labels, aria-labels, "Signed in as {name}" header, trigger aria-labels recorded above. (D11-3)
- **Home for authenticated users:** settled — keep Home for all users. (D11-3)
- **Availability placement:** settled — keep in both Planning group (primary) and account menu (secondary shortcut); deduplication flagged to planner. (D11-3, D11-8)
- **Desktop layout / responsive / tap targets:** settled — spacing, panel width/position, z-40, chevron affordance, dividers, reduced-motion via token durations, md switch unchanged, focus rings + tap targets. (D11-3, D10-16, D11-9)