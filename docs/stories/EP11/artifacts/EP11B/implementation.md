# EP11B implementation record

**Story:** [EP11B-mobile-drawer-grouped-sections.md](../../EP11B-mobile-drawer-grouped-sections.md)
**Implemented:** 2026-11-01 (single implementer pass; frontend only; mobile drawer grouped sections + Account section)
**Baseline HEAD before changes:** `c4aa040` (EP11A implemented + plan-review pass 2 `Plan Ready`); unit baseline `3853aaa`
**Parent:** EP11 breakdown; combined index [artifacts/EP11/implementation.md](../EP11/implementation.md); combined EP11 parent review next.
**Scope:** replace the legacy flat `navLinks` drawer block with data-driven grouped rendering from `getNavGroups(isAuthenticated)` + drawer Account section, reusing EP10C drawer behavior. Desktop behavior, `navGroups.ts` contract content, routes and backend untouched.

## Changed paths

Production:

- `apps/web/src/widgets/header/ui/Header.tsx` — deleted the legacy `navLinks` const, `NavLinkItem` interface, EP11B marker comment and `showVerify` (dead after `visibleAccountItems` consumption; `noUnusedLocals`); `navLinkClass` mobile branch extended (`gap-3 rounded-md hover:bg-surface-muted` added, `gap-2` moved to the desktop branch so gap classes never collide; desktop output unchanged); drawer `<nav aria-label="Primary">` now renders from `getNavGroups(isAuthenticated)` branching on `section.items`: single links (Home, Dashboard) as `NavLink end` icon rows; groups (Academics, Planning) as `<section aria-labelledby="mobile-nav-{id}-heading">` regions with `<h2>` label-only headings and `NavLink end` item rows (icon `h-5 w-5 shrink-0 aria-hidden`, `onClick` closes the drawer); Planning renders the ratified EP06F `Plan` (`/plan`) entry — **removes the pre-existing one-surface drift (legacy drawer lacked `/plan`; desktop/drawer parity restored per plan-review PR-001)**. New authenticated Account section after `</nav>`: `aria-labelledby="mobile-nav-account-heading"`, `<h2>Account</h2>`, identity row (aria-hidden initials avatar with `User` fallback + "Signed in as {name}"), `role="separator"` dividers, then `visibleAccountItems`: Profile/Availability as `NavLink end` (active state), Verify email as `Link` (conditional, settled element decision), Logout as plain 44px `navLinkClass(false, true)` `<button>` preceded by a separator, closing the drawer before `void logout()`. Unauthenticated branch (Login/Get Started full-width buttons below the divider) unchanged. EP10C drawer mechanism (focus trap, scroll lock, Escape, route-change close, focus restore, backdrop, slide-in, drawer header) untouched.

Tests:

- `apps/web/src/widgets/header/ui/Header.test.tsx` — new `describe('Header mobile drawer grouped sections (EP11B)')` with 8 cases per the story matrix: (1) grouped structure incl. **`Plan` `href="/plan"` inside the Planning region** + `md:hidden` wrapper class, (2) unauthenticated drawer (Home + Login/Get Started, no groups/Account/identity/Logout), (3) Verify email by verification state, (4) identity row + aria-hidden `A` avatar, (5) `aria-current` on active drawer item + nested-route negative (zero `aria-current` in drawer at `/courses/abc`), (6) account actions out of the primary `<nav>` + **D11-8 duplicate `Availability` pair asserted deliberately** (1 in nav, 2 in dialog) + non-interactive headings, (7) `min-h-[44px]` rows + `h-5 w-5` `aria-hidden` icons, (8) focus-trap wrap guard (**13 authenticated focusables**, last = Logout, Tab wraps to the drawer Close button). Existing cases: `closes the drawer when a nav link is clicked` strengthened to `within(dialog)` scoping; `closes the drawer on Escape…` strengthened with the hamburger focus-restore assertion; the other 3 drawer cases and all 17 EP11A desktop cases kept **unmodified** (desktop regression guard).

Docs:

- `docs/stories/EP11/artifacts/EP11B/checkpoint.md`
- `docs/stories/EP11/artifacts/EP11B/implementation.md` (this file)
- `docs/stories/EP11/artifacts/EP11/implementation.md` (combined parent index — EP11B owns it per the README review-unit table)
- `docs/stories/EP11/EP11B-mobile-drawer-grouped-sections.md` — Status
- `docs/stories/EP11/README.md` — queue row + active/next fields

