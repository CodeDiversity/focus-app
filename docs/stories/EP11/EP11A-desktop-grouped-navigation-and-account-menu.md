# EP11A: Desktop Grouped Navigation & Account Menu

**Story ID:** EP11A
**Title:** Frontend — desktop grouped navigation & account/user menu (dropdowns, icons)
**Parent epic:** [EP11: Navigation & Information Architecture (ADHD-friendly)](../../epics/EP11-navigation-and-information-architecture.md)
**Parent:** [EP11 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** EP10C (app shell refresh — header, layout, navigation, mobile drawer) implemented and parent-reviewed (EP10 parent review PASSED 2026-10-29). `ui-refiner` pass required before implementation (D11-3).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (ui-refiner pass — dropdown interaction, icon set, account-menu trigger, copy, availability placement, home-for-authenticated decision settled)

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

- `apps/web/src/widgets/header/ui/Header.test.tsx`:
  - Authenticated: Home + Dashboard links present; Academics/Planning triggers present; their items (Semesters, Courses, Assignments, Calendar, Availability) present inside menus (after open); account menu trigger present.
  - Unauthenticated: only Home (and Login/Get Started) present; no grouped sections or account menu.
  - Dropdown open/close via click and keyboard; Escape closes; arrow navigation; focus restoration.
  - Account menu contents by verification state (Verify email only when unverified).
  - Active `aria-current="page"` on the active item (including inside a dropdown) and active styling on the group trigger.
  - Verification: `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/src/widgets/header/ui/Header.tsx`: flat `navLinks` array; desktop `<nav aria-label="Primary">` maps links; auth area renders welcome text + verify link + Logout button (desktop); mobile drawer reuses `navLinks` + auth area.
- `Header.test.tsx`: asserts nav by auth state, active highlight (`text-accent` + `aria-current`), mobile drawer toggle/Escape/scroll lock/auth actions.
- Icons available via lucide-react (already dependency); currently `Menu`, `X` imported.

### Proposed files

- `apps/web/src/widgets/header/ui/Header.tsx` (modify — desktop dropdowns + account menu + navGroups extraction).
- Optional new `apps/web/src/widgets/header/ui/NavDropdown.tsx` or `AccountMenu.tsx` in the same folder if complexity warrants (implementer's call; FSD placement).
- `apps/web/src/widgets/header/ui/Header.test.tsx` (update).

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

### Unverified / for implementer

- Implement dropdown open/close state, outside-click handling, and focus management without an existing shared dropdown primitive (EP10B has `Dialog` but no menu primitive; inline implementation in the widget is acceptable per FSD).
- Ensure `NavLink` `end` matching is preserved so nested routes (e.g. `/courses/:id`) do not highlight the parent item (current behavior; D10-13).
- Existing `Header.test.tsx` active-highlight assertions reference the inline flat links; update to the grouped structure.
- Keep the mobile drawer (EP10C) working unchanged in this story; EP11B adapts it.
- `navGroups`/`accountMenuItems` shape must be reusable by EP11B (mobile drawer) without drift; document the type.

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
- **Files:** `apps/web/src/widgets/header/ui/Header.tsx` (modify), optional `NavDropdown.tsx`/`AccountMenu.tsx` (new), `apps/web/src/widgets/header/ui/Header.test.tsx` (update).
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