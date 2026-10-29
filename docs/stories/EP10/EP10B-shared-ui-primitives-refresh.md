# EP10B: Shared UI Primitives Refresh

**Story ID:** EP10B
**Title:** Frontend — refresh shared UI primitives (Button, Input, Select, Card, Dialog, Badge, EmptyState)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Implemented — awaiting parent review
**Dependencies:** EP10A (tokens it consumes).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning; ui-refiner pass — primitive set, variants/sizes, states, dialog, tap targets, focus ring settled)

## Summary

Migrate the shared UI primitives in `apps/web/src/shared/ui/` to the token system and give them consistent variants, sizes, and states (loading, disabled, error, focus). Introduce `Card`, `Dialog`, `Badge`, `EmptyState` primitives so pages compose primitives instead of re-implementing styles.

## Description & bounded scope

### In scope

1. **Migrate** `Button`, `Input`, `Select` to consume semantic tokens; preserve their public props/API.
2. **Introduce** `Card`, `Dialog`, `Badge`, `EmptyState` primitives in `shared/ui`, following the established component pattern (forwardRef where applicable, clsx/tailwind-merge, accessible attributes).
3. **Consistent states:** loading, disabled, error, focus, hover, across variants/sizes.
4. **Accessibility:** visible focus rings, `aria-*` attributes, keyboard operability, 44×44px tap targets on mobile.
5. **Component tests** for variants, sizes, states, focus, and a11y.

### Out of scope

- Token definitions (EP10A).
- App shell (EP10C).
- Page adoption (EP10D–EP10G) — existing per-feature dialogs remain as-is; migration to the shared `Dialog` is adoption work.
- Backend/API changes (D10-2).

## Source requirement references

- **Epic AC-E10-02, AC-E10-05, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-3, D10-4, D10-6, D10-8.

## Acceptance criteria

1. `Button`, `Input`, `Select` consume semantic tokens; their public props/API are unchanged (no call-site breakage).
2. `Card`, `Dialog`, `Badge`, `EmptyState` live in `shared/ui`, follow the existing component pattern, and are token-driven.
3. All primitives expose consistent variants, sizes, and states (loading, disabled, error, focus, hover).
4. Focus rings are visible and tap targets are ≥ 44×44px on mobile for all interactive primitives.
5. Component tests cover variants, sizes, states, focus, and a11y for each primitive.
6. Existing primitive tests (`Button.test.tsx`) pass; no regressions in callers.

## Tests to add / update

- `apps/web/src/shared/ui/Button.test.tsx` (update for token variants/states).
- `apps/web/src/shared/ui/Input.test.tsx` (new).
- `apps/web/src/shared/ui/Select.test.tsx` (new).
- `apps/web/src/shared/ui/Card.test.tsx`, `Dialog.test.tsx`, `Badge.test.tsx`, `EmptyState.test.tsx` (new).
- Verification: `pnpm --filter web test -- src/shared/ui`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/src/shared/ui/Button.tsx`: variants primary/secondary/outline/ghost/danger, sizes sm/md/lg, isLoading with spinner.
- `apps/web/src/shared/ui/Input.tsx`: label/error/hint, password toggle, left/right icons, aria attributes.
- `apps/web/src/shared/ui/Select.tsx`: label/error/hint, chevron, aria attributes.
- Only `Button.test.tsx` exists; no Input/Select tests.
- No `Card`/`Dialog`/`Badge`/`EmptyState` primitive exists; dialogs are implemented per-feature (e.g. `ArchiveCourseDialog`).
- Empty states are inlined per page (e.g. `SemestersPage`: centered "No semesters yet" + CTA); badges are inlined (e.g. availability slot kind badge).

### Proposed files

- `apps/web/src/shared/ui/Button.tsx` (modify)
- `apps/web/src/shared/ui/Input.tsx` (modify)
- `apps/web/src/shared/ui/Select.tsx` (modify)
- `apps/web/src/shared/ui/Card.tsx`, `Dialog.tsx`, `Badge.tsx`, `EmptyState.tsx` (new)
- corresponding `*.test.tsx`

### Decisions (ui-refiner, 2026-10-29)

**Primitive set (all four introduced).** Card, Dialog, Badge, EmptyState are all needed: `.card`/inline empty-state/badge patterns recur across pages and per-feature dialogs duplicate focus-trap logic. Each is token-driven and lives in `shared/ui`.

**Button — variants/sizes/states.**
- Variants: `primary`, `secondary`, `outline`, `ghost`, `danger` (unchanged set).
- Sizes: `sm`, `md` (default), `lg` (unchanged).
- Token mapping: primary `bg-accent text-white hover:bg-accent-hover`; secondary `bg-surface-muted text-text hover:bg-border`; outline `border-2 border-accent text-accent hover:bg-accent/10`; ghost `text-text hover:bg-surface-muted`; danger `bg-danger text-white hover:bg-danger/90`.
- States: hover (per variant), focus-visible ring `ring-2 ring-focus-ring ring-offset-2`, active/pressed (hover color), disabled `opacity-50 cursor-not-allowed`, loading `isLoading` disables the button, renders an `aria-hidden` spinner in place of children, and sets `aria-busy="true"`.
- Tap target: primitive applies `max-sm:min-h-[44px]` (D10-8).

**Input & Select — variants/sizes/states.**
- Add `size?: 'sm' | 'md' | 'lg'` (default `md`) to both, matching Button padding/text scale: sm `px-3 py-1.5 text-sm`, md `px-4 py-2 text-sm`, lg `px-4 py-3 text-base`.
- No `variant` prop; the `error` prop drives the error state.
- Token mapping: base `bg-surface border-border-strong text-text placeholder-text-muted`; focus `border-accent focus:ring-2 focus:ring-accent`; error `border-danger text-danger placeholder-danger/70 focus:border-danger focus:ring-danger`; disabled `opacity-50 cursor-not-allowed bg-surface-muted`.
- Label `text-text font-medium text-sm`; hint `text-text-muted text-sm`; error text `text-danger text-sm` (`.error-message` vocabulary), rendered below the control with `role="alert"` and an id for `aria-describedby`.
- Password toggle (Input) is a focusable button with `aria-label`, focus-visible ring, and a mobile tap target.
- Tap target: primitive applies `max-sm:min-h-[44px]` to the control.

**Card.**
- Props: `variant?: 'default' | 'flat' | 'elevated'` (default `default`), `padding?: 'none' | 'sm' | 'md' | 'lg'` (default `md`).
- Base: `bg-surface rounded-lg`. Variants: default `shadow-md`; flat `border border-border`; elevated `shadow-lg`. Padding: none `p-0`, sm `p-4`, md `p-6`, lg `p-8`.
- forwardRef, clsx/tailwind-merge, merges `className`.

**Dialog.**
- Controlled: `open: boolean`, `onClose: () => void`. Renders via `ReactDOM.createPortal` to `document.body` only while open.
- Props: `title: string`, `description?: string`, `children?` (body), `footer?` (ReactNode), `size?: 'sm' | 'md' | 'lg'` (default `md`, max-widths 24rem/32rem/48rem), `closeOnBackdrop?: boolean` (default true), `closeOnEscape?: boolean` (default true).
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (title id), `aria-describedby` (description id when present). Close button with `aria-label="Close"`.
- Focus: on open, save `document.activeElement` and move focus to the first focusable element (or the container with `tabIndex={-1}`); trap Tab/Shift+Tab within the dialog; on close restore focus to the saved trigger. Escape closes (when enabled); backdrop click closes (when enabled).
- Body scroll lock while open (`overflow-hidden` on `body`, restored on close).
- Animation: backdrop fade + panel fade/scale using Tailwind transitions (`duration-base`, `transitionTimingFunction: standard`); under `prefers-reduced-motion` durations resolve to ~0 via the token media query. No framer-motion.
- Tap target: close button meets 44×44px on mobile.

**Badge.**
- Props: `variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'` (default `neutral`), `size?: 'sm' | 'md'` (default `sm`).
- Base: `inline-flex items-center gap-1 rounded-full font-medium`. sm `px-2 py-0.5 text-xs`; md `px-2.5 py-1 text-body-sm`.
- Token mapping: neutral `bg-surface-muted text-text-muted`; accent `bg-accent text-white`; success `bg-success/10 text-success`; warning `bg-warning/10 text-warning`; danger `bg-danger/10 text-danger`. (Icon slots are the caller's; non-color distinction via icon/text is the caller's responsibility, per D10-8.)
- Rendered as a `<span>`; not interactive, so no tap-target/focus-ring requirement.

