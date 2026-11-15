# EP13A implementation record

**Story:** [EP13A — Plan Generation Counts Reality](../../EP13A-plan-generation-counts-reality.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-14
**Implementer commit scope:** `apps/api/src/modules/study-plans/` (service + five specs), EP13A docs/queue updates. No migration (as planned). No frontend change.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — confirmed time attributed, COMPLETED-only, task-only stays unattributed (V-13-1) | **Done.** New private `confirmedTimeByAssignment` (one `studySession.groupBy` per read: `where {userId, status:'COMPLETED'}`, grouped by `assignmentId`; null group → unattributed). `classifyAssignments` already clamps `max(0, estimate − confirmed)`. | `study-plans.service.ts` helper + call sites; unit: `study-plans.service.spec.ts` (State-B attribution, clamp-at-zero), `study-plans-reality.service.spec.ts` ("subtracts confirmed study time", "only COMPLETED sessions count") |
| 2 — one aggregation feeds remaining-work, preview, save, recovery, catch-up | **Done.** `getRemainingWork` → thin projection over new `remainingWorkInternal`; `gatherPlanData` (shared by preview/save/catch-up preview/confirm) calls the same helper; recovery summary reuses `remainingWorkInternal` and now reports real per-assignment `confirmedMinutes` (EP08 PR-003's deferral closed). | service diff; recovery test "reuses the remaining-work computation…" |
| 3 — locked-future subtraction, never negative | **Done.** In `gatherPlanData`: minutes of `SCHEDULED && locked` rows with civil date ≥ today are subtracted per assignment (clamped ≥ 0) before the engine runs; past locked rows subtract nothing. | `study-plans-reality.service.spec.ts`: "subtracts locked FUTURE…", "locked minutes covering the whole estimate…", "past locked rows subtract nothing" |
| 4 — save preserves locked/completed; preserved rows busy; replaced-rows exclusion | **Done.** `save()` delete is now `SCHEDULED && !locked` within the window (byte-identical to EP08C confirm) and inserts `locked: false`; the preserved rows enter the busy set through `gatherPlanData`, replaced SCHEDULED non-locked rows excluded by construction (PR-002 rule now shared). | recovery spec: flipped save pins ("…now pinned IDENTICAL to confirm", busy-set 409/no-self-conflict test) |
| 5 — fully-studied assignments not scheduled, reported `remainingMinutes: 0` | **Done.** Zero-remaining schedulables are filtered from the **engine input only**; the read payload still lists them with `remainingMinutes: 0` and real `confirmedMinutes`. | unit: clamp test (read side); reality spec: "…produces no warning — even overdue" (engine side) |

## Verification (all run from `apps/api`, 2026-11-14)

- `pnpm test` (root-filtered run of `jest`): **926 passed, 0 failed**, 461 skipped — the skipped tests are the gated live-DB suites, which self-skip without `DATABASE_URL` (none available in this session; see F-EP13A-03).
- `pnpm lint`: clean (`--max-warnings 0`; auto-fixed formatting in the new spec).
- `pnpm typecheck` (`tsc --noEmit`): clean.
- `pnpm format`: clean.

New/changed tests: `study-plans-reality.service.spec.ts` (new, 7 tests — TR-E13-01 engine-input half); `study-plans.service.spec.ts` (State-B attribution + clamp, groupBy scoping, 404 guard); `study-plans-recovery-catch-up.service.spec.ts` (groupBy mock, total-vs-unattributed semantics, order-robust missed-query assertion, save pins flipped + new save busy-set test); gated `study-plans-e2e.spec.ts` + `study-plans-data-scoping.spec.ts` fixtures/assertions upgraded to State B (**not executed live**).

## Deviations from the plan (each with why)

1. **`groupBy` instead of the documented `findMany` upgrade.** The EP06 in-code State-B sketch (steps 1–3) described re-selecting rows via `findMany`. Implemented as one `groupBy` aggregation instead: identical semantics, one query (EP07's `confirmedTime` precedent), and it keeps the unit-spec mocks disjoint — the shared `studySession.findMany` mock ignores `where`, so a second findMany call would have fed busy-set fixtures into the confirmed-time math in every existing test.
2. **The plain preview now treats locked/completed planned rows as busy** (not just save/confirm). Not stated in the story text, but entailed by AC3 + AC4 together: with locked minutes subtracted and locked rows preserved, a preview that could still propose sessions *into* the locked slot would re-create the double-booking at save time (guaranteed 409 on an unedited save). Implemented by moving the preserved-rows read into `gatherPlanData` (tagged intervals; `replan`'s preserved counts ride the tags), which also let `catchUpPreview`/`catchUpConfirm` drop their duplicate queries.
3. **EP08's P-05 drift pin intentionally flipped.** The old test pinned save's *unfiltered* delete and missing `locked` key as "the contract asymmetry". EP13A's AC4 defines that asymmetry as the defect, so the pins now assert save↔confirm **convergence** (both paths pinned to the same delete shape; drift still fails a test). The P-05 finding's intent — drift detection — is preserved.
4. **Recovery summary `confirmedMinutes` is now the total (attributed + unattributed).** In State A the two figures were identical, so the code shipped reading `unattributedConfirmedMinutes`. The EP08 contract says "total confirmed minutes (session log)", so the faithful State-B reading is the total; implemented via the internal refactor without changing any public payload key set.
5. **Gated live suites updated but not executed.** No `DATABASE_URL` in this session; the four gated specs compile (typecheck) and their fixtures/assertions were upgraded to State B. Live execution rides the EP13 parent review unit / EP13M, consistent with how EP08 recorded gated evidence.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13A-01 | The engine marks every overdue assignment `OVERDUE` even with `remainingMinutes: 0` (`scheduler.ts:162–164`), which would surface a spurious warning for finished work. | Addressed at the service seam (zero-remaining filter before the engine). Engine-side cleanup can ride EP13F's placement rewrite — noted for that story; not a blocker. |
| F-EP13A-02 | Pre-existing EP06 gap: the plain preview's busy set ignored locked/completed planned rows entirely, so generate→save could double-book or 409 against preserved rows. | Fixed (deviation 2). |
| F-EP13A-03 | Gated live fixtures seeded status-less (`ACTIVE`-default) sessions as confirmed time — wrong under State B. | Fixed in fixtures/assertions; **not executed live** (no `DATABASE_URL`). Open evidence item for the parent review unit. |

## Changed paths

- `apps/api/src/modules/study-plans/study-plans.service.ts` — helper, `remainingWorkInternal`, State-B reads, `gatherPlanData` (confirmed map, planned-rows read, tagged busy, locked-future subtraction, zero filter), `catchUpPreview`/`catchUpConfirm` simplification, `save` selective delete + `locked: false` insert.
- `apps/api/src/modules/study-plans/study-plans-reality.service.spec.ts` — **new** (TR-E13-01 engine-input half).
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts`, `study-plans-recovery-catch-up.service.spec.ts` — updated unit pins.
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts` — gated fixtures/assertions (State B).
- Docs: this record, `checkpoint.md`, EP13 README queue row, EP13A story status.
