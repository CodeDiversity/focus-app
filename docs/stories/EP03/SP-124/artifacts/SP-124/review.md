# SP-124 independent combined implementation review — pass 2 (re-review)

**Date:** 2026-10-26
**Pass:** 2 (re-review of pass 1, which returned Changes Required)
**Review task:** Complete — **PASS**, with one optional polish note. Parent approval granted subject to the final walkthrough and passing docs sync.
**Reviewed state:** committed `5ed6f5f3fae4fcf217caf51978304867a83f504b` (docs provenance) on top of correction commit `7f27a8a4fdeb2496f6262b48e2d0302574b0b0e5`; working tree clean except the untracked pass-1 `review.md` being replaced. HEAD verified: `5ed6f5f3…`; relevant dirty path: only `docs/stories/EP03/SP-124/artifacts/SP-124/review.md` (this report's target).
**Review unit:** SP-124A + SP-124B + SP-124C, shared interaction layer, course/list integration, parent implementation index and DoD-10 evidence.
**Canonical queue:** [../../README.md](../../README.md#execution-queue).
**Implementation index:** [implementation.md](./implementation.md).
**Prior report:** pass 1 (same path, now superseded; retained in Git history as the untracked working copy).

## Scope and method

Re-reviewed the complete parent scope end to end: the shared owner (`useAssignmentActions`, `AssignmentRow`, `AssignmentDialogs`, `AssignmentForm`, `SubtaskChecklist`), both hosts (`AssignmentsPage`, `AssignmentsSection`), the parent/child implementation records and checkpoints, the EP03 acceptance criteria and all eleven shared DoD conditions. Independently inspected the correction diffs rather than trusting the implementer's "closed" labels. Verified each pass-1 finding against the actual persisted code at `7f27a8a`.

No code, tests, migrations, tickets, plans or Jira were modified in this review. No secrets were read. The reviewing session had shell access; affected gates were run or reused as recorded below.

## Prior findings — disposition (R-124-001…006)

All six pass-1 should-fix findings are **closed** in `7f27a8a`, with independent code + test evidence. IDs are preserved.

| ID | Disposition | Independent verification |
|---|---|---|
| R-124-001 | **Closed.** `latest` ref holds `items` and every host callback; async status completion reads `latest.current.items` for the focus neighbor and `latest.current.onStatusChanged` for the refetch. `handleSubtaskChanged`/`handleSubtaskRefresh` are stable `useCallback` wrappers over `latest.current`, so checklist handlers that outlive their render still reach the current host callback. `AssignmentsPage.runFetch` uses a monotonic `requestSeq` and only the newest request may commit rows, status copy, loading or error effects. | Code: `useAssignmentActions.ts:59-84,138-198,279-284`; `AssignmentsPage.tsx:127-128,166-223`. Tests: deferred-PATCH-then-filter-change refetches with final params; out-of-order GET cannot replace newer rows; hook uses latest `onStatusChanged` after re-render. |
| R-124-002 | **Closed.** `handleCreateSuccess` sets `focusAfterCreate`; a layout effect focuses `[data-assignment-focus="add"]` once the refetch supplies rows; while still empty the form's own restoration keeps the empty-state trigger. | Code: `useAssignmentActions.ts:97-103,230-238`. Tests: empty→populated focus on header Add; header-create success keeps header Add focus; cancel still restores its trigger. E2E journey 1. |
| R-124-003 | **Closed.** Scoped `max-sm:min-h-[44px]` on header Add, empty-state Add/Browse, Title/Course/Due date/Duration/Type/Priority/Description, Cancel/Create. Input/Select apply `className` via `clsx` to the control. | Grep: 9 in `AssignmentForm.tsx`, 3 in `AssignmentsPage.tsx`. Class assertions in page tests. E2E journey 4 measures header Add/Course/Create ≥44 px at 375×667 with `scrollWidth <= innerWidth + 1`. |
| R-124-004 | **Closed.** `previousItems` ref resets `expandedIds` when `items` changes identity and retains when stable; skips the state update when nothing is expanded. | Code: `useAssignmentActions.ts:220-228`. Hook tests: new-array reset + same-array retention. Course-section test rewritten to the D124-5 contract (reset on new array). |
| R-124-005 | **Closed.** List-host create-failure test added. | `AssignmentsPage.test.tsx:681-700`: sanitized toast, dialog + entered title retained, submit re-enabled, no refetch, no success announcement. |
| R-124-006 | **Closed (gate executed).** Committed `apps/web/e2e/assignments-list.spec.ts` run against the self-contained real stack. | 4/4 passed on Chromium + API `:4100` + throwaway Postgres `studypilot_e2e_test` (created/dropped); committed-state re-run 4/4, 7.0 s. Real browser→API→DB evidence, not component substitutes. |

### One optional polish note (does not block pass)

- **P-124-001 (polish).** The e2e spec covers the primary create/edit/delete/status/focus/prefill/mobile flows on both hosts, but does not replicate in-browser: blank-title validation, 5xx save failure, keyboard tab-order/Escape on the create dialog, ordered subtask move, or a desktop-width layout. Those behaviors are covered by the component suites (`AssignmentsPage.test.tsx` tab/Escape case; `AssignmentForm.test.tsx` validation/400 cases; `SubtaskChecklist` move tests). Extending the spec is optional hardening, not a required gate. Owner: implementer, optional.

## Acceptance-criterion results

### SP-124A

| AC | Disposition | Evidence |
|---|---|---|
| 1. One feature home | Satisfied | No assignment files under `features/courses/ui/`; section imported from `@/features/assignments`. |
| 2. One owner / one mount | Satisfied | `useAssignmentActions` owns status, dialogs, expand/busy, focus; `AssignmentsSection` calls it once and renders `<AssignmentDialogs>` once. `AssignmentRow` owns row markup. D124-5 reset now implemented (R-124-004). |
| 3. Shared item | Satisfied | `AssignmentInteractionItem` in `model/types.ts`; form and delete dialog accept it. |
| 4. Shared presentation | Satisfied | `assignmentPresentation.ts` exports; list imports from there. |
| 5. Course-page behavior preserved | Satisfied | Moved course-section tests pass (38), incl. delete/finish focus, show-completed reset, keyboard tab order, dialog traps. Disclosure test now matches D124-5. |
| 6. No list behavior change in A | Satisfied at A stage | Superseded by B/C as intended. |
| 7. Moved/new tests | Satisfied | Hook isolation + PATCH-shape tests; two hook instances do not share `busyIds`. |

### SP-124B

| AC | Disposition | Evidence |
|---|---|---|
| 1. Shared row integration | Satisfied | Page renders `AssignmentRow`; no page-local status/delete/checklist logic. |
| 2. Title opens edit | Satisfied | `onTitleActivate={() => actions.openEdit(a)}`; tests assert dialog, prefilled title, unchanged route. |
| 3. Course affordance / No course | Satisfied | `CourseMeta` link with color dot + monospace code + name; null → static `No course`. |
| 4. Current-params refetch and states | Satisfied | `refetchCurrent()` → `runFetch(buildParams(), false, …)`; only the newest request commits (R-124-001). Background refetch keeps rows, shows spinner + `aria-busy`, toasts fixed copy on failure. |
| 5. Single hook and dialog mount | Satisfied | One `useAssignmentActions` call and one `<AssignmentDialogs>` mount. |
| 6. Actionable/404 errors | Satisfied | Edit 404 uniform sentence; delete 404 same sentence (D-124B-2); status/save toasts; generic delete keeps inline alert (D-124B-4). |
| 7. Keyboard / responsive | Satisfied | Tab order + Escape test; row stacking + 44 px targets; real browser measurement (R-124-003/006). |
| 8. Automated tests | Satisfied | 10 new cases + deferred-PATCH/current-params + out-of-order-GET cases. |

### SP-124C

| AC | Disposition | Evidence |
|---|---|---|
| 1. Shared create form | Satisfied | Header Add + empty-state Add call `actions.openForm`; one `AssignmentForm` mount. |
| 2. Fixed course preserved | Satisfied | Select only when `!isEdit && !courseId`; fixed host course still sent. |
| 3. No course select in edit | Satisfied | `showCourseSelect` excludes edit; form test asserts no Course control. |
| 4. Optional selector / payload / prefill | Satisfied | Select below Title, `No course` first, `CODE Name`; prefill from active filter when offered; "No course" omits `courseId`. |
| 5. Validation / errors / duplicate lock | Satisfied | Schema unchanged; `courseId` in 400 field map; in-flight lock/`aria-busy`; save-failure toast (R-124-005 test). |
| 6. Header action | Satisfied | Header stacks `flex-col-reverse … sm:flex-row` with `data-assignment-focus="add"`; carries 44 px (R-124-003). |
| 7. Empty-state actions | Satisfied | Unfiltered: `No assignments yet.` + subtitle + both CTAs + `/courses` link; filtered keeps clear-filters state with header Add. Both CTAs carry 44 px. |
| 8. Refetch / announcement / focus | Satisfied | Create success → `refetchCurrent('Assignment added.')`; dialog closes; list re-runs with current params; live region announces. Cancel/Escape restores trigger. First-create success moves focus to stable header Add (R-124-002). |
| 9. Parent index + DoD-10 note | Satisfied | Index links A/B/C and records executed integrated evidence (R-124-006). |
| 10. Automated tests | Satisfied | 10 form + 5 page cases at child commit; +list-host create-failure + mobile-class assertions (R-124-005/003). |

Original EP03 coverage: creation with title/course (C), ordered/completable subtasks and status changes (A owner + B host), editing/deletion via same owner. No new backend/schema/AI/LMS/grade/flashcard/native scope.

## Shared Definition of Done

| # | Result | Evidence / limitation |
|---|---|---|
| 1. Functional ACs | **PASS** | A/B/C ACs above; R-124-001/002/004/005 corrected with regression tests. |
| 2. Validation | **PASS** | Zod schema `:38-66`; 400 mapping incl. `courseId`; invalid/400 tests; service validates create DTO + optional course (`assignments.service.ts:56-82`). |
| 3. Authenticated student scoping | **PASS (inspection; unchanged backend)** | Controller `@CurrentUser()` throughout; service `ownedWhere` reads/writes; list user constraint; subtask user/assignment constraints; affected-count check. No client-supplied user identity or unscoped new query. Backend integration/ownership tests not rerun (not claimed). |
| 4. Actionable API errors | **PASS** | Sanitized save/status/refetch copy; uniform edit/delete 404; field-level mapping; list-host create-error test (R-124-005). |
| 5. Loading / empty / error states | **PASS** | Initial spinner, live region, filtered/unfiltered empty states, header actions, refetch spinner + `aria-busy`, refetch-failure toast, in-dialog alerts. Only the newest list request may commit (R-124-001). |
| 6. Keyboard interactions | **PASS** | Row tab order + dialog traps (A/B tests); create dialog order incl. Course select; Escape restores focus; first-create focus fallback (R-124-002). Live browser keyboard tab-order not re-executed beyond component tests (limitation noted). |
| 7. Desktop/mobile responsive behavior | **PASS** | Rows stack below `sm` with 44 px targets; header stacks; dialog `max-w-md w-full max-h-[90vh] overflow-y-auto`, single-column fields. Create entry points/controls carry `max-sm:min-h-[44px]`; real browser measurement ≥44 px at 375 px, no overflow (R-124-003/006). |
| 8. Automated business-rule tests | **PASS** | Focused 156 (7 files) at `7f27a8a`; full 680 (50 files); +4 real-stack Playwright journeys. Typecheck + lint green. |
| 9. API/migration documentation | **PASS — no change applicable** | No API/schema/migration change; existing contracts reused. |
| 10. Integrated environment review | **PASS** | Executed 2026-10-26 against self-contained real stack (see below). |
| 11. Final reviewer walkthrough | **PASS** | `walkthrough.md` saved and verified beside this report. |

## DoD-10 browser note (executed)

**Execution status:** Executed 2026-10-26 by the implementer against the repo's self-contained Playwright mode; independently re-run by this review on the committed state. Real browser → real API → real database evidence.

| Field | Value |
|---|---|
| Date | 2026-10-26 |
| Tested Git state | Committed correction state `7f27a8a` (re-run after the pre-commit formatter; 4/4 passed in 7.0 s) |
| Environment | Playwright Chromium (`chromium-1248`), test API `:4100`, test Vite `:3100` proxying `/api`, throwaway Postgres `studypilot_e2e_test` at `localhost:5432` created/dropped by global setup/teardown |
| Command | `cd apps/web && pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` |
| Result | Exit 0 — 4 passed, serial mode |
| Provenance | Env loaded programmatically by the spec; no `.env`/secret file read, printed or committed; no developer database modified |

**Executed workflows and actual outcomes**

| # | Workflow | Actual result |
|---|---|---|
| 1 | List: empty state → create → focus → edit → status → delete | Empty-state dialog opens with Title focused and Course `No course`; Escape returns focus to **Add your first assignment**; create closes the dialog, announces `Assignment added. Showing 1 assignment.`, focus lands on header **Add assignment**; title button opens the shared edit dialog with no Course select; priority save announces `Assignment updated…` and shows `Urgent`; status announces `Assignment marked as completed. Showing 1 assignment.`; delete returns the page to `No assignments yet.` |
| 2 | Filtered prefill + course link | Selecting a course filter yields the filtered empty state; **Add assignment** opens with Course prefilled; created row shows the course code and a `View course` link with `href="/courses/:id"` |
| 3 | Course host regression | Course page **Add assignment** shows no Course select; create announces `Assignment added.`; subtasks add/complete (`Subtask completed.`) and status completion removes the row from the unfinished view, restored via **Show completed (1)** |
| 4 | Narrow layout (375×667) | Header Add, Course select and Create measured ≥44 px; no horizontal overflow |

**Residual unverified browser scenarios (covered by component tests, not the e2e spec):** blank-title validation, 5xx save failure, keyboard tab-order/Escape on the create dialog, ordered subtask move, desktop-width layout. These are limitations, not blockers; see polish note P-124-001.

## Verification provenance

### Independently executed by this review

| Command | CWD | Exit | Result |
|---|---|---|---|
| `pnpm --filter @studypilot/web lint` | `/Users/michael/Documents/GitHub/focus-app` | 0 | ESLint `--max-warnings 0` clean on committed state |
| `cd apps/web && pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` | `/Users/michael/Documents/GitHub/focus-app/apps/web` | 0 | 4 passed, 7.0 s, serial; throwaway DB created/dropped |
| `git rev-parse HEAD` | `/Users/michael/Documents/GitHub/focus-app` | 0 | `5ed6f5f3fae4fcf217caf51978304867a83f504b` |
| `git status --short` | `/Users/michael/Documents/GitHub/focus-app` | 0 | Only `?? docs/stories/EP03/SP-124/artifacts/SP-124/review.md` (this report's target) |

### Reused recorded gates (code unchanged since; not rerun)

| Command | Exit | Result | Provenance |
|---|---|---|---|
| `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` | 0 | 156 passed (7 files) | Run by implementer at `7f27a8a`; code unchanged since. |
| `pnpm --filter @studypilot/web test` | 0 | 680 passed (50 files) | Same. |
| `pnpm --filter @studypilot/web typecheck` | 0 | `tsc --noEmit` clean | Same. |

Historical-AC helper evidence from pass 1 (A did not add list actions; no assignment files under `features/courses/ui/`) remains valid and was not re-run.

## Dispositions and handoff

- **Verdict decided before any passing sync:** PASS, with one polish note (P-124-001). No blocker or should-fix finding is open. R-124-001…006 are all closed.
- **Reviewer writes:** this report at `docs/stories/EP03/SP-124/artifacts/SP-124/review.md` (replacing pass 1), and the final `walkthrough.md` at the same directory. No code/tests/migrations/tickets/plans/Jira were modified.
- **Passing docs sync (to be performed now):** correction-log entries for R-124-001…006 + P-124-001, queue rows A/B/C → `Reviewed`, `Active substory`/`Next substory` → `None` (parent complete), parent status line refresh, commit of `review.md` + `walkthrough.md` + sync edits.
- **Coordinator Git handoff:** commit `7f27a8a` (code/tests/e2e) and `5ed6f5f` (docs provenance) are the reviewed code state. The passing sync commit will add `review.md`, `walkthrough.md` and the queue/status edits. The pass-1 report is superseded in place (earlier version remains in Git history as the untracked working copy; it should be committed as part of this sync or removed per coordinator policy).
- **Remaining work for the user (optional):** extend the e2e spec with the residual scenarios in P-124-001; not required for acceptance.

**Final verdict: SP-124 meets the acceptance criteria and shared DoD.** The only finding is polish (P-124-001); all six pass-1 should-fix findings (R-124-001…006) are closed with persisted, verified evidence. Final walkthrough saved at `./walkthrough.md`. Passing docs sync and commit follow.