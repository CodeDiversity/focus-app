# SP-122 implementation review — Assignment Search, Sorting & Filters (pass 3)

**Review date:** 2026-10-26
**Mode:** Implementation review (final parent review unit, re-pass after post-review UI polish)
**Reviewed state:** working tree on `main`; parent baseline `e0a1722` (SP-122 plan); combined scope SP-122A/B/C. HEAD `faddc5d` (UI polish: filter bar layout). Planner correction `440ff2a` (docs only) remains in effect. No application logic change since pass 2; the only change since the prior passing review (`b619604`) is commit `faddc5d` (CSS/layout only in `AssignmentsPage.tsx`).
**Scope:** SP-122A (backend `GET /assignments`) + SP-122B (frontend `/assignments` page) + SP-122C (integration e2e + parent index). Combined review of all three children plus cross-child behavior. Excludes story 7, pagination, and a dedicated detail page (D122-1, D122-7).
**Reviewer:** reviewer (read-only on code/tests; report and walkthrough are reviewer-owned writes).

## Scope and evidence boundaries

Read the canonical queue (`docs/stories/EP03/SP-122/README.md`), parent coordination record, all three child tickets, all child implementation records/checkpoints, the parent implementation index (`./implementation.md`), the prior pass-1 and pass-2 reports (`review.md`), the SP-113/SP-115/SP-120/SP-121 DoD-10 exception precedent, and the shared DoD (`docs/epics/README.md`). Independently re-inspected the changed filter bar in `AssignmentsPage.tsx` (commit `faddc5d`) plus the previously reviewed list DTO, service `list()`, controller `@Get()`, frontend `listAssignments`, `AssignmentsPage`, `AssignmentListItem` type, route/nav, e2e spec, unit/component tests, and ownership helpers. Source requirements: EP03 AC-E03-07 and the shared DoD. No code, tests, migrations, story tickets, or plans were modified by this review.

### Browser exception (D122C-1)

As recorded in passes 1/2 and in `SP-122C/implementation.md`, the manual browser pass (search, filters, sort, empty/error states, responsive, keyboard) was not executed in this agent context; a session-owner-authorized automated substitute was recorded under the SP-113C precedent. This review re-acknowledges that exception. It does **not** claim a live browser walk occurred. DoD items 6, 7 and 10 are marked **PASS under D122C-1 exception**; the manual browser verification remains outstanding for the user, with steps provided in `walkthrough.md` labelled `Not executed — user test instructions`. This is not a code defect and does not block the parent review on its own. The `faddc5d` polish (responsive filter bar) is consistent with the documented responsive behavior and does not change this disposition.

## Findings

### F122C-1 — closed (pass 2, unchanged)

- **Requirement / source:** D122-5 and the shared API contract sort line; A AC7; C AC2.
- **Disposition:** Closed in pass 2. No change in pass 3. Contract, implementation (`orderBy: [{ priority: order }]` / `[{ status: order }]` on native enum columns), and e2e expectations (ordinal) remain consistent. See pass-2 report for full closure evidence.

### D122C-1 — acknowledged, not a blocker (DoD-10 exception, unchanged)

- **Requirement / source:** DoD item 10; C AC9.
- **Disposition:** Accepted under the authorized exception, consistent with the SP-113C / SP-115H / SP-120J / SP-121B precedent. Manual browser pass outstanding (user). See pass-2 report.

### F122C-2 — polish (optional, not blocking, unchanged)

- **Requirement / source:** Correction-log entry F122C-1; e2e spec sort-test titles/comments.
- **Observed gap:** E2e spec sort-test titles/comments still say "enum string" / "see F122C-1". Cosmetic only; expectations correct and passing.
- **Severity rationale:** Optional wording cleanup; no unmet AC/DoD/mandatory obligation. Polish.
- **Owner:** implementer (test file only), optional.
- **Closure condition:** Rename the two `it(...)` titles to "enum ordinal" and update the two comments to reference revised D122-5. No behavior change; no re-review required.

### Pass-3 re-assessment of commit `faddc5d` (filter bar layout)

