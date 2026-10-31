# EP08 Plan Review — Catch-Up & Recovery

**Review date:** 2026-10-30
**Pass:** 4 (independent re-review after the planner's correction pass 3, PR-009 residual + PR-012)
**Reviewer role:** reviewer, `plan_review` mode (planning stage, not implementation)
**Reviewed state:** branch `main`, HEAD `311846d4a5cba0941400a668a7de3ab40956f10d` (read from `.git/refs/heads/main`). Reviewed content is `docs/stories/EP08/**` on disk at that HEAD. No shell was available, so `git status`/`git diff` and command execution were not possible; working-tree cleanliness is unverified and every citation below is against the files as read.
**Reviewed paths:** `docs/stories/EP08/README.md` (execution queue, AC/TR traceability, shared API/data contract, decision register D08-1…D08-8, code baseline, invariants, verification tasks, quality gate, final review unit, plan correction log), all six children `EP08A…EP08F`, source epic `docs/epics/EP08-catch-up-and-recovery.md`, shared DoD `docs/epics/README.md`, neighbouring breakdowns `docs/stories/EP06/README.md`, `docs/stories/EP07/README.md`, the EP06 plan-review (`docs/stories/EP06/plan-review.md`) for format/precedent, and the prior reports `docs/stories/EP08/plan-review.md` (passes 1–3). Application code was not re-inspected in this pass; the code-baseline citations recorded in passes 1–2 are reused and were verified against `apps/api/...` in those passes.
**Scope:** re-verify closure of the pass-3 findings (PR-009 residual, PR-012) with fresh evidence; check for new issues introduced by or surviving the correction pass; produce a pass-4 verdict.
**Limitations (honest):**
- No shell: no `git status`/`git log`/`git diff` and no command execution. HEAD hash read from `.git/refs/heads/main`. Application code read directly from the working tree in prior passes; not re-read here.
- Plan review requires no test execution (no implementation exists). No test was run and none is claimed. `prisma migrate dev`/`migrate diff` were **not** executed.
- The `## Autopilot` section of `docs/stories/EP08/README.md` is coordinator-owned; read for context, not edited.
- No secrets read; nothing under `.env`/`.env.*` opened.
- The `ui-refiner` decisions for EP08D/E remain open (D08-7) and gate only those two children; not a planning defect.
- Per the task scope, planning docs were **not** edited in this pass; the passing-review docs sync (status line, correction-log disposition updates) is deferred to the planner/coordinator (see Handoff).

---

## Verdict

**`Plan Ready`** — the pass-3 findings (PR-009 residual, PR-012) are **resolved** with fresh evidence, and no new findings were introduced by the correction pass. All prior findings PR-001…PR-012 are now closed. The plan is internally consistent: AC/TR coverage complete, six substantive children, coherent dependency chain and one-writer sequence, shared contract detailed and internally consistent after the PR-001…PR-012 corrections, invariants table with concrete counterexamples, and code-baseline citations resolving exactly.

The two open verification tasks (V-08-2 date boundary, V-08-5 State-B upgrade) and the D08-7 `ui-refiner` gate are recorded in the plan as explicit blocks/provisional decisions and are accepted as such (not findings). The implementation blocker PR-003 is recorded in the quality gate. None of these prevent the plan from being implementation-ready.

---

## Prior findings (PR-001…PR-012) — disposition

| ID | Pass-3 disposition | Pass-4 disposition | Fresh evidence |
|---|---|---|---|
| PR-001 | Resolved | **Resolved** (unchanged) | README data-model heading still reads "EP08A owns the additive migration; EP08C consumes it — D08-4, settled 2026-10-30" (line 113); EP08A scope/out-of-scope (lines 19, 30) and technical notes (line 67, "Migration owned here (PR-001)") state EP08A adds `locked Boolean @default(false)` and selects it in the missed-session query; EP08C summary/scope/technical notes (lines 13, 18, 89) state it consumes the column and adds no migration. Dependency order stays EP08A → EP08C. `locked` is absent from `schema.prisma` (unimplemented, as expected). |
| PR-002 | Resolved | **Resolved** (unchanged) | README confirm transaction step 2 (line 211) and EP08C AC #4 (line 53) name the complete busy set (confirmed `StudySession`s + completed `PlannedSession`s + locked `PlannedSession`s + the *other submitted* sessions) and explicitly exclude the replaced SCHEDULED non-locked sessions, with the unedited-confirm rationale. |
| PR-003 | Resolved | **Resolved** (unchanged) | README quality-gate row 7 (line 287) and verdict line (line 277) record the implementation blocker; EP08A AC #5 (line 45) states per-assignment `confirmedMinutes` stays State A until V-08-5 lands and EP08A delivers the total only. Verified against code in pass 2: `study-plans.service.ts:473-501` is State A. |
| PR-004 | Resolved | **Resolved** (unchanged) | README missed-session definition (line 132) and EP08A AC #2/technical notes (lines 42, 65) use `new Date(`${formatToday(timeZone)}T00:00:00.000Z`)` and forbid converting a profile-zone midnight to an instant. |
| PR-005 | Resolved | **Resolved** (unchanged) | README V-08-2 (line 235) and D08-5 (line 227) scope V-08-2 to the date boundary only, recording the status filter as settled by reuse of EP06's `isUnfinishedStatus` (verified in `remaining-work.ts:33-43`). |
| PR-006 | Resolved | **Resolved** (unchanged) | EP08B input shape (lines 72-74) carries `locked: true` inside `busy` and derives `lockedPreserved` from `busy`; no separate `lockedSessions` input. |
| PR-007 | Resolved | **Resolved** (unchanged) | README confirm step 4 (line 213) and EP08C AC #4 (line 55) state `targetHours = (sum of submitted session durations on that day) / 60` computed from `dto.sessions` in the transaction. |
| PR-008 | Resolved | **Resolved** (unchanged) | EP08A AC #6 (line 46) requires the placeholder to pass the non-blaming term check and locates EP08D's override test in TR-E08-05. |
| PR-009 | Should-fix (new, pass 2) → partially resolved (pass 3) | **Resolved** | All four sub-gaps plus the residual two locations are now closed: (a) EP08A sizing "Exclusions" (line 94) clarifies the additive `locked` migration is in scope; (b) EP08A sizing "Production files" (line 89) lists the migration folder + `schema.prisma`; (c) README DoD map row 9 (line 105) assigns migration documentation to EP08A ("recovery contract + migration, locked field"); (d) EP08C's TR-E08-04 (line 78) defers the migration-shape test to EP08A and EP08A's TR-E08-01 (line 53) carries it. **Residual (a) closed:** EP08C sizing "Outcome" (line 113) now reads "preview + confirm API + tests" (no "+ migration"), matching its own production-files line (line 116, "No migration folder here") and the contract heading. **Residual (b) closed:** EP08A DoD item 9 (line 80) now reads "API/migration documentation (recovery contract in EP08 README — done; migration steps + rollback for the additive `locked` column in this story's implementation record — PR-001)", naming the locked migration steps/rollback alongside the recovery contract. The correction-log rows PR-009 (line 306) and PR-012 (line 309) together cover the closure; the PR-009 row's verification claim ("EP08A sizing + EP08C sizing + README DoD row 9 + TR-E08-01/04 now agree on ownership") is now accurate because all locations agree. No location contradicts the contract heading. |
| PR-010 | Resolved | **Resolved** (unchanged) | README TR-E08-04 (line 87) includes "unedited confirm succeeds with no conflicts"; EP08C tests (line 71) includes "Unedited confirm succeeds with no conflicts (PR-010)". |
| PR-011 | Resolved | **Resolved** (unchanged) | EP08E technical notes (line 76) reads "locked is an explicit student toggle (V-08-1 resolved 2026-10-30); the toggle UI lives here and is subject to the `ui-refiner`" — no "if it settles" conditional. |
| PR-012 | Polish (new, pass 3) | **Resolved** | README quality gate row 9 (line 289) now reads "First plan of this epic; plan-review passes 1–3 recorded (PR-001…PR-012). Corrections applied in passes 1 and 2; pass 3 residual (PR-009 partial) corrected in this pass." — no longer claims "no plan-review pass yet". The quality-gate rows 1 and 3 (lines 281, 283) no longer reference the PR-009 residual. The correction-log row PR-012 (line 309) records the closure. |

---

## Findings (open)

**None.** No new findings were introduced by the correction pass, and no prior finding remains open. The cross-file consistency check (migration ownership, DoD map, quality-gate prose, correction-log claims) was re-run against the current disk state at HEAD `311846d` and all locations now agree with the contract heading.

---

## Requirement / DoD planning-coverage summary

| # | Check (shared planning validation) | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Six children, each a substantive outcome (read-side API, pure-domain rescheduler, preview/confirm API, recovery UI, catch-up UI, cross-layer E2E + parent index). No README-only/status-only/evidence-only child. Each split has a stated reason. Sizing blocks present (2/2/3/2/3/3). All six `Outcome` lines are substantive; EP08C's no longer attributes migration delivery (PR-009 residual closed). |
| 2 | Original AC/TR coverage | Pass | All nine epic ACs mapped to owners (README AC-ownership table); eight TRs assigned (TR-E08-01…08). Every AC has at least one owning child and every TR a named owner. |
| 3 | Definition of Done | Pass | DoD map present; items 10/11 assigned to the combined EP08 parent review; per-child DoD lists carry justified N/A reasons. Row 9's migration owner is correctly EP08A in the README map, and EP08A's own DoD item 9 now names the migration steps/rollback (PR-009 residual closed). |
| 4 | Contract consistency | Pass | One shared API/data contract section (endpoints, shapes, missed-session definition, engine reuse, confirm transaction, migration). PR-001…PR-012 corrections resolved the internal inconsistencies found in pass 1; no new inconsistency found in pass 4. |
| 5 | Code paths inspected | Pass | Code baseline section verified against the actual code in passes 1–2 (`PlannedSession`/`PlannedSessionStatus`, `Assignment.status`, `StudyPlan.date` `@db.Date`, `StudyPlansService`, `findConflicts`, `classifyAssignments`/`isUnfinishedStatus`, ownership helpers, `formatToday`, `study-sessions` confirmed-time endpoint). Not re-inspected in pass 4; unverified items disclosed (ui-refiner decisions, V-08-2 date boundary, browser rendering). |
| 6 | Feature-specific risks/counterexamples | Pass | Invariants table — seven claims with concrete counterexamples: cross-student access, historical-log immutability, deadline non-extension, locked preservation, decline no-op, completed-assignment exclusion, non-blaming copy. |
| 7 | Dependencies | Pass (with blocker noted) | Sequence EP08A → EP08B → EP08C → EP08D → EP08E → EP08F recorded, with the one-way frontend dependencies and the `ui-refiner` gate. EP06/EP07 complete and parent-reviewed. Implementation blocker (PR-003, resolved): EP08A delivers the confirmed-minutes total only until the EP06 State-B upgrade (V-08-5) lands; per-assignment stays State A. |
| 8 | Material decisions | Blocked (provisional) | D08-1, D08-2, D08-3, D08-8 settled. D08-4, D08-6 settled by user decision 2026-10-30. D08-5 provisional with V-08-2 (narrowed per PR-005). D08-7 (UI/UX for EP08D/E) unresolved and is the `ui-refiner`'s to settle. Accepted as explicit blocks, not findings. |
| 9 | Correction-log history | Pass | Correction log contains PR-001…PR-012 with dispositions; PR-009 and PR-012 residual closures recorded in pass 3 and verified here. |
| 10 | Jira identity/sync | Not applicable | No sync authorized; epic key STUDY-17, all six child keys `Pending creation`. |

**Verdict rationale:** checks 1–7 and 9–10 pass. Checks 7 and 8 are `Blocked (provisional)`, which the plan records explicitly and which the reviewer accepts as explicit blocks (not findings). All twelve findings (PR-001…PR-012) are now closed with fresh evidence at HEAD `311846d`. No new finding was introduced by the correction pass. The plan meets the shared planning validation and is `Plan Ready`.

---

## Handoff

**Findings the planner must address:** none. All PR-001…PR-012 are closed.

**Decisions needing the user:** none new. D08-4, D08-6 and V-08-1/V-08-3/V-08-4 were settled on 2026-10-30. V-08-2 (date boundary) remains the only open product-facing verification task and is not blocking the corrections above. PR-003's State-B upgrade (V-08-5) remains an explicit implementation blocker recorded in the quality gate; the schema now carries `assignmentId`/`status` on `StudySession` (verified in pass 2), so the upgrade is feasible whenever it is scheduled, but it is not required for EP08A's total `confirmedMinutes`.

**Passing-review docs sync (deferred per task scope — "Do not edit planning docs"):** on this `Plan Ready` verdict the reviewer would normally perform the sync, but the task explicitly forbids editing planning docs. The following edits are deferred to the planner/coordinator and should be applied before the next planning gate:
- README status line (line 6): update "Plan-review gate: **Changes Required** (pass 3, 2026-10-30)" to reflect `Plan Ready` (pass 4, 2026-10-30).
- README correction log (rows PR-009 line 306, PR-012 line 309): update disposition from "Addressed — awaiting re-review" to "Closed (pass 4, verified at HEAD 311846d)".
- No queue-row state changes are required (all children remain `Queued`/`Needs refinement`; implementation has not started).

**No passing-review docs sync was performed in this pass** (planning docs untouched per scope). The report above is the only file written. The planner owns the deferred sync edits and the subsequent re-review is not required — the plan is `Plan Ready`.