No changes to `navGroups.ts`, `App.tsx` routes, `Layout.tsx`, desktop nav/account-menu markup, tokens, primitives, or anything backend/API.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Grouped sections with headings + Account section; Home/Dashboard standalone; icon + text everywhere; legacy flat list gone; always expanded | **PASS.** `navLinks`/`NavLinkItem` deleted; drawer renders from `getNavGroups`; headings are label-only `<h2>`; no toggles or `aria-expanded` on headings. | test 1, 6 |
| 2 Account section (identity row, Profile, Availability, conditional Verify email, Logout); unauthenticated = Home + Login/Get Started only | **PASS.** Legacy `Hi, {name}`/verify/Logout block replaced by the Account section; `visibleAccountItems` drives the conditional. | tests 1, 2, 3, 4 |
| 3 EP10C drawer behavior preserved (open/close, Escape + restore, trap, scroll lock, route-change/link close, backdrop) | **PASS.** Mechanism untouched; 5 existing behavior cases green (2 strengthened), plus new trap guard at 13 focusables. | existing drawer cases + test 8 |
| 4 Responsive: drawer wrapper `md:hidden`; desktop surfaces unmodified | **PASS.** Wrapper class asserted (jsdom cannot evaluate media queries — settled limitation); desktop drawer regression cases + 17 desktop cases green unmodified. | test 1, EP11A describe |
| 5 Accessibility: headed `<section>` regions, label-only headings, `aria-current` (nested routes excluded), `aria-hidden` icons, focus rings, ≥44px rows | **PASS.** Region-scoped queries; `NavLink end` semantics; row/icon classes asserted; focus-ring classes shared with the untouched base. | tests 1, 5, 6, 7 |
| 6 Component tests cover structure/contents/active/classes/behaviors; header + full web suite pass | **PASS.** Header 30/30; full web suite 100 files / 1140 tests green at tested HEAD (below). | verification |

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app` (implementer-executed, 2026-11-01; tested tree = `c4aa040` + the committed EP11B diff — code/test state identical to HEAD `8b7cd6a`; the lint-staged pre-commit hook was verified to leave the tested content unchanged):

- `pnpm --filter web test -- src/widgets/header` — 1 file / **30 tests passed** (22 existing — 2 strengthened — + 8 new), exit 0. Re-run after the code commit: 30/30 green at HEAD `8b7cd6a`.
- `pnpm --filter web typecheck` — exit 0 (`strict` + `noUnusedLocals`; dead-code removal mandatory and done).
- `pnpm --filter web lint` — exit 0 (`--max-warnings 0`).
- `pnpm --filter web test` — 100 files / **1140 tests passed**, exit 0. Gate per plan-review PR-005: **green at current HEAD**, not the dated 842 count (842 was the EP11A-era count; EP06F added tests between `3853aaa` and HEAD; 1140/1140 green is the honest current figure).

Not run: manual browser/screen-reader pass — TR-E11-03/04 executed evidence (keyboard traversal, screen-reader spot check incl. the duplicate `Availability` naming, emulated reduced motion, 320–375px check, PR-004 outside-click focus negative) remains with the combined EP11 parent review. No DoD 10/11 claim.

## Decisions followed

- D11-4 as ratified: Planning = Calendar/Availability/**Plan** consumed as-is from `navGroups.ts` — expected contract consumption, not drift (PR-001); no contract edit, no stop-and-flag trigger (no new fields were needed).
- D11-8 keep-both: `Availability` renders twice (Planning + Account); asserted 1-in-nav / 2-in-dialog rather than deduplicated.
- D11-5 lucide icons + text at `h-5 w-5 aria-hidden`; D11-9 `min-h-[44px]` rows (own class, not `Button`'s `max-sm` threshold) and shared focus-ring classes.
- D11-7: EP10C drawer reused unchanged — focus trap, scroll lock, Escape, route-change close, focus restore, drawer header; no new animation, token durations only.
- Story "Exact edits" followed element-for-element: heading ids `mobile-nav-*`; Verify email as `Link`; Logout as plain `<button type="button">`; avatar `text-sm font-semibold` with `initials || User` fallback; separators after identity row and before Logout; no new files or extraction.

## Findings and deviations

- **F-B-1 (fixed, formatting-only):** the two initial new-case lines violated `prettier/prettier` line-wrapping in `Header.test.tsx`; fixed via `eslint --fix` on the same file before commit; no assertion semantics changed; lint then clean at `--max-warnings 0`.
- **F-B-2 (verified non-issue):** the repo's lint-staged pre-commit hook re-runs `eslint --fix`/`prettier --write` on staged files; post-commit check confirmed the committed tree is identical to the tested working tree (`git diff HEAD -- apps/web` empty) and the header suite re-ran 30/30 at HEAD `8b7cd6a`.
- **One-surface parity outcome (expected, recorded per PR-001):** the drawer now exposes `Plan` (`/plan`) for the first time — the legacy flat list never had it. This is the merged outcome the corrected story predicts (risk bullet "Live one-surface drift today"), not scope creep.
- Findings/deviations otherwise: None. No backend/API changes (AC-E11-08); no `navGroups.ts` edit; no new contract fields.

## Status

Implemented — awaiting parent review. Combined index: [artifacts/EP11/implementation.md](../EP11/implementation.md).
