# EP14 plan review

**Date:** 2026-11-16
**Pass:** 2 (re-review of the C-EP14-01…03 corrections; pass 1 moved verbatim to [plan-review-pass-1.md](./plan-review-pass-1.md))
**Reviewed commit:** `966b109` (clean tree, branch `hfi/bf2612ce-2a74-474c-9871-26c93b36fc2d/elm`)
**Reviewer:** reviewer (`plan_review`), fresh session
**Scope:** the three pass-1 findings and their corrections (commit `966b109`: epic AC6, EP14A, EP14B, EP14E, README status, history correction log); independent re-inspection of every code line the corrections newly cite. EP14C and EP14D are byte-unchanged since pass 1's reviewed commit `5682fe8` (`git diff --stat 5682fe8..966b109` touches neither) — pass 1's coverage of them stands and is not redone here.

## Prior findings — disposition

| ID | Pass-1 severity | Disposition | Evidence (reviewer-verified at `966b109`) |
|---|---|---|---|
| R-EP14-01 | Should-fix | **Resolved** | EP14A-AC3 now requires (i) a deliberate-red throwaway commit and (ii) a known-red-baseline run whose **only** failures are the four R-EP13-03 tests, and states "The first fully green CI run is EP14B's closeout evidence, not this story's" (`EP14A…md:36`); TR-E14-01 in the story's Tests matches (`:41`); the known-red window between EP14A and EP14B is recorded in Technical notes (`:48`). EP14B-AC2 now owns the first fully green CI link in its implementation record (`EP14B…md:35`) and its Sizing/Verification requires "full gated run 0 failed locally **and** a green CI run link" (`:68`). The evidence definition is attainable and consistent with the EP14A→EP14B order — closure condition met. Residual stale summary phrasing → R-EP14-04 (polish). |
| R-EP14-02 | Should-fix | **Resolved** | EP14A-AC2 pins the backend-test step to single-worker `--runInBand` against the workflow's Postgres service and a non-empty `JWT_SECRET` fallback when the repo secret is unset (`EP14A…md:35`; at-a-glance `:12`). The static test is relaxed to exactly the three changed areas: the `on:` block, the backend-test step, the `JWT_SECRET` line (`:42`); Technical notes propose `pnpm --filter @studypilot/api test -- --runInBand` and `JWT_SECRET: ${{ secrets.JWT_SECRET \|\| 'ci-only-test-secret' }}` (`:47`). Re-verified independently: `ci.yml:31` is `JWT_SECRET: ${{ secrets.JWT_SECRET }}` (empty when unset); `apps/api/src/test/test-http.ts:72` uses `??`, which does not replace an empty string, so the Actions-expression `\|\|` fallback is the right layer; `apps/api/package.json:17` `"test": "jest"` (parallel) and `:25` `test:integration` matching only the three auth-recovery specs — exactly the parity gap. CI-vs-canonical-command parity now has an owner (EP14A) with named evidence (the static diff test + the AC3 run pair, then EP14B's green link) — closure condition met. |
| R-EP14-03 | Should-fix | **Resolved** | EP14E-AC3 pins day-centric semantics: "**Within one day's gap list** (placement is day-centric — `placeBlock` scans a single date's free gaps, so days are never compared) … Which day a block lands on is decided by the existing per-day loop and budgets, unchanged" (`EP14E…md:36`); the cross-day owning test is named — Monday 22:00 LOW only + Tuesday 09:00 NORMAL → the Monday block still lands Monday 22:00 (`:43`); D-E3's Options cell carries the day-centric pin inside the ratified option (a), Ruling cell untouched (`:57`); epic AC6 aligned: "on any given day … (which day a block lands on is unchanged)" (`docs/epics/EP14-adaptive-scheduling-follow-ups.md:49`). Code claim verified: `placeBlock` (`apps/api/src/domain/study-planning/scheduler.ts:340–395`) scans `freeFor(date, …)` (`:362`) — one date's free gaps; `freeFor` (`:204–212`) takes a single `date`; day selection lives only in the per-day loop (`:405–436`); `byEnergyPreference` (`:124–130`) reorders only the one-day list it is handed; `windowHintOf` (`:156–160`) unchanged. The pass-1 counterexample is now pinned by AC text and a named test — closure condition met. |

