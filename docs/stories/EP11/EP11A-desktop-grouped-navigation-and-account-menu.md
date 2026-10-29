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
**Refined:** not yet (pending `ui-refiner` pass)

## Summary

Redesign the desktop primary navigation from a flat eight-link list into grouped sections (Dashboard; Academics; Planning) rendered as dropdown menus, each entry showing an icon + text, and move personal/account actions (Profile, Availability, email-verification, Logout) into a user/avatar dropdown. Reduce top-level link count and cognitive load while preserving every route and auth behavior.

## Description & bounded scope

### In scope

1. **Nav groups definition:** introduce a single `navGroups`/`accountMenuItems` definition (in `widgets/header/ui/` or a small module in the same folder) consumed by both desktop and mobile (EP11B reuses it). Authenticated groups: Dashboard (single), Academics (Semesters/Courses/Assignments), Planning (Calendar/Availability). Unauthenticated: Home (single).
2. **Desktop primary nav:** render Academics and Planning as dropdown menus (button trigger + menu panel) with icon + text items; Dashboard as a single `NavLink`. Icons from lucide-react.
3. **Account/user menu:** avatar/initial trigger (desktop, md+) opening a dropdown containing Profile, Availability, Verify email (when `!user.emailVerifiedAt`), Logout. Remove the welcome text + inline verify link + Logout button from the desktop auth area in favor of the menu (or keep a compact name per ui-refiner decision).
4. **Keyboard operability:** button-triggered menus; Enter/Space toggle; Escape closes; arrow keys move between items; focus moves into the menu on open and returns to the trigger on close; `aria-expanded`, `aria-haspopup="menu"`, `role="menu"`/`role="menuitem"`.
5. **Active highlighting:** preserve `aria-current="page"` on the active item (including within a dropdown's items); highlight the group trigger when any child route is active (per ui-refiner decision).
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

1. Desktop primary nav renders Dashboard (single link), an Academics dropdown, and a Planning dropdown, each item showing an icon + text; the flat Semesters/Courses/Assignments/Calendar/Availability links are no longer rendered inline.
2. The desktop account/user menu contains Profile, Availability, email-verification (when unverified), and Logout; the previous inline welcome/verify/Logout cluster is replaced by the menu (copy per ui-refiner).
3. Dropdowns and the account menu open/close via click and keyboard (Enter/Space toggle, Escape close, arrow-key item navigation, focus management, focus restoration); `aria-expanded`, `aria-haspopup`, and `role="menu"` are present.
4. Active link highlighting is preserved: the active item has `aria-current="page"` and the active styling; the group trigger is highlighted when a child route is active (per ui-refiner decision).
5. No functional regression: all routes reachable; auth behavior (login/logout/verify) unchanged; skip link and landmarks unchanged.
6. Component tests cover grouped nav by auth state, dropdown open/close + keyboard, account menu, active `aria-current`; existing tests pass.

## Tests to add / update

- `apps/web/src/widgets/header/ui/Header.test.tsx`:
  - Authenticated: Dashboard link present; Academics/Planning triggers present; their items (Semesters, Courses, Assignments, Calendar, Availability) present inside menus (possibly after open); account menu trigger present.
  - Unauthenticated: only Home (and Login/Get Started) present; no grouped sections or account menu.
  - Dropdown open/close via click and keyboard; Escape closes; arrow navigation; focus restoration.
  - Account menu contents by verification state.
  - Active `aria-current="page"` on the active item (including inside a dropdown).
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

### Decisions (ui-refiner pending — D11-3)

The following are deliberately undecided and must be recorded by the `ui-refiner` before implementation:
- Dropdown interaction model: click-to-open vs hover; whether multiple menus can be open; outside-click close; focus trap scope.
- Keyboard model: roving tabindex vs arrow-key navigation; whether Tab moves between triggers and items.
- Account-menu trigger: avatar with initials vs icon + name; menu placement/alignment.
- Whether the group trigger is highlighted when a child route is active (and how).
- Exact lucide icon set per entry (candidates below; ui-refiner finalizes).
- Copy: account menu item labels, "Account"/"Menu" headings, trigger aria-labels.
- Whether Home stays in primary nav for authenticated users.
- Whether the desktop auth area keeps a compact "Hi, {name}" alongside the avatar trigger.

### Candidate icon set (provisional, ui-refiner finalizes)

- Dashboard: `LayoutDashboard`
- Academics: `GraduationCap` (group); Semesters: `CalendarRange`/`BookOpen`; Courses: `BookOpen`; Assignments: `ClipboardList`/`FileText`
- Planning: `CalendarDays` (group); Calendar: `Calendar`; Availability: `Clock`/`CalendarClock`
- Account menu: `User`, `Clock` (Availability), `MailCheck`/`ShieldCheck` (verify), `LogOut`
- Home: `Home`

### Unverified / for implementer

- Implement dropdown open/close state, outside-click handling, and focus management without an existing shared dropdown primitive (EP10B has `Dialog` but no menu primitive; inline implementation in the widget is acceptable per FSD).
- Ensure `NavLink` `end` matching is preserved so nested routes (e.g. `/courses/:id`) do not highlight the parent item (current behavior; D10-13).
- Existing `Header.test.tsx` active-highlight assertions reference the inline flat links; update to the grouped structure.
- Keep the mobile drawer (EP10C) working unchanged in this story; EP11B adapts it.

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

## UI/UX gaps for the `ui-refiner` (D11-3 — required before implementation)

- **Dropdown interaction model:** click-to-open vs hover; multiple-open policy; outside-click close; focus trap scope. (unsettled)
- **Keyboard model:** roving tabindex vs arrow navigation; Tab behavior between triggers and items. (unsettled)
- **Account-menu trigger:** avatar with initials vs icon + name; menu alignment. (unsettled)
- **Group-trigger active state:** whether/how the group trigger is highlighted when a child route is active. (unsettled)
- **Icon set:** exact lucide icons per entry (candidates listed; finalize). (unsettled)
- **Copy:** account menu item labels, headings, trigger aria-labels; whether compact "Hi, {name}" remains. (unsettled)
- **Home for authenticated users:** keep or remove from primary nav. (unsettled)
- **Availability placement:** keep in both Planning group and account menu, or deduplicate (D11-8). (unsettled)