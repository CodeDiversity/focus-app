# EP11A implementation record

**Story:** [EP11A-desktop-grouped-navigation-and-account-menu.md](../../EP11A-desktop-grouped-navigation-and-account-menu.md)
**Implemented:** 2026-10-29 (single implementer pass; frontend only; desktop navigation + account menu)
**Baseline HEAD before changes:** `3853aaa`
**Parent:** EP11 breakdown; combined EP11 parent review after EP11B.
**Scope:** desktop grouped navigation, account/user menu, shared nav contract. EP11B (mobile drawer grouped sections) was **not** started.

## Changed paths

Production:

- `apps/web/src/widgets/header/ui/navGroups.ts` (**new**) — typed `NavItem`, `NavSection`, `AccountMenuItem`; `authenticatedNavGroups` (Home, Dashboard, Academics → Semesters/Courses/Assignments, Planning → Calendar/Availability), `unauthenticatedNavGroups` (Home), `getNavGroups(isAuthenticated)`, `accountMenuItems` (Profile, Availability, Verify email `requiresUnverified`, Logout action). Icons are `LucideIcon` component references; Availability is documented as canonical in Planning and repeated as the account-menu shortcut (D11-8).
- `apps/web/src/widgets/header/ui/Header.tsx` — desktop nav now renders single links (Home, Dashboard) with icons and `NavLink end` active styling, plus Academics/Planning button-triggered dropdowns; account avatar trigger (initials, `User` fallback) opens the account menu with “Signed in as {name}”, Profile, Availability, conditional Verify email, Logout. One `openMenu` state enforces single-open. `useMenuFocus` provides first/last focus on open, ArrowUp/Down wrapping, Home/End, Escape close + trigger restore, Tab close without restore. Outside `mousedown` closes and restores the trigger. `aria-expanded`, `aria-haspopup="menu"`, `role="menu"`/`role="menuitem"`; group triggers use prefix matching for accent + semibold active state. Panels `z-40`, semantic tokens only, token durations (global reduced-motion zeros them). Mobile drawer markup/behavior retained with the legacy flat `navLinks` list marked for EP11B.

Tests:

- `apps/web/src/widgets/header/ui/Header.test.tsx` — rewritten for EP11A: grouped nav by auth state, menu semantics/open via click, single-open, outside click, Escape + focus restore, Enter/Space toggle, ArrowDown/ArrowUp open focus, ArrowUp/Down/Home/End cycling, Enter/Space activation, Tab close without restore, account menu contents by verification state, account-menu keyboard, active item `aria-current`, nested-route group-trigger highlight, single-link active treatment, Home for authenticated users; mobile drawer regressions retained.
- `apps/web/src/pages/forgot-password/ui/ForgotPasswordPage.test.tsx`, `apps/web/src/pages/reset-password/ui/ResetPasswordPage.test.tsx`, `apps/web/src/pages/verify-email/ui/VerifyEmailPage.test.tsx`, `apps/web/src/widgets/email-verification-banner/ui/EmailVerificationBanner.test.tsx` — assertions that referenced the removed inline desktop Logout/Verify email controls now assert the account-menu trigger or open the account menu (`Logout`/`Verify email` menuitems).

Docs:

- `docs/stories/EP11/artifacts/EP11A/checkpoint.md`
- `docs/stories/EP11/artifacts/EP11A/implementation.md` (this file)
- `docs/stories/EP11/EP11A-desktop-grouped-navigation-and-account-menu.md` — Status → Implemented — awaiting parent review
- `docs/stories/EP11/README.md` — queue row/active/next fields

No backend/API, route, `Layout.tsx`, `ProtectedRoute`, `PublicRoute`, token, or primitive changes.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Grouped desktop nav: Home + Dashboard single links; Academics/Planning dropdowns with icon + text; flat links no longer inline | **PASS.** `navGroups.ts` is the single source; desktop renders 2 links + 2 triggers; group children are unmounted until opened. | `Header.test.tsx` grouped-nav and open/menu tests |
| 2 Account menu: “Signed in as {name}”, Profile, Verify email when unverified, Logout; inline desktop auth cluster removed; Availability in Planning and account menu | **PASS.** Inline welcome/verify/Logout removed from desktop; avatar menu replaced it; Availability present in both surfaces. | account-menu content tests (verified/unverified) |
| 3 Click/keyboard open-close, Enter/Space, Escape, arrows, focus entry/restoration, `aria-expanded`/`aria-haspopup`/`role="menu"` | **PASS.** Single-open `openMenu`, outside mousedown, `useMenuFocus` (open→first/last, cycle/wrap, Home/End, Escape restore, Tab close-no-restore), Space/Enter activation. | dropdown keyboard/focus/outside-click tests |
| 4 Active highlighting: item `aria-current="page"` + active styling; group trigger accent + semibold when child route active | **PASS.** `NavLink end` for items; prefix match for group trigger; single links keep underline treatment. | active item/group/single-link tests |
| 5 No functional regression: routes reachable; auth behavior unchanged; skip link/landmarks unchanged | **PASS.** No route or auth-flow changes; `Layout.tsx` untouched; full web suite green. Mobile drawer behavior unchanged (legacy flat list). | full suite; unchanged drawer tests |
| 6 Component tests cover grouped nav by auth state, dropdown open/close + keyboard, account menu, active `aria-current`; existing tests pass | **PASS.** 22 header tests; 842 total web tests pass. | verification below |

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app`

- `pnpm --filter web test -- src/widgets/header` — 1 file / **22 tests passed**, exit 0.
- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web lint` — exit 0 (0 warnings; Prettier rule clean).
- `pnpm --filter web test` — 67 files / **842 tests passed**, exit 0 (baseline 829 tests; new/rewritten header cases + adapted page/banner assertions).

Not run: manual browser/screen-reader pass; TR-E11-03/04 manual accessibility evidence remains part of the combined EP11 parent review. No browser screenshots taken.

## Decisions followed

- Single `openMenu: 'academics' | 'planning' | 'account' | null` state (Decision 3); menus unmounted when closed.
- Tab out closes without focus restoration; Escape/outside click/item selection restore the trigger (Decision 5).
- `NavLink end` for item active state; group trigger prefix match for its own styling; no `aria-current` on the button trigger.
- Space activation on link menu items via `preventDefault` + `click()`; Enter handled the same way for deterministic keyboard activation.
- Account trigger initials from name/email, `User` fallback; panel right-aligned; dividers after the identity line and before Logout.
- Mobile drawer intentionally keeps the legacy flat list (Decision 2) and is behaviourally unchanged; EP11B owns grouped drawer sections.

## Findings and deviations

- **F-A-1 (fixed, test-only):** First test run showed menu focus entry did not run on open because the focus effect's dependency list omitted `open`. Fixed by passing `open` into `useMenuFocus` and gating/triggering the layout effect on it; header tests then 22/22.
- **F-A-2 (fixed):** `eslint` required `tabIndex={-1}` on both `role="menu"` panels and `useCallback` for `closeMenu` (exhaustive-deps). Applied; lint clean with `--max-warnings 0`.
- **F-A-3 (fixed, expected consequence):** Four existing page/widget test files asserted the removed inline header `Logout` button / `Verify email` link. Updated them to assert the account trigger or open the account menu; no production behavior beyond the intended EP11A change.
- Findings/deviations otherwise: None. No backend/API changes (AC-E11-08). Mobile drawer not modified (EP11B not started).

## Status

Implemented — awaiting parent review.
