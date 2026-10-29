# EP10A: Design Tokens & Theme Foundation

**Story ID:** EP10A
**Title:** Frontend — design tokens and theme foundation (Tailwind + global CSS)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** None.
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning; ui-refiner pass required before implementation)

## Summary

Establish the token-driven styling foundation: semantic color, typography, spacing, radius, shadow, and motion tokens in the Tailwind theme and global CSS, with reduced-motion handling. This story changes no component or page; it prepares the system the later stories consume.

## Description & bounded scope

### In scope

1. **Tailwind theme** (`apps/web/tailwind.config.js`): define semantic color tokens, typography scale, radius, shadow, and motion tokens per the shared contract, mapping each semantic token to a concrete palette entry.
2. **Global CSS** (`apps/web/src/index.css`): expose the tokens as CSS custom properties where useful, update base styles to consume them, and tokenize `.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.input-error`, `.error-message`.
3. **Reduced motion:** under `prefers-reduced-motion: reduce`, motion durations resolve to ~0.
4. **Retain legacy class names** (D10-7) so existing callers keep working during incremental adoption.

### Out of scope

- Component or page changes (EP10B–EP10G).
- Dark mode (D10-9 — only if the ui-refiner records it).
- New primitives (EP10B).
- Any backend/API change (D10-2).

## Source requirement references

- **Epic AC-E10-01, AC-E10-06** (token-driven styling; WCAG contrast + reduced motion).
- **Shared Definition of Done** ([docs/epics/README.md](../../epics/README.md#definition-of-done)) — items 1, 6, 7, 8 (8 = build/typecheck/lint + manual visual), 10/11 belong to the combined EP10 parent review.
- **Decisions:** D10-1 (evolve), D10-3 (ui-refiner), D10-4…D10-7, D10-9.

## Acceptance criteria

1. `tailwind.config.js` defines the semantic color tokens (`background`, `surface`, `surface-muted`, `text`, `text-muted`, `border`, `border-strong`, `accent`, `accent-hover`, `danger`, `success`, `warning`, `focus-ring`), a constrained typography scale, radius steps, shadow steps, and motion durations.
2. `index.css` exposes the tokens (as CSS custom properties where useful) and base styles consume them.
3. `.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.input-error`, `.error-message` consume tokens; their class names are unchanged.
4. Under `prefers-reduced-motion: reduce`, motion durations resolve to zero (or near-zero).
5. No component or page file is changed; existing tests, typecheck, and lint pass.
6. Token text/background pairs meet WCAG 2.2 AA contrast (recorded values).

## Tests to add / update

- No new component tests (no component logic changes).
- Verification: `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web build`, plus a manual visual smoke of the existing pages to confirm nothing broke.
- Primitive/a11y tests land in EP10B.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/tailwind.config.js`: `primary` (blue 50–900), `secondary` (slate 50–900), `fontFamily.sans` Inter/system-ui; no plugins.
- `apps/web/src/index.css`: base styles + `.btn*`/`.card`/`.input-error`/`.error-message` + scrollbar + focus-visible.
- No CSS custom properties exist yet.

### Proposed files

- `apps/web/tailwind.config.js` (modify)
- `apps/web/src/index.css` (modify)

### Unverified / for ui-refiner

- Exact palette values, typography scale steps, radius/shadow/motion durations.
- Whether tokens are exposed as CSS custom properties in addition to Tailwind theme entries.
- Dark mode (D10-9).

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Not applicable — no state changes; existing states preserved.
6. Not applicable — focus styles retained (verified in EP10B/C).
7. Responsive behavior unchanged (verified by build + manual smoke).
8. Not applicable — no component logic; verification is build/typecheck/lint + manual visual.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** a token-driven Tailwind theme + global CSS foundation with reduced-motion handling, no component/page changes.
- **Request/token estimate:** ~1–2 requests/tokens — config + CSS edits, verification, manual smoke.
- **Model recommendation:** 3 — foundational but mechanical once the ui-refiner settles values; a strong mid-tier model is right.
- **Files:** `apps/web/tailwind.config.js`, `apps/web/src/index.css`.
- **Start context:** this story file; the shared contract in `docs/stories/EP10/README.md`; `apps/web/tailwind.config.js` and `apps/web/src/index.css`.
- **Verification:** `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web build`, plus manual visual smoke.
- **Dependencies / exclusions:** None. Excludes component/page changes, dark mode (unless ui-refiner records it), and new primitives.

## UI/UX gaps for the `ui-refiner` (D10-3 — required before implementation)

- **Palette:** choose the Apple/Google-inspired minimal palette (accent, surfaces, text, borders, danger/success/warning) with WCAG 2.2 AA contrast; map semantic tokens to concrete values.
- **Typography:** settle the size/line-height/weight scale and whether Inter stays or changes (D10-5).
- **Spacing/radius/shadow/motion:** settle the constrained scales and durations, including reduced-motion behavior.
- **Token delivery:** Tailwind theme only, or Tailwind + CSS custom properties (and which components consume which).
- **Legacy classes:** confirm `.card`/`.btn*` tokenization approach and any visual restyle (D10-7).
- **Dark mode:** decide in or out (D10-9).