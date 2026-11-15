# EP13L — Deterministic Estimate Calibration

**Story ID:** EP13L
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend (pure domain core + small frontend annotation)
**Status:** Ready
**Dependencies:** EP13A implemented (calibration applies where confirmed time is attributed); EP13F + EP13G implemented (calibrated remaining work feeds placement v2's budgets and the flex/fixed partition — see *Review note*). D13-7 provisional.
**Reviewed:** 2026-11-15 — one AC added for the EP13G interaction.
**Replanned:** 2026-11-15 — converted to the shared-understanding template (EP13Q); decisions D-L1…D-L5 proposed for user review before implementation.

## Plan at a glance

- **What this changes:** a new pure module `domain/study-planning/calibration.ts` plus wiring in `study-plans.service.ts`: per-assignment-type multipliers (median of confirmed ÷ estimated over finished assignments, ≥3 samples, clamped 0.5–3.0) scale remaining-work estimates before placement; preview and remaining-work payloads gain a `calibration` annotation; one neutral explanatory line in the plan preview UI.
- **Why it improves it:** students whose estimates run systematically short stop getting plans that are impossible by construction, and they are told why in one plain, non-judgemental sentence (product). The engine stays pure and deterministic; no `Assignment` row is ever written; a student without history sees zero change (code).
- **Decisions needing you:** ▲ D-L1 (where the multiplier is applied) and ▲ D-L4 (student-facing copy) are Proposed with recommendations; the rest auto-ratify.
- **How to change this plan:** edit a Ruling cell in the Decisions table below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.


ADHD estimates are systematically optimistic, and the planner currently
trusts them fully. This story corrects estimates from the student's own
history, deterministically and transparently (D13-7): over finished
assignments (COMPLETED/SUBMITTED/GRADED with estimate > 0 and confirmed
minutes > 0), compute the median ratio confirmed/estimated per
`Assignment.type` (fallback: overall median), require ≥3 samples else 1.0,
clamp to [0.5, 3.0], and multiply remaining-work estimates by it during
classification. Previews and the remaining-work payload annotate every
calibrated value (`{ assignmentType, multiplier, samples }`) so the student
sees "your papers usually take about 1.6× your estimate, so we planned for
that" — the app on the student's side, not auditing them. No AI: pure
arithmetic over the student's own records.

## Scope

**In scope:**
- Pure calibration module in `domain/study-planning/` (`calibration.ts`):
  ratios → medians → clamped multipliers; no clock, no I/O.
- Service wiring: multipliers computed from finished assignments + confirmed
  time in `gatherPlanData`/`getRemainingWork`; applied to estimates before
  `classifyAssignments`; `calibration` annotations added to preview and
  remaining-work payloads.
- Frontend: a one-line explainable annotation where estimates are shown in
  the plan preview and remaining-work sections (existing presentation
  patterns; copy neutral per D13-9 — never "you underestimate").
- Tests (TR-E13-12).

**Out of scope:**
- Editing multipliers manually; per-course calibration; any model/learning
  beyond the stated arithmetic; UI redesign of the preview.

## Source requirement references

- Epic AC-E13-13, AC-E13-14. Shared DoD 1, 3, 8, 9. TR-E13-12. D13-7.

## Acceptance criteria

1. The calibration module is pure and deterministic; given the same history
   it yields identical multipliers (median, ≥3-sample gate, clamp [0.5,
   3.0], per-type with overall fallback).
2. Calibrated estimates affect placement only through the existing
   remaining-work path (estimate × multiplier − confirmed, clamped ≥ 0);
   `Assignment` rows are never written; raw estimates remain visible.
3. Every payload that carries a calibrated value also carries its
   explanation (`assignmentType`, `multiplier`, `samples`); an uncalibrated
   student (fewer than 3 samples everywhere) sees exactly today's behavior
   (multiplier 1.0, no annotation noise).
4. The frontend annotation renders the explanation neutrally and
   accessibly; no shaming framing (test-asserted).
5. **The flex/fixed partition is computed from calibrated remaining work**
   (EP13G rule 6) and stays deterministic: the same history yields the same
   anchors. More calibrated work legitimately pins more sessions — that is
   deadline pressure becoming visible, not a regression — and the extra
   minutes that no longer fit surface through the existing deficit
   warnings (EP13F), never as silent loss. Pinned by a test that runs the
   same fixture with and without calibration and asserts both the anchor
   shift and `placed + deficit = calibrated remaining`.

## Tests (TR-E13-12)

- Median/gate/clamp/fallback matrix (0–2 samples, outlier ratios, mixed
  types, missing type); determinism.
- Application: placement shrinks/grows with multiplier; assignments
  unwritten (field-for-field); identity when uncalibrated.
- Payload annotations present/absent correctly; ownership scoping of the
  history query.
- EP13G interaction (EP13L-AC5): anchor partition under calibration, determinism,
  and the no-silent-loss assertion.
- Frontend annotation rendering + copy assertion.

## Technical notes

- **Inspected (2026-11-14):** `Assignment` fields per EP08 baseline
  (`estimatedHours`, `actualHours` — note: calibration uses **confirmed
  session minutes**, not the self-reported `actualHours`, which EP06
  deliberately ignores); `remaining-work.ts` classification seam.
- **Proposed:** `calibration.ts` + `calibration.spec.ts` in the domain
  module; multiplier map plumbed through `gatherPlanData` beside the EP13A
  confirmed map; annotation types in the preview DTO.
- Interaction with EP13A is compositional: calibration scales the estimate,
  EP13A subtracts confirmed minutes — order fixed (scale first) and pinned
  by test.

### Review note (2026-11-15)

Calibration lands after EP13F and EP13G, which both read `remainingMinutes`:
placement v2 sizes blocks and spends the day budget from it, and EP13G's
pin rule asks whether the work still fits its horizon. Multiplying a
student's estimates by 1.6 therefore does more than make plans longer — it
**converts flex sessions into fixed ones** wherever the extra work removes
the slack. That is correct behaviour (the deadline really did get tighter),
but it is a visible, surprising change that a reviewer could read as an
EP13G regression, so EP13L-AC5 makes it an asserted, intentional outcome rather
than an emergent one.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-L1 ▲ (refines D13-7) | (a) multiply the estimate **before** EP13A subtracts confirmed minutes (`est×m − confirmed`); (b) multiply the remainder after subtraction (`(est − confirmed)×m`) | **(a)** | Confirmed minutes are real and must not be inflated; (b) would re-scale work already done. Material: changes plan math for every calibrated student. | Proposed |
| D-L2 | Sample source: (a) `StudySession` confirmed minutes (EP13A attribution); (b) self-reported `Assignment.actualHours` | **(a)** | EP06 already ignores `actualHours` as unreliable; EP13A made confirmed minutes authoritative. | Proposed |
| D-L3 | Fallback when a type has < 3 samples: (a) overall median across types; (b) 1.0 until the type has 3 | **(a)**, itself gated at ≥ 3 overall samples | A student with 3 finished essays and 1 problem set still benefits; (b) is simpler but delays value. | Proposed |
| D-L4 ▲ | Annotation copy: (a) "Your papers usually take about 1.6× your estimate, so we planned for that."; (b) numeric badge "×1.6" with tooltip only; (c) no student-facing copy, annotation in payload only | **(a)** | D13-9 wants the app on the student's side and explainable (AC-E13-13); (b) is terse but opaque; (c) fails the epic AC. Material: user-visible wording. | Proposed |
| D-L5 | Where the multiplier is computed: (a) once per plan read inside `gatherPlanData` alongside the EP13A confirmed map; (b) a cached per-student value persisted on save | **(a)** | Pure function of history, cheap (one grouped query); persistence would add a write path and staleness for no measured need. | Proposed |

Rows are `D-L<n>`; one that refines or overrides a register row says `(refines D13-<n>)` / `(overrides D13-<n>)`. ▲ = material: the implementer stops and asks if still `Proposed`; other rows become `Ratified by default` at implementation start.

## Definition of Done

1. Functional criteria pass (AC-E13-13).
2. N/A (no new inputs). 3. Ownership scoping on the history query.
4. Existing error contracts. 5–7. N/A beyond the annotation (existing
   patterns, component-tested).
8. Automated tests (TR-E13-12).
9. Payload contract documented.
10–11. Combined EP13 parent review (DoD-11: its "How to verify by hand" section).

## Sizing

- **Outcome:** plans absorb the student's real pace, visibly and explainably, with zero behavior change until history exists.
- **Actual at closeout:** tbd (from `artifacts/efficiency.md`).
- **Model tier:** default (implementer).
- **Production files:** `apps/api/src/domain/study-planning/calibration.ts` (new), `study-plans.service.ts` wiring, preview DTO, small frontend annotation component.
- **Test files:** `calibration.spec.ts` (new), service spec (extend), annotation component test.
- **Minimal start context:** this story, EP13 README D13-7, `remaining-work.ts`, EP13A record.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13A. Blocks nothing.
- **Exclusions:** manual multiplier editing, per-course calibration, learning.

