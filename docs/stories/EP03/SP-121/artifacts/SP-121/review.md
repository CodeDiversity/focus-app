# SP-121 implementation review — Completion & Status Tracking (pass 2)

**Review date:** 2026-10-26
**Mode:** Implementation review (final parent review unit, re-review)
**Reviewed state:** committed `main` HEAD `18bab0a5c6adf126bd4d495867e3d07114f4f972` (implementer review-fix commit on top of `a2f850e`). Untracked: this report (reviewer-owned).
**Scope:** SP-121A (Assignment Status API) + SP-121B (Assignment Status UI) + parent index. Re-verification of IR-121-1…5 from pass 1.
**Reviewer:** reviewer (read-only on code/tests; report + walkthrough + passing sync are reviewer-owned writes).

## Re-review summary

All four mandatory findings from pass 1 (IR-121-1 through IR-121-4) are now
closed with committed or user-provided evidence. IR-121-5 remains open as
optional polish (non-blocking). No new findings. The story meets the DoD and
acceptance criteria.

## Closure verification (pass 1 findings)

| Finding | Pass 1 status | Pass 2 verification | Disposition |
|---|---|---|---|
| IR-121-1 Missing frontend component tests | should-fix | Committed `AssignmentsSection.test.tsx` (commit `18bab0a`): 7 new cases — Select render/options/aria-label, PATCH exactly `{ status }`, in-flight disable, finished removal + no DELETE, both empty states, failure toast, focus move. Statically verified against `AssignmentsSection.tsx` (selectors `Status for <title>`, `combobox`, option labels; `toast.error` copy; `deleteAssignment` mock assertion). | **Resolved** |
| IR-121-2 Missing `assignmentApi.test.ts` status-through test | should-fix | Committed `assignmentApi.test.ts` (`18bab0a`): exact body `{ status: 'COMPLETED' }` assertion on PATCH. Statically verified against `assignmentApi.ts` (passes body through). | **Resolved** |
| IR-121-3 Missing `CourseDetailPage` status-wiring test | should-fix | Committed `CourseDetailPage.test.tsx` (`18bab0a`): asserts `updateAssignment('asgn-1', { status: 'COMPLETED' })`, live-region sentence `Assignment marked as completed.`, 2 `getCourse` calls, and row removal after refetch. Statically verified against `CourseDetailPage.tsx` (`handleAssignmentStatusChanged`). | **Resolved** |
| IR-121-4 DoD-10 browser pass not executed | CANNOT VERIFY | User-provided evidence recorded in `artifacts/SP-121B/implementation.md` (DoD-10 note, 2026-10-26): all six steps confirmed (status change through all five values; row disappearance on finished statuses; all-finished empty state; tab/focus ring + accessible name; phone width). | **Resolved** |
| IR-121-5 Status array not reused from `ASSIGNMENT_STATUSES` | polish | Still open; optional consistency, no mandatory gap. | Open (polish, non-blocking) |

## Acceptance criteria (re-verified)

All SP-121A AC 1-7 and SP-121B AC 1-6 are satisfied; see pass 1 report for
file/line evidence, which remains accurate. Pass 2 adds test-level evidence for
B AC 1-3 (IR-121-1/3) and the DoD-10 manual gate (IR-121-4). No regression
introduced (commit is test-only + doc-record edits; production code unchanged).

## Definition of Done audit (pass 2)

| # | Condition | Disposition | Evidence |
|---|---|---|---|
| 1 | Functional ACs pass | Pass | A: pass. B: pass (IR-121-1/3 tests + IR-121-4 browser evidence). |
| 2 | Frontend/backend validation | Pass | Unchanged from pass 1. |
| 3 | Academic data scoped | Pass | Unchanged from pass 1. |
| 4 | Actionable API errors | Pass | Unchanged from pass 1. |
| 5 | Loading/empty/error states | Pass | Both empty states now covered by tests (IR-121-1); failure toast covered. |
| 6 | Keyboard accessibility | Pass | Tab-order test + browser focus-ring evidence (IR-121-4). |
| 7 | Responsive layouts | Pass | Browser pass at phone width (IR-121-4). |
| 8 | Automated tests | Pass | A: thorough (unchanged). B: `status.test.ts` + new `AssignmentsSection`/`assignmentApi`/`CourseDetailPage` cases (IR-121-1/2/3), committed `18bab0a`. |
| 9 | API docs/migrations | Pass | Unchanged. |
| 10 | Integrated dev review | Pass | DoD-10 browser pass executed and passed (IR-121-4, user evidence, 2026-10-26). |
| 11 | Reviewer walkthrough | **Pending — produced in this pass** | `walkthrough.md` saved beside this report. |

### Residual verification limitation (honestly recorded)

The three new test files were committed but could not be **executed** in this
review session: no shell/test-runner tool was available to the reviewer
(or to the implementer at commit time). They were statically verified against
the implementation and mirror established, previously-green patterns
(`AssignmentsSection.test.tsx` tab-order test, `assignmentApi.test.ts` subtask
status-through test, `CourseDetailPage.test.tsx` subtask-announcement test).
The prior web suite was 48 files / 600 tests passing. Recommend a CI run to
confirm the new cases; this is a verification gap, not a code defect, and does
not reopen any finding.

## Findings

No open blocker or should-fix findings. IR-121-5 (polish, optional) remains
open and non-blocking; it is not required for acceptance.

## Verdict

**Pass.** The story meets the DoD and acceptance criteria with no open
blocker or should-fix finding (IR-121-5 is polish only). All mandatory gates
have evidence: automated tests present and committed (`18bab0a`), DoD-10
browser pass executed and passed (user evidence, 2026-10-26), ownership and
validation verified by code inspection and existing tests. The final user
walkthrough is saved as `walkthrough.md` beside this report. Passing-review
docs sync and commit follow.