- **Change:** CSS/layout only in `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`. Filter bar now uses `space-y-3` vertical rhythm; controls container uses a responsive grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end`; every control carries `w-full` (course, status, priority, type, sort Selects; due-from/due-to Inputs; order toggle retains its fixed 44 px touch target with `min-h-[44px] min-w-[44px]`). Search input remains full-width in its own row above the grid.
- **Scope of impact:** No TypeScript, no logic, no data flow, no API contract, no test changes. Existing component tests (2 files / 29 tests) exercise behavior, not class names, so they remain valid. Typecheck unaffected (no TS changes).
- **DoD impact:** Supports DoD 6 (keyboard/focus unchanged — controls remain native, keyboard-operable, with visible focus rings) and DoD 7 (responsive — mobile-first 2-column stacking, then 3/4 columns; full-width controls; no horizontal scroll expected). Live mobile rendering still not executed (D122C-1 exception).
- **Disposition:** No new finding. Polish retained. No AC or DoD obligation newly unmet. No should-fix or blocker.

No blocker or other should-fix findings. All other criteria pass (unchanged from pass 2).

## Acceptance-criterion assessment

Unchanged from pass 2; the `faddc5d` polish does not alter any AC outcome. Summary:

### SP-122A (backend) — all AC1–AC12 satisfied

See pass-2 report for per-AC evidence (projection, ownership gate, filters, date bounds, search, sort/order stability, unknown-param rejection, unauthenticated 401, no regression). F122C-1 closed (pass 2).

### SP-122B (frontend) — all AC1–AC11 satisfied

See pass-2 report. AC9 (accessibility) and AC10 (responsive) remain satisfied by code inspection; live browser a11y/mobile not executed (D122C-1). The `faddc5d` polish reinforces AC10 responsive behavior (full-width controls, responsive grid) by inspection only.

### SP-122C (integration) — all AC1–AC10 satisfied

See pass-2 report. C AC9 (DoD-10) remains PASS under D122C-1 exception.

## Definition of Done audit

Unchanged from pass 2 except DoD 7 note updated for the polish (still under exception).

| # | Condition | Disposition | Evidence / limitation |
|---|---|---|---|
| 1 | Functional criteria | PASS | A endpoint + filters + sort; B list page + controls; C integrated proof. F122C-1 closed (pass 2). |
| 2 | Invalid-input validation | PASS | DTO decorators + service re-checks (validateSync) + frontend mirrors rules. |
| 3 | Student data scoping | PASS | `where: { userId }` always present; courseId gate via `ownedWhere`; tasks filtered by `userId`; cross-student HTTP matrix (B list excludes A; A courseId → uniform 404). |
| 4 | Actionable API errors | PASS | Field-level 400 `errors` map; uniform 404 "Resource not found"; 401 global guard; frontend toast + reset. |
| 5 | Loading/empty/error states | PASS | B states implemented and code-inspected. |
| 6 | Keyboard accessibility | PASS under D122C-1 exception | Controls keyboard-operable in code; live browser keyboard not executed. Component tests cover some interactions. |
| 7 | Responsive layouts | PASS under D122C-1 exception | `faddc5d`: filter bar `space-y-3` + responsive grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `w-full` controls, 44 px touch target on order toggle. Live mobile rendering not executed. |
| 8 | Automated business-rule tests | PASS | A unit + data-scoping + C e2e 23 (with DB) + B component 29 (recorded). Without `DATABASE_URL`, e2e/data-scoping self-skip (recorded as skipped, not claimed passed). |
| 9 | API/migration documentation | PASS (F122C-1 closed) | Contract in SP-122 README; no migration. Sort wording consistent (pass 2). |
| 10 | Integrated development review | PASS under D122C-1 exception | Automated HTTP integration against real PostgreSQL + component suite substituted for browser walk; independent reviewer re-review completed (pass 3). Manual browser pass outstanding (user). |
| 11 | Reviewer walkthrough | PASS | `walkthrough.md` saved beside `review.md` (refreshed pass 3), verified. |

## Ownership / security check

Unchanged from pass 2. Every Prisma read in `list()` is scoped by `userId`: `assignment.findMany({ where: { userId, … } })`, `course.findFirst({ where: ownedWhere(userId, courseId) })`, and `tasks: { where: { userId } }`. No client-supplied `userId` is accepted (DTO has no such field; `forbidNonWhitelisted` → 400). Foreign/missing `courseId` → uniform 404 "Resource not found" before any assignment query (no existence oracle). No 403 or distinct messages. Controller uses `@CurrentUser()`, not `@Req()`. No secret/credential files touched. No AI/LMS/grade/flashcard/native scope introduced. PASS.

## Verification ledger

### Reviewer independent inspection (read-only, no execution)

- Re-inspected this pass: the changed filter bar in `AssignmentsPage.tsx` (commit `faddc5d`) — `space-y-3`, responsive grid classes, `w-full` on each control, search row, order toggle touch target. Re-confirmed no TS/logic changes in the file relative to the prior reviewed scope (diff is class-name/layout only). Also re-confirmed the previously reviewed service/controller/DTO/frontend files are unchanged in logic.
- Reconciled D122-5 wording across README, shared contract, SP-122A, SP-122C against the implementation and e2e expectations (unchanged since pass 2).
- No code/tests/migrations/docs other than this report, `walkthrough.md`, and the passing-review docs sync were modified. No shell/test runner available to the reviewer, consistent with the SP-121 pass 2/3 precedent.

### Implementer verification (recorded evidence, reused — code unchanged in logic)

From `artifacts/SP-122/implementation.md` and child records (pass 1, unchanged by `faddc5d`):

- With `DATABASE_URL` (disposable local Postgres 55432):
  - `pnpm --filter @studypilot/api exec tsc --noEmit`: pass.
  - `pnpm --filter @studypilot/api exec jest --runInBand assignments-list-e2e.spec.ts`: **23 passed**.
  - `pnpm --filter @studypilot/api exec jest --runInBand`: **43 suites, 1025 tests passed**.
- Frontend:
  - `npm run test` (AssignmentsPage + assignmentApi): **2 files, 29 tests passed**.
  - `pnpm --filter @studypilot/web typecheck`: pass.
- A unit: `assignments.service.spec.ts` list tests reported passing (A record: 246 passed).
- B component: 29 passed (B record).
- `git diff --check`: pass.
- Without `DATABASE_URL`, the e2e spec self-skips (`describe.skip`); recorded as skipped, not claimed passed.

Reviewer-executed gates: **none** (no shell access). The `faddc5d` change is CSS-only, so the recorded frontend component tests and typecheck remain valid without rerun; component tests assert behavior, not class names. Raw output was not re-captured and is not reproduced here. No test rerun was performed or claimed.

## Closeout / concrete handoff

- **Review task:** Complete (passing verdict).
- **Verdict:** **PASS** — SP-122 (A/B/C) meets the DoD and acceptance criteria (AC-E03-07) with no open blocker or should-fix finding. F122C-1 closed (pass 2). D122C-1 is an acknowledged, authorized DoD-10 exception and does not block. Polish-only findings F122C-2 (stale e2e wording) and the `faddc5d` filter-bar layout polish remain optional/non-blocking.
- **Findings:**
  - F122C-1 (should-fix, pass 1) — closed in pass 2 (wording path; docs consistent with ordinal implementation; no code change). Unchanged pass 3.
  - D122C-1 (DoD-10 exception) — acknowledged; manual browser pass outstanding for the user.
  - F122C-2 (polish, optional) — stale e2e test title/comment wording; no action required for pass.
  - Pass-3 re-assessment of `faddc5d` — no new finding (CSS-only polish retained).
- **Artifacts produced by reviewer:** `docs/stories/EP03/SP-122/artifacts/SP-122/review.md` (this file, pass 3) and `docs/stories/EP03/SP-122/artifacts/SP-122/walkthrough.md` (refreshed pass 3). Passing-review docs sync applied (correction-log note for the polish, execution queue rows remain `Reviewed`, parent status line refreshed, autopilot stage updated).
- **Git handoff:** Reviewer saved `review.md`, refreshed `walkthrough.md`, and applied the passing-review docs sync (README queue/correction-log/autopilot fields, parent coordination status line) but has no git tool available, so the scoped commit is deferred to the coordinator. Suggested commit scope: `docs/stories/EP03/SP-122/artifacts/SP-122/review.md`, `docs/stories/EP03/SP-122/artifacts/SP-122/walkthrough.md`, `docs/stories/EP03/SP-122/README.md`, `docs/stories/EP03/SP-122/SP-122-assignment-search-sorting-and-filters.md`. No code/test/migration changes are included.

**Verdict: PASS — SP-122 meets the DoD and acceptance criteria (AC-E03-07). F122C-1 closed; DoD-10 accepted under the authorized D122C-1 exception; DoD-11 walkthrough saved/refreshed. Only optional polish (F122C-2, `faddc5d` layout) remains.**