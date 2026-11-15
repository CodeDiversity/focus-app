# EP13L implementation record

**Story:** [EP13L — Deterministic Estimate Calibration](../../EP13L-deterministic-estimate-calibration.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-15
**Commit scope:** `apps/api/src/domain/study-planning/` (new `calibration.ts` + spec; `types.ts`, `remaining-work.ts`, `scheduler.spec.ts`), `apps/api/src/modules/study-plans/` (service + three specs), `apps/web/src/` (study-plan types, `CalibrationNote` + copy helper + tests, `PlanPage`, `RemainingWorkSection`, fixture updates), EP13L docs/queue updates. No migration (as planned). No new endpoint.

Decisions applied: D-L1 and D-L4 (user-ratified); D-L2, D-L3, D-L5 ratified by default at implementation start (cells written in the story).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP13L-AC1 — pure, deterministic module: median, ≥3-sample gate, clamp [0.5, 3.0], per-type with overall fallback | **Done.** `calibration.ts`: `calibrationSamplesOf` (the D-L2 sample rule), `computeCalibration` (ratios → per-type and overall medians → gated, clamped, 2-decimal multipliers), `multiplierFor` (own figure, else overall fallback itself gated at ≥3 — D-L3, else `null` = 1.0). No clock, no I/O, order-independent. | `calibration.spec.ts` — median, sample rule, 0/1/2-sample gate, outlier + clamp bounds, fallback (typed and untyped), overall gate, determinism, rounding |
| EP13L-AC2 — applied only through the remaining-work path (`est × m − confirmed`, clamped ≥ 0); `Assignment` never written; raw estimates visible | **Done.** `classifyAssignments(facts, confirmed, calibration?)` scales the estimate **before** subtracting confirmed minutes (D-L1); `estimatedMinutes` stays raw; `ClassifiedAssignment.calibration` carries the annotation. The service passes the table at the two classification call sites (`gatherPlanData`, `remainingWorkInternal`), so placement v2, EP08 replan, the recovery summary and the remaining-work read all consume it through the one existing path. The history helper only reads. | `calibration.spec.ts` "application" (order pinned: 162 not 144; clamp at 0; input not mutated); `study-plans-reality.service.spec.ts` EP13L block (preview places 162; `assignment.update*` never called) |
| EP13L-AC3 — every payload with a calibrated value carries `{ assignmentType, multiplier, samples }`; uncalibrated student sees today's behavior | **Done.** `RemainingWorkItem.calibration` (per item, `null` when none); `PlanPreview.calibration: CalibrationAnnotation[]` (distinct figures behind the proposal, stable order) on `POST /study-plans/preview` and the catch-up preview. Under 3 samples everywhere: identical minutes, `calibration: null` / `[]`. | reality spec: "annotates each remaining-work item…", "uncalibrated student… sees exactly today's behavior", "untyped… overall figure"; contract-key pins in `study-plans.service.spec.ts` and `study-plans-recovery-catch-up.service.spec.ts` updated to include the additive key |
| EP13L-AC4 — neutral, accessible frontend annotation; no shaming framing (test-asserted) | **Done.** `CalibrationNote` (`role="note"`, labelled, plain text, no colour-only meaning, renders nothing when empty) with the D-L4 sentence per figure via `calibrationCopy.ts` ("Your papers usually take about 1.6× your estimate, so we planned for that."). Mounted in the plan preview (above the week) and in `RemainingWorkSection` (one note derived from the rows' distinct figures). | `CalibrationNote.test.tsx` (sentence, plurals incl. overall fallback, list form, empty, **copy assertion**: no underestimat/wrong/behind/late/fail/should); `PlanPage.test.tsx` (+2); `RemainingWorkSection.test.tsx` (+2) |
| EP13L-AC5 — flex/fixed partition from calibrated work; deterministic; `placed + deficit = calibrated remaining` | **Done.** No engine change needed: the EP13G post-pass reads `remainingMinutes`, which is now calibrated upstream. Pinned by the fixture test: a 300-min paper due tomorrow (480-min horizon) is all `FLEX_DAY` with no deficit; the same fixture with papers at 2× (600 min) is all `FIXED` with `INSUFFICIENT_TIME_BEFORE_DEADLINE`, and `placed + deficit (+ deferred) = remaining` holds in both runs; two calibrated runs are deep-equal. | `calibration.spec.ts` "the EP13G anchor partition under calibration" (3 tests); reality spec "is deterministic" |

## Verification (2026-11-15)

- `apps/api`: `npx jest` → **1056 passed, 0 failed**, 475 skipped (the gated live-DB suites self-skip without `DATABASE_URL`; none available here — see F-EP13L-02). `pnpm lint` (`--max-warnings 0 --fix`, formatting only), `pnpm typecheck`, `pnpm format`: clean.
- `apps/web`: `npx vitest run` → **1210 passed, 0 failed** (107 files). `pnpm lint`, `pnpm typecheck`, `pnpm format`: clean (after `format:write` on two new test files).
- New tests: `calibration.spec.ts` (new, 24 tests), reality spec EP13L block (+6), `CalibrationNote.test.tsx` (new, 6), `PlanPage.test.tsx` (+2), `RemainingWorkSection.test.tsx` (+2). Updated pins: 2 contract-key lists (additive `calibration` key), 1 item equality (`calibration: null`), `scheduler.spec.ts` + 3 web fixtures gain the new field.
- Tested state: unit/component level with mocked Prisma and mocked API; no browser run, no live DB (gated-spec pins updated, not executed — F-EP13L-02).

## Payload contract (DoD-9)

- `GET /study-plans/remaining-work` → each item gains `calibration: { assignmentType: string | null, multiplier: number, samples: number } | null`. `estimatedMinutes` remains the raw estimate; `remainingMinutes = max(0, round(estimatedMinutes × multiplier) − confirmedMinutes)`.
- `POST /study-plans/preview` and `POST /study-plans/catch-up/preview` → gain `calibration: CalibrationAnnotation[]` — the distinct figures the proposal was planned with (sorted by type, overall fallback `assignmentType: null` first); `[]` for the uncalibrated student.
- The recovery summary's `unfinishedWork` items inherit the item shape. The saved-plan read is unchanged (F-EP13L-01).

## Deviations (each with why)

1. **Multiplier rounded to two decimals** (not stated in the story). Keeps the annotation stable and readable; pinned by test. The clamp and gate are exactly as specified.
2. **Untyped assignments contribute to the overall figure only.** The story says "per `Assignment.type` (fallback: overall median)"; a `null` type has no group of its own, so it uses the fallback. Tested ("missing type").
3. **`MISSING_DUE_DATE` items are calibrated too.** They flow through the same classification, so their `remainingMinutes` and `calibration` follow the one rule; `MISSING_ESTIMATE` items have nothing to scale and carry `null`.
4. **The preview's `calibration` list covers the engine's input** (after EP13A's zero-remaining filter), so it explains exactly the sessions shown. The remaining-work read annotates every item individually.
5. **Saved-plan read not annotated.** `contracts.md` names "the saved-plan read" alongside the preview; the story's scope and ACs name the preview and remaining-work payloads. Stored sessions carry no calibrated value to explain, and adding the two history queries to every saved-plan read would be cost without a consumer. Implemented the story's scope; recorded as F-EP13L-01 for the planner.
6. **Web copy formats the multiplier to one decimal** (`1.25` → `1.3×`), matching the story's "about 1.6×" register; the payload keeps two decimals.
7. **One shared note per surface rather than one line per row** in the remaining-work section: the D-L4 sentence is per figure, so repeating it on every row of the same type would be noise.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13L-01 | `contracts.md` ("Endpoints") says the saved-plan read gains `calibration`; the story scope/ACs do not, and the saved-plan payload has no calibrated value to annotate. | Open — planner to reconcile the contracts wording (implementer may not edit `contracts.md`). No code impact. |
| F-EP13L-02 | The gated live-DB suites (`study-plans-e2e`, `study-plans-data-scoping`, `study-plans-catch-up-e2e`) were not executed (no `DATABASE_URL`). Their three exact-key pins (remaining-work item ×2, catch-up preview body) were updated for the additive `calibration` key and compile under typecheck, but were **not run live**. | Open evidence item for the EP13 parent review unit (same standing as F-EP13A-03). |

## Changed paths

- `apps/api/src/domain/study-planning/calibration.ts` — **new** pure module.
- `apps/api/src/domain/study-planning/calibration.spec.ts` — **new** (matrix, application, EP13L-AC5 fixture).
- `apps/api/src/domain/study-planning/types.ts` — `AssignmentFacts.assignmentType?`, `CalibrationAnnotation`, `ClassifiedAssignment.calibration`.
- `apps/api/src/domain/study-planning/remaining-work.ts` — optional calibration table; scale-then-subtract (D-L1).
- `apps/api/src/domain/study-planning/scheduler.spec.ts` — fixture gains `calibration: null`.
- `apps/api/src/modules/study-plans/study-plans.service.ts` — `calibrationTable` helper (scoped history read, D-L5), `type` selected, table passed at both classification sites, `calibration` on `RemainingWorkItem` / `PlanPreview` / catch-up preview, `calibrationAnnotationsOf`.
- `apps/api/src/modules/study-plans/study-plans-reality.service.spec.ts` — EP13L block; `study-plans.service.spec.ts`, `study-plans-recovery-catch-up.service.spec.ts` — additive key pins; gated `study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts`, `study-plans-catch-up-e2e.spec.ts` — additive key pins (not executed live).
- `apps/web/src/entities/study-plan/model/types.ts` — `CalibrationAnnotation`, `PlanPreview.calibration`, `RemainingWorkItem.calibration`.
- `apps/web/src/features/study-plan/lib/calibrationCopy.ts` — **new** (D-L4 sentence, plurals, distinct figures).
- `apps/web/src/features/study-plan/ui/CalibrationNote.tsx` (+ test) — **new**.
- `apps/web/src/pages/plan/ui/PlanPage.tsx` (+ test), `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` (+ test) — the note mounted.
- `apps/web/src/features/plan-health/ui/*.test.tsx`, `apps/web/src/features/study-plan/lib/preview.test.ts` — fixtures gain the field.
- Docs: this record, the EP13L story (Status, D-L2/3/5 rulings, sizing), the EP13 README queue row, `artifacts/efficiency.md`.
