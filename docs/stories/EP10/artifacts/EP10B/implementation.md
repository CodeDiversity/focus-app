# EP10B implementation record

**Story:** [EP10B-shared-ui-primitives-refresh.md](../../EP10B-shared-ui-primitives-refresh.md)
**Implemented:** 2026-10-29 (single implementer pass; frontend only; shared UI primitives refresh)
**Code commit:** (this closeout commit — see checkpoint for provenance)
**Parent:** EP10 breakdown; combined EP10 parent review after all seven children.

## Changed paths

Production:
- `apps/web/src/shared/ui/Button.tsx` — migrated to semantic tokens; 5 variants × 3 sizes per D10-12; loading (spinner + aria-busy), disabled, focus-visible ring, tap targets, icon slots.
- `apps/web/src/shared/ui/Input.tsx` — tokenized; added `size` prop (sm/md/lg) per D10-13; error/hint/label tokens; password toggle aria-label; tap targets.
- `apps/web/src/shared/ui/Select.tsx` — tokenized; added `size` prop (sm/md/lg) per D10-13; chevron tokenized.
- `apps/web/src/shared/ui/Card.tsx` — new (variants default/elevated/outlined/muted; padding sm/md/lg) per D10-14.
- `apps/web/src/shared/ui/Badge.tsx` — new (variants neutral/accent/success/warning/danger; sizes sm/md; icon slot) per D10-15.
- `apps/web/src/shared/ui/EmptyState.tsx` — new (icon/title/description/action) per D10-16.
- `apps/web/src/shared/ui/Dialog.tsx` — new (portal, focus trap, Escape, backdrop, scroll lock, restore focus, enter animation, disableBackdropClose) per D10-17.

Tests:
- `apps/web/src/shared/ui/Button.test.tsx` (updated for token variants/states)
- `apps/web/src/shared/ui/Input.test.tsx` (new)
- `apps/web/src/shared/ui/Select.test.tsx` (new)
- `apps/web/src/shared/ui/Card.test.tsx`, `Dialog.test.tsx`, `Badge.test.tsx`, `EmptyState.test.tsx` (new)

Docs:
- `docs/stories/EP10/artifacts/EP10B/checkpoint.md`
- `docs/stories/EP10/artifacts/EP10B/implementation.md` (this file)
- `docs/stories/EP10/EP10B-shared-ui-primitives-refresh.md` (Status → Implemented)
- `docs/stories/EP10/README.md` (queue row EP10B → Implemented; next → EP10C)

Caller test adjustments (style/aria, no functional change):
- `apps/web/src/pages/login/ui/LoginPage.test.tsx` — password input selector tightened to `/^password$/i` to disambiguate from the new show/hide password toggle's aria-label.
- `apps/web/src/features/assignments/ui/AssignmentsSection.test.tsx` — header button class assertion updated to new token classes.

No backend/API changes. No page adoption (EP10D–G untouched).

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Button/Input/Select consume semantic tokens; public props/API unchanged | **PASS.** Migrated to accent/surface/text/etc.; added additive `size` to Input/Select; Button props unchanged. | Component files; typecheck green |
| 2 New primitives in shared/ui, token-driven | **PASS.** Card, Dialog, Badge, EmptyState added; all use semantic tokens. | Component files |
| 3 Consistent variants, sizes, states | **PASS.** Button 5×3; Input/Select sm/md/lg; Card 4×3; Badge 5×2; loading/disabled/error/focus/hover. | Tests |
| 4 Focus rings visible; tap targets ≥44px mobile | **PASS.** focus-visible ring on interactive; `max-sm:min-h-[44px]`. | Component files |
| 5 Component tests cover variants/sizes/states/focus/a11y | **PASS.** 7 test files, 53 shared/ui tests. | Test run |
| 6 Existing Button.test passes; no caller regressions | **PASS.** Full web suite 822/822 green. | Test run |

## Verification

- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web lint` — exit 0.
- `pnpm --filter web build` — exit 0 (vite build, 1607 modules).
- `pnpm --filter web test -- src/shared/ui` — 7 files / 53 tests, exit 0.
- `pnpm --filter web test` — 66 files / 822 tests, exit 0.
- `pnpm --filter web format` (prettier check) — all matched files use Prettier code style.

## DoD mapping

1 Functional criteria — pass. 2 — n/a (primitives render passed errors). 3 — n/a (no data). 4 — n/a (no API). 5 Loading/empty/error states exposed — pass. 6 Keyboard a11y + focus + aria — pass (Dialog focus trap/Escape/restore tested). 7 Responsive tap targets — pass. 8 Automated tests — pass. 9 — n/a. 10/11 — combined EP10 parent review.

## Findings and deviations

Findings/deviations: None (see checkpoint F-B-1…F-B-3 for non-blocking observations; all resolved).

## Status

Implemented — awaiting parent review.