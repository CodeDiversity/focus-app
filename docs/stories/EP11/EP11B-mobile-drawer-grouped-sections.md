# EP11B: Mobile Drawer Grouped Sections & Account Section

**Story ID:** EP11B
**Title:** Frontend — mobile drawer grouped sections & account section (responsive + a11y)
**Parent epic:** [EP11: Navigation & Information Architecture (ADHD-friendly)](../../epics/EP11-navigation-and-information-architecture.md)
**Parent:** [EP11 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Ready
**Dependencies:** EP11A — **implemented and committed** (`b7ae794` feature, `1aec0ea` story-status docs; HEAD `a169743`). EP11A delivered `apps/web/src/widgets/header/ui/navGroups.ts` and the desktop consumption; the mobile drawer was intentionally left on the legacy flat `navLinks` list with a `// EP11B: replace with grouped rendering` marker. `ui-refiner` pass completed 2026-10-29 (D11-3).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (ui-refiner pass — mobile grouping labels/ordering, account section placement + identity row, icon size/spacing, collapsibility, drawer header, active highlighting, copy, tap targets, reduced motion settled); 2026-10-29 (technical-refine — EP11A baseline verified in code, exact drawer edits, shared-contract consumption, test matrix against the existing 22-case suite, risks)

## Summary

Adapt the existing EP10C mobile drawer to the grouped information architecture delivered by EP11A: render grouped sections with headings (Dashboard is a standalone top link; Academics and Planning are labeled sections) and an Account section, each entry showing an icon + text, reusing the EP10C drawer's focus trap, scroll lock, Escape, route-change-close, focus restoration and reduced-motion behavior unchanged. The shared `navGroups`/`accountMenuItems` data added by EP11A becomes the single source for both desktop and mobile, removing the legacy flat `navLinks` list and the EP11A placeholder marker.

## Description & bounded scope

### In scope

1. **Mobile drawer sections:** replace the flat `navLinks` list with grouped sections rendered from the already-exported `getNavGroups(isAuthenticated)` — Home and Dashboard render as single links; Academics and Planning render as labeled sections (heading + item links with icon + text). Sections are **always expanded** (no accordion).
2. **Account section:** render `visibleAccountItems` in a grouped Account section at the bottom of the drawer for authenticated users (identity row "Signed in as {name}" with avatar, Profile, Availability, Verify email when unverified, Logout), replacing the legacy inline auth area (`Hi, {name}` + verify link + Logout button).
3. **Unauthenticated drawer:** Home link + Login/Get Started buttons below the existing divider (no grouped sections, no Account section, no identity row), per EP10C baseline.
4. **Reuse EP10C drawer behavior:** focus trap, scroll lock, Escape close, route-change close, focus restoration, backdrop, slide-in animation, reduced motion — unchanged.
5. **Responsive correctness:** desktop dropdowns hidden on mobile; drawer hidden on desktop; no duplicate nav surfaces.
6. **Icons:** lucide icon component references from the shared contract (`h-5 w-5` in the drawer), `aria-hidden`, leading each label.
7. **Tests:** update `Header.test.tsx` for grouped mobile sections, region/heading structure, account section contents by verification state, active `aria-current`, tap-target/icon classes, and drawer behavior regressions.

### Out of scope

- Desktop dropdowns/account menu (EP11A — already implemented; do not modify its markup or behavior).
- Changes to `navGroups.ts` data/types (consume as-is; report drift instead of editing the contract in this story).
- Token definitions/primitives (EP10A/EP10B) and shell baseline (EP10C).
- Backend/API changes (D11-2).
- New routes.
- E2E/deployment changes; manual screen-reader evidence belongs to the combined EP11 review (TR-E11-03/04).

## Source requirement references

- **Epic AC-E11-01, AC-E11-02, AC-E11-04, AC-E11-05, AC-E11-06, AC-E11-07, AC-E11-08.**
- **Shared DoD** — items 1, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D11-1…D11-9, D10-8, D10-11…D10-16.

## Acceptance criteria

1. The authenticated mobile drawer renders grouped sections with headings (Academics, Planning, Account) and an Account section; Home and Dashboard render as standalone single links; every nav/account item shows an icon + text; the legacy flat link list is gone. Sections are always expanded (no toggle/`aria-expanded` on headings).
2. The Account section contains the identity row "Signed in as {name}" with an initials avatar (or `User` fallback), then Profile, Availability, Verify email only when `!user.emailVerifiedAt`, and Logout. Unauthenticated users instead see Home plus Login/Get Started below a divider, with no grouped/Account sections or identity row.
3. Drawer behavior from EP10C is preserved: opens/closes via hamburger, Escape closes and restores focus to the hamburger, focus trap still cycles within the drawer, body scroll lock is restored, closes on route change and on link click, backdrop/close-button close.
4. Responsive: the drawer wrapper remains `md:hidden`; desktop nav/dropdowns remain `hidden md:flex` and are not modified; no duplicate nav surface.
5. Accessibility: headed `<section>` regions (`aria-labelledby`), `<h2>` section headings that are labels only (not links, not focusable, no `aria-expanded`/`aria-haspopup`), `aria-current="page"` on the active item (including nested routes not marking the parent), `aria-hidden` icons, focus-visible rings, and ≥44px drawer rows.
6. Component tests cover grouped section/heading structure, account contents by verification state, active `aria-current`, icon/tap-target classes, and the preserved drawer behaviors; the existing header suite and full web suite pass.

## Tests to add / update

File: `apps/web/src/widgets/header/ui/Header.test.tsx` (existing: `describe('Header desktop grouped navigation (EP11A)')` — 17 cases — plus `describe('Header mobile drawer')` — 5 cases; 22 total). Keep the EP11A desktop cases unchanged and add a `describe('Header mobile drawer grouped sections (EP11B)')` block.

**Query rules (important — jsdom renders CSS-hidden desktop nav too):**

- Always scope drawer assertions: `const dialog = screen.getByRole('dialog', { name: 'Primary navigation' })`, then `within(dialog)`.
- Scope multi-name items by region: authenticated sections are `<section aria-labelledby=…>` → `within(dialog).getByRole('region', { name: 'Academics' })`, `'Planning'`, `'Account'`.
- `Availability` intentionally appears twice inside the drawer (Planning + Account, D11-8). Assert `within(dialog).getAllByRole('link', { name: 'Availability' })` has length 2 (or scope per region).
- Two controls are named "Close menu" while open (hamburger + drawer close button, pre-existing). Scope the drawer close button with `within(dialog)`.

Cases to add:

1. `renders grouped sections, headings, single links and the Account section for an authenticated user`
   - Open drawer; assert headings `Academics`, `Planning`, `Account` via `getByRole('heading', { level: 2, name })`.
   - Assert single links `Home` (`href="/"`) and `Dashboard` (`href="/dashboard"`) directly in the dialog.
   - Assert `Semesters`/`Courses`/`Assignments` inside the Academics region and `Calendar`/`Availability` inside the Planning region with the expected `href`s.
   - Assert the `Profile` link (`/profile`) and the `Logout` button inside the Account region; `Verify email` (`/verify-email`) present for the unverified `sessionUser`.
2. `renders Home and auth buttons with no grouped or Account sections when unauthenticated`
   - Open drawer; assert `Home` link; `within(dialog).getByRole('button', { name: 'Login' })` and `Get Started`.
   - Assert no `Academics`/`Planning`/`Account` headings, no region named `Account`, no "Signed in as" text, no `Logout`.
3. `shows Verify email only for an unverified user`
   - Unverified (default `sessionUser`): present in Account region.
   - Verified (`{ ...sessionUser, emailVerifiedAt: '2026-01-01T00:00:00.000Z' }`): absent; `Profile`/`Logout` still present.
4. `shows the identity row with avatar initials and name`
   - `within(accountRegion).getByText('Signed in as Ada Lovelace')`; avatar shows `A` (text query) and is `aria-hidden="true"`.
5. `marks the active drawer item with aria-current and keeps nested routes off the parent`
   - Render at `/semesters`, open drawer: `within(dialog).getByRole('link', { name: 'Semesters' })` has `aria-current="page"` and `text-accent`; `Dashboard`/`Courses` do not.
   - Render at `/courses/abc`: because every drawer item uses `NavLink end`, `Courses` does **not** get `aria-current` on the nested detail route (and no other item does); the drawer has no group-trigger active state (headings are plain `<h2>`). This is the settled D10-13 behavior, not a regression.
6. `keeps account actions out of the primary list and headings non-interactive`
   - Inside `within(dialog).getByRole('navigation', { name: 'Primary' })`: no `Profile` link, no `Verify email`; `Availability` appears once (Planning).
   - Assert `within(dialog).queryByRole('button', { name: 'Academics menu' })` / `'Planning menu'` are absent; headings have no `aria-expanded`.
7. `applies 44px rows and 20px aria-hidden icons in the drawer`
   - For a representative drawer link and the Logout button: `toHaveClass('min-h-[44px]')`; the row's `svg` has classes `h-5 w-5` and `aria-hidden="true"`.
8. `traps focus inside the drawer after the grouped sections were added`
   - Authenticated drawer: focus the last focusable (`Logout`), `await user.tab()`, assert focus wraps to `within(dialog).getByRole('button', { name: 'Close menu' })`.
   - This is the regression guard for the EP10C `querySelectorAll(FOCUSABLE_SELECTOR)` trap now that the drawer contains more links.

Cases to update/strengthen (existing):

- `closes the drawer when a nav link is clicked` — keep, but select the drawer `Dashboard` link via `within(dialog)` (currently filters by `dialog.contains`; both work).
- `closes the drawer on Escape and restores focus to the hamburger` — add `expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus()` after Escape (the title already claims restoration; EP10C behavior must stay).
- `opens and closes the drawer via the hamburger`, `locks body scroll while open and restores it on close`, `drawer contains auth actions on mobile` — keep as-is; they are the behavior regression baseline.
- Optional class assertion for responsiveness: after opening, `expect(dialog.parentElement).toHaveClass('md:hidden')` (jsdom cannot evaluate media queries; class assertion only).

Verification:

- `pnpm --filter web test -- src/widgets/header` (expect 1 file; the 22 existing cases — 2 strengthened — plus the new cases green)
- `pnpm --filter web typecheck` (strict + `noUnusedLocals`)
- `pnpm --filter web lint` (0 warnings, `--max-warnings 0`)
- `pnpm --filter web test` (full suite; baseline 67 files / 842 tests at EP11A)

## Technical notes

### Verified baseline (inspected 2026-10-29 at HEAD `a169743`, EP11A merged)

- `apps/web/src/widgets/header/ui/navGroups.ts` **exists** and already exports everything this story needs:
  - types `NavItem` (`id`, `label`, `icon: LucideIcon`, `to`), `NavSection` (`id`, `label`, `icon`, optional `to`, optional `items`), `AccountMenuItem` (`id`, `label`, `icon`, optional `to`, optional `action: 'logout'`, optional `requiresUnverified`);
  - data `authenticatedNavGroups` (Home → `/`, Dashboard → `/dashboard`, Academics → Semesters/Courses/Assignments, Planning → Calendar/Availability), `unauthenticatedNavGroups` (Home only), `getNavGroups(isAuthenticated)`, `accountMenuItems` (Profile → `/profile`, Availability → `/availability`, Verify email → `/verify-email` with `requiresUnverified`, Logout `action: 'logout'`).
  - Invariant documented in-file: a `NavSection` is either a single link (`to`) or a group (`items`), never both. Mobile must branch on the presence of `items`.
- `apps/web/src/widgets/header/ui/Header.tsx` already imports `accountMenuItems, getNavGroups, type AccountMenuItem, type NavItem, type NavSection` from `./navGroups`, and already computes:
  - `const navGroups = getNavGroups(isAuthenticated);` (desktop consumption);
  - `const name = user?.name || user?.email?.split('@')[0] || '';`
  - `const initials = (user?.name?.trim()[0] || user?.email?.split('@')[0]?.[0] || '').toUpperCase();`
  - `const visibleAccountItems = accountMenuItems.filter((item) => !item.requiresUnverified || !user?.emailVerifiedAt);`
  - `const showVerify = isAuthenticated && !user?.emailVerifiedAt;` — used **only** by the legacy drawer auth block, so it becomes unused after this change.
- The drawer (inside `{open && …}`) currently renders `navLinks` (flat, no icons) in `<nav aria-label="Primary" className="flex flex-col gap-1">`, then a `mt-4 … border-t … pt-4` auth area with `Hi, {name}`, conditional verify link, Logout (or Login/Get Started). Drawer wrapper is `fixed inset-0 z-50 md:hidden`; panel is `role="dialog" aria-modal="true" aria-label="Primary navigation" id="mobile-nav"`, with focus trap (`FOCUSABLE_SELECTOR`), body scroll lock, Escape, route-change close, focus restoration, slide-in + backdrop (`duration-base ease-standard`).
- `Header.test.tsx` currently has 22 cases total — 17 desktop EP11A cases plus 5 mobile drawer cases (toggle, Escape, link-click close, scroll lock, unauth auth actions). `setupUser()` (`apps/web/src/test/user.ts`) wraps `click`, `tab`, `keyboard`, etc. in `act`.
- `apps/web/tsconfig.json` sets `strict`, `noUnusedLocals`, `noUnusedParameters` — dead code is a typecheck failure, not a warning.
- `Button` (`apps/web/src/shared/ui/Button.tsx`) only guarantees 44px via `max-sm:min-h-[44px]` (i.e. < 640px), while the drawer is visible to < 768px. Do not rely on `Button` for drawer row height.
- Global reduced motion is handled in `apps/web/src/index.css` (`@media (prefers-reduced-motion: reduce)` zeroing transition durations). No new component-level guards.
- Routes are unchanged (`App.tsx`): `/`, `/dashboard`, `/semesters`, `/courses`, `/courses/:id`, `/assignments`, `/calendar`, `/availability`, `/profile`, `/verify-email`. `Layout.tsx` and the skip link are untouched.

### Exact edits — `apps/web/src/widgets/header/ui/Header.tsx`

1. **Delete the legacy list and marker.** Remove the `// EP11B: replace with grouped rendering…` comment, the `navLinks` const, and the now-unused `NavLinkItem` interface (line ~31). `noUnusedLocals` makes this mandatory.
2. **Delete `showVerify`** once the drawer uses `visibleAccountItems` (it has no other consumer). Keep `visibleAccountItems` for both desktop and drawer.
3. **Extend the drawer link classes** by adjusting `navLinkClass(isActive, mobile)` so mobile gets `gap-3`, `rounded-md`, `hover:bg-surface-muted`, without conflicting with the base `gap-2`:
   ```ts
   ('inline-flex items-center transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
     mobile
       ? 'min-h-[44px] w-full gap-3 rounded-md px-2 hover:bg-surface-muted'
       : 'gap-2 py-1 border-b-2',
     isActive
       ? 'text-accent font-semibold border-accent'
       : 'text-text-muted hover:text-text border-transparent');
   ```
   (Move `gap-2` out of the shared base so `gap-2`/`gap-3` are never emitted together. Desktop visuals stay identical.)
4. **Replace the flat `<nav>` body** with a branch on `section.items` (single link vs group). Required structure:
   - single link: `NavLink end` + `section.icon` at `h-5 w-5 shrink-0` + label, `onClick={() => setOpen(false)}`, `className={({ isActive }) => navLinkClass(isActive, true)}`.
   - group: a `<section key={section.id} className="flex flex-col gap-1">` with `aria-labelledby` pointing at `mobile-nav-{section.id}-heading`, containing an `<h2 id="mobile-nav-{section.id}-heading">` with classes `mt-3 mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted` and `{section.label}`, then `NavLink end` item rows with `h-5 w-5 shrink-0` icons and the same class function. No group icon in the heading (labels only, per ui-refiner).
   - IDs: use the `mobile-nav-*` prefix to avoid colliding with desktop `desktop-nav-*` IDs.
5. **Add the authenticated Account section** after `</nav>` (same scroll container), replacing the legacy `isAuthenticated` branch of the auth area:
   - Wrapper: `<section aria-labelledby="mobile-nav-account-heading" className="mt-4 flex flex-col gap-1 border-t border-border pt-4">`.
   - Heading: `<h2 id="mobile-nav-account-heading" className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Account</h2>` (visible; before the identity row).
   - Identity row: `<div className="flex items-center gap-3 px-2 py-1">` with `<span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">{initials || <User className="h-4 w-4" />}</span>` and `<span className="truncate text-sm text-text-muted">Signed in as {name}</span>`. (`User` is already imported; `text-sm` matches the desktop avatar and avoids the `text-body-sm` token's embedded 400 weight.)
   - `<div role="separator" className="my-1 border-t border-border" />` after the identity row.
   - Map `visibleAccountItems`: `Profile`/`Availability` → `NavLink end` + `navLinkClass(isActive, true)`; `verify-email` → `Link` + `navLinkClass(false, true)` (per settled decision; it is an action-ish destination, not a persistent tab); `logout` (`action === 'logout'`) → plain `<button type="button">` with `navLinkClass(false, true)` and `onClick={() => { setOpen(false); void logout(); }}`, preceded by another `role="separator"` divider, inside a keyed `Fragment`.
   - Rationale for a plain `<button>` instead of `Button`: `Button`'s 44px guarantee stops at 640px and its padding/variant styling would break row alignment; `navLinkClass(false, true)` gives the exact 44px icon+text row.
6. **Keep the unauthenticated branch** of the auth area (`Login`/`Get Started` full-width `Button`s inside `Link`s, `mt-4 … border-t … pt-4`, `onClick={() => setOpen(false)}`) unchanged.
7. **Do not touch**: hamburger, drawer header ("Menu" + close), focus-trap effect, route-change effect, body lock, backdrop, panel transition, desktop nav/account menu, `Layout.tsx`, routes.

Reference sketch (structure only — not verbatim production code):

```tsx
<nav aria-label="Primary" className="flex flex-col gap-1">
  {navGroups.map((section) => {
    const SectionIcon = section.icon;
    if (!section.items) {
      return (
        <NavLink
          key={section.id}
          to={section.to ?? '/'}
          end
          onClick={() => setOpen(false)}
          className={({ isActive }) => navLinkClass(isActive, true)}
        >
          <SectionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {section.label}
        </NavLink>
      );
    }
    const headingId = `mobile-nav-${section.id}-heading`;
    return (
      <section key={section.id} aria-labelledby={headingId} className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="mt-3 mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted"
        >
          {section.label}
        </h2>
        {section.items.map((item) => {
          const ItemIcon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) => navLinkClass(isActive, true)}
            >
              <ItemIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </section>
    );
  })}
</nav>
```

### Settled UI decisions (ui-refiner, 2026-10-29) — carried forward

- **Ordering:** Home (single link), Dashboard (single link), Academics section (heading + Semesters/Courses/Assignments), Planning section (heading + Calendar/Availability), divider, Account section (identity row + Profile/Availability/Verify email when unverified/Logout). Dashboard stays standalone and is not folded into a section. Sections always expanded; no accordion and no expand/collapse animation.
- **Headings:** labels only — not links, not focusable, no `aria-expanded`/`aria-haspopup`; `<h2>`; `text-xs font-semibold uppercase tracking-wide text-text-muted`, `mt-3 mb-1 px-2` for nav groups.
- **Account section:** bottom region, separated by `border-t border-border` (`mt-4 pt-4`); visible "Account" heading; identity row (`flex items-center gap-3`, circular initials avatar `w-8 h-8 rounded-full bg-accent text-white`, "Signed in as {name}" truncated `text-sm text-text-muted`, `User` fallback); divider before the items; divider before Logout — mirrors the desktop account menu.
- **Rows:** icon `h-5 w-5` (`aria-hidden`), `gap-3`, `min-h-[44px]`, `px-2`, `w-full`, `rounded-md`; hover `bg-surface-muted`; active `text-accent font-semibold`; focus ring `focus-visible:ring-2 ring-focus-ring ring-offset-2`. Tap targets ≥44px (D11-9).
- **Active state:** `NavLink end` emits `aria-current="page"`; mobile rows use weight + color + `aria-current` (no desktop underline); no active treatment on section headings; single links keep the same treatment.
- **Drawer header:** unchanged "Menu" + close button (`X`, `aria-label="Close menu"`); identity lives only in the Account section.
- **Unauthenticated:** Home + Login/Get Started below the divider; no grouped sections/Account/identity.
- **Reduced motion:** no section animation; existing drawer transitions use token durations (`duration-base ease-standard`, hover `duration-fast`); global media query handles reduction; no new animation library or guards.
- **Copy:** headings "Academics"/"Planning"/"Account"; links "Home"/"Dashboard"/"Semesters"/"Courses"/"Assignments"/"Calendar"/"Availability"; account "Profile"/"Availability"/"Verify email"/"Logout"; "Signed in as {name}"; "Menu"; "Close menu"; "Login"/"Get Started". No empty states (Verify email is the only conditional item).
- **Availability appears twice by design** (Planning canonical + Account shortcut, D11-8); do not deduplicate in this story.

### Decisions (technical-refine, 2026-10-29)

1. **Contract consumption:** import `{ getNavGroups, accountMenuItems }` (and the `NavSection`/`AccountMenuItem` types if needed for helpers) from `./navGroups`; reuse the existing `navGroups` const in `Header.tsx` for both desktop and drawer. Do not re-declare nav data, and do not edit `navGroups.ts` in this story.
2. **Conditional account items:** use the existing `visibleAccountItems` (filters `requiresUnverified`) rather than re-implementing `showVerify`; delete `showVerify` to satisfy `noUnusedLocals`.
3. **Dead-code removal:** remove `navLinks`, `NavLinkItem`, and the EP11B marker comment. Leaving any of them fails `typecheck` (unused) or leaves the placeholder the acceptance criteria forbid.
4. **Group vs single branch:** branch on `section.items` (not `section.id`/`section.to`), matching the contract invariant, so the drawer stays data-driven if EP11A later adds groups.
5. **Region markup:** each group is a `<section aria-labelledby>` with an `<h2 id>` inside the drawer `<nav>`; this gives screen-reader heading/region navigation and lets tests scope the duplicate `Availability` link without brittle index queries.
6. **Verify email rendering:** `Link` (not `NavLink`) per the settled element decision; Profile/Availability remain `NavLink end` so they can show the active state.
7. **Logout rendering:** plain `<button type="button">` styled with `navLinkClass(false, true)` (44px row, icon + text), not `Button`. `Button`'s `max-sm` 44px threshold stops at 640px while the drawer runs to 768px, and its variant padding breaks row alignment. Logout still closes the drawer before calling `void logout()`.
8. **Identity row text:** avatar uses `text-sm font-semibold` (matching the desktop avatar) instead of `text-body-sm`, whose token tuple includes `font-weight: 400`; identity text stays `text-sm text-text-muted truncate`. Avatar is `aria-hidden` because the adjacent text carries the identity.
9. **Accessible label collision:** the drawer deliberately contains two `Availability` links and (while open) two "Close menu" controls (hamburger + drawer close). This is pre-existing/D11-8 behavior; tests must scope with `within(dialog)`/regions. Do not add `aria-label` overrides in this story (would change settled copy).
10. **Test scoping:** because the desktop nav is only CSS-hidden in jsdom, every drawer assertion must be scoped to the dialog (or a named region); global `getByRole('link', { name: 'Home' | 'Dashboard' })` would match both surfaces while the drawer is open.
11. **No new files / no extraction:** keep the grouped rendering inline in `Header.tsx` (matching EP11A's inline approach); no new primitive, hook, or `navGroups` change.
12. **Responsive testability:** jsdom does not evaluate media queries, so responsiveness is asserted via the existing `md:hidden` wrapper class only; real breakpoints remain covered by the combined manual review.

### Risks / open questions (none blocking)

- **Shared contract drift:** if the implementer needs a new field (e.g. a per-item mobile label), that is a contract change owned by EP11A/planner — stop and flag rather than editing `navGroups.ts` here.
- **Duplicate accessible names** (`Availability` ×2, "Close menu" ×2 while open) are accepted per D11-8/EP10C; a screen reader hears Availability twice. If that becomes undesirable, it is a planner-level decision, not an EP11B edit.
- **`<h2>` heading order** inside the dialog starts at level 2 (nav headings), while the legacy drawer header is a `<span>`. This matches the settled ui-refiner decision; no `h1` is introduced in the drawer.
- **Focus trap order:** the trap's `FOCUSABLE_SELECTOR` now covers 11–12 focusables (drawer close, Home, Dashboard, section items, account items, Logout); the first is the drawer close button and the last is Logout (authenticated) or Get Started (unauthenticated). Do not reorder the drawer header or account section in a way that leaves an unfocusable last element.
- **`aria-controls="mobile-nav"`** points at an element that only exists while open (pre-existing EP10C behavior). Not changed here; do not "fix" it as part of this story.
- **Desktop regression guard:** the desktop render path must remain behaviorally identical; the 17 EP11A desktop cases in the same file are the guard. Reusing the same `navGroups` const does not mutate it.
- **No manual browser/screen-reader evidence** is produced by this story; TR-E11-03/04 remain part of the combined EP11 parent review.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Not applicable — no new async states at shell level.
6. Keyboard accessibility + visible focus + drawer behavior (trap, Escape, restoration) preserved.
7. Responsive: drawer at < md, grouped sections render correctly on narrow screens; desktop dropdowns unchanged.
8. Automated component tests pass (new grouped cases + existing header/full web suite).
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP11 parent review.
11. Reviewer walkthrough — combined EP11 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized. (Tracker description reconciliation, if the key is later created, is a planner/jira-sync action — this story file stays the source of truth.)

## Sizing

- **Outcome:** the mobile drawer renders the shared grouped nav contract (single links + labeled Academics/Planning sections) and an Account section with identity + account actions, with EP10C drawer behavior and desktop surfaces unchanged.
- **Request/token estimate:** ~1–2 requests/tokens — replace one drawer block, extend one class helper, update/extend `Header.test.tsx`; low uncertainty because the contract and drawer mechanism already exist.
- **Model recommendation:** 2 — moderate markup/test work; main care points are duplicate-name test scoping and the focus-trap regression, not new interaction logic.
- **Files:** `apps/web/src/widgets/header/ui/Header.tsx` (modify), `apps/web/src/widgets/header/ui/Header.test.tsx` (update/extend). No new files; `navGroups.ts`, `Layout.tsx`, `App.tsx` unchanged.
- **Start context:** this story; `apps/web/src/widgets/header/ui/navGroups.ts` (contract); `apps/web/src/widgets/header/ui/Header.tsx` (EP11A baseline + legacy drawer); `apps/web/src/widgets/header/ui/Header.test.tsx`; EP11A implementation record `./artifacts/EP11A/implementation.md`; shared nav contract in the parent README; EP10C drawer baseline (focus trap/scroll lock/Escape/route-close). Do not read unrelated epic stories.
- **Verification:** `pnpm --filter web test -- src/widgets/header`; `pnpm --filter web typecheck`; `pnpm --filter web lint`; `pnpm --filter web test` (full suite).
- **Dependencies / exclusions:** EP11A implemented (`b7ae794`, `1aec0ea`). Excludes desktop dropdowns (EP11A), token/primitive definitions (EP10A/EP10B), page adoption (EP10D–EP10G), `navGroups.ts` contract changes, and manual accessibility evidence (combined EP11 review).

## UI/UX gaps for the `ui-refiner` (D11-3 — settled 2026-10-29)

- **Mobile grouping labels/ordering:** settled — Home, Dashboard, Academics section, Planning section, Account section; headings are labels only. (D11-3, D11-4)
- **Account section:** settled — bottom placement with divider; "Account" heading + identity row "Signed in as {name}" with avatar; Profile/Availability/Verify email (conditional)/Logout with a divider before Logout. (D11-3, D11-6, D11-8)
- **Icon size/spacing:** settled — `h-5 w-5`, `gap-3`, `min-h-[44px]` rows, heading typography as specified; tap targets ≥44px. (D11-3, D11-5, D11-9)
- **Collapsibility:** settled — always expanded; no accordion, no hidden choices. (D11-3)
- **Animation:** settled — none for sections; existing drawer token durations only; no new animation library. (D10-16, D11-3)
- **Drawer header:** settled — "Menu" + close button unchanged; identity only in the Account section. (D11-3)
- **Active highlighting:** settled — active item `text-accent font-semibold` + `aria-current="page"`; headings never active. (D10-13, D11-3)
- **Copy:** settled — headings/links/account labels/"Signed in as {name}"/no empty states. (D11-3)
- **Reduced motion:** settled — token durations only; no component-level guards. (D10-16, D11-3)
