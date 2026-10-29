# EP11B: Mobile Drawer Grouped Sections & Account Section

**Story ID:** EP11B
**Title:** Frontend — mobile drawer grouped sections & account section (responsive + a11y)
**Parent epic:** [EP11: Navigation & Information Architecture (ADHD-friendly)](../../epics/EP11-navigation-and-information-architecture.md)
**Parent:** [EP11 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** EP11A (shared `navGroups`/`accountMenuItems` definition + desktop implementation). `ui-refiner` pass required before implementation (D11-3).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (ui-refiner pass — mobile grouping labels/ordering, account section placement + identity row, icon size/spacing, collapsibility, drawer header, active highlighting, copy, tap targets, reduced motion settled)

## Summary

Adapt the existing EP10C mobile drawer to the grouped information architecture: render grouped sections with headings (Dashboard, Academics, Planning) and an Account section, each entry showing an icon + text, reusing the EP10C drawer's focus trap, scroll lock, Escape, and route-change-close behavior. Keep desktop and mobile in sync via the shared nav-groups definition.

## Description & bounded scope

### In scope

1. **Mobile drawer sections:** replace the flat `navLinks` list in the drawer with grouped sections using the shared `navGroups` definition — Dashboard and Home render as single links; Academics and Planning render as labeled sections (heading + item links with icon + text). Sections are **always expanded** (no accordion).
2. **Account section:** render `accountMenuItems` in a grouped Account section at the bottom of the drawer (identity row "Signed in as {name}" with avatar, Profile, Availability, Verify email when unverified, Logout), replacing the previous inline auth area (compact auth summary retained at the top of the section).
3. **Unauthenticated drawer:** Home link + Login/Get Started buttons (no grouped sections/account section), per EP10C baseline.
4. **Reuse EP10C drawer behavior:** focus trap, scroll lock, Escape close, route-change close, focus restoration, backdrop, animation, reduced motion — unchanged.
5. **Responsive correctness:** desktop dropdowns hidden on mobile; drawer hidden on desktop; no duplicate nav surfaces.
6. **Icons:** lucide icons alongside labels (same set as EP11A), `h-5 w-5` in the drawer.
7. **Tests:** update `Header.test.tsx` for grouped mobile sections, account section contents, drawer behavior preserved, responsive classes.

### Out of scope

- Desktop dropdowns/account menu (EP11A).
- Token definitions/primitives (EP10A/EP10B) and shell baseline (EP10C).
- Backend/API changes (D11-2).
- New routes.

## Source requirement references

- **Epic AC-E11-01, AC-E11-02, AC-E11-04, AC-E11-05, AC-E11-06, AC-E11-07, AC-E11-08.**
- **Shared DoD** — items 1, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D11-1…D11-9, D10-8, D10-11…D10-16.

## Acceptance criteria

1. The mobile drawer renders grouped sections with headings (Dashboard, Academics, Planning) and an Account section, each item showing an icon + text; the flat link list is replaced. (Sections are always expanded; Dashboard is a standalone top link.)
2. The Account section contains a "Signed in as {name}" identity row (with avatar), Profile, Availability, email-verification (when unverified), and Logout (and Login/Get Started for unauthenticated users).
3. Drawer behavior from EP10C is preserved: opens/closes via hamburger, Escape closes, focus trap, focus restoration, body scroll lock, closes on route change and link click.
4. Responsive: desktop dropdowns are not rendered on mobile (`md:hidden` drawer only); drawer is not rendered on desktop.
5. No functional regression: all routes reachable; auth behavior unchanged.
6. Component tests cover grouped mobile sections, account section contents, drawer behavior, responsive classes; existing tests pass.

## Tests to add / update

- `apps/web/src/widgets/header/ui/Header.test.tsx`:
  - Authenticated mobile drawer: grouped section headings (Academics, Planning, Account) and identity row present; items present (Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Profile) with icons.
  - Unauthenticated drawer: Home + Login/Get Started; no grouped/account sections or identity row.
  - Account section contents by verification state (Verify email conditional; avatar initials).
  - Drawer behavior preserved: toggle, Escape, scroll lock, link-click close (existing tests).
  - Active `aria-current="page"` on the active item inside the drawer.
  - Verification: `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/src/widgets/header/ui/Header.tsx`: mobile drawer renders `navLinks` (flat) in a `<nav aria-label="Primary">` and an auth area below a border; hamburger toggle, focus trap, scroll lock, Escape, route-change close, backdrop + slide-in animation (D10-11).
- `Header.test.tsx`: mobile drawer tests (toggle, Escape, link-click close, scroll lock, auth actions in drawer).
- EP11A (ui-refined, not yet implemented) defines the shared `navGroups`/`accountMenuItems` and the settled icon set; EP11B consumes them.

### Proposed files

- `apps/web/src/widgets/header/ui/Header.tsx` (modify — mobile drawer grouped sections + Account section).
- `apps/web/src/widgets/header/ui/Header.test.tsx` (update).

### Decisions (ui-refiner, 2026-10-29)

**Mobile grouping labels/ordering — Dashboard stays a standalone top item.**
- Authenticated drawer order (top to bottom): Home (single link), Dashboard (single link), Academics section (heading + Semesters/Courses/Assignments), Planning section (heading + Calendar/Availability), divider, Account section (identity row + Profile/Availability/Verify email (conditional)/Logout).
- Home and Dashboard render as single `NavLink`s with icon + text (same as desktop); Academics and Planning render as labeled sections with a heading and a vertical list of item links. Dashboard is NOT folded into a section; it stays a standalone top item to match desktop and keep the most-used destination one tap away. Rationale: matches EP11A desktop IA and the shared `navGroups`; reduces nesting; ADHD-friendly (primary destinations immediately visible, no tap to expand).
- Section headings are labels only (not links/triggers): "Academics", "Planning", "Account". They carry no `aria-expanded`/`aria-haspopup` and are not focusable. No group-trigger active treatment on mobile (sections are always expanded).
- Unauthenticated drawer: Home single link + Login/Get Started buttons; no grouped sections, no Account section, no identity row (EP10C baseline preserved).

**Account section — placement, divider, identity row, conditional verify.**
- Placement: after the primary nav groups, separated by a `border-t border-border` divider (`mt-4 pt-4`), i.e. the bottom region of the drawer (matches EP10C auth-area placement).
- Identity row at the top of the Account section: a non-interactive row `flex items-center gap-3` containing a circular initials avatar (`w-8 h-8 rounded-full bg-accent text-white text-body-sm font-semibold`, showing the first letter of `name` or the email local part, fallback `User` icon when neither) + "Signed in as {name}" (`text-sm text-text-muted truncate`). Then a divider (`border-t border-border`) before the items. Rationale: visual continuity with the desktop account-menu trigger (EP11A) and keeps identity visible in an always-expanded section; avatar provides a non-color cue.
- Items (vertical list, icon + text, `min-h-[44px]`): Profile (`User`), Availability (`Clock`), Verify email (`MailCheck`, only when `!user.emailVerifiedAt`), Logout (button, `LogOut`). A divider (`border-t border-border`) separates the identity row from the items and another precedes Logout, mirroring the desktop account menu.
- `showVerify = isAuthenticated && !user?.emailVerifiedAt` (same condition as EP10C/EP11A).

**Icon size/spacing in the drawer.**
- Icons: `h-5 w-5` (larger tap affordance than desktop's `h-4 w-4`), `aria-hidden="true"`, leading each label with `gap-3` between icon and text (row `flex items-center gap-3`).
- Row: `min-h-[44px]`, `px-2`, `w-full`, `rounded-md` (EP10C tap target, D11-9); hover `bg-surface-muted`; active `text-accent font-semibold`. Focus ring `focus-visible:ring-2 ring-focus-ring ring-offset-2`.
- Section headings: `text-xs font-semibold uppercase tracking-wide text-text-muted`, with `mt-3 mb-1 px-2` spacing (small vertical rhythm). Rendered as `<h2>` for screen-reader heading navigation.
- Container: `flex flex-col gap-1` within the nav (EP10C); sections separated by the heading's top margin.

**Section collapsibility — always-expanded (decided).**
- Sections are always expanded; no accordion, no toggle, no hidden items. Rationale: ADHD-friendly — all choices visible at all times; avoids extra interaction and state, and prevents routes being hidden behind a toggle. Rejected collapsible accordions (would hide routes and add animation/state).

**Section expand/collapse animation — none (decided).**
- No expand/collapse animation because sections are always expanded. The drawer's own open/close animation (backdrop opacity + panel translate, `duration-base ease-standard`) is unchanged (D10-11/D10-16). No new animation library.

**Drawer header — keep "Menu" title + close button (EP10C); identity lives in the Account section.**
- Drawer header unchanged: "Menu" (`text-lg font-semibold text-text`) + close button (`X`, `aria-label="Close menu"`). No avatar in the header. Identity (avatar + "Signed in as {name}") lives at the top of the Account section. Rationale: keeps the drawer header minimal and consistent with EP10C; identity grouped with account actions (context of use); avoids duplicating identity at the top and bottom of the drawer.

**Active highlighting in the drawer.**
- Active item: `text-accent font-semibold` + `aria-current="page"` (NavLink emits automatically; D10-13). Non-color cue = weight + `aria-current`. Items are `NavLink` with `end` so nested routes (e.g. `/courses/:id`) do not highlight the parent item.
- Section headings are labels only and are never active (not links). No group-trigger treatment on mobile (sections always expanded). Single links (Home, Dashboard) keep the same active treatment.
- Mobile links do not use the desktop underline (`border-b-2`); they use weight + color + `aria-current` (EP10C baseline `navLinkClass` mobile branch). Keep as EP10C.

**Reuse EP10C drawer behavior — unchanged.**
- Hamburger toggle, focus trap (Tab/Shift+Tab within drawer), scroll lock (`overflow: hidden` on `body`, restored on close), Escape close, route-change close, link-click close, focus restoration to the hamburger, backdrop + slide-in animation (`duration-base ease-standard`), reduced motion via global media query (D10-16). No new behavior. The grouped sections render inside the existing drawer container; the focus-trap `querySelectorAll(FOCUSABLE_SELECTOR)` still captures all focusables (including the new links).
- Drawer container: `role="dialog"`, `aria-modal="true"`, `aria-label="Primary navigation"`, `id="mobile-nav"`. Nav inside: `<nav aria-label="Primary">` (EP10C) now contains the sections.

**Reduced motion — token durations only (D10-16).**
- No new animation library; no component-level reduced-motion guards. Drawer transitions use existing `duration-base ease-standard`; item hover uses `duration-fast`. No section animation (none). Confirmed.

**Copy — section headings and item labels (same as desktop).**
- Section headings: "Academics", "Planning", "Account".
- Single links: "Home", "Dashboard".
- Academics items: "Semesters", "Courses", "Assignments".
- Planning items: "Calendar", "Availability".
- Account items: "Profile", "Availability", "Verify email", "Logout".
- Identity line: "Signed in as {name}" (truncated).
- Drawer header: "Menu"; close button aria-label "Close menu"; hamburger "Open menu"/"Close menu".
- Unauthenticated: "Login", "Get Started".
- No empty states (sections always contain at least their listed items; Verify email is conditional but the Account section still renders Profile/Availability/Logout).

**Tap targets ≥ 44px (D11-9).**
- Drawer links/buttons use `min-h-[44px]` (existing mobile branch). Hamburger/close meet 44px via Button `max-sm:min-h-[44px]`. Verified.

**Element decisions.**
- Reuse `NavLink` (react-router-dom) for single links and section items so `aria-current="page"` is emitted (D10-13); `end` matching preserved.
- Reuse `Link` for Verify email, Login, Get Started (EP10C baseline).
- Reuse `Button` for hamburger, close, Logout, Login, Get Started (EP10C baseline).
- Icons from `lucide-react`: add to the existing `Menu`, `X` import — `Home`, `LayoutDashboard`, `GraduationCap`, `CalendarRange`, `BookOpen`, `ClipboardList`, `CalendarDays`, `Calendar`, `Clock`, `User`, `MailCheck`, `LogOut` (same set as EP11A; mobile renders them at `h-5 w-5`).
- No new shared primitive; the grouped drawer is implemented inline in `widgets/header/ui/Header.tsx` (FSD), consuming the shared `navGroups`/`accountMenuItems` from EP11A (defined once). If EP11A extracts a `navGroups.ts`, import from there; otherwise define in the header module per EP11A's decision.
- Avatar initials logic reused from EP11A (first letter of `name` or email local part; fallback `User` icon).
- `Layout.tsx`, `ProtectedRoute`, `PublicRoute` untouched.

**Layout & hierarchy.**
- Mobile drawer interior (unchanged container): header row "Menu" + close; then `<nav aria-label="Primary">` containing Home link, Dashboard link, Academics section (heading + items), Planning section (heading + items); then divider + Account section (identity row + items) for authenticated users. For unauthenticated users: nav contains the Home link only, then divider + Login/Get Started below; no grouped/account sections.
- Desktop nav is untouched by this story (EP11A owns it). This story adapts only the mobile drawer. Responsive switch `md` unchanged.

**States.**
- No loading/empty/error states at shell level (EP10C baseline). Drawer open/closed is local component state. Verification-dependent item (Verify email) renders only when `!user.emailVerifiedAt`. The Account section always renders Profile/Availability/Logout, so no empty state.

**Accessibility.**
- Keyboard: drawer focus trap + Escape + route-change close (EP10C). Section headings are not focusable (labels only). All links/buttons focusable with the standard focus ring `focus-visible:ring-2 ring-focus-ring ring-offset-2`. Icons `aria-hidden`. `aria-current="page"` on the active item.
- Non-color distinction on active item: weight (semibold) + `aria-current` (D10-13 mobile branch).
- Reduced motion handled globally (D10-16).
- Skip link and landmarks unchanged (D10-14).
- Section headings exposed as `<h2>` for screen-reader heading navigation.

**Responsive.**
- `md` (768px) switch unchanged. Drawer is `md:hidden`. Desktop dropdowns (`hidden md:flex`/`hidden md:block`, EP11A) are not rendered on mobile. No duplicate surfaces.
- Container padding unchanged (`px-4 sm:px-6 lg:px-8`).

**Test cases to add/update.**
- `Header.test.tsx`:
  - Authenticated mobile drawer: grouped section headings "Academics", "Planning", "Account" present; identity row "Signed in as Ada Lovelace" + avatar initials present; items present (Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Profile).
  - Unauthenticated drawer: Home link + Login/Get Started; no "Academics"/"Planning"/"Account" headings and no identity row.
  - Account section contents by verification state: Verify email present when unverified, absent when verified.
  - Drawer behavior preserved: toggle, Escape, scroll lock, link-click close (existing tests).
  - Active `aria-current="page"` on the active item inside the drawer.
  - Responsive classes: drawer `md:hidden` (existing).
  - Verification: `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

### Unverified / for implementer

- Consume the shared `navGroups`/`accountMenuItems` from EP11A (do not duplicate); if EP11A's shape differs, adapt without drift.
- Preserve the EP10C focus trap `querySelectorAll(FOCUSABLE_SELECTOR)` behavior now that the drawer contains more links — no regression.
- Existing flat-link tests must be updated to the grouped structure while keeping behavior assertions.
- Ensure `NavLink` `end` matching is preserved so nested routes do not highlight the parent item.
- Section headings rendered as `<h2>` with the specified visual classes.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Not applicable — no new async states at shell level.
6. Keyboard accessibility + visible focus + drawer behavior preserved.
7. Responsive: drawer at < md, grouped sections render correctly on narrow screens.
8. Automated component tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP11 parent review.
11. Reviewer walkthrough — combined EP11 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** mobile drawer reorganized into grouped sections with icons + text and an Account section, reusing EP10C drawer behavior.
- **Request/token estimate:** ~1–2 requests/tokens — drawer section markup + account section + tests.
- **Model recommendation:** 2 — moderate markup/test updates; lower risk since drawer mechanism is reused.
- **Files:** `apps/web/src/widgets/header/ui/Header.tsx` (modify), `apps/web/src/widgets/header/ui/Header.test.tsx` (update).
- **Start context:** this story; EP11A implementation (shared nav-groups); EP10C story + implementation (`410c343`); `apps/web/src/widgets/header/ui/Header.tsx`; `apps/web/src/widgets/header/ui/Header.test.tsx`; shared nav contract in `docs/stories/EP11/README.md`.
- **Verification:** `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP11A implemented. Excludes desktop dropdowns (EP11A), token/primitive definitions (EP10A/EP10B), page adoption (EP10D–EP10G).

## UI/UX gaps for the `ui-refiner` (D11-3 — settled 2026-10-29)

- **Mobile grouping labels/ordering:** settled — Dashboard stays a standalone top item (Home, Dashboard, then Academics section, Planning section, then Account section); section headings are labels only. (D11-3, D11-4)
- **Account section:** settled — placement after primary groups with divider; identity row "Signed in as {name}" with avatar (initials) at top; Verify email conditional; Logout last with preceding divider. (D11-3, D11-6, D11-8)
- **Icon size/spacing:** settled — icons `h-5 w-5`, row `min-h-[44px]` + `gap-3`, section headings `text-xs font-semibold uppercase tracking-wide text-text-muted`, tap targets ≥ 44px. (D11-3, D11-5, D11-9)
- **Collapsibility:** settled — always-expanded (no accordion, no hidden choices); ADHD-friendly. (D11-3)
- **Animation:** settled — none for sections (always-expanded); drawer uses existing token durations (`duration-base ease-standard`); no new animation library. (D10-16, D11-3)
- **Drawer header:** settled — keep "Menu" title + close button (EP10C); identity lives in the Account section (no avatar in header). (D11-3)
- **Active highlighting:** settled — active item `text-accent font-semibold` + `aria-current="page"`; section headings are labels only (no group-trigger treatment on mobile). (D10-13, D11-3)
- **Copy:** settled — section headings "Academics"/"Planning"/"Account"; item labels same as desktop; "Signed in as {name}"; no empty states. (D11-3)
- **Reduced motion:** settled — token durations only; no new animation library or component-level guards. (D10-16, D11-3)