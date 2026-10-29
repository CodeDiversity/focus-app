# EP10B: Shared UI Primitives Refresh

**Story ID:** EP10B
**Title:** Frontend — refresh shared UI primitives (Button, Input, Select, Card, Dialog, Badge, EmptyState, …)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** EP10A (tokens it consumes).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning; ui-refiner pass required before implementation)

## Summary

Migrate the shared UI primitives in `apps/web/src/shared/ui/` to the token system and give them consistent variants, sizes, and states (loading, disabled, error, focus). Introduce any new primitives the refresh needs (Card, Dialog, Badge, EmptyState) so pages compose primitives instead of re-implementing styles.

## Description & bounded scope

### In scope

1. **Migrate** `Button`, `Input`, `Select` to consume semantic tokens; preserve their public props/API.
2. **Introduce** (only if the ui-refiner records a need) `Card`, `Dialog`, `Badge`, `EmptyState` primitives in `shared/ui`, following the established component pattern (forwardRef, clsx/tailwind-merge, accessible attributes).
3. **Consistent states:** loading, disabled, error, focus, hover, across variants/sizes.
4. **Accessibility:** visible focus rings, `aria-*` attributes, keyboard operability, 44×44px tap targets on mobile.
5. **Component tests** for variants, sizes, states, focus, and a11y.

### Out of scope

- Token definitions (EP10A).
- App shell (EP10C).
- Page adoption (EP10D–EP10G).
- Backend/API changes (D10-2).

## Source requirement references

- **Epic AC-E10-02, AC-E10-05, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-3, D10-4, D10-6, D10-8.

## Acceptance criteria

1. `Button`, `Input`, `Select` consume semantic tokens; their public props/API are unchanged (no call-site breakage).
2. Any new primitive introduced (`Card`, `Dialog`, `Badge`, `EmptyState`) lives in `shared/ui`, follows the existing component pattern, and is token-driven.
3. All primitives expose consistent variants, sizes, and states (loading, disabled, error, focus, hover).
4. Focus rings are visible and tap targets are ≥ 44×44px on mobile for all interactive primitives.
5. Component tests cover variants, sizes, states, focus, and a11y for each primitive.
6. Existing primitive tests (`Button.test.tsx`) pass; no regressions in callers.

## Tests to add / update

- `apps/web/src/shared/ui/Button.test.tsx` (update for token variants/states).
- `apps/web/src/shared/ui/Input.test.tsx` (new).
- `apps/web/src/shared/ui/Select.test.tsx` (new).
- `apps/web/src/shared/ui/Card.test.tsx`, `Dialog.test.tsx`, `Badge.test.tsx`, `EmptyState.test.tsx` (new, if those primitives are introduced).
- Verification: `pnpm --filter web test -- src/shared/ui`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/src/shared/ui/Button.tsx`: variants primary/secondary/outline/ghost/danger, sizes sm/md/lg, isLoading with spinner.
- `apps/web/src/shared/ui/Input.tsx`: label/error/hint, password toggle, left/right icons, aria attributes.
- `apps/web/src/shared/ui/Select.tsx`: label/error/hint, chevron, aria attributes.
- Only `Button.test.tsx` exists; no Input/Select tests.
- No `Card`/`Dialog`/`Badge`/`EmptyState` primitive exists; dialogs are implemented per-feature (e.g. `ArchiveCourseDialog`).

### Proposed files

- `apps/web/src/shared/ui/Button.tsx` (modify)
- `apps/web/src/shared/ui/Input.tsx` (modify)
- `apps/web/src/shared/ui/Select.tsx` (modify)
- `apps/web/src/shared/ui/Card.tsx`, `Dialog.tsx`, `Badge.tsx`, `EmptyState.tsx` (new, if recorded by ui-refiner)
- corresponding `*.test.tsx`

### Unverified / for ui-refiner

- Which new primitives are actually needed (avoid inventing components).
- Variant/size matrix and visual treatment per state.
- Dialog focus-trap/portal behavior (currently per-feature dialogs).

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — primitives don't own input validation rules; they render errors passed in.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Loading/empty/error states handled (states exposed).
6. Keyboard accessibility + visible focus + aria attributes.
7. Responsive (tap targets ≥ 44×44px on mobile).
8. Automated component tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** shared primitives migrated to tokens with consistent variants/sizes/states and component tests.
- **Request/token estimate:** ~2–3 requests/tokens — three migrated primitives, possible new primitives, tests.
- **Model recommendation:** 3 — composition over a settled token set; moderate presentation risk.
- **Files:** `apps/web/src/shared/ui/{Button,Input,Select}.tsx` (modify) + new primitives + tests.
- **Start context:** this story file; EP10A token output; `apps/web/src/shared/ui/*`; `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx` (dialog pattern).
- **Verification:** `pnpm --filter web test -- src/shared/ui`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10A implemented. Excludes token definitions, shell, and page adoption.

## UI/UX gaps for the `ui-refiner` (D10-3 — required before implementation)

- **Primitive set:** decide which of Card/Dialog/Badge/EmptyState to introduce (don't invent without need).
- **Variants/sizes:** finalize the variant and size matrix for Button/Input/Select and any new primitive.
- **States:** visual treatment for loading, disabled, error, focus, hover; spinner placement; error text placement.
- **Dialog:** portal, focus trap, animation, and reduced-motion behavior.
- **Tap targets & focus:** confirm 44×44px mobile targets and focus-ring style.