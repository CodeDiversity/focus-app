# EP06 — Parent Implementation Index

**Parent:** [EP06: Study Planning & Scheduling](../../README.md) (epic [EP06-study-planning-and-scheduling.md](../../epics/EP06-study-planning-and-scheduling.md), Jira STUDY-15)
**Milestone:** M3 (Study planning and focus sessions)
**Review unit:** one combined EP06 parent review — all eight children, after EP06H. Reviewer artifacts: `./review.md` + `./walkthrough.md` (DoD 10/11).
**Base commit (pre-EP06):** `9b1ec19` (`docs(EP05): close out the parent review unit …`)
**Final commit (this index):** `69e45ef` (`docs(EP06): record EP06G's closeout and open the EP06H implementer dispatch`) — the last commit that landed on `main` before this index was written. The EP06H implementer's reported commits (`5b3fb15`, `4d4240c`) did **not** persist to `main` (see *Known gaps*); the E2E spec and the parent index itself are therefore recorded here by the coordinator rather than by EP06H, and no E2E spec is present in the tree at the time of writing.
**Branch:** `main`. Nothing was pushed, merged, deployed or synced to Jira.

## Review scope

The parent and all eight children, each with its implementation record:

| Child | Title (layer) | Implementation record | Key commits (child scope) |
|---|---|---|---|
| [EP06A](../EP06A-study-preferences-shape-and-api.md) | Study-preferences shape & API (Backend) | [artifacts/EP06A/implementation.md](./EP06A/implementation.md) | `7457a0a` (code + tests), `4ea2b63` (closeout), `236e460` (confirmation run) |
| [EP06B](../EP06B-remaining-work-calculation-and-read-api.md) | Remaining-work calculation & read API (Backend) | [artifacts/EP06B/implementation.md](./EP06B/implementation.md) | `f07a84b` (code + tests), `7007aa0` (closeout) |
| [EP06C](../EP06C-deterministic-scheduling-engine.md) | Deterministic scheduling engine (Backend, pure domain) | [artifacts/EP06C/implementation.md](./EP06C/implementation.md) | `ee619ad` (code + tests), `7c13b2c` (closeout) |
| [EP06D](../EP06D-study-plan-persistence-and-preview-save-api.md) | Plan persistence & preview/save/read API (Backend) | [artifacts/EP06D/implementation.md](./EP06D/implementation.md) | `4380ce9` (migration + code + tests + closeout) |
| [EP06E](../EP06E-study-preferences-ui.md) | Study-preferences surface on `/profile` (Frontend) | [artifacts/EP06E/implementation.md](./EP06E/implementation.md) | `04ce78d` (code + tests), `08f9613` (closeout) |
| [EP06F](../EP06F-study-plan-page-preview-edit-and-save.md) | `/plan` page: generate, preview, edit, save (Frontend) | [artifacts/EP06F/implementation.md](./EP06F/implementation.md) | `2e35061` (code + tests), `356b87e` (closeout) |
| [EP06G](../EP06G-remaining-work-and-deficit-warnings-ui.md) | Remaining-work list + deficit warnings (Frontend) | [artifacts/EP06G/implementation.md](./EP06G/implementation.md) | `55430f6` (code + tests), `c6aa220` (closeout) |
| [EP06H](../EP06H-cross-layer-e2e-and-parent-index.md) | Cross-layer E2E + regression sweep + parent index (Integration) | [artifacts/EP06H/implementation.md](./EP06H/implementation.md) (not written — the implementer's commits did not persist; see *Known gaps*) | none landed |

The plan-review gate is **passed** (pass 3, 2026-10-30 — `Plan Ready`; report `docs/stories/EP06/plan-review.md`; all 22 prior findings closed; six non-blocking polish findings PR-023…PR-028 remain open). All eight children are `Implemented — awaiting parent review` in the queue. No child is marked `Reviewed`.

## Combined Git change scope

- **Base commit (pre-EP06):** `9b1ec19` (`docs(EP05): close out the parent review unit — children Reviewed, gates recorded`)
- **Final commit on `main`:** `69e45ef` (`docs(EP06): record EP06G's closeout and open the EP06H implementer dispatch`) — the last commit that landed before this index was written.
- **Child commits (in order):**
  - EP06A: `7457a0a` feat, `4ea2b63` docs, `236e460` docs
  - EP06B: `f07a84b` feat, `7007aa0` docs
  - EP06C: `ee619ad` feat, `7c13b2c` docs
  - EP06D: `4380ce9` feat (migration + code + tests + closeout)
  - EP06E: `04ce78d` feat, `08f9613` docs
  - EP06F: `2e35061` feat, `356b87e` docs
  - EP06G: `55430f6` feat, `c6aa220` docs
  - EP06H: **none landed** (the implementer's reported commits `5b3fb15` and `4d4240c` did not persist — see *Known gaps*)
- **Plan-review / planning commits (before implementation):** `d4067d0`, `bfc6453`, `3bb58d5`, `2f8ea8d`, `9b230b7`, `a736f23`, `aa009e9`, `a102031`, `6a756dc` (breakdown), `1b595e6` (pass 1), `0cab534` (verdict), `d3ea7cd` + `9ade8a7` (correction 1), `84151a0` (pass 2), `acf7ab0` + `11f3b39` + `447bd74` (correction 2), `e846176` (pass 3 — Plan Ready), plus the ui-refiner/reconciliation commits `aca61b3`, `35513a4`, `50a6fa8`, `85c3dd5`, `e101e1f`, `46a8ced`, `c3ce7e0`, `a3c4aae`, `8f470d1`, `4b1f748`, `50e75bd`, `356b87e`.
- The combined diff is **not** just the last child's: it spans the migration, the pure domain module, the API module, the web entity/feature/page layers and the test suites. The reviewer must use the base commit `9b1ec19` and the final commit above, not only EP06G's diff.
- **Unrelated dirty path (never staged, never committed):** `apps/api/tsconfig.json` (adds `dist-test` to `exclude`). It is a pre-existing local change and is not part of EP06's scope.

## Epic acceptance criteria → owners (all nine covered)

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can set preferred study-session durations. | AC-E06-01 | EP06A (shape, validation, `GET/PUT /study-preferences`), EP06E (preferences surface) |
| The system calculates remaining estimated work from assignment estimates and confirmed study time. | AC-E06-02 | EP06B (calculation + read API; the confirmed-time aggregation), EP06G (remaining-work surface) |
| The scheduler places work only inside available study windows. | AC-E06-03 | EP06C (engine placement), EP06D (service supplies the windows, persists the result) |
| Proposed sessions do not overlap classes, blocked time, or existing confirmed sessions. | AC-E06-04 | EP06C (conflict rules), EP06D (save-time re-check) |
| The scheduler prioritizes upcoming deadlines with deterministic tie-breaking rules. | AC-E06-05 | EP06C (ordering + tie-breaks), EP06D (service feeds the engine) |
| Students can review and edit proposed sessions before saving. | AC-E06-06 | EP06D (preview, save with conflict re-check), EP06F (preview, edit interactions, save) |
| The system reports work that cannot fit before a deadline. | AC-E06-07 | EP06C (capacity/deficit computation), EP06D (warnings in the preview payload), EP06G (warnings surface) |
| The scheduler does not change assignment due dates. | AC-E06-08 | EP06C (engine is pure — no write path), EP06D (service writes only plan rows; the test asserts the assignment rows are unchanged) |
| Assignments missing necessary scheduling information are flagged rather than silently scheduled. | AC-E06-09 | EP06B (flagging of a missing estimate / due date), EP06C (engine refuses to schedule a flagged assignment), EP06G (the flag is shown) |

## Test requirements → owners (all nine covered)

| Req | Requirement | Owning children |
|---|---|---|
| TR-E06-01 | Study-preferences API tests: bounds matrix, cross-field rules, merge-on-partial-update, defensive read of a missing/partial/malformed bag, the bag's other keys surviving, ownership scoping, uniform 404/401 | EP06A |
| TR-E06-02 | Remaining-work tests: estimate→minutes conversion, confirmed-minutes subtraction, unattributed total, flagged classifications, unfinished-status filter, ownership-scoped `StudySession` aggregation (D06-6), uniform 404 | EP06B |
| TR-E06-03 | Engine unit tests: ordering and every tie-break, window placement, splitting across days (D06-2), daily cap, interval arithmetic, conflict avoidance, deficit categories, flag refusal, purity (no writes, no clock, no randomness) | EP06C |
| TR-E06-04 | Plan API tests: preview side-effect freedom, atomic save, conflict re-check on save (409) with per-session reasons, malformed-session matrix (400), migration shape and reversibility, uniform 404, assignment rows unchanged after a save (AC-E06-08) | EP06D |
| TR-E06-05 | Preferences-surface tests: four fields, client-side bounds mirror, save round-trip, loading/error/success states, keyboard operability | EP06E |
| TR-E06-06 | Plan-page tests: generate → preview → move → resize → delete → save, saved-plan view, empty/loading/error states, keyboard operability of the editing controls, narrow-screen layout | EP06F |
| TR-E06-07 | Remaining-work and warning-surface tests: per-assignment row, remaining-hours formatting, flagged marker, warning categories and copy, empty states | EP06G |
| TR-E06-08 | Cross-layer E2E against the real stack: the whole generate→edit→save journey, the deficit warning, the saved plan surviving a reload, the API and web suites and the pre-existing E2E specs staying green | EP06H (not landed — see *Known gaps*) |
| TR-E06-09 | Manual accessibility pass recorded for the plan surface (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) | EP06F, EP06G (recorded), EP06H (collected for the combined review) |

## Shared DoD → owners (all eleven have an owner)

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | EP06A (bounds + cross-field rules), EP06B (query validation), EP06D (session matrix, range caps), EP06E (client-side mirror), EP06F (edit inputs), EP06G (read inputs) |
| 3 student data scoping | EP06A, EP06B, EP06D, EP06H (cross-student isolation case) |
| 4 actionable API errors | EP06A, EP06B, EP06D, EP06E, EP06F, EP06G |
| 5 loading, empty, and error states | EP06E, EP06F, EP06G |
| 6 keyboard accessibility | EP06E, EP06F, EP06G |
| 7 responsive layouts | EP06E, EP06F, EP06G |
| 8 automated tests | All children (TR-E06-01…08); TR-E06-09 is a recorded manual pass owned by EP06F/EP06G with EP06H collecting the evidence |
| 9 API/migration documentation | EP06A (preference contract), EP06B (read contract), EP06D (migration, its guard and its rollback, the plan contract), EP06H (parent index) |
| 10 integrated review | EP06 parent review unit (all eight children) |
| 11 reviewer walkthrough | Reviewer, once for the EP06 parent review unit |

## Commands run and their actual results

All commands were run by the implementing children and recorded in their implementation records. No command result below is invented; the E2E results below come from EP06F/EP06G's unit/integration suites because the EP06H E2E suite did not land.

| Command | Child | Result |
|---|---|---|
| `pnpm --filter api test -- study-plans` | EP06A | 3 suites / 35 tests passed |
| `pnpm --filter api test -- preferences` | EP06A | 1 suite / 27 tests passed |
| `pnpm --filter api test` | EP06A | 53 suites / 1151 tests passed |
| `pnpm --filter api typecheck` | EP06A | exit 0 |
| `pnpm --filter api lint` | EP06A | exit 0 |
| `pnpm --filter api test -- remaining-work` | EP06B | 1 suite / 21 tests passed |
| `pnpm --filter api test -- ordering` | EP06B | 1 suite / 15 tests passed |
| `pnpm --filter api test -- study-plans` | EP06B | 3 suites / 56 tests passed (executed against the local migrated DB) |
| `pnpm --filter api test` | EP06B | 56 suites / 1217 tests passed |
| `pnpm --filter api typecheck` | EP06B | exit 0 |
| `pnpm --filter api lint` | EP06B | exit 0 |
| `pnpm --filter api test -- scheduler` | EP06C | 1 suite / 25 tests passed |
| `pnpm --filter api test -- intervals` | EP06C | 1 suite / 24 tests passed |
| `pnpm --filter api test -- study-plans` | EP06C | 3 suites / 56 tests passed |
| `pnpm --filter api test` | EP06C | 58 suites / 1266 tests passed |
| `pnpm --filter api typecheck` | EP06C | exit 0 |
| `pnpm --filter api lint` | EP06C | exit 0 |
| `pnpm --filter api format` | EP06C | exit 0 |
| `pnpm --filter api db:migrate` | EP06D | applied cleanly; guard succeeded on the empty table; `planned_sessions`, `PlannedSessionStatus` and the two indexes present |
| `pnpm --filter api test -- study-plans` | EP06D | 3 suites / 56 tests passed |
| `pnpm --filter api test -- conflicts` | EP06D | 1 suite / 8 tests passed |
| `pnpm --filter api test` | EP06D | 59 suites / 1274 tests passed |
| `pnpm --filter api typecheck` | EP06D | exit 0 |
| `pnpm --filter api lint` | EP06D | exit 0 |
| `pnpm --filter web test` | EP06E | 80 suites / 985 tests passed |
| `pnpm --filter web test -- StudyPreferences` | EP06E | 2 suites / 23 tests passed |
| `pnpm --filter web typecheck` | EP06E | exit 0 |
| `pnpm --filter web lint` | EP06E | exit 0 |
| `pnpm --filter web test` | EP06F | 84 suites / 1005 tests passed |
| `pnpm --filter web test -- Plan` | EP06F | 4 suites / 20 tests passed |
| `pnpm --filter web typecheck` | EP06F | exit 0 |
| `pnpm --filter web lint` | EP06F | exit 0 |
| `pnpm --filter web typecheck` | EP06G | exit 0 |
| `pnpm --filter web lint` | EP06G | exit 0 |
| `pnpm --filter web format` | EP06G | clean |
| `pnpm --filter web test -- RemainingWork` | EP06G | 12 tests passed |
| `pnpm --filter web test -- WorkloadWarnings` | EP06G | 7 tests passed |
| `pnpm --filter web test -- PlanPage` | EP06G | 7 tests passed |
| `pnpm --filter web test -- studyPlanApi` | EP06G | 5 tests passed |
| `pnpm --filter web test` | EP06G | 1022 / 1024 passed (2 `CourseForm` tests time out / spy-not-called under full-suite load; both pass in isolation — unrelated, pre-existing flakiness) |

## Known gaps

1. **EP06H did not land.** The integration implementer reported two commits (`5b3fb15` and `4d4240c`) that did not persist to `main` — the E2E spec `apps/web/e2e/study-plan.spec.ts`, the helper extensions (`createAssignmentViaApi`, `createAvailabilitySlotViaApi`), the parent index and EP06H's checkpoint/implementation records are absent from the tree. The coordinator wrote this index in their place so the combined review has a scope and evidence record, but the cross-layer E2E suite itself is missing. **TR-E06-08 is therefore not satisfied by an executed check** — it is recorded as not executed.
2. **The cross-student isolation case, the deficit-warning case, the flagged-marker case and the conflict case** (EP06H AC 3–5, TR-E06-08) are covered by the unit/integration tests of EP06B/EP06D/EP06F, but not by an end-to-end run. The reviewer should treat them as `CANNOT VERIFY` at the E2E level.
3. **The manual accessibility pass (TR-E06-09)** is recorded in EP06F and EP06G but was not collected into a single document by EP06H (EP06H's role). The reviewer owns the walkthrough and can re-run the pass.
4. **F-EP06-07 (open, cross-epic):** `PATCH /users/me` writes the `preferences` column verbatim (`users.service.ts:97-99`), so a later profile PATCH carrying a preferences bag can **erase** saved `studyDefaults`. EP06 does not change `PATCH /users/me` (excluded by the spec and D06-14); fixing it needs an EP01-owned change plus its integration spec (`users-profile-integration.spec.ts:147-160`), which is outside this run's scope and needs the user's authorization.
5. **Six non-blocking plan-review polish findings (PR-023…PR-028)** are open and owned by the planner: one home per type (PR-023), two migration authorities (PR-024), the unachievable "preserved byte-for-byte" wording for a `jsonb` column (PR-025), the no-overlap invariant's missing competing-request counterexample (PR-026), EP06H's DoD 5/7 rows claiming an empty state and a phone viewport its six scenarios do not cover (PR-027), and the children's `Refined:` fields still reading "technical-refine pass not yet run" (PR-028).
6. **EP05's calendar/dashboard integration (V-05-1)** is not taken: planned sessions are visible only on `/plan`; the dashboard's "Today's study sessions" widget keeps its empty state until EP05's owner takes the seam (a new `PLANNED_SESSION` event type). EP06 does not touch the calendar service (D06-18).
7. **EP07's two V-07-2 rows** (`docs/stories/EP07/README.md:209`, `:258`) are stale under D06-6 and are recorded as coordinator note F-EP06-05; EP07's document was not edited by this run.
8. **The unrelated dirty `apps/api/tsconfig.json`** (adds `dist-test` to `exclude`) is a pre-existing local change and is not part of EP06's scope.
9. **No Jira sync was performed** — all eight children remain `Pending creation` (STUDY-15 is the epic key). Tracker reconciliation is a separate, authorized workflow.

## Notes for the combined review

- The plan-review gate is **passed** (pass 3, 2026-10-30 — `Plan Ready`; report `docs/stories/EP06/plan-review.md`). The reviewer must still verify the implementation independently; the plan review is not implementation approval.
- The combined review covers all eight children and their integration; there is no per-child review gate.
- The reviewer must also prepare and verify the separate final `walkthrough.md` (code explanation, correctness evidence after correction rounds, and manual test steps/expected results for every applicable workflow) before the parent can be marked `Reviewed`.
- F-H-1 (the self-contained stack's API on port 4100 is reached through the web server's Vite proxy, not directly) is recorded in EP06H's implementation record and is relevant to how the E2E suite is run.