# SP-122 implementation review — Assignment Search, Sorting & Filters (pass 2)

**Review date:** 2026-10-26
**Mode:** Implementation review (final parent review unit, re-pass after plan correction)
**Reviewed state:** working tree on `main`; parent baseline `e0a1722` (SP-122 plan) per README Autopilot; combined scope SP-122A/B/C. Planner correction `440ff2a` revised D122-5/contract to enum-ordinal; no application code change. HEAD not independently re-verified (no shell available — see verification ledger); recorded HEAD `65eb09a`.
**Scope:** SP-122A (backend `GET /assignments`) + SP-122B (frontend `/assignments` page) + SP-122C (integration e2e + parent index). Combined review of all three children plus cross-child behavior. Excludes story 7, pagination, and a dedicated detail page (D122-1, D122-7).
**Reviewer:** reviewer (read-only on code/tests; report and walkthrough are reviewer-owned writes).

## Scope and evidence boundaries

Read the canonical queue (`docs/stories/EP03/SP-122/README.md`), parent coordination record, all three child tickets, all child implementation records/checkpoints, the parent implementation index (`./implementation.md`), the prior pass-1 report (`review.md` pass 1), the SP-113/SP-115/SP-120/SP-121 DoD-10 exception precedent, and the shared DoD (`docs/epics/README.md`). Independently re-inspected the list DTO, service `list()`, controller `@Get()`, frontend `listAssignments`, `AssignmentsPage`, `AssignmentListItem` type, route/nav, e2e spec, unit/component tests, and ownership helpers. Source requirements: EP03 AC-E03-07 and the shared DoD. No code, tests, migrations, story tickets, or plans were modified by this review.

### Browser exception (D122C-1)

As recorded in pass 1 and in `SP-122C/implementation.md`, the manual browser pass (search, filters, sort, empty/error states, responsive, keyboard) was not executed in this agent context; a session-owner-authorized automated substitute was recorded under the SP-113C precedent. This review re-acknowledges that exception. It does **not** claim a live browser walk occurred. DoD items 6, 7 and 10 are marked **PASS under D122C-1 exception**; the manual browser verification remains outstanding for the user, with steps provided in `walkthrough.md` labelled `Not executed — user test instructions`. This is not a code defect and does not block the parent review on its own.

## Findings

### F122C-1 — closed (pass 2)

- **Requirement / source:** D122-5 and the shared API contract sort line in `docs/stories/EP03/SP-122/README.md`; A AC7 ("Every supported sort is stable and deterministic"); C AC2 ("Each sort × order combination returns rows in the documented order").
- **Prior gap (pass 1):** D122-5 documented "stored enum string" while the implementation sorts Prisma enum columns by Postgres declaration ordinal, and the e2e spec was adjusted to ordinal. Contract, implementation, and tests disagreed.
- **Closure evidence (verified this pass):** Planner correction `440ff2a` applied the **wording path**. Cross-file comparison confirms consistency:
  - `README.md` D122-5 and the shared API contract sort line now state priority/status sort by enum declaration order (Postgres ordinal): `AssignmentPriority` LOW → MEDIUM → HIGH → URGENT; `AssignmentStatus` PENDING → IN_PROGRESS → COMPLETED → SUBMITTED → GRADED, not lexicographic text order and not a severity rank.
  - `SP-122A` AC7 and contract notes state the same ordinal sequence.
  - `SP-122C` contract notes state the same.
  - Implementation `assignments.service.ts` `list()` builds `orderBy: [{ priority: order }]` / `[{ status: order }]` directly on the native enum columns, which PostgreSQL orders by declaration ordinal — matching the documented sequence.
  - E2e expectations (`assignments-list-e2e.spec.ts`) assert the ordinal sequence and are reported passing (23/23 with DB).
- **Disposition:** Closed. No application code change was required or made. The contract, implementation, and tests now agree. (The e2e test title/comment wording still references "F122C-1"/"enum string" — see optional polish below; it does not affect correctness or the contract.)
- **Verification:** documentation cross-file comparison (this pass) + recorded implementer evidence (23 e2e passed, full suite 43 suites / 1025 tests).

### D122C-1 — acknowledged, not a blocker (DoD-10 exception)

- **Requirement / source:** DoD item 10 (integrated development review) and C AC9 (manual browser pass) in the SP-122 README DoD map; SP-122C AC9.
- **Observed:** The manual browser pass was not executed in this agent context; a session-owner-authorized automated substitute was recorded (backend full suite 43 suites / 1025 tests incl. 23 new e2e, frontend component suite 2 files / 29 tests, both typechecks). The substitute is explicitly *not* a live browser-to-API journey, actual mobile rendering, or human visual/a11y ratification.
- **Disposition:** Accepted under the authorized exception, consistent with the SP-113C / SP-115H / SP-120J / SP-121B precedent. DoD items 6, 7 and 10 are marked **PASS under D122C-1 exception**; the manual browser verification remains outstanding and must be performed by the user, with steps provided in `walkthrough.md` as `Not executed — user test instructions`. This is not a code defect and does not block the parent review on its own.

