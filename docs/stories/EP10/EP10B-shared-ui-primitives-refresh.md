# EP10B: Shared UI Primitives Refresh

**Story ID:** EP10B
**Title:** Frontend — refresh shared UI primitives (Button, Input, Select, Card, Dialog, Badge, EmptyState, …)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Implemented — awaiting parent review
**Dependencies:** EP10A (tokens it consumes).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (ui-refiner pass — primitive variants/sizes/states and new-primitive set settled; D10-11…D10-17 recorded below)

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
- **Decisions:** D10-1, D10-3, D10-4, D10-6, D10-8, D10-11, D10-12, D10-13, D10-14, D10-15, D10-16, D10-17.

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
- `apps/web/src/shared/ui/Card.tsx` (new)
- `apps/web/src/shared/ui/Dialog.tsx` (new)
- `apps/web/src/shared/ui/Badge.tsx` (new)
- `apps/web/src/shared/ui/EmptyState.tsx` (new)
- corresponding `*.test.tsx` (new/updated: Button, Input, Select, Card, Dialog, Badge, EmptyState)

### Decisions (ui-refiner, 2026-10-29) — settled; planner syncs register rows D10-11…D10-17

**D10-11 — New primitive set: introduce all four (`Card`, `Dialog`, `Badge`, `EmptyState`) in `shared/ui`, in addition to migrating `Button`/`Input`/`Select`.**
- Rationale: each has ≥2 existing call sites or repeated patterns — `Card` for the many `.card` usages (availability, courses, assignments); `Badge` for inline status chips (slot kind, course status, calendar event kind); `EmptyState` for the repeated "No X yet" + CTA pattern (assignments, courses, meetings, semesters, availability); `Dialog` to consolidate the many hand-rolled focus-trapped dialogs (archive course, delete assignment/subtask/semester/slot/meeting).
- All four are additive; no mass migration of existing callers in EP10B (page adoption stays in EP10D–G). Existing per-feature dialogs keep working unchanged; the primitive is available for new/adopted code. Dialog is the heaviest piece and is a checkpoint boundary (see Sizing).

