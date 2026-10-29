# EP10C: App Shell Refresh

**Story ID:** EP10C
**Title:** Frontend — app shell refresh (header, layout, navigation)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Implemented — awaiting parent review
**Dependencies:** EP10B (primitives it composes).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning; ui-refiner pass — mobile nav, header density/logo/active-link, skip link/landmarks, auth area, reduced motion settled)

## Summary

Refresh the app shell — header, layout, and navigation — to the token system, keeping desktop and mobile usable and keyboard-operable. Mobile navigation is a right-side slide-in drawer (D10-11); the header gains a skip-to-content link and proper landmarks (D10-14). This is the last primitive-level story before page adoption.

## Description & bounded scope

### In scope

1. **Header** (`apps/web/src/widgets/header/ui/Header.tsx`): logo, nav, auth actions restyled to tokens; responsive navigation via a right-side slide-in drawer on mobile (D10-11); skip-to-content link lives in `Layout` (D10-14).
2. **Layout** (`apps/web/src/widgets/layout/ui/Layout.tsx`): page container, max widths, spacing, background, landmark structure (`<header>`, `<nav>`, `<main id="main-content">`), skip link.
3. **Focus treatment:** visible focus rings, skip-to-content link, `aria-current="page"` on active nav entries.
4. **Preserve routing and auth behavior** (ProtectedRoute/PublicRoute untouched).

### Out of scope

- Token definitions (EP10A) and primitives (EP10B).
- Page-level adoption (EP10D–EP10G).
- Backend/API changes (D10-2).

## Source requirement references

- **Epic AC-E10-03, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-3, D10-4, D10-6, D10-8, D10-11…D10-16.

## Acceptance criteria

1. Header, layout, and navigation use semantic tokens and the refreshed primitives.
2. Desktop navigation and the mobile drawer are usable and keyboard-operable, with visible focus.
3. Authenticated/unauthenticated nav entries and the logout flow behave as before.
4. Skip-to-content link and landmark structure are provided (D10-14).
5. Reduced motion is respected for any shell animation.
6. Component tests cover header nav rendering/keyboard behavior, mobile drawer toggle, skip link; existing tests pass.

## Tests to add / update