### F122C-2 — polish (optional, not blocking)

- **Requirement / source:** Correction-log entry F122C-1 ("E2e test comments should reference revised D122-5 rather than F122C-1"); e2e spec titles "sorts by priority asc/desc (enum string)" and "sorts by status asc/desc (enum string, title tie-break)" and their `// … see F122C-1` comments.
- **Observed gap:** The e2e spec's sort-test titles/comments still say "enum string" / "see F122C-1" even though the expectations and contract now describe declaration (ordinal) order. Cosmetic only; expectations are correct and passing.
- **Severity rationale:** Optional wording cleanup with accurate status and complete evidence; no unmet AC/DoD/mandatory obligation. Polish, not should-fix.
- **Owner:** implementer (test file only), optional.
- **Closure condition:** Rename the two `it(...)` titles to "enum ordinal" and update the two `// … see F122C-1` comments to reference revised D122-5. No behavior change; no re-review required.

No blocker or other should-fix findings. All other criteria pass.

## Acceptance-criterion assessment

### SP-122A (backend)

| AC | Assessment | Evidence |
|---|---|---|
| A AC1 — list returns array, empty `[]` | Satisfied | `assignments.service.ts` `list()` returns `rows.map(...)`; e2e "returns [] with 200 for an empty match". |
| A AC2 — course filter; missing/foreign/malformed → uniform 404; no list query | Satisfied | courseId gate via `ownedWhere` before `findMany`; unit "course filter gates ownership before listing" (`prisma.assignment.findMany` not called); e2e "student B filtering by A courseId → uniform 404". |
| A AC3 — status filter; invalid → 400 | Satisfied | DTO `@IsIn`; e2e invalid status → 400 with `errors`. |
| A AC4 — priority/type filters; invalid → 400 | Satisfied | DTO `@IsIn`; e2e cases. |
| A AC5 — date range inclusive; null excluded when bound present; invalid → 400 | Satisfied | `where.dueDate = { gte, lte }` (nulls excluded by comparison); e2e "dueFrom/dueTo inclusive bounds and excludes null dueDate". |
| A AC6 — search case-insensitive title+description; empty/whitespace absent; over-long → 400 | Satisfied | `where.OR` contains insensitive; service trims q, `hasQ`; DTO `@MaxLength(200)`; e2e search cases + whitespace-only. |
| A AC7 — sort/order; unknown → 400; default dueDate asc nulls-last, title, id; stable | Satisfied (F122C-1 closed) | Stability/determinism satisfied; priority/status order now documented as enum ordinal and matches native `ORDER BY` on enum columns (verified pass 2). |
| A AC8 — ownership; `userId` not a query field → 400 | Satisfied | `where = { userId }` always present; DTO has no `userId` field and `forbidNonWhitelisted` rejects it; e2e `{ userId: 'forged' }` → 400. |
| A AC9 — unknown params → 400 | Satisfied | DTO + FieldValidationPipe; e2e `{ foo: 'bar' }` → 400. |
| A AC10 — unauthenticated → 401 | Satisfied | Global guard; e2e unauthenticated → 401. |
| A AC11 — projection key set exactly; course shape; subtasks 6-key ordered | Satisfied | Service maps 11 keys + `course` + `subtasks`; unit projection assertion; e2e `LIST_ITEM_KEYS` / `SUBTASK_KEYS`. |
| A AC12 — no regression (POST/PATCH/DELETE/subtasks/course detail) | Satisfied | e2e smoke; full API suite reported passing. |

### SP-122B (frontend)