**EmptyState.**
- Props: `icon?: ReactNode`, `title: string`, `description?: string`, `action?: ReactNode`.
- Layout: centered column, `py-8 sm:py-12`, gap-2. Icon `text-text-muted` (size 32–40 via caller or default 32). Title `text-base font-semibold text-text`. Description `text-sm text-text-muted max-w-sm`. Action `mt-4`.
- Used by pages for loading/empty/error presentation; error variant is caller-composed (icon + danger title) or a future prop — keep the primitive minimal (no error prop) to avoid inventing states; pages compose.

**Focus ring (all interactive primitives).** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2`. Inputs/selects also keep `focus-visible:border-accent` (error state uses `focus-visible:border-danger focus-visible:ring-danger`). Keyboard-only via `focus-visible`, matching legacy `.btn`/`.input-error`.

**Tap targets.** Interactive primitives enforce `max-sm:min-h-[44px]` (and `max-sm:min-w-[44px]` for icon-only controls) internally, so callers no longer need `max-sm:min-h-[44px]` overrides (e.g. availability rows). Mobile-only to keep desktop compact.

**Loading/empty/error consistency.** Button owns loading; EmptyState owns empty; error text style is shared via the `.error-message` vocabulary and `text-danger`. Pages compose these rather than re-styling.

### Unverified / for implementer

- Confirm `aria-busy`/spinner replacement does not break existing `Button.test.tsx` expectations (test update recorded).
- Dialog portal requires `ReactDOM` import; verify jsdom test environment supports `createPortal` (existing dialog tests render without portal, so Dialog tests must wrap in a container or use `screen` queries).

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

- **Outcome:** shared primitives migrated to tokens with consistent variants/sizes/states and component tests; four new primitives introduced.
- **Request/token estimate:** ~2–3 requests/tokens — three migrated primitives, four new primitives, tests. Checkpoint milestones: (1) migrate Button/Input/Select; (2) add Card/Badge/EmptyState; (3) add Dialog + tests; (4) run verification. Resume inputs: this story, EP10A token values, `shared/ui/*`.
- **Model recommendation:** 3 — composition over a settled token set; moderate presentation risk.
- **Files:** `apps/web/src/shared/ui/{Button,Input,Select}.tsx` (modify) + `Card.tsx`, `Dialog.tsx`, `Badge.tsx`, `EmptyState.tsx` (new) + corresponding `*.test.tsx`.
- **Start context:** this story file; EP10A token output; `apps/web/src/shared/ui/*`; `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx` (dialog pattern); `apps/web/src/pages/semesters/ui/SemestersPage.tsx` (empty-state pattern).
- **Verification:** `pnpm --filter web test -- src/shared/ui`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10A implemented. Excludes token definitions, shell, and page adoption.
