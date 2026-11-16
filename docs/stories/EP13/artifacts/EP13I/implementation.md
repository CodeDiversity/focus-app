# EP13I implementation record

**Story:** [EP13I — Micro-Start and Hyperfocus Absorption](../../EP13I-micro-start-and-hyperfocus-absorption.md) (re-lettered from EP13J, D13-16)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-15
**Commit scope:** `apps/api/src/modules/study-sessions/` (absorb-next, the optional from-planned body, one new DTO, three specs incl. one gated), `apps/web/src/` (today-card hero, start dialog, focus timer restyle, the new `AbsorbNextOffer`, start hook/entity client, five specs), EP13I docs/queue updates. **No migration.**

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — one-interaction micro-start, linked, EP13A math holds | **Done.** Hero: "Just 10 min" beside "Start focus" (hidden when resuming); dialog: "Just 10 minutes" bypasses the duration form. Both post `{ plannedMinutes: 10 }`; `from-planned` accepts the optional body (5..480, validated at both layers) and the planned row's lifecycle is untouched. The gated journey asserts confirmed +10 / remaining −10 through `GET /study-plans/remaining-work` after a real finish. | `TodayPlanCard.test.tsx` (+3), `StartFocusSessionDialog.test.tsx` (new, 2), planned-link unit spec (+4, incl. flex-row fix-up keeping its own duration), gated journey |
| 2 — gated inline offer; accept grows the target in place; decline is local and final per candidate | **Done.** `AbsorbNextOffer` renders only when target-reached × ACTIVE × candidate (from the existing `todayPlanApi` — no new read endpoint); accept applies the grown session through `applySession` (no remount); decline is component state keyed by candidate id, no API call. | `AbsorbNextOffer.test.tsx` (6 cases: gating matrix, accept + refetch, decline, quiet 409, keyboard, role) |
| 3 — transactional, scoped, race-safe endpoint with actionable 409s | **Done.** Candidate = earliest `SCHEDULED` same-assignment row on the session's civil day (profile zone), own linked row excluded. One transaction, both writes conditional: a raced candidate or a stopped session matches 0 rows, throws, and rolls everything back. Uniform 404 via `ownedWhere`. | `study-sessions-absorb.service.spec.ts` (new, 9: determinism, Auckland boundary, 409 matrix, both race arms, 404/scoping); gated double-absorb journey |
| 4 — positive framing; no overrun flags | **Done.** The timer's target-reached state drops its warning styling entirely (meta + progress bar → success, D-I7) — for every session, candidate or not; the offer copy is "Still going — fold in the next … session?" and a lost race dismisses quietly instead of erroring at someone who is working. | copy assertions in the offer spec (`not.toMatch(/exceed|overrun|over target|late/)`); `FocusTimer` suite green |
| 5 — states, keyboard, narrow screens, announced accessibly | **Done.** The offer is a persistent `role="status"` card (never a toast), both actions real buttons with 44px mobile targets; the hero's two buttons stack under `sm`; no animation so reduced motion is trivial. | offer/card specs; `DashboardPage` keyboard-order test extended for the second start control |

## Verification (2026-11-15)

- `apps/api`: `pnpm jest` → **1028 passed**, 475 skipped (gated, CI-executed), 0 failed; typecheck/lint/format clean.
- `apps/web`: `pnpm vitest run` → **1200 passed, 0 failed** (106 files); typecheck/lint/format clean.
- New/changed tests: `study-sessions-absorb.service.spec.ts` (new, 9), planned-link unit spec (+4), gated planned-link e2e (+2 journeys), `AbsorbNextOffer.test.tsx` (new, 6), `StartFocusSessionDialog.test.tsx` (new, 2), `TodayPlanCard.test.tsx` (+3), `DashboardPage.test.tsx` (keyboard-order inventory +1 start control).

## Deviations from the plan (each with why)

1. **"No backend change" became two small additive API changes** (recorded at refinement, D-I4): the optional `plannedMinutes` body on `from-planned` — without it, a hero micro-start would have had to use the unlinked create path, leaving the planned row `SCHEDULED` while its work happened — plus the story's own `absorb-next` endpoint.
2. **V-13-6 resolved as D-I8: the absorbed row is `COMPLETED` but not row-linked.** `StudySession.plannedSessionId` is single-valued; D13-13's "linked" cannot be expressed without a migration. The conditional flip inside the same transaction is the audit trail; EP13C ignores COMPLETED rows; EP13A's math is unaffected. **Flagged to the planner as the V-13-6 ruling.**
3. **Micro-start on a flex row fixes the row at its own duration, not 10 minutes** — the row still represents the full planned block; only the timer's target is 10. Pinned by test.
4. **No per-row micro buttons** (D-I3): the hero and the dialog carry the affordance; rows keep one control each. Revisit only with evidence.
5. **A finished 10-minute linked session completes its planned row** — D13-3's existing rule, not new behaviour; recorded because it can read as surprising. The remaining 40+ minutes are not lost: remaining work = estimate − confirmed (EP13A), so the next generation re-plans them. Auto-forgiveness, by design.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13I-01 | Manual a11y pass (TR-E13-14) not executed in a browser — fourth recorded instance (with F-EP13D-02/F-EP13E-01/F-EP13H-01). One combined manual pass before EP13M clears all of them. | Open evidence item for the parent review. |
| F-EP13I-02 | The absorption offer depends on the `todayPlanApi` cache being correct at target-reached time; a plan regenerated in another tab shows a candidate that 409s on accept. Handled (quiet dismissal + refetch), but the offer can briefly show for a stale candidate. | Accepted trade-off, documented; the server stays authoritative. |
| F-EP13I-03 | The gated suites (+2 journeys here) remain CI-executed, not run locally. | Same standing disposition as F-EP13A-03 et al. |

## Changed paths

- `apps/api/src/modules/study-sessions/`: `dto/start-from-planned.dto.ts` (new), controller (+ `absorb-next` route, `from-planned` body), service (`absorbNext`, target override), `study-sessions-absorb.service.spec.ts` (new), planned-link unit + gated e2e specs.
- `apps/web/src/entities/study-session/api/studySessionApi.ts` — optional body + `absorbNextSession`.
- `apps/web/src/features/today-plan/` — `useStartPlannedSession(start(id, minutes?))`, hero micro button (+ tests).
- `apps/web/src/features/focus-session/` — `AbsorbNextOffer.tsx` (+ test, new), `StartFocusSessionDialog` micro action (+ test, new), `FocusTimer` restyle.
- `apps/web/src/pages/focus/ui/FocusPage.tsx` — offer mounted under the timer (one shared target-reached rule).
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` — keyboard-order inventory.
- Docs: this record, `checkpoint.md`, the EP13 README queue row, the EP13I story status.

## Correction (2026-11-16, R-EP13-02)

This record dispositioned its unexecuted `DATABASE_URL`-gated suites as
CI-executed. That claim was wrong: `.github/workflows/ci.yml` triggers only on
`main`/`develop`, which never ran for this delivery chain. The suites were
first executed by the combined EP13 review at `210f76c` (red — R-EP13-01) and
are green after the R-EP13-01 fix commit, except the four pre-existing
failures dispositioned as R-EP13-03. Evidence: `artifacts/EP13/review.md` and
the fix commit's record in `history.md`.
