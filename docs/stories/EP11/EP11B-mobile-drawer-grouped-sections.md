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
**Refined:** not yet (pending `ui-refiner` pass)

## Summary

Adapt the existing EP10C mobile drawer to the grouped information architecture: render grouped sections with headings (Dashboard, Academics, Planning) and an Account section, each entry showing an icon + text, reusing the EP10C drawer's focus trap, scroll lock, Escape, and route-change-close behavior. Keep desktop and mobile in sync via the shared nav-groups definition.

## Description & bounded scope

### In scope

1. **Mobile drawer sections:** replace the flat `navLinks` list in the drawer with grouped sections using the shared `navGroups` definition — each group renders a heading (or labeled section) plus its items (icon + text); Dashboard renders as a single link.
2. **Account section:** render `accountMenuItems` in a grouped Account section at the bottom of the drawer (Profile, Availability, Verify email when unverified, Logout), replacing the previous inline auth area (or keeping a compact auth area per ui-refiner decision).
3. **Unauthenticated drawer:** Home link + Login/Get Started buttons (no grouped sections/account section), per EP10C baseline.
4. **Reuse EP10C drawer behavior:** focus trap, scroll lock, Escape close, route-change close, focus restoration, backdrop, animation, reduced motion — unchanged.
5. **Responsive correctness:** desktop dropdowns hidden on mobile; drawer hidden on desktop; no duplicate nav surfaces.
6. **Icons:** lucide icons alongside labels (same set as EP11A).
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

1. The mobile drawer renders grouped sections with headings (Dashboard, Academics, Planning) and an Account section, each item showing an icon + text; the flat link list is replaced.
2. The Account section contains Profile, Availability, email-verification (when unverified), and Logout (and Login/Get Started for unauthenticated users).
3. Drawer behavior from EP10C is preserved: opens/closes via hamburger, Escape closes, focus trap, focus restoration, body scroll lock, closes on route change and link click.
4. Responsive: desktop dropdowns are not rendered on mobile (`md:hidden` drawer only); drawer is not rendered on desktop.
5. No functional regression: all routes reachable; auth behavior unchanged.
6. Component tests cover grouped mobile sections, account section contents, drawer behavior, responsive classes; existing tests pass.

## Tests to add / update

- `apps/web/src/widgets/header/ui/Header.test.tsx`:
  - Authenticated mobile drawer: grouped section headings (Academics, Planning) and Account section present; items present (Semesters, Courses, Assignments, Calendar, Availability, Profile).
  - Unauthenticated drawer: Home + Login/Get Started; no grouped/account sections.
  - Account section contents by verification state (Verify email conditional).
  - Drawer behavior preserved: toggle, Escape, scroll lock, link-click close (existing tests).
  - Verification: `pnpm --filter web test -- src/widgets/header`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/src/widgets/header/ui/Header.tsx`: mobile drawer renders `navLinks` (flat) in a `<nav aria-label="Primary">` and an auth area below a border; hamburger toggle, focus trap, scroll lock, Escape, route-change close, backdrop + slide-in animation (D10-11).
- `Header.test.tsx`: mobile drawer tests (toggle, Escape, link-click close, scroll lock, auth actions in drawer).

### Proposed files

- `apps/web/src/widgets/header/ui/Header.tsx` (modify — mobile drawer grouped sections + Account section).
- `apps/web/src/widgets/header/ui/Header.test.tsx` (update).

### Decisions (ui-refiner pending — D11-3)

- Mobile grouping labels and ordering (e.g., whether Dashboard is a labeled section or a standalone link at the top).
- Account section placement and divider treatment.
- Whether the mobile drawer keeps a compact auth summary (e.g., "Hi, {name}") above the Account section.
- Icon size/spacing in the drawer; whether section headings are collapsible.
- Animation/transition for section expand (should reuse token durations, D10-16).

### Unverified / for implementer

- Ensure the shared `navGroups`/`accountMenuItems` from EP11A is consumed (not duplicated) to avoid drift.
- Preserve the EP10C focus trap/scroll lock/Escape behavior exactly; do not regress existing drawer tests.
- Existing `Header.test.tsx` drawer tests assert flat links; update to grouped structure while keeping behavior assertions.

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

## UI/UX gaps for the `ui-refiner` (D11-3 — required before implementation)

- **Mobile grouping labels/ordering:** whether Dashboard is a standalone link or a labeled section; section heading style. (unsettled)
- **Account section:** placement, divider, compact auth summary above it. (unsettled)
- **Icon size/spacing:** in the drawer; section heading collapsibility. (unsettled)
- **Animation:** any section expand/collapse uses token durations only (D10-16). (unsettled)