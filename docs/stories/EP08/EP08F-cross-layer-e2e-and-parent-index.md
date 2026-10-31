# EP08F — Cross-Layer E2E and Parent Index

**Story ID:** EP08F
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Integration
**Status:** Queued
**Dependencies:** EP08A–EP08E implemented. No UI decisions.
**Jira key:** Pending creation

## Summary

Cross-layer verification of the entire EP08 catch-up and recovery flow against the real stack, plus the EP08 parent implementation index. Adds a new Playwright spec suite covering the full replan journey, decline, locked-session preservation, feasibility-warning display, completed-assignment exclusion, and reload survival. Collects the manual accessibility evidence for the combined EP08 review. Writes `./artifacts/EP08/implementation.md`.

## Scope

**In scope:**
- New Playwright spec `apps/web/e2e/catch-up.spec.ts` against the self-contained EP09 stack.
- Date-dependent fixture setup (availability, classes, assignments with due dates inside the generated window; missed sessions seeded or generated).
- Assertions against the window the server computed (not wall-clock dates).
- Locked-session preservation proof (a locked session survives confirm unchanged).
- Decline proof (plan unchanged after decline).
- Feasibility-warning display proof.
- Completed-assignment exclusion proof.
- Reload survival proof.
- EP04 calendar regression check (in-progress/null-endTime sessions still render) — carry-forward from EP07F.
- Parent implementation index at `./artifacts/EP08/implementation.md`.
- Collection of manual a11y evidence (TR-E08-08) for the combined review.

**Out of scope:**
- New backend or frontend feature code (this story verifies; it does not add features).
- Editing existing passing specs beyond keeping them green.

## Source requirement references

- All nine epic ACs (AC-E08-01…09) — cross-layer proof.
- Shared DoD items 3 (scoping proof), 8 (automated tests), 9 (parent index), 10 (integrated review input), 11 (walkthrough input).
- TR-E08-07, TR-E08-08.

## Acceptance criteria

1. A new Playwright spec `apps/web/e2e/catch-up.spec.ts` exercises the full replan journey: missed sessions → preview → edit → confirm → reload, and the plan survives the reload.
2. The spec proves decline leaves the plan unchanged.
3. The spec proves a locked session survives confirm unchanged (fields + count).
4. The spec proves a feasibility warning is displayed when work cannot fit before its deadline.
5. The spec proves a completed assignment's planned sessions are not reported as missed.
6. The spec proves recorded confirmed time reaches the recovery summary / remaining-work (where applicable).
7. The EP04 calendar regression harness stays green (in-progress/null-`endTime` sessions handled).
8. All pre-existing API, web and E2E suites stay green (the unrelated `study-plans-e2e.spec.ts` dailyCapMinutes failure, if still open, is reported but not a blocker for EP08).
9. `./artifacts/EP08/implementation.md` is written, indexing all six children with their commit hashes, test evidence, and known gaps.
10. Manual a11y evidence (TR-E08-08) is collected and referenced for the combined review.

## Tests (TR-E08-07, TR-E08-08)

- Cross-layer E2E: full replan journey; decline; locked preservation; feasibility warning; completed-assignment exclusion; saved plan surviving a reload; recorded time reaching the recovery summary.
- EP04 calendar regression: in-progress (null `endTime`) session handled; existing calendar specs green.
- Manual accessibility pass recorded (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) for EP08D/E surfaces, evidence collected here.

## Technical notes

- **Inspected code paths (verified):**
  - `apps/web/e2e/study-plan.spec.ts`, `study-sessions.spec.ts` (patterns to mirror).
  - `apps/web/e2e/global-setup.ts`, `global-teardown.ts`, `helpers.ts`, `test-env.ts`.
  - `apps/web/e2e/calendar.spec.ts` (calendar regression pattern).
- **Proposed (new):** `apps/web/e2e/catch-up.spec.ts`; `./artifacts/EP08/implementation.md`.
- **Date-dependent fixture discipline (EP06H lesson):** the fixture must create availability, classes and assignments whose due dates land inside the server-computed window; assertions must be made against the window the server returned (`from`/`to`), never wall-clock dates. The browser must never compute "today".
- **Timing:** catch-up E2E is less timing-sensitive than study-sessions E2E, but the reload-survival assertion must re-read the saved plan from the server.

## Definition of Done

1. Functional criteria pass (all AC-E08-01…09 at the integrated level).
2. Invalid input N/A (integration).
3. Student data scoping proof (cross-student access denied) — TR-E08-07.
4. Actionable API errors verified in E2E where applicable.
5. Loading/empty/error states covered where applicable.
6. Keyboard accessibility evidence collected (TR-E08-08).
7. Responsive layouts verified where applicable.
8. Automated tests (TR-E08-07, TR-E08-08).
9. Parent index written (`./artifacts/EP08/implementation.md`).
10. Integrated review — combined EP08 parent review (this story's completion unblocks it).
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable integration outcome (new Playwright suite + parent index + a11y evidence collection).
- **Estimate:** 3 requests/tokens.
- **Model recommendation:** 4 — high complexity (date-dependent fixtures, cross-layer assertions, parent index authoring); substantial new test harness.
- **Production files:** `apps/web/e2e/catch-up.spec.ts` (new); `docs/stories/EP08/artifacts/EP08/implementation.md` (new).
- **Test files:** the new spec.
- **Minimal start context:** this story file, EP08 README, EP06H/EP07F integration stories, existing E2E specs/helpers, design-system tokens.
- **Verification commands:** `npm run test:e2e --workspace=apps/web` (catch-up + pre-existing specs), `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`.
- **Dependencies:** EP08A–EP08E. Unblocks the combined EP08 parent review.
- **Exclusions:** no new feature code, no UI decisions, no Jira sync.

## Tracker reference

Jira key: Pending creation (no sync authorized).