# EP14E — Effort-Aware Placement: Student-Owned "Hard" Flag and a Light-Work Timing Guard

**Story ID:** EP14E
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 (D14-2)
**Layer:** Backend + Frontend (migration, engine, assignment form)
**Status:** Needs refinement — refiner pass for the assignment-form control and copy; ▲ D-E1…D-E3 need rulings; plan review required (new migration, planning-checklist rule)
**Dependencies:** EP14B (the new boolean body field must land under the strict-conversion policy, ▲ D-B1). Sources: EP13R D-R1 + D-R2 (user rulings 2026-11-16); F-EP13J-02, F-EP13J-04; closes V-13-5.

## Plan at a glance

- **What this changes:** an optional per-assignment "hard" flag (Auto / Hard / Not hard) that placement uses in place of the D13-10 guess when set; and a guard so light work only prefers a LOW-energy window that sits in the same part of the day as the earliest free NORMAL window.
- **Why it improves it:** the heuristic guesses what the student can simply say, and calibration can flip its 120-minute line (F-EP13J-02); without the guard, easy work can drift to a 22:00 LOW slot when 09:00 is free (F-EP13J-04) (product). Both stay deterministic, and the all-NORMAL identity (EP13J-AC3) must still hold (code).
- **Decisions needing you:** ▲ D-E1 (persisted field shape), ▲ D-E2 (Auto stays the default), ▲ D-E3 (the guard rule).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Let the student own the "is this demanding?" call, keep the existing rule as
the automatic default, and stop light work from being pushed late in the day
for the sake of an energy match.

## Scope

**In:** migration + DTO + engine input + `isDemanding` override; the guard in `byEnergyPreference`; the assignment form control; tests; `contracts.md`.
**Out:** energy quick setup, per-day overrides, explainability (Backlog BL-14-01…03).

## Source requirement references

AC-E14-06; TR-E14-06; DoD-1–9.

## Acceptance criteria

1. Assignments carry an optional hard flag (Auto when unset); create/update accept it with validation; the response always includes it; existing rows read as Auto.
2. When set, placement treats the assignment as demanding (Hard) or light (Not hard) regardless of type and size; Auto keeps D13-10 exactly; with every window NORMAL the output stays byte-identical (EP13J-AC3 preserved).
3. Light work prefers a LOW window only if it lies in the same part of the day (`windowHintOf`) as the earliest free NORMAL gap; otherwise it takes that NORMAL gap; demanding work is unchanged; deterministic.
4. The assignment form offers the three choices with keyboard support and plain copy (no percentages, no blame), following the EP13N named-choice pattern.

## Tests

- AC1: DTO matrix (true/false/null/omitted, wrong types → 400 under D-B1); migration default; ownership on update.
- AC2: `energy.spec.ts` — a HOMEWORK marked Hard scans HIGH first, an EXAM marked Not hard scans LOW first, Auto unchanged; identity case extended with flags set.
- AC3: the F-EP13J-04 scenario (09:00 NORMAL + 22:00 LOW → light work at 09:00); same-part-of-day LOW still preferred; determinism.
- AC4: form component tests (render, arrow keys, round-trip, 400 under the group).

## Technical notes

- Inspected: `apps/api/src/domain/study-planning/scheduler.ts:103–111` (`DEMANDING_REMAINING_MINUTES`, `isDemanding`), `byEnergyPreference` and `windowHintOf` in the same file; `apps/api/prisma/schema.prisma:196–202` (`Assignment.type` nullable, no effort field); EP13N's radio-card pattern in `StudyPreferencesForm.tsx`.
- Refiner gate: the assignment-form placement, labels and helper copy are UI decisions (D13-14 rule applies).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-E1 | Persisted shape: (a) nullable boolean `hard` (null = Auto); (b) nullable enum `effort` (LIGHT/NORMAL/HARD); (c) reuse `priority` | **(a)** — three honest states, one additive migration; (b) adds a NORMAL the engine has no use for; (c) conflates urgency with effort | Proposed |
| ▲ D-E2 | Default: (a) Auto = D13-10 heuristic, labelled "Auto (based on type and size)"; (b) remove the heuristic, default Not hard | **(a)** — nobody's plan changes until they choose; V-13-5 closes as "student-overridable" | Proposed |
| ▲ D-E3 (refines EP13J's D-J3) | Guard: (a) same-part-of-day rule via `windowHintOf`; (b) a new "no study after HH:mm" preference; (c) both | **(a)** — no new preference, deterministic, identity-preserving; (b) can come later if asked | Proposed |

## Definition of Done

1–9 as applicable; DoD-9 includes the migration and `contracts.md`; 10–11 via the parent review.

## Sizing

- **Outcome:** students decide what counts as hard, and easy work stops drifting late.
- **Actual at closeout:** tbd.
- **Files:** `schema.prisma` + migration, assignments DTOs/service/response, `remaining-work.ts` (carry the flag), `scheduler.ts`, `types.ts`, `energy.spec.ts`, assignment form + tests, `contracts.md`.
- **Start context:** this story; EP13J record (D-J1/D-J3); `scheduler.ts` energy section.
- **Verification:** API + web suites, gated run (via EP14A CI), the journeys unchanged.
- **Dependencies / exclusions:** EP14B (D-B1); backlog items BL-14-01…04.
