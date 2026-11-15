# EP13A — Plan Generation Counts Reality

**Story ID:** EP13A
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend
**Status:** Ready
**Dependencies:** EP06/EP07 complete. No UI decisions. First in the EP13 queue.
**Jira key:** Pending creation

## Summary

Close the "State A" gap: plan generation, preview and the remaining-work list
currently pass an **empty** confirmed-time map
(`study-plans.service.ts:492–494` and `:652–653`), so the planner always
schedules an assignment's full estimate no matter how much the student has
already studied. After this story, confirmed study minutes are attributed per
assignment and subtracted from remaining work everywhere the engine is fed
(preview, save, remaining-work, recovery summary, catch-up). Two adjacent
reality defects are fixed in the same seam: minutes held by **locked future
planned sessions** also reduce remaining work (today they are double-counted),
and the EP06 save path stops deleting **locked and completed** planned
sessions (parity with EP08's catch-up confirm).

This is the enabling story for the whole epic: every later behavior ("do the
work in any form and the plan shrinks") depends on this subtraction being
correct.

## Scope

**In scope:**
- Per-assignment confirmed-minutes aggregation (COMPLETED sessions only,
  grouped by `assignmentId`) feeding `classifyAssignments` in `gatherPlanData`
  and `getRemainingWork`; the EP08A recovery summary's per-assignment
  `confirmedMinutes` upgrades from always-0 to real values (closing seams
  V-07-3 / V-08-5 / EP08 PR-003's deferral).
- Remaining work additionally reduced by the minutes of locked, future,
  `SCHEDULED` planned sessions (they are kept commitments).
- `save` deletes only `SCHEDULED && !locked` rows in the window (EP06 parity
  with the EP08C confirm transaction).
- Unit/API tests (TR-E13-01).

**Out of scope:**
- The planned↔actual link (EP13B); status transitions (EP13B/C).
- Placement-rule changes (EP13F). Calibration multipliers (EP13L).
- Any UI.

## Source requirement references

- Epic AC-E13-01, AC-E13-02. Shared DoD 1, 3, 8, 9.
- TR-E13-01. Cross-epic seams V-07-3, V-08-5 (EP06/EP08 READMEs).

## Acceptance criteria

1. Remaining work per assignment = `max(0, calibratable estimate − confirmed
   minutes attributed to that assignment)`; only `COMPLETED` study sessions
   count; task-only sessions (`assignmentId` null) stay in the unattributed
   total and reduce nothing (V-13-1).
2. Preview, save, remaining-work, recovery summary and catch-up preview all
   consume the same aggregation (one helper, no second read path); the
   recovery summary's per-assignment `confirmedMinutes` is now real.
3. Minutes of locked, future, `SCHEDULED` planned sessions are subtracted
   from the remaining work handed to the engine, so locked time is never
   scheduled twice; the subtraction never produces a negative remainder.
4. `POST /study-plans` (save) preserves `locked` and `COMPLETED` planned
   sessions in the window — it deletes only `SCHEDULED && !locked` rows —
   and the conflict re-check treats the preserved rows as busy (same busy-set
   rule as EP08C confirm, including the replaced-rows exclusion).
5. An assignment whose confirmed minutes meet or exceed its estimate is not
   scheduled and is reported as effectively complete in the remaining-work
   payload (new `remainingMinutes: 0` presentation, not a new status).

## Tests (TR-E13-01)

- Aggregation: COMPLETED-only, per-assignment grouping, task-only sessions
  excluded from attribution but kept in the unattributed total.
- Subtraction: partial progress shrinks placement; full progress removes the
  assignment from placement; clamp at zero.
- Locked-future subtraction: locked minutes reduce remaining work; unlocked
  future sessions do not (they are being regenerated).
- Save preservation: locked and completed rows survive save; `SCHEDULED &&
  !locked` rows are replaced; conflict re-check counts preserved rows busy;
  unedited save succeeds (no self-conflict).
- Ownership scoping on every new query (uniform 404 where applicable).
- Regression: EP06/EP08 suites stay green (same engine, corrected inputs).

## Technical notes

- **Inspected (2026-11-14):** `study-plans.service.ts` lines 445–509 (the
  documented State-A comment block and empty maps at 492–494), 652–653;
  `domain/study-planning/remaining-work.ts` (`classifyAssignments` already
  accepts a confirmed map — the seam was built for this); EP08C's confirm
  transaction (busy-set + lock-preserving delete) as the parity model;
  `GET /study-sessions/confirmed-time` (EP07) as the aggregation precedent.
- **Proposed:** one private aggregation helper in the study-plans module (or
  shared with study-sessions) returning `Map<assignmentId, minutes>` +
  unattributed total; called by `gatherPlanData` and `getRemainingWork`.
  No migration. No endpoint shape changes beyond honest `confirmedMinutes`.
- EP08's catch-up busy set already includes locked rows; only the
  remaining-work subtraction is new there.

## Definition of Done

1. Functional criteria pass (AC-E13-01, AC-E13-02).
2. Invalid input: N/A (no new input surface; existing DTO validation stands).
3. Student data scoping on every new/changed query.
4. Actionable errors: existing contracts unchanged.
5–7. N/A (backend only).
8. Automated tests (TR-E13-01).
9. Contract doc: README remaining-work semantics updated by this story's
   implementation record; no migration.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** plans and work lists reflect work already done and commitments already kept.
- **Estimate:** 2–3 requests/tokens (aggregation helper + three call sites + save-path change + test matrix).
- **Model recommendation:** 4 — the subtraction semantics are the epic's money path; regressions here corrupt every plan.
- **Production files:** `apps/api/src/modules/study-plans/study-plans.service.ts`; possibly a small helper module beside it.
- **Test files:** `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (extend), gated API specs as in EP08's pattern.
- **Minimal start context:** this story, EP13 README shared contracts, `study-plans.service.ts` (the two State-A sites + save), `remaining-work.ts`, EP08C confirm transaction notes.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/api lint`, typecheck.
- **Dependencies:** none inside EP13. Blocks EP13B/C/F/L.
- **Exclusions:** link/lifecycle (EP13B), rollover (EP13C), placement rules (EP13F), calibration (EP13L).

## Tracker reference

Jira key: Pending creation (no sync authorized).
