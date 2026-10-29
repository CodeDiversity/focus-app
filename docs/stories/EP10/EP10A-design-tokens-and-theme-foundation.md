# EP10A: Design Tokens & Theme Foundation

**Story ID:** EP10A
**Title:** Frontend — design tokens and theme foundation (Tailwind + global CSS)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Implemented — awaiting parent review
**Dependencies:** None.
**Jira key:** Pending creation
**Refined:** 2026-10-29 (ui-refiner pass — palette, typography, scales, delivery, legacy classes, dark mode settled)

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
- Dark mode (D10-9 — recorded as out of scope by the ui-refiner; light theme only).
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
6. Token text/background pairs meet WCAG 2.2 AA contrast. The recorded contrast values live in two inspectable places: (a) the `ui-refiner` decision register on EP10A (D10-3/D10-4 — the palette mapping with per-pair contrast ratios below), and (b) the EP10A implementation record under `./artifacts/EP10A/` (the final verified token→value table). "Recorded values" means a concrete, inspectable artifact in one of those two locations, not an unspecified note. Exact values remain the `ui-refiner`'s job (D10-3).

## Tests to add / update

- No new component tests (no component logic changes).
- Verification: `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web build`, plus a manual visual smoke of the existing pages to confirm nothing broke.
- Primitive/a11y tests land in EP10B.
- Implementation record: write `./artifacts/EP10A/contrast-record.md` (or equivalent) with the final verified token→value table and per-pair ratios; required by AC #6(b).

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- `apps/web/tailwind.config.js`: `primary` (blue 50–900), `secondary` (slate 50–900), `fontFamily.sans` Inter/system-ui; no plugins.
- `apps/web/src/index.css`: base styles + `.btn*`/`.card`/`.input-error`/`.error-message` + scrollbar + focus-visible.
- No CSS custom properties exist yet.

### Proposed files

- `apps/web/tailwind.config.js` (modify)
- `apps/web/src/index.css` (modify)

### Decisions (ui-refiner, 2026-10-29)

**D10-4 — Semantic color tokens (Apple/Google-inspired minimal, teal accent).** Values are RGB-channel CSS variables (see delivery) so opacity modifiers work. Text/background pairs are WCAG 2.2 AA (≥4.5:1 for text; ≥3:1 for non-text UI).

| Token | Value | Hex | Notes |
|---|---|---|---|
| `background` | `rgb(248 250 252)` | #f8fafc (slate-50) | Page background |
| `surface` | `rgb(255 255 255)` | #ffffff | Cards, inputs |
| `surface-muted` | `rgb(241 245 249)` | #f1f5f9 (slate-100) | Subtle fills, hover |
| `text` | `rgb(15 23 42)` | #0f172a (slate-900) | Primary text |
| `text-muted` | `rgb(71 85 105)` | #475569 (slate-600) | Secondary text |
| `border` | `rgb(226 232 240)` | #e2e8f0 (slate-200) | Decorative separators (non-essential) |
| `border-strong` | `rgb(100 116 139)` | #64748b (slate-500) | Control borders (≥3:1) |
| `accent` | `rgb(15 118 110)` | #0f766e (teal-700) | Primary action fill + links |
| `accent-hover` | `rgb(17 94 89)` | #115e59 (teal-800) | Hover/pressed accent |
| `danger` | `rgb(220 38 38)` | #dc2626 (red-600) | Errors/destructive |
| `success` | `rgb(21 128 61)` | #15803d (green-700) | Success states |
| `warning` | `rgb(161 98 7)` | #a16207 (amber-700) | Warnings |
| `focus-ring` | `rgb(15 118 110)` | #0f766e (teal-700) | = accent |

Contrast record (text/background pairs, WCAG 2.2 AA):

| Foreground | Background | Ratio | Pass? |
|---|---|---|---|
| `text` #0f172a | `background` #f8fafc | 17.06:1 | Yes |
| `text` #0f172a | `surface` #ffffff | 17.85:1 | Yes |
| `text` #0f172a | `surface-muted` #f1f5f9 | 16.30:1 | Yes |
| `text-muted` #475569 | `background` #f8fafc | 7.24:1 | Yes |
| `text-muted` #475569 | `surface` #ffffff | 7.58:1 | Yes |
| `text-muted` #475569 | `surface-muted` #f1f5f9 | 6.92:1 | Yes |
| white #ffffff | `accent` #0f766e | 5.47:1 | Yes |
| white #ffffff | `accent-hover` #115e59 | 7.58:1 | Yes |
| white #ffffff | `danger` #dc2626 | 4.83:1 | Yes |
| white #ffffff | `success` #15803d | 5.02:1 | Yes |
| white #ffffff | `warning` #a16207 | 4.92:1 | Yes |
| `focus-ring` #0f766e | `background` #f8fafc | 5.23:1 | Yes |
| `focus-ring` #0f766e | `surface` #ffffff | 5.47:1 | Yes |
| `focus-ring` #0f766e | `surface-muted` #f1f5f9 | 5.00:1 | Yes |
| `border-strong` #64748b | `surface` #ffffff | 4.76:1 (≥3 UI) | Yes |

`border` #e2e8f0 is a decorative separator (1.23:1 on white) and is not required to meet the 3:1 non-text threshold because it is not the sole affordance for any control; inputs use `border-strong`.

**D10-5 — Typography.** Keep Inter/system-ui/sans-serif (no new font). Constrained scale (Tailwind `fontSize` entries, each with line-height and weight):

