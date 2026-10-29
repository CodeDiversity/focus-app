# EP10C: App Shell Refresh

**Story ID:** EP10C
**Title:** Frontend — app shell refresh (header, layout, navigation)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** EP10B (primitives it composes).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning; ui-refiner pass required before implementation)

## Summary

Refresh the app shell — header, layout, and navigation — to the token system, keeping desktop and mobile usable and keyboard-operable. This is the last primitive-level story before page adoption.

## Description & bounded scope

### In scope

1. **Header** (`apps/web/src/widgets/header/ui/Header.tsx`): logo, nav, auth actions restyled to tokens; responsive navigation (mobile menu/drawer) if the ui-refiner records it.
2. **Layout** (`apps/web/src/widgets/layout/ui/Layout.tsx`): page container, max widths, spacing, background.
3. **Focus treatment:** visible focus rings, skip-to-content link if recorded.
4. **Preserve routing and auth behavior** (ProtectedRoute/PublicRoute untouched).

### Out of scope

- Token definitions (EP10A) and primitives (EP10B).
- Page-level adoption (EP10D–EP10G).
- Backend/API changes (D10-2).

## Source requirement references

- **Epic AC-E10-03, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-3, D10-4, D10-6, D10-8.

## Acceptance criteria

1. Header, layout, and navigation use semantic tokens and the refreshed primitives.
2. Desktop navigation and (if recorded) mobile navigation are usable and keyboard-operable, with visible focus.
3. Authenticated/unauthenticated nav entries and the logout flow behave as before.
4. Skip-to-content or equivalent is provided if the ui-refiner records it.
5. Reduced motion is respected for any shell animation.
6. Component tests cover header nav rendering/keyboard behavior; existing tests pass.

## Tests to add / update

- `apps/web/src/widgets/header/ui/Header.test.tsx` (new or update) — nav entries by auth state, keyboard operability, mobile menu toggle.
- Verification: `pnpm --filter web test -- src/widgets`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/src/widgets/header/ui/Header.tsx`: nav Home/Dashboard/Semesters/Courses/Assignments/Calendar/Availability/Profile, logo, welcome text, email-verification link, logout; `hidden md:flex` desktop nav, no mobile menu (nav hidden on mobile).
- `apps/web/src/widgets/layout/ui/Layout.tsx` exists; not read in detail — verified path only.
- Routes registered in `apps/web/src/app/App.tsx`.

### Proposed files

- `apps/web/src/widgets/header/ui/Header.tsx` (modify)
- `apps/web/src/widgets/layout/ui/Layout.tsx` (modify)
- `apps/web/src/widgets/header/ui/Header.test.tsx` (new/update)

### Unverified / for ui-refiner

- Mobile navigation pattern (drawer, sheet, or collapsed list) — currently nav is hidden on mobile with no replacement.
- Header density, logo treatment, active-link styling.
- Skip-to-content link and landmark structure.
- Whether the email-verification link stays in the header.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Loading/empty/error states not applicable at shell level; preserved in pages.
6. Keyboard accessibility + visible focus.
7. Responsive desktop + mobile.
8. Automated component tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** refreshed, token-driven, accessible app shell with responsive navigation.
- **Request/token estimate:** ~2–3 requests/tokens — header + layout + nav + tests.
- **Model recommendation:** 3 — moderate presentation and responsive risk.
- **Files:** `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/src/widgets/layout/ui/Layout.tsx`, header test.
- **Start context:** this story file; EP10A/EP10B output; `apps/web/src/widgets/header/ui/Header.tsx`; `apps/web/src/app/App.tsx`.
- **Verification:** `pnpm --filter web test -- src/widgets`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10B implemented. Excludes token/primitive definitions and page adoption.

## UI/UX gaps for the `ui-refiner` (D10-3 — required before implementation)

- **Mobile nav:** the current shell hides nav below `md` with no replacement — decide the mobile pattern.
- **Header layout:** logo, title, nav, auth actions alignment and density.
- **Active link:** how the current route is indicated (color + non-color cue).
- **Skip link & landmarks:** decide skip-to-content and heading/landmark structure.
- **Auth area:** welcome text, email-verification link, logout button treatment.