**D10-12 — `Button` variant/size matrix (tokenized).**
- Variants (5, unchanged names so call sites don't break):
  - `primary`: `bg-accent text-white hover:bg-accent-hover` — primary action.
  - `secondary`: `bg-surface-muted text-text hover:bg-border` — secondary action.
  - `outline`: `border-2 border-accent text-accent hover:bg-accent/10` (accent outline for primary affordance; not a neutral border variant).
  - `ghost`: `text-text-muted hover:bg-surface-muted hover:text-text`.
  - `danger`: `bg-danger text-white hover:bg-danger/90`.
- All variants: `focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2`, `transition-colors duration-base`, `disabled:opacity-50 disabled:cursor-not-allowed`.
- Sizes: `sm` `px-3 py-1.5 text-body-sm gap-1.5`; `md` (default) `px-4 py-2 text-body-sm gap-2`; `lg` `px-6 py-3 text-body gap-2.5`.
- Tap targets: `max-sm:min-h-[44px]` on every size (so `sm` reaches 44px on mobile without growing desktop height).
- Loading: spinner replaces children (existing behavior preserved), button disabled, `aria-busy="true"`. Spinner uses `currentColor`, `animate-spin`, `motion-reduce:animate-none` (covered by global reduced-motion too).
- Icons: `leftIcon`/`rightIcon` rendered in a `gap` flex row; icons `aria-hidden` when decorative.

**D10-13 — `Input` / `Select` (single style + error, new `size` prop).**
- No `variant` prop (single style); error is a state, not a variant. Add `size?: 'sm' | 'md' | 'lg'` (default `md`) — additive, no call-site breakage. Heights: `sm` `px-3 py-1.5 text-body-sm` (min-h 36), `md` `px-4 py-2 text-body-sm` (min-h 40), `lg` `px-4 py-3 text-body` (min-h 44). Mobile tap target `max-sm:min-h-[44px]` for `sm`/`md`.
- Base: `bg-surface border-border-strong text-text placeholder:text-text-muted rounded-md`; focus `border-accent focus:ring-2 focus:ring-accent focus:outline-none`; transition `duration-base`.
- Error: `border-danger text-danger placeholder-danger/70 focus:border-danger focus:ring-danger`; error text `text-danger text-body-sm mt-1` (`.error-message` parity). Hint text `text-text-muted text-body-sm mt-1`.
- Label: `text-text text-body-sm font-medium mb-2`.
- Disabled: `opacity-50 cursor-not-allowed bg-surface-muted`.
- Password toggle / icon slots: `text-text-muted hover:text-text`, tap target `max-sm:min-h-[44px] max-sm:min-w-[44px]`, `aria-label` required (show/hide password).
- Select: `appearance-none pr-10`, chevron `text-text-muted pointer-events-none` size 16. `aria-invalid`/`aria-describedby` preserved.
- `aria-invalid`, `aria-describedby`, `useId` auto-id preserved (public API unchanged).

**D10-14 — `Card` primitive.**
- Props: `variant?: 'default' | 'elevated' | 'outlined' | 'muted'` (default `default`); `padding?: 'sm' | 'md' | 'lg'` (default `md`); plus `className`/children.
- `default`: `bg-surface rounded-lg shadow-md`; `elevated`: `bg-surface rounded-lg shadow-lg`; `outlined`: `bg-surface rounded-lg border border-border shadow-none`; `muted`: `bg-surface-muted rounded-lg shadow-none`.
- Padding: `sm` `p-4`, `md` `p-6`, `lg` `p-8`. Renders a `div` (no interactive semantics); consumers can pass `as`? No — keep `div` to avoid polymorphism complexity; use `className` for overrides via `twMerge`.

**D10-15 — `Badge` primitive.**
- Props: `variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'` (default `neutral`); `size?: 'sm' | 'md'` (default `sm`); `icon?: ReactNode` (rendered before children, `aria-hidden`).
- Style: `inline-flex items-center gap-1 rounded-full font-medium`. `sm`: `px-2 py-0.5 text-caption`; `md`: `px-2.5 py-1 text-body-sm`.
- Colors: `neutral` `bg-surface-muted text-text-muted`; `accent` `bg-accent/10 text-accent`; `success` `bg-success/10 text-success`; `warning` `bg-warning/10 text-warning`; `danger` `bg-danger/10 text-danger`.
- Non-color-only: Badge is presentational; consumers must pair color with text and/or `icon`. The primitive provides an `icon` slot so callers don't rely on color alone. No `role="status"` by default (avoid over-announcing); callers add if needed.

**D10-16 — `EmptyState` primitive.**
- Props: `icon?: ReactNode`, `title: string`, `description?: string`, `action?: ReactNode` (rendered below description).
- Layout: centered column `flex flex-col items-center text-center gap-3 py-8 sm:py-12`; icon `text-text-muted` (size 32–40, `aria-hidden`); title `text-text font-semibold text-body`; description `text-text-muted text-body-sm max-w-sm`; action `mt-2`. No card chrome by default (caller wraps in `Card` if needed).

**D10-17 — `Dialog` primitive.**
- Props: `open: boolean`, `onClose: () => void`, `title: string`, `description?: string`, `children?` (body), `footer?` (actions), `size?: 'sm' | 'md' | 'lg'` (default `md`: `max-w-sm`/`max-w-md`/`max-w-lg`).
- Portal: `createPortal(..., document.body)`. Body scroll lock while open (restore on close).
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (title id), `aria-describedby` (description id when present). On open: save `document.activeElement`, focus first focusable (or dialog container `tabIndex={-1}`); trap Tab/Shift+Tab inside; Escape calls `onClose`. On close: restore focus to the saved trigger.
- Backdrop: `fixed inset-0 bg-text/50`, click calls `onClose`. Backdrop click is disabled only if the consumer passes a busy flag? Dialog itself has no busy state; consumers disable their own action buttons; backdrop click always closes (matches existing dialogs where frozen-while-working disables backdrop click). Decision: add optional `disableBackdropClose?: boolean` (default false) for in-flight actions.
- Animation: enter fade + scale (`opacity-0 scale-95` → `opacity-100 scale-100`, `duration-base`, `ease-standard`); close unmounts immediately (no exit delay) to keep reduced-motion simple. Under `prefers-reduced-motion`, all durations resolve to ~0 (global rule), so no transform/transition runs.
- Focus trap implementation mirrors the existing per-feature dialogs (`FOCUSABLE_SELECTOR`); extracted into the primitive.

**Shared state/copy/focus rules (all primitives).**
- Focus ring: `focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2` (teal, meets WCAG 2.2 AA — see EP10A contrast record). All interactive primitives use `focus-visible` (not `focus`) so mouse clicks don't show rings; keyboard navigation does.
- Tap targets: `max-sm:min-h-[44px]` (and `min-w` for icon-only) on all interactive elements.
- Reduced motion: rely on global `prefers-reduced-motion` rule; no per-component animation durations beyond `duration-*` tokens.
- Error copy placement: below the control, `mt-1`, `text-danger`, `role="alert"` only when the message is dynamic (Input/Select error already has `aria-describedby` + `aria-invalid`). Keep existing aria wiring.
- Loading copy: Button is spinner-only while loading (children replaced by spinner, button disabled, `aria-busy`). Callers that want "Saving…" text should render it outside the button or pass it as children when not loading; documented in component JSDoc. API stays stable.

**Resolved (was "Unverified / for ui-refiner"):** all items above. No open UI/UX questions remain for this story.

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

- **Outcome:** shared primitives migrated to tokens with consistent variants/sizes/states, four new primitives (Card, Dialog, Badge, EmptyState), and component tests.
- **Request/token estimate:** ~4–6 requests/tokens — 3 migrated + 4 new primitives + 7 test files. Checkpoint boundaries: (1) migrate Button/Input/Select; (2) Card/Badge/EmptyState; (3) Dialog (portal + focus trap + animation) + tests. Dialog is the heaviest; if scope pressure appears, Dialog can be split into a sibling (EP10B2) by the planner, but keep it here by default for one cohesive primitives outcome.
- **Model recommendation:** 3 — composition over a settled token set; moderate presentation risk; Dialog focus-trap logic needs care.
- **Files:** `apps/web/src/shared/ui/{Button,Input,Select,Card,Dialog,Badge,EmptyState}.tsx` + tests.
- **Start context:** this story file; EP10A token output + contrast record; `apps/web/src/shared/ui/*`; `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx` (dialog pattern).
- **Verification:** `pnpm --filter web test -- src/shared/ui`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10A implemented. Excludes token definitions, shell, and page adoption. Existing per-feature dialogs are not refactored here (additive only).

## UI/UX gaps (resolved by ui-refiner, 2026-10-29)

All gaps settled in the Decisions block above (D10-11…D10-17). Summary:
- **Primitive set:** introduce `Card`, `Dialog`, `Badge`, `EmptyState` + migrate `Button`/`Input`/`Select` (D10-11).
- **Variants/sizes:** matrices recorded (D10-12 Button 5×3; D10-13 Input/Select size sm/md/lg; D10-14 Card 4×3; D10-15 Badge 5×2).
- **States:** loading (Button spinner + aria-busy), disabled, error, focus (focus-visible ring), hover — treatment recorded (D10-12, D10-13).
- **Dialog:** portal + focus trap + Escape + backdrop + enter animation + reduced motion (D10-17).
- **Tap targets & focus:** `max-sm:min-h-[44px]` and teal focus ring confirmed (shared rules).

No open UI/UX questions remain for this story.