| Step | Size | Line-height | Weight |
|---|---|---|---|
| `display` | 2.25rem (36px) | 2.5rem | 600 (semibold) |
| `h1` | 1.875rem (30px) | 2.25rem | 600 |
| `h2` | 1.5rem (24px) | 2rem | 600 |
| `h3` | 1.25rem (20px) | 1.75rem | 600 |
| `body` | 1rem (16px) | 1.5rem | 400 (regular) |
| `body-sm` | 0.875rem (14px) | 1.25rem | 400 |
| `caption` | 0.75rem (12px) | 1rem | 500 (medium) |

Weights available: 400 (regular), 500 (medium), 600 (semibold). No bold (700).

**D10-6 — Spacing / radius / shadow / motion.**

- Spacing: Tailwind default scale (0.25rem / 4px base). Arbitrary values disallowed in new/changed code; use scale steps only.
- Radius (Tailwind `borderRadius`): `sm` 0.375rem (6px), `md` 0.5rem (8px), `lg` 0.75rem (12px), `xl` 1rem (16px). (Baseline inputs `rounded-lg` → `rounded-md`; cards `rounded-xl` → `rounded-lg`.)
- Shadow (Tailwind `boxShadow`): `sm` 0 1px 2px 0 rgb(0 0 0 / 0.05); `md` 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07); `lg` 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08).
- Motion (Tailwind `transitionDuration`): `fast` 150ms, `base` 200ms, `slow` 300ms. Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (standard). Reduced motion: under `prefers-reduced-motion: reduce`, all durations resolve to 0ms (0.01ms floor in CSS to avoid breaking `transitionend`), transitions/animations disabled, and `scroll-behavior` reset to `auto`.

**D10-7 — Legacy classes retained but tokenized.** Class names unchanged; bodies rewritten to consume semantic tokens. Visual character (sizes, radii, shadows) preserved (tokenize only, no restyle):

- `.btn`: `inline-flex items-center justify-center px-4 py-2 font-medium rounded-md transition-colors duration-base`
- `.btn-primary`: `btn bg-accent text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2`
- `.btn-secondary`: `btn bg-surface-muted text-text hover:bg-border`
- `.btn-outline`: `btn border-2 border-accent text-accent hover:bg-accent/10`
- `.card`: `bg-surface rounded-lg shadow-md p-6`
- `.input-error`: `border-danger text-danger placeholder-danger/70 focus:border-danger focus:ring-danger`
- `.error-message`: `mt-1 text-sm text-danger`

Base styles updated to consume tokens: `body` → `bg-background text-text font-sans`; headings → `text-text font-semibold`; links → `text-accent hover:text-accent-hover`; inputs/selects/textarea → `bg-surface border-border-strong text-text placeholder-text-muted focus:border-accent focus:ring-accent`; buttons → `focus:ring-accent`.

**D10-9 — Dark mode: out of scope.** Light theme only; no `.dark` class or dark variants. Color CSS variables are defined in `:root` only. Future dark mode can override the same variables without changing component code.

**Token delivery (D10-4/D10-6).** Tailwind theme + CSS custom properties, hybrid:

- `index.css` `:root` defines color tokens as RGB channels (e.g. `--color-background: 248 250 252;`) and motion durations (e.g. `--duration-base: 200ms;`), so `rgb(var(--color-*) / <alpha-value>)` works in Tailwind and values are inspectable at runtime.
- `tailwind.config.js` maps semantic colors to `rgb(var(--color-*) / <alpha-value>)`, and defines `fontFamily`, `fontSize`, `borderRadius`, `boxShadow`, `transitionDuration` directly in the theme (radius/shadow/motion are compile-time scales; colors are runtime vars for theming).
- Radius/shadow/typography are Tailwind-only (no CSS vars) because legacy classes consume them via `@apply`. Motion durations are exposed as both Tailwind `transitionDuration` entries and CSS vars (`--duration-*`) so reduced-motion and CSS animations can read them.
- No new Tailwind plugins.

**Focus ring (DoD 6).** `focus-ring` token (#0f766e) meets WCAG 2.2 AA against `surface`, `background`, and `surface-muted` (5.47 / 5.23 / 5.00 :1). Primitive-level focus behavior is verified in EP10B/C.

### Unverified / for ui-refiner

- (Settled above; no open UI/UX questions remain for this story.)

### Decision register sync (planner/coordinator)

The following register rows in `docs/stories/EP10/README.md` should be reconciled to these settled values by the planner (ui-refiner does not edit the README): D10-4 (palette mapping + ratios above), D10-5 (Inter retained + scale above), D10-6 (scales/durations above), D10-7 (tokenize-only legacy classes), D10-9 (dark mode out). D10-3 is satisfied by this pass.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no data access.
4. Not applicable — no API changes.
5. Not applicable — no state changes; existing states preserved.
6. Not applicable for component behavior (verified in EP10B/C), but EP10A owns the focus-ring **token**: include a quick verification that the `focus-ring` semantic token meets WCAG 2.2 AA contrast against the surfaces it appears on (`surface`, `background`, `surface-muted`), and record the value alongside the contrast record (see AC #6). Primitive behavior verification stays in EP10B/C.
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
- **Dependencies / exclusions:** None. Excludes component/page changes, dark mode (decided out of scope), and new primitives.

## UI/UX gaps for the `ui-refiner` (D10-3 — required before implementation)

- **Palette:** settled — teal accent (#0f766e) with slate neutrals; WCAG 2.2 AA ratios recorded above and to be copied to `./artifacts/EP10A/`.
- **Typography:** settled — Inter retained; scale above.
- **Spacing/radius/shadow/motion:** settled — scales and durations above, including reduced-motion zeroing.
- **Token delivery:** settled — Tailwind + CSS custom properties (RGB channels) above.
- **Legacy classes:** settled — tokenize only, class names unchanged, mappings above.
- **Dark mode:** settled — out of scope (D10-9).