| AC | Assessment | Evidence |
|---|---|---|
| B AC1 — route in ProtectedRoute+Layout; heading; nav link | Satisfied | `App.tsx` route; `Header.tsx` link between Courses and Profile. |
| B AC2 — list renders rows in API order with all fields | Satisfied | `AssignmentsPage.tsx` row rendering; component tests. |
| B AC3 — search input, maxLength 200, placeholder, 300 ms debounce (flush on Enter), inline clear, empty omits q | Satisfied | `AssignmentsPage.tsx` search control (`aria-label="Search assignments"`, `maxLength={200}`); `assignmentApi.ts` trims q. |
| B AC4 — course Select from listCourses + All courses; foreign/missing → toast + reset | Satisfied | `AssignmentsPage.tsx` course Select and failed re-query reset. |
| B AC5 — native date inputs → ISO datetimes; empty omits | Satisfied | `AssignmentsPage.tsx` `${dueFrom}T00:00:00` / `${dueTo}T23:59:59`; `assignmentApi.ts`. |
| B AC6 — status/priority/type Selects; All omits | Satisfied | `AssignmentsPage.tsx` Selects; `buildParams` omits empty. |
| B AC7 — sort Select + asc/desc toggle with accessible name | Satisfied | `AssignmentsPage.tsx` sort Select and toggle `aria-label` asc/desc. |
| B AC8 — loading/empty/error states | Satisfied | `AssignmentsPage.tsx` initial spinner, keep-list+spinner, empty variants, error card+retry, toast on failed re-query, foreign-course toast+reset. |
| B AC9 — accessibility (semantic ul/li; text+color; live region; focus; toggle name) | Satisfied by code inspection; live browser a11y not executed (D122C-1) | `AssignmentsPage.tsx` `aria-busy`, `<ul>`/`<li>`, badges use text labels. |
| B AC10 — responsive | Satisfied by code inspection; live mobile rendering not executed (D122C-1) | `AssignmentsPage.tsx` classes per D122B-8. |
| B AC11 — no regression | Satisfied | No backend/migration change; existing controls untouched. |

### SP-122C (integration)

| AC | Assessment | Evidence |
|---|---|---|
| C AC1 — filter matrix e2e | Satisfied | 23 tests; filters and combinations; empty match `[]` 200. |
| C AC2 — sort matrix e2e | Satisfied | All sort×order combos; nulls-last dueDate asc; title/id tie-break. Priority/status per ordinal (F122C-1 closed). |
| C AC3 — search e2e | Satisfied | Case-insensitive title+description; whitespace-only absent. |
| C AC4 — ownership e2e | Satisfied | B list excludes A rows; B filtering by A courseId → uniform 404; B data unchanged. |
| C AC5 — validation e2e | Satisfied | Invalid enum/date/sort/order/q length/unknown → 400 with `errors`; unauthenticated → 401. |
| C AC6 — projection e2e | Satisfied | Key sets match contract. |
| C AC7 — no regression e2e | Satisfied | POST/PATCH/DELETE/subtasks smoke + course projection keys; full API suite reported passing. |
| C AC8 — parent index | Satisfied | `./artifacts/SP-122/implementation.md` written with A/B/C evidence and checkpoint links. |
| C AC9 — DoD-10 | PASS under D122C-1 exception | Automated substitute only; manual browser not executed. |
| C AC10 — verification gates | Satisfied (with DB) | Backend unit + data-scoping + e2e and frontend component tests reported passing; spec self-skips without `DATABASE_URL` (recorded as skipped). |

## Definition of Done audit

| # | Condition | Disposition | Evidence / limitation |
|---|---|---|---|
| 1 | Functional criteria | PASS | A endpoint + filters + sort; B list page + controls; C integrated proof. F122C-1 closed (pass 2). |
| 2 | Invalid-input validation | PASS | DTO decorators + service re-checks (validateSync) + frontend mirrors rules. |
| 3 | Student data scoping | PASS | `where: { userId }` always present; courseId gate via `ownedWhere`; tasks filtered by `userId`; cross-student HTTP matrix (B list excludes A; A courseId → uniform 404). |
| 4 | Actionable API errors | PASS | Field-level 400 `errors` map; uniform 404 "Resource not found"; 401 global guard; frontend toast + reset. |
| 5 | Loading/empty/error states | PASS | B states implemented and code-inspected (initial spinner, keep-list+spinner, empty variants, error card+retry, toast on failed re-query, foreign-course toast+reset). |
| 6 | Keyboard accessibility | PASS under D122C-1 exception | Controls keyboard-operable in code; live browser keyboard not executed. Component tests cover some interactions. |
| 7 | Responsive layouts | PASS under D122C-1 exception | Mobile/desktop classes per D122B-8; live mobile rendering not executed. |
| 8 | Automated business-rule tests | PASS | A unit 246 (reported) + data-scoping 74 (reported) + C e2e 23 (with DB) + B component 29 (reported). Without `DATABASE_URL`, e2e/data-scoping self-skip (recorded as skipped, not claimed passed). |
| 9 | API/migration documentation | PASS (F122C-1 closed) | Contract in SP-122 README; no migration. Sort wording now consistent (pass 2). |
| 10 | Integrated development review | PASS under D122C-1 exception | Automated HTTP integration against real PostgreSQL + component suite substituted for browser walk; independent reviewer re-review completed (pass 2). Manual browser pass outstanding (user). |
| 11 | Reviewer walkthrough | PASS | `walkthrough.md` saved beside `review.md` (pass 2), verified. |

## Ownership / security check