- `apps/web/src/widgets/header/ui/Header.test.tsx` (new or update) — nav entries by auth state, active `aria-current`, keyboard operability (Tab/Enter), mobile drawer toggle (open/close, Escape, focus restoration, body scroll lock), skip link presence.
- Verification: `pnpm --filter web test -- src/widgets`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/src/widgets/header/ui/Header.tsx`: nav Home/Dashboard/Semesters/Courses/Assignments/Calendar/Availability/Profile, logo, welcome text, email-verification link, logout; `hidden md:flex` desktop nav, no mobile menu (nav hidden on mobile).
- `apps/web/src/widgets/layout/ui/Layout.tsx` exists; not read in detail — verified path only.
- Routes registered in `apps/web/src/app/App.tsx`.
- `EmailVerificationBanner` already renders in `Layout` and links to `/verify-email`.

### Proposed files

- `apps/web/src/widgets/header/ui/Header.tsx` (modify)
- `apps/web/src/widgets/layout/ui/Layout.tsx` (modify)
- `apps/web/src/widgets/header/ui/Header.test.tsx` (new/update)

### Decisions (ui-refiner, 2026-10-29)

**D10-11 — Mobile navigation: right-side slide-in drawer.** Below `md`, the header shows logo + hamburger only; the hamburger opens a right-side drawer overlay containing the full primary nav plus the auth area.

- Drawer panel: `fixed inset-y-0 right-0 w-80 max-w-[85vw]`, `bg-surface`, `shadow-lg`, `z-50`; backdrop `fixed inset-0 bg-text/40` (opacity transition). Open/close via `translate-x` (panel) + opacity (backdrop) transitions using `duration-base` / `ease-standard` (Tailwind `transitionTimingFunction: standard`); global reduced-motion media query zeroes durations.
- Focus: on open move focus to the first nav link (or a container with `tabIndex={-1}`); trap Tab/Shift+Tab within the drawer; Escape closes; restore focus to the hamburger on close.
- Body scroll lock (`overflow-hidden` on `body`, restored on close). Closes on route change and on link click.
- Hamburger button: `aria-label` toggles "Open menu"/"Close menu", `aria-expanded`, `aria-controls="mobile-nav"`. Drawer panel `id="mobile-nav"`, `role="dialog"`, `aria-modal="true"`, `aria-label="Primary navigation"`.
- Auth actions (login/get started or welcome + verify link + logout) live inside the drawer on mobile; desktop keeps them in the header (D10-15).
- Rationale: conventional app-shell pattern, handles the long link list, keeps the mobile header minimal; mirrors the EP10B `Dialog` focus-trap/scroll-lock approach without introducing a new primitive.

**D10-12 — Header density & logo.** Header `min-h-16` (64px), single row, container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, `gap-4`. Logo: 40px square `bg-accent rounded-xl` with white "S" + "StudyPilot" wordmark `text-xl font-semibold text-text`. No gradient (no gradient token exists; solid accent). Sticky: no — preserve current static behavior. All interactive elements carry the standard focus-visible ring.

**D10-13 — Active link styling.** Use `NavLink` (react-router-dom) for all primary nav entries so `aria-current="page"` is set automatically. Active classes: `text-accent font-semibold` plus a 2px accent underline (`border-b-2 border-accent` with `pb-1`/`underline-offset-4`). Inactive: `text-text-muted hover:text-text`. Focus-visible ring on every link. Non-color cues: weight + underline + `aria-current`. Match is exact pathname (current behavior) — nested routes (e.g. `/courses/:id`) do not highlight the parent link. Reversible to `startsWith` if desired.

**D10-14 — Skip-to-content & landmarks.** Add a skip link as the first focusable element in `Layout`: visually hidden (`sr-only`) that becomes visible on focus (`focus:not-sr-only`), styled `focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:text-text focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-focus-ring`, text "Skip to main content", `href="#main-content"`. Landmarks: `<header>` wraps the shell header; `<nav aria-label="Primary">` wraps desktop nav and (same label) the drawer nav; `<main id="main-content" tabIndex={-1}>` wraps page content. `EmailVerificationBanner` renders inside `<main>` at the top so the skip target lands on contextual content. No `<footer>` (none exists). Rationale: satisfies WCAG 2.4.1 bypass blocks and 1.3.1 info/relationships.

**D10-15 — Auth area treatment.** Desktop (md+): auth area right-aligned, `gap-3`:
- Authenticated: `Hi, {name}` (truncated, `text-sm text-text-muted`, visible md+), a "Verify email" text link shown only when `!user.emailVerifiedAt` (`text-sm text-accent hover:text-accent-hover underline`), and a Logout `Button variant="outline" size="sm"`.
- Unauthenticated: Login `Button variant="outline" size="sm"` + Get Started `Button variant="primary" size="sm"`.
Mobile (< md): auth area moves into the drawer (D10-11); the header shows only logo + hamburger. Welcome text is "Hi, {name}" (`name = user?.name || user?.email.split('@')[0]`). The email-verification link stays in the header (desktop) and drawer (mobile) as a persistent affordance alongside the banner. Rationale: keeps the mobile header minimal; retains quick access to verification.

**D10-16 — Reduced motion.** Shell animations use only token durations/easing: drawer backdrop opacity + panel transform `duration-base ease-standard`; header link/button hover `duration-fast`. The global reduced-motion media query (EP10A) zeroes these durations, so no component-level `useReducedMotion` hook or conditional logic is added. No framer-motion or other animation library. Rationale: single source of truth for motion; avoids duplicate guards.

**Element decisions.**
- Reuse `Button` (EP10B) for all shell buttons (Login, Get Started, Logout, hamburger, close) with variants/sizes.
- Reuse `Link`/`NavLink` from react-router-dom; switch nav entries to `NavLink` for `aria-current` (D10-13).
- No new shared primitive; the mobile drawer is implemented inline in `widgets/header/ui/Header.tsx` (FSD placement). If complexity warrants, extract a `MobileNavDrawer` in the same folder (implementer's call).
- `Layout.tsx` is the only layout file changed; `ProtectedRoute`/`PublicRoute` untouched.

**Layout & hierarchy.**
- Desktop: single row — logo (left) | nav (center, `flex items-center gap-6`) | auth area (right). Nav does not wrap; links use `py-1`.
- Mobile: logo + hamburger only; drawer contains nav (vertical list, links with `min-h-[44px]` tap targets) + auth area.

**States.** No loading/empty/error states at shell level; `ProtectedRoute`/`PublicRoute` handle auth loading. Header consumes `useAuth` synchronously (as today).

**Accessibility.**
- Keyboard: all links/buttons focusable; drawer focus trap + Escape; skip link; `aria-current="page"` on active nav entry.
- Visible focus: `focus-visible:ring-2 ring-focus-ring ring-offset-2` on interactive elements.
- Non-color distinction on active link: weight + underline + `aria-current`.
- Tap targets: hamburger/close and drawer links meet 44px on mobile (Button primitive applies `max-sm:min-h-[44px]`; drawer links use `min-h-[44px]`).
- Reduced motion handled globally (D10-16).

**Responsive.** `md` (768px) is the switch: below `md` the drawer is used; at `md+` inline nav. Container padding responsive (`px-4 sm:px-6 lg:px-8`).

**Copy.**
- Skip link: "Skip to main content".
- Hamburger aria-label: "Open menu" / "Close menu".
- Drawer `aria-label`: "Primary navigation".
- Welcome text: "Hi, {name}".
- Verification link: "Verify email".
- Buttons: "Login", "Get Started", "Logout".

**Test cases to add/update.**
- `Header.test.tsx`: nav entries by auth state (existing, update active-class assertions from `text-primary-600` to the new active classes `text-accent` + `font-semibold`); active `aria-current="page"`; keyboard operability (Tab moves through links, Enter activates); mobile drawer toggle (hamburger opens/closes, Escape closes, focus restoration, body scroll lock); drawer contains auth actions on mobile.
- Skip link presence and `href="#main-content"` in `Layout` (new `Layout.test.tsx` optional, or assert via Header tests).
- Verification: `pnpm --filter web test -- src/widgets`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

### Unverified / for implementer

- Implement focus trap + body scroll lock + route-change close in the drawer (mirrors EP10B `Dialog` behavior; no shared primitive exists yet).
- `NavLink` className function for active styling; ensure `aria-current` is emitted.
- Existing `Header.test.tsx` active-highlight assertions reference `text-primary-600` and must be updated to the new active classes (D10-13).
- `EmailVerificationBanner` moves inside `<main>` (D10-14) — confirm no test relies on its previous sibling position.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Not applicable — loading/empty/error states preserved in pages.
6. Keyboard accessibility + visible focus + skip link + landmarks.
7. Responsive desktop + mobile (drawer).
8. Automated component tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** refreshed, token-driven, accessible app shell with responsive drawer navigation, skip link, and landmarks.
- **Request/token estimate:** ~2–3 requests/tokens — header + layout + nav + drawer + tests.
- **Model recommendation:** 3 — moderate presentation and responsive risk.
- **Files:** `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/src/widgets/layout/ui/Layout.tsx`, header test.
- **Start context:** this story file; EP10A/EP10B output; `apps/web/src/widgets/header/ui/Header.tsx`; `apps/web/src/app/App.tsx`.
- **Verification:** `pnpm --filter web test -- src/widgets`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10B implemented. Excludes token/primitive definitions and page adoption.

## UI/UX gaps for the `ui-refiner` (D10-3 — required before implementation)

- **Mobile nav:** settled — right-side slide-in drawer (D10-11).
- **Header layout:** settled — 64px single row, logo + wordmark, inline nav md+ (D10-12).
- **Active link:** settled — accent + semibold + underline + `aria-current` (D10-13).
- **Skip link & landmarks:** settled — skip link + header/nav/main landmarks (D10-14).
- **Auth area:** settled — compact name + verify link + logout; mobile moves to drawer (D10-15).
- **Reduced motion:** settled — token durations only, no extra guards (D10-16).