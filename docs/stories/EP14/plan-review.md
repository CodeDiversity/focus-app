# EP14 plan review

**Date:** 2026-11-16
**Pass:** 2 (re-review). Pass 1: [plan-review-round-1.md](./plan-review-round-1.md).
**Reviewer:** `reviewer`, assignment `plan_review`.
**Reviewed commit:** `bd01495`, clean tree, branch `hfi/bf2612ce-2a74-474c-9871-26c93b36fc2d/oak`.
**Scope:** corrections C-EP14-01…09 (`bd01495`) across the epic, README, history and EP14A…EP14E, each re-checked against the code it cites. No test suites run (planning scope). Ratified decisions not re-litigated.

## Verdict

**Plan Ready.** R-EP14-01…09 resolved. One new polish finding (R-EP14-10), non-blocking. Implementation blockers: none beyond the existing EP14E refiner gate.

## Prior findings

| ID | Severity | Status | Fresh evidence |
|---|---|---|---|
| R-EP14-01 | Should-fix | Resolved | The four R-EP13-03 tests, re-read: (1) `study-plans-e2e.spec.ts:570–590` lock 400-case runs first and seeds once, so it fails only on `{ locked: 'yes' }` → 200 (`set-session-lock.dto.ts:12` `@IsBoolean` + implicit conversion `main.ts:20`). (2) `:594` happy path is the second `seedPlannedSession` (`:532–550`, fixed-date `studyPlan.create`), so it hits `study_plans_userId_date_key`. (3) `study-plans-data-scoping.spec.ts:320–331` has the same fixed-date create, so the second caller (`:380`) collides. (4) Bag-survival `:166–189`: the shared `student` (`beforeAll :56`) already holds `dailyCapMinutes: 300` from `:152`. Under merge (`users.service.ts:97–126`), `PATCH {theme}` no longer wipes `studyDefaults`, so `{...DEFAULTS, 45}` mismatches. That is a stale premise, and D-A4(a) repairs it. Given the reviewer-executed 4-failed baseline (`EP13/artifacts/EP13/review.md:58`), D-A3/D-A4 leave exactly the lock 400-case. EP14A-AC2/AC3 now state a proof that can be achieved, and EP14B-AC3 owns the green run. |
| R-EP14-02 | Should-fix | Resolved | EP14A now carries the CI trigger, two fixture repairs, one spec rewrite, a CI-failure diagnosis and the skill rule. That clears the meaningful-work gate. Keeping the ID separate is justified (it preserves the user's ordering and push authorization). |
| R-EP14-03 | Should-fix | Resolved | `grep -rn enableImplicitConversion apps/api/src` → `main.ts:20`, `test-http.ts:109`, `assignments.service.spec.ts:173,534,1059,1108`, `auth.controller.spec.ts:220`, the five `auth/dto/*.dto.spec.ts:9–11`, `study-plans-recovery-catch-up.service.spec.ts:623,886,978,1017,1074,1161`. That is exactly EP14B's list. Note: four of the recovery-catch-up sites are `plainToInstance(…, {enableImplicitConversion: true})`, not pipes. AC2's "every spec that builds a pipe" does not literally cover them, but the AC2 grep guard does, and EP14B Technical notes lists them. |
| R-EP14-04 | Should-fix | Resolved | EP14B Technical notes carries the body inventory and the query-side finding. AC1 adds `{ locked: "false" }` and `offset`. AC3 adds Playwright. The D-B1 rationale is corrected. |
| R-EP14-05 | Should-fix | Resolved | EP14B Tests/Files name `validation-strictness-e2e.spec.ts`, which matches `.*\.spec\.ts$`, and gate it with `describeIntegration`. |
| R-EP14-06 | Should-fix | Resolved | `grep -rn "bg-success/10" apps/web/src` shows the pairing with `text-success` at exactly `Badge.tsx:14`, `AvailabilitySlotList.tsx:79`, `assignmentPresentation.ts:26,112` and `CalendarEventChip.tsx:79`. Three other sites use `bg-success/10` without `text-success` (`MomentumWeekStrip.tsx:30`, `TodayPlanCard.tsx:165`, `AbsorbNextOffer.tsx:84`) and are correctly excluded. AC3 also adds a guard. See R-EP14-10. |
| R-EP14-07 | Should-fix | Resolved | Epic AC6 (`EP14-adaptive-scheduling-follow-ups.md`) now matches EP14E-AC3. AC3 defines the usable-gap reference (`usable ≥ minBlock`) and the no-NORMAL case (D-J3 order), and Tests names a case for each. |
| R-EP14-08 | Should-fix | Resolved | EP14C-AC2 requires a trace and a recorded root cause before any fix. D-C2 applies only to shared-user state, and a product-side duplicate POST is routed to a finding. The technical note now matches `login.spec.ts:16–20` and `auth.service.ts:141–145`. |
| R-EP14-09 | Polish | Resolved | (1) `momentumCopy.ts:65` and `momentumCopy.test.ts:62` are in EP14B. (2) `study-plans.service.ts:1071` (`assignmentType: a.type`) is in EP14E Files. (3) The AC-E14-07 verifier is the EP14 parent review. (4) The BL-14-01/-04/-05 triggers are rewritten and checkable. (5) The duplicate PR runs are noted in D-A1. |

## New findings

| ID | Severity | Gap | Location | Consequence | Suggested correction | Closure condition |
|---|---|---|---|---|---|---|
| R-EP14-10 | Polish | EP14D Files omit a test that pins the old pairing | `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx:853` (`toHaveClass('bg-success/10', 'text-success')` on the COMPLETED status select, which comes from `assignmentPresentation.ts`) | The D-D2 token change breaks this test. The `src/**` guard would also flag it unless the guard excludes tests. | The implementer updates it in EP14D. The planner may add it to Files. | Optional. EP14D's closeout shows it updated. |

## Coverage summary

| Checklist # | Result |
|---|---|
| 1 Separation and sizing | Pass |
| 2 AC/TR coverage | Pass (epic AC6 aligned) |
| 3 DoD | Pass |
| 4 Contracts / integration ownership | Pass (one pipe-options source; green-run owner explicit) |
| 5 Code paths inspected | Pass (R-EP14-10 polish) |
| 6 Risks / owning tests | Pass |
| 7 Dependencies / sequence | Pass (EP14A red → EP14B green) |
| 8 ▲ decisions ruled | Pass (all ratified 2026-11-16) |
| 9 Correction log | Pass (C-EP14-01…09 → closed in this pass) |
| 10 Identifiers / queue-lint | Pass |

## Handoff

**Planner:** none required. R-EP14-10 is optional. **User:** no decisions. **Next:** EP14A — implement.
