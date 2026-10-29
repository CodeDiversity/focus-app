# EP10A contrast record

**Story:** EP10A — Design tokens & theme foundation
**Artifact:** `docs/stories/EP10/artifacts/EP10A/contrast-record.md`
**Scope:** final verified token→value table and WCAG 2.2 AA contrast ratios for the light theme only (dark mode out of scope, D10-9).

## Token → value table (final)

### Semantic color tokens (CSS custom properties in `:root`, RGB channels)

| Token (Tailwind) | CSS var | RGB channels | Hex | Role |
|---|---|---|---|---|
| `background` | `--color-background` | `248 250 252` | #f8fafc (slate-50) | Page background |
| `surface` | `--color-surface` | `255 255 255` | #ffffff | Cards, inputs |
| `surface-muted` | `--color-surface-muted` | `241 245 249` | #f1f5f9 (slate-100) | Subtle fills, hover |
| `text` | `--color-text` | `15 23 42` | #0f172a (slate-900) | Primary text |
| `text-muted` | `--color-text-muted` | `71 85 105` | #475569 (slate-600) | Secondary text |
| `border` | `--color-border` | `226 232 240` | #e2e8f0 (slate-200) | Decorative separators (non-essential) |
| `border-strong` | `--color-border-strong` | `100 116 139` | #64748b (slate-500) | Control borders (≥3:1) |
| `accent` | `--color-accent` | `15 118 110` | #0f766e (teal-700) | Primary action fill + links |
| `accent-hover` | `--color-accent-hover` | `17 94 89` | #115e59 (teal-800) | Hover/pressed accent |
| `danger` | `--color-danger` | `220 38 38` | #dc2626 (red-600) | Errors/destructive |
| `success` | `--color-success` | `21 128 61` | #15803d (green-700) | Success states |
| `warning` | `--color-warning` | `161 98 7` | #a16207 (amber-700) | Warnings |
| `focus-ring` | `--color-focus-ring` | `15 118 110` | #0f766e (teal-700) | = accent |

### Typography scale (Tailwind `fontSize`)

| Step | Size | Line-height | Weight |
|---|---|---|---|
| `display` | 2.25rem (36px) | 2.5rem | 600 |
| `h1` | 1.875rem (30px) | 2.25rem | 600 |
| `h2` | 1.5rem (24px) | 2rem | 600 |
| `h3` | 1.25rem (20px) | 1.75rem | 600 |
| `body` | 1rem (16px) | 1.5rem | 400 |
| `body-sm` | 0.875rem (14px) | 1.25rem | 400 |
| `caption` | 0.75rem (12px) | 1rem | 500 |

Font family: Inter, system-ui, sans-serif (unchanged). Weights available: 400, 500, 600 (no 700).

### Radius (Tailwind `borderRadius`)

| Step | Value |
|---|---|
| `sm` | 0.375rem (6px) |
| `md` | 0.5rem (8px) |
| `lg` | 0.75rem (12px) |
| `xl` | 1rem (16px) |

### Shadow (Tailwind `boxShadow`)

| Step | Value |
|---|---|
| `sm` | 0 1px 2px 0 rgb(0 0 0 / 0.05) |
| `md` | 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07) |
| `lg` | 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08) |

### Motion (Tailwind `transitionDuration` + CSS vars)

| Step | Duration | CSS var |
|---|---|---|
| `fast` | 150ms | `--duration-fast` |
| `base` | 200ms | `--duration-base` |
| `slow` | 300ms | `--duration-slow` |

Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (standard). Under `prefers-reduced-motion: reduce`, durations resolve to `0.01ms` and animations/transitions are disabled.

## Contrast record (WCAG 2.2 AA)

Text/background pairs:

| Foreground | Background | Ratio | Pass (≥4.5:1 text / ≥3:1 UI) |
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

Focus-ring token (`focus-ring` #0f766e) meets WCAG 2.2 AA against `surface`, `background`, and `surface-muted` (5.47 / 5.23 / 5.00 :1). Primitive-level focus behavior is verified in EP10B/C.

## Legacy class tokenization (class names unchanged)

| Class | Tokenized body |
|---|---|
| `.btn` | `inline-flex items-center justify-center px-4 py-2 font-medium rounded-md transition-colors duration-base` |
| `.btn-primary` | `btn bg-accent text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2` |
| `.btn-secondary` | `btn bg-surface-muted text-text hover:bg-border` |
| `.btn-outline` | `btn border-2 border-accent text-accent hover:bg-accent/10` |
| `.card` | `bg-surface rounded-lg shadow-md p-6` |
| `.input-error` | `border-danger text-danger placeholder-danger/70 focus:border-danger focus:ring-danger` |
| `.error-message` | `mt-1 text-sm text-danger` |

## Base styles (tokenized)

- `body` → `bg-background text-text font-sans`
- headings → `text-text font-semibold`
- links → `text-accent hover:text-accent-hover`
- inputs/selects/textarea → `bg-surface border-border-strong text-text placeholder-text-muted focus:border-accent focus:ring-accent`
- buttons → `focus:ring-accent`

## Delivery

- Tailwind theme + CSS custom properties (RGB channels for colors + motion vars). No new Tailwind plugins. Dark mode out of scope (light only; variables defined in `:root` only).
- Reduced motion: under `prefers-reduced-motion: reduce`, durations resolve to `0.01ms`, transitions/animations disabled, `scroll-behavior` reset to `auto`.

## Verification

- `pnpm --filter web typecheck`
- `pnpm --filter web lint`
- `pnpm --filter web build`
- Manual visual smoke of existing pages (no functional regression).

Verification results recorded in `./implementation.md`.
