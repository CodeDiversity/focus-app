# EP10A implementation record

**Story:** [EP10A-design-tokens-and-theme-foundation.md](../../EP10A-design-tokens-and-theme-foundation.md)
**Implemented:** 2026-10-29 (single implementer pass; frontend only; tokens + global CSS)
**Code commit:** (this closeout commit — see checkpoint for provenance)
**Parent:** EP10 breakdown; combined EP10 parent review after all seven children.

## Changed paths

Production:

- `apps/web/tailwind.config.js` — added semantic color tokens (mapped to RGB-channel CSS vars), constrained typography scale (`display`/`h1`/`h2`/`h3`/`body`/`body-sm`/`caption`), radius steps (`sm`/`md`/`lg`/`xl`), shadow steps (`sm`/`md`/`lg`), motion durations (`fast`/`base`/`slow`) + standard easing. Retained existing `primary`/`secondary` palettes and Inter font for D10-1 evolve/compatibility. No new plugins.
- `apps/web/src/index.css` — defined color/motion CSS custom properties in `:root` (RGB channels), rewrote base styles to consume tokens, tokenized `.card`/`.btn`/`.btn-primary`/`.btn-secondary`/`.btn-outline`/`.input-error`/`.error-message`, updated scrollbar + focus-visible, added `prefers-reduced-motion` zeroing.

Docs/artifacts:

- `docs/stories/EP10/artifacts/EP10A/checkpoint.md`
- `docs/stories/EP10/artifacts/EP10A/contrast-record.md` — final verified token→value table + per-pair ratios.
- `docs/stories/EP10/artifacts/EP10A/implementation.md` (this file)

No component or page files changed. No backend/API changes.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Tailwind semantic color tokens + typography + radius + shadow + motion | **PASS.** `tailwind.config.js` defines all 13 semantic colors, 7-step type scale, 4 radius steps, 3 shadow steps, 3 motion durations. | Config file; typecheck/build green |
| 2 `index.css` exposes tokens as CSS vars; base styles consume them | **PASS.** `:root` defines `--color-*` (RGB channels) and `--duration-*`; base styles use semantic utilities. | `index.css` |
| 3 Legacy classes consume tokens; class names unchanged | **PASS.** `.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.input-error`, `.error-message` rewritten per D10-7. | `index.css` components layer |
| 4 Reduced motion zeroing | **PASS.** `@media (prefers-reduced-motion: reduce)` sets durations to `0.01ms`, disables animations/transitions, resets scroll-behavior. | `index.css` |
| 5 No component/page file changed; tests/typecheck/lint pass | **PASS.** Only config + CSS changed in app; full web suite 773/773, typecheck/lint/build green. | Verification below |
| 6 WCAG 2.2 AA contrast recorded | **PASS.** Values in story D10-4 table and `./artifacts/EP10A/contrast-record.md`; all listed pairs pass (border decorative exception documented). | contrast record |

## Verification

- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web lint` — exit 0.
- `pnpm --filter web build` — exit 0 (vite build, 1607 modules).
- `pnpm --filter web test` — 60 files / 773 tests, exit 0.
- `pnpm --filter web format` (prettier check) — all matched files use Prettier code style.
- Manual visual smoke: not executed in this automated pass; recommended before parent review (existing pages use retained `primary`/`secondary` and tokenized legacy classes, so no functional regression expected).

## DoD mapping

1 Functional criteria — pass (token foundation only). 2/3/4/9 — not applicable (no input/data/API/migration). 5 States — n/a (no component logic). 6 Keyboard/focus token — focus-ring token contrast verified (5.47/5.23/5.00 :1); primitive behavior in EP10B/C. 7 Responsive — unchanged. 8 Automated tests — web suite green. 10/11 — combined EP10 parent review.

## Findings and deviations

Findings/deviations: None.

- No new component tests (per story scope; primitive/a11y tests land in EP10B).
- Legacy `primary`/`secondary` palettes retained for D10-1 compatibility; new code should prefer semantic tokens.
- `label` base style retained original `text-secondary-700` color to avoid an unrecorded restyle (not in D10-7 base-style list).

## Status

Implemented — awaiting parent review.
