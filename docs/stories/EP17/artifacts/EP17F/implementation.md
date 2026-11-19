# EP17F — Proposal composition and decision affordances — implementation record

**Implementer:** implementer session, 2026-11-19 (the session that closed
EP17E). **Branch:** `hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/elm`
(worktree), base `6e7cdad` (EP17E).

## Completed behavior

`/plan/proposal` is composed as **four regions** in rank order (▲ D-F1/▲ D-F2,
replacing EP16C's D-C6):

1. **Judge the week** — `h1` (focus target unchanged), `weekLine`, and the one
   pacing sentence. `proposalSummary` gained an **optional** third argument
   (D-F3): absent, the pre-EP17D string is byte-identical (the existing D-C12
   assertions pass unchanged); present, the sentence reads
   `"5 sessions · about 4 h this week · spread across 3 days"` /
   `"… · on 1 day"`, fed from `preview.pacing?.studyDays.length` — the
   **selected** day set (contracts §5, ▲ D-D1), hence "spread across". No `%`
   anywhere (copy audit forbids the character). EP17G's control slot sits
   under this region.
2. **Change the week** — EP17E's `EditableWeek` (or the preserved empty
   state).
3. **What will not happen** — the `conflict-summary` alert then
   `WorkloadWarnings`, always visible at every width (▲ D-F2). EP16K's
   "a 409 forces the disclosure open" rule is retired: nothing here can be
   hidden, asserted by a test that the summary is never inside the
   disclosure panel.
4. **Reassurance and context** — one `<Disclosure label="What else changed">`
   (new `shared/ui/Disclosure.tsx`, D-F6) holding `CalibrationNote` (▲ D-F7
   (a): it may start collapsed below `md`, no auto-expand), `WhatThisKeepsCard`
   (lock toggle intact) and `MovedForwardList`. `defaultOpen` is
   `useMediaQuery(MD_UP_QUERY, true)` — open at `md`+, collapsed below; the
   synchronous first render means no flash and the desktop-default tests stay
   green. Heading outline unchanged (`h2`s inside the panel).

The header's two buttons are gone; `ProposalActionBar` (new) renders the
**one** `Use this plan` (only when a preview exists — loading/error/rolled-over
show only `Not now`, as before) and the **one** `Not now`, fixed at
`bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0`,
`pb-[env(safe-area-inset-bottom)] md:pb-0`, `z-20` under the tab bar's `z-30`
(D-F5 — the same `md` boundary `useTabBarVisible` uses, in CSS; no
features → widgets import). The proposal `<section>` reserves `pb-24` so the
last day of the week is never under the bar. `useProposal` is untouched; the
F-EP16F-02 cache resets and D-C9/D-C11/`WINDOW_ROLLED_OVER` behaviours are
preserved — only which component renders the buttons changed.

## AC-by-AC

| AC | Outcome |
|---|---|
| EP17F-AC1 | **Met.** `getAllByRole` returns exactly one of each; both live in `ProposalActionBar`; the header `<div>` contains no button; reachability by construction (fixed bar) asserted structurally, position at 360×640 owned by EP17H (V-17-5). |
| EP17F-AC2 | **Met.** Class contract asserted on the bar (offset, safe-area padding, `z-20`) in both `ProposalActionBar.test.tsx` and `PlanProposal.test.tsx`, and `pb-24` on the section. |
| EP17F-AC3 | **Met.** One sentence (a `<p>`, never a heading), extended `proposalSummary`; boundary tests: "on 1 day", empty proposal renders no summary, and the no-`pacing` fallback is byte-identical. |
| EP17F-AC4 | **Met.** Four-region DOM order asserted (`proposal-summary` → `editable-week` → `Workload warnings` → disclosure contents); the disclosure button carries the visible label, `aria-expanded` and `aria-controls`; expanded at `md`+ (jsdom fallback) and collapsed below (`matchMedia` stub test); every demoted region reachable through it. |
| EP17F-AC5 | **Met.** Focus-on-`h1` (entry + Try again), confirm → three cache resets → `/today`, Not now → `/plan` with no request, rolled-over banner / skeleton / error card byte-unchanged, 409 marks sessions + one conflict summary + edits preserved — all pre-existing tests pass against the recomposition. |
| EP17F-AC6 | **Met.** Keyboard test follows the new visual order (heading → week → … → action bar); 44 px below `sm` on the bar buttons and the disclosure; no animation added (reduced-motion safe); axe (wcag2a/2aa/21a/21aa/22aa, `color-contrast` excluded — needs real rendering, covered by the e2e axe pass) reports zero violations at 1280 px and 360 px. |