## New findings

| ID | Severity | Claim / gap | Where | Consequence | Suggested correction | Closure condition |
|---|---|---|---|---|---|---|
| R-EP14-04 | Polish | C-EP14-01 did not propagate to three summary lines, which still describe the pre-correction "red/green" evidence: the README traceability row "Scratch-branch red/green CI run pair recorded" (`docs/stories/EP14/README.md:67`), EP14A's DoD line "8 (the red/green proof)" (`EP14A…md:59`), and EP14A's Sizing "Verification: two CI run links (red, then green) on a scratch branch" (`EP14A…md:67`). | README TR table; EP14A DoD/Sizing | A literal reading of these summaries re-creates the unattainable "green on EP14A" expectation R-EP14-01 removed. No real ambiguity for implementation: the normative texts (EP14A-AC3, its Tests/Technical notes, EP14B-AC2) are explicit and mutually consistent, and AC3 states in terms the green run is EP14B's. | Docs-only planner touch: reword the three lines to the deliberate-red + known-red-baseline pair (e.g. "Scratch-branch deliberate-red + known-red-baseline pair recorded"). | The three lines match EP14A-AC3's evidence definition. Optional; does not block. |

## Coverage notes

- **Corrections stay inside their scope.** `git diff 5682fe8..966b109` touches only the epic AC6 sentence, the EP14A/EP14B/EP14E texts above, the README status line, the history correction log, and the pass-1 report itself; no story requirement outside the three findings changed; no Ruling cell was edited (D-E3's Options/Recommended cells carry the pin; the user's 2026-11-16 ratification stands).
- **EP14A AC renumbering is consistent:** old AC2 split into new AC2 (execution mode/secret) and AC3 (failure proof); old AC3 (closeout evidence rule) is now AC4. All cross-references found (`EP14A…md:41`, `history.md:23–24`) use the new numbering; nothing elsewhere referenced the old numbers.
- **EP14E edge case checked:** a day with LOW gaps and no free NORMAL gap (the cross-day test's Monday) is pinned by the named test itself (the block still lands Monday 22:00), and energy preference remains "a preference, never a constraint — every gap is still tried" (`scheduler.ts:359–363`), so the two defensible readings of AC3's guard converge; no further pin needed.
- **Implementation note (not a finding):** the proposed step `pnpm --filter @studypilot/api test -- --runInBand` relies on pnpm's argument forwarding; EP14A-AC2's requirement is behavioral (single-worker execution), so the exact flag plumbing is verified at implementation.
- **Gate rerun:** `node tools/queue-lint.mjs docs/stories/EP14` → `clean (9 files)`, exit 0, reviewer-executed at `966b109` (cwd repo root).
- **EP14C / EP14D:** unchanged since `5682fe8`; see [plan-review-pass-1.md](./plan-review-pass-1.md) coverage summary for their standing review.

## Verdict

**Plan Ready** — R-EP14-01, R-EP14-02, R-EP14-03 all resolved with verified text and code evidence; the only open finding is R-EP14-04 (polish, optional). Implementation may start with EP14A per the queue; push authorization for the scratch-branch proof is already granted (user, 2026-11-16).

## Compact handoff

**For the planner (optional):** R-EP14-04 — three stale "red/green" summary echoes (`README.md:67`, `EP14A…md:59`, `EP14A…md:67`) to reword to the deliberate-red + known-red-baseline pair whenever EP14 docs are next touched; polish only.

**For the user:** nothing needs a ruling. The plan is ready; the corrections stayed inside the options you ratified (D-E3's day-centric pin included), and the known-red CI window between EP14A and EP14B is now an explicit, recorded part of the plan.
