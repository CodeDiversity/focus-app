# EP10C implementation record

**Story:** [EP10C-app-shell-refresh.md](../../EP10C-app-shell-refresh.md)
**Implemented:** 2026-10-29 (single implementer pass; frontend only; app shell refresh)
**Baseline HEAD before changes:** `9a88d9c` (EP10B)
**Parent:** EP10 breakdown; combined EP10 parent review after all seven children.

## Changed paths

Production:
- `apps/web/src/widgets/header/ui/Header.tsx` — token-driven header: 64px single row, `max-w-7xl` container, 40px solid-accent rounded logo square with white "S" + "StudyPilot" wordmark; desktop nav via `NavLink` with `aria-current="page"` and active styling (`text-accent font-semibold` + `border-b-2 border-accent`); desktop auth area (Hi name, conditional "Verify email" link, Logout); mobile hamburger + right-side slide-in drawer (`#mobile-nav`, focus trap, Escape, scroll lock, restore focus, route-change/link-click close) containing nav + auth actions.
- `apps/web/src/widgets/layout/ui/Layout.tsx` — skip-to-content link (`href="#main-content"`), landmarks (`<header>` via Header, `<nav aria-label="Primary">`, `<main id="main-content" tabIndex={-1}>`), `EmailVerificationBanner` rendered inside `<main>`.

Tests:
- `apps/web/src/widgets/header/ui/Header.test.tsx` — updated active-highlight assertions to `text-accent`/`aria-current`; added mobile drawer tests (toggle, Escape, link-click close, scroll lock, auth actions in drawer).
- `apps/web/src/widgets/layout/ui/Layout.test.tsx` — new; skip link + landmarks.
- `apps/web/src/widgets/email-verification-banner/ui/EmailVerificationBanner.test.tsx` — updated expected verify link name to "Verify email" (copy change per D10-15).

Docs:
- `docs/stories/EP10/artifacts/EP10C/checkpoint.md`
- `docs/stories/EP10/artifacts/EP10C/implementation.md` (this file)
- `docs/stories/EP10/EP10C-app-shell-refresh.md` (Status → Implemented)
- `docs/stories/EP10/README.md` (queue row EP10C → Implemented)

No backend/API changes. No page adoption (EP10D–G untouched). `ProtectedRoute`/`PublicRoute` untouched.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Header/layout/nav use semantic tokens and refreshed primitives | **PASS.** Button primitive reused; semantic tokens (surface, border, text, accent, focus-ring); no gradient. | Component files |
| 2 Desktop nav + mobile drawer usable & keyboard-operable with visible focus | **PASS.** NavLink focus rings; drawer focus trap + Escape + Tab cycling; hamburger/close buttons focusable. | Tests + manual |
| 3 Auth entries + logout behave as before | **PASS.** Auth state branching preserved; logout calls useAuth().logout; verify link conditional on `!emailVerifiedAt`. | Header.test + EmailVerificationBanner.test |
| 4 Skip-to-content + landmarks (D10-14) | **PASS.** Skip link first focusable, `href="#main-content"`; `<header>`/`<nav aria-label="Primary">`/`<main id="main-content" tabIndex={-1}>`. | Layout.test |
| 5 Reduced motion respected | **PASS.** Drawer transitions use `duration-base ease-standard`; global reduced-motion media query zeroes durations; no component-level guards or animation libs. | index.css + Header |
| 6 Component tests cover nav rendering/keyboard, mobile drawer toggle, skip link; existing tests pass | **PASS.** 67 test files / 829 tests green. | Test run |

## Verification

- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web lint` — exit 0.
- `pnpm --filter web format` — all files use Prettier code style.
- `pnpm --filter web build` — exit 0 (1607 modules).
- `pnpm --filter web test` — 67 files / 829 tests, exit 0.
- `pnpm --filter web test -- src/widgets` — 4 files / 27 tests, exit 0.

## DoD mapping

1 Functional criteria — pass. 2 — n/a (no new input). 3 — n/a (no data). 4 — n/a (no API). 5 Loading/empty/error preserved in pages — pass (shell adds none). 6 Keyboard a11y + focus + skip link + landmarks — pass. 7 Responsive desktop + mobile drawer — pass. 8 Automated tests — pass. 9 — n/a. 10/11 — combined EP10 parent review.

## Findings and deviations

- F-C-1: Header test's mobile auth-actions assertion initially ambiguous because desktop auth area remains in the DOM (CSS-hidden). Adjusted test to query within the drawer dialog. (Test-only; no functional change.)
- F-C-2: Verify-email link copy changed from "Email verification" to "Verify email" per D10-15; updated `EmailVerificationBanner.test.tsx` expected link name accordingly. (Copy change per settled decision.)
- Findings/deviations otherwise: None.

## Status

Implemented — awaiting parent review.