- Every Prisma read in `list()` is scoped by `userId`: `assignment.findMany({ where: { userId, … } })`, `course.findFirst({ where: ownedWhere(userId, courseId) })`, and `tasks: { where: { userId } }`. No client-supplied `userId` is accepted (DTO has no such field; `forbidNonWhitelisted` → 400). Foreign/missing `courseId` → uniform 404 "Resource not found" before any assignment query (no existence oracle). No 403 or distinct messages. Controller uses `@CurrentUser()`, not `@Req()`. No secret/credential files touched. No AI/LMS/grade/flashcard/native scope introduced. PASS.

## Verification ledger

### Reviewer independent inspection (read-only, no execution)

- Re-inspected this pass: `assignments.service.ts` (`list()`, `orderBy` construction, ownership gate, scoping, projection), `assignments.controller.ts` (`@Get()`), `dto/list-assignments-query.dto.ts`, `assignmentApi.ts` (`listAssignments`), `AssignmentsPage.tsx`, `App.tsx`, `Header.tsx`, `ownership.ts`, e2e spec (sort tests), unit/component tests, README contract, child tickets and implementation records, parent index, prior pass-1 report.
- Reconciled D122-5 wording across README, shared contract, SP-122A, SP-122C against the implementation and e2e expectations (pass 2).
- No code/tests/migrations/docs other than this report, `walkthrough.md`, and the passing-review docs sync were modified. No shell/test runner available to the reviewer, consistent with the SP-121 pass 2 precedent.

### Implementer verification (recorded evidence, reused — code unchanged since)

From `artifacts/SP-122/implementation.md` and child records (pass 1, unchanged):

- With `DATABASE_URL` (disposable local Postgres 55432):
  - `pnpm --filter @studypilot/api exec tsc --noEmit`: pass.
  - `pnpm --filter @studypilot/api exec jest --runInBand assignments-list-e2e.spec.ts`: **23 passed**.
  - `pnpm --filter @studypilot/api exec jest --runInBand`: **43 suites, 1025 tests passed**.
- Frontend:
  - `npm run test` (AssignmentsPage + assignmentApi): **2 files, 29 tests passed**.
  - `pnpm --filter @studypilot/web typecheck`: pass.
- A unit: `assignments.service.spec.ts` list tests (projection, ownership gate, filters, orderBy) reported passing (A record: 246 passed).
- B component: 29 passed (B record).
- `git diff --check`: pass.
- Without `DATABASE_URL`, the e2e spec self-skips (`describe.skip`); recorded as skipped, not claimed passed.

Reviewer-executed gates: **none** (no shell access). The recorded implementer evidence is reused for unchanged code; raw output was not re-captured and is not reproduced here. Planner correction `440ff2a` is docs-only and does not change tested code, so prior gate results remain valid.

## Closeout / concrete handoff

- **Review task:** Complete (passing verdict).
- **Verdict:** **PASS** — SP-122 (A/B/C) meets the DoD and acceptance criteria (AC-E03-07) with no open blocker or should-fix finding. F122C-1 closed (pass 2). D122C-1 is an acknowledged, authorized DoD-10 exception and does not block. Polish-only finding F122C-2 remains optional.
- **Findings:**
  - F122C-1 (should-fix, pass 1) — closed in pass 2 (wording path; docs consistent with ordinal implementation; no code change).
  - D122C-1 (DoD-10 exception) — acknowledged; manual browser pass outstanding for the user.
  - F122C-2 (polish, optional) — stale e2e test title/comment wording; no action required for pass.
- **Artifacts produced by reviewer:** `docs/stories/EP03/SP-122/artifacts/SP-122/review.md` (this file, pass 2) and `docs/stories/EP03/SP-122/artifacts/SP-122/walkthrough.md`. Passing-review docs sync applied (correction-log entry status updated, execution queue rows → `Reviewed`, parent status line refreshed, autopilot stage updated).
- **Git handoff:** Reviewer saved `review.md`, `walkthrough.md`, and the passing-review docs sync (README queue/correction-log/autopilot fields, parent coordination status line) but has no git tool available, so the scoped commit is deferred to the coordinator. Suggested commit scope: `docs/stories/EP03/SP-122/artifacts/SP-122/review.md`, `docs/stories/EP03/SP-122/artifacts/SP-122/walkthrough.md`, `docs/stories/EP03/SP-122/README.md`, `docs/stories/EP03/SP-122/SP-122-assignment-search-sorting-and-filters.md`. No code/test/migration changes are included.

**Verdict: PASS — SP-122 meets the DoD and acceptance criteria (AC-E03-07). F122C-1 closed; DoD-10 accepted under the authorized D122C-1 exception; DoD-11 walkthrough saved. Only optional polish F122C-2 remains.**