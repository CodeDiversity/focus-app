# EP10: UI Design System & Visual Refresh

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** None blocking. EP10 is cross-cutting and can run in parallel with the functional epics, but it touches the shared UI primitives every page depends on, so its internal sequencing (tokens → primitives → shell → page adoption) must be respected. Page-adoption stories that restyle a functional surface require that surface to exist (e.g. EP10F requires the EP04 calendar/availability pages).

## Epic Summary

Refresh the whole web app toward an Apple/Google-inspired, minimalistic, ADHD-friendly visual design system, without changing product behavior.

## Description

As a student, I want a calm, consistent, and easy-to-scan interface so I can find what I need quickly and stay focused, without visual noise or unnecessary choices.

The refresh is visual only: every existing feature, route, data flow, and business rule stays intact. It evolves the established visual system (Tailwind `primary`/`secondary` blue palette, Inter, `.card`, `.btn`) into a documented, token-driven design system and applies it consistently across the app shell and every page.

## Scope

- Design tokens (color, typography, spacing, radius, shadow, motion) and their Tailwind/global-CSS representation.
- Shared UI primitives (Button, Input, Select, and any new primitives the refresh introduces, e.g. Card, Dialog, Badge, EmptyState) migrated to the token set.
- App shell refresh: header, layout, navigation (desktop and mobile), focus treatment.
- Page-by-page adoption of the refreshed system across public/auth pages, academic data pages, calendar & availability, and dashboard & profile.
- Consistent loading, empty, and error states across pages.
- Keyboard focus, responsive behavior, reduced motion, and WCAG 2.2 AA accessibility on refreshed surfaces.

## Acceptance Criteria

- A documented design-token set drives all styling; Tailwind config and global CSS reflect it, and pages no longer hard-code ad-hoc color/spacing values where a token exists.
- Shared UI primitives use the token set and expose consistent variants, sizes, and states (loading, disabled, error, focus).
- The app shell uses the refreshed system and remains usable on desktop and mobile, including keyboard navigation.
- Every existing page renders with the refreshed visual system with no functional regression (routes, data, forms, dialogs, and actions behave as before).
- Loading, empty, and error states are visually consistent across pages.
- Refreshed surfaces meet WCAG 2.2 AA for color contrast, focus visibility, and keyboard operability, and respect `prefers-reduced-motion`.
- No backend or API changes are required; if a story discovers a needed contract change, it is flagged and approved before implementation.

## Proposed Stories

1. EP10A — Design tokens & theme foundation (Tailwind + global CSS).
2. EP10B — Shared UI primitives refresh (Button, Input, Select, Card, Dialog, Badge, EmptyState, …).
3. EP10C — App shell refresh (header, layout, navigation).
4. EP10D — Public/auth pages adoption (home, login, register, forgot/reset password, verify email, onboarding).
5. EP10E — Academic data pages adoption (semesters, courses, course detail, assignments).
6. EP10F — Calendar & availability pages adoption.
7. EP10G — Dashboard & profile adoption.

## Technical Notes

- **Baseline visual system (inspected 2026-10-29):** `apps/web/tailwind.config.js` (Tailwind `primary` 50–900 blue, `secondary` 50–900 slate, `fontFamily.sans` Inter/system-ui), `apps/web/src/index.css` (base typography, `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-outline`, `.card`, `.input-error`, `.error-message`, scrollbar, focus-visible), `apps/web/src/shared/ui/{Button,Input,Select}.tsx`. This baseline is the starting point; the refresh evolves it rather than discarding it wholesale (recorded as a provisional decision in the breakdown README).
- **Design references for the "redesigned page" pattern:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (`max-w-5xl` shell, header + upper-right CTA, toolbar outside the results card, `role="status"` count header, distinct empty/no-match/error states) and `apps/web/src/pages/courses/ui/CoursesPage.tsx` + `features/courses/ui/CourseCard.tsx` + `CourseActionsMenu.tsx` (SP-126).
- **Frontend architecture:** FSD layers (`app/pages/widgets/features/entities/shared`) enforced by `import/no-restricted-paths`; new primitives belong in `shared/ui`, page adoption in `pages/*`, shell in `widgets/*`. Single `@/` alias.
- **No backend work:** this epic is frontend-only. Any story that finds a required API/contract change flags it and stops for approval.
- **Accessibility target:** WCAG 2.2 AA (shared DoD). Reduced motion via `prefers-reduced-motion`.
- **Out of scope:** AI features, new product features, backend/API changes, native mobile apps, dark mode (unless the ui-refiner recommends and records it), and visual-regression snapshot tooling (EP09 scope). Business logic and data flows are unchanged.