## Verification (cwd `apps/web`, state: EP17E+EP17F complete)

| Command | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `npx vitest run src/features/plan-proposal src/shared/ui/Disclosure.test.tsx` | PASS — 9 files, 79 tests (28 in `PlanProposal.test.tsx`, incl. the axe case) |
| `pnpm test` (full web unit suite) | PASS — 137 files, 1472 tests |
| `npx eslint src/shared/ui/Disclosure.{tsx,test.tsx} src/features/plan-proposal/ui e2e/plan-flow.spec.ts` | 1 error — the pre-existing F-EP17A-01 unused-var in `plan-flow.spec.ts:731`; no new error |

Test counts (this record is the only home): new `Disclosure.test.tsx` 4,
`ProposalActionBar.test.tsx` 5; `PlanProposal.test.tsx` now 28 (8 new EP17F
cases incl. axe at two widths); targeted run 79 / 0 failed; full web suite
1472 / 0 failed. `apps/api` untouchable and untouched.

## Changed paths / commit scope

- `apps/web/src/shared/ui/Disclosure.tsx` + `.test.tsx` (new, D-F6)
- `apps/web/src/features/plan-proposal/ui/ProposalActionBar.tsx` + `.test.tsx` (new)
- `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx`, `PlanProposal.test.tsx`
- `apps/web/e2e/plan-flow.spec.ts` (narrow-viewport case — see deviation 2)
- `docs/stories/EP17/EP17F-proposal-composition-and-decision.md` (Status, sizing actual), `docs/stories/EP17/README.md` (queue row), this record

## Deviations

1. **The disclosure renders only when it has content** (any calibration
   annotation, kept session/count or moved-forward session): an expandable
   region whose panel is empty is noise, and all three children already
   render `null` when empty. The AC's "every EP16C region is still present
   and reachable" holds whenever a region has something to say.
2. **`e2e/plan-flow.spec.ts` narrow-viewport case updated**: the old
   assertion pinned the *header* buttons stacking vertically at 320 px; the
   buttons now share the action bar's one row (same `y`, ≥44 px), and the
   lock toggle sits behind the collapsed "What else changed" below `md`, so
   the test opens it first. DB-gated; not run locally (EP17H owns the
   Playwright run). No other e2e change was needed — the desktop-viewport
   specs see the disclosure open by default and the bar's buttons by the same
   accessible names.
3. **The axe component test excludes `color-contrast`** (jsdom has no real
   rendering); contrast is covered by the existing e2e `axeViolations` helper
   (EP17H). The axe copy is loaded through `eslint-plugin-jsx-a11y`'s
   resolver, the same no-new-dependency route `e2e/helpers.ts` uses.

## Findings

- **F-EP17F-01** — source: AC-E17-10 sweep while recomposing; path:
  `PlanProposal.tsx` conflict-summary list (`{c.date} {c.startTime} — …`);
  issue: the 409 summary prints the raw ISO date; EP17F-AC5 freezes this copy
  ("the confirm's 409 handling … unchanged in behaviour and in copy") and the
  e2e 409 test asserts the ISO string, so changing it here would contradict a
  frozen AC; joins F-EP17E-02 (WhatThisKeepsCard / MovedSessionRow ISO dates)
  as the one remaining AC-E17-10 gap on the page; disposition: reported for
  the combined review / a follow-up story; owner: planner; closure evidence:
  pending.

Checkpoint: none (closed in-session).
