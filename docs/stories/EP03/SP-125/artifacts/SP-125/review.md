# SP-125 independent implementation review — pass 1

**Date:** 2026-10-27
**Pass:** 1 (first review of this unit)
**Review task:** Complete — **Changes Required** (non-passing: one blocker, three should-fix findings). Not approved; a fix pass and re-review are required.
**Reviewed state:** committed `ed9ec4eb8bb60868cf0ae09d751485813f008f35` on `main` (HEAD; working tree clean at review start — `git status --short` empty). Combined SP-125 change scope reviewed in full, base `3cde1ad` (plan) → `ed9ec4e`, 17 files. Production: `assignmentPresentation.ts`, `AssignmentRow.tsx`, `RowActionsMenu.tsx` (new), `SubtaskChecklist.tsx`, `AssignmentsPage.tsx`, `AssignmentForm.tsx`, `AssignmentsSection.tsx` (+1 line), `entities/assignment/model/status.ts`. Tests: `AssignmentsPage.test.tsx`, `AssignmentsSection.test.tsx`, `AssignmentForm.test.tsx`, `CourseDetailPage.test.tsx`. E2E: `e2e/assignments-list.spec.ts`. Docs: SP-125 folder. **No backend, migration, router, `assignmentApi`, or `useAssignmentActions` change** — confirmed by the range diff.
**Review unit:** SP-125 standalone (one frontend story; no substories).
**Canonical queue:** [../../README.md](../../README.md#execution-queue).
**Implementation index:** [implementation.md](./implementation.md).
**Prior report:** none (first review of this unit).

## Scope and method

Reviewed the complete standalone unit end to end: the refined story, the SP-125 README (queue, decisions, correction log, quality gate), the implementation record and checkpoint, the EP03 epic and shared DoD, the full `3cde1ad..ed9ec4e` diff (not just the last commit), and the changed components' actual source. Verified each acceptance criterion and all eleven shared DoD conditions against code, tests, and executed gates. The reviewing session had no direct shell; gates were executed through this session's bounded PTY command-capture tool under the reviewer's control (commands, CWDs, exit codes below).

No code, tests, migrations, tickets, plans, or Jira were modified in this review. No secrets were read. On this non-passing verdict the reviewer saves the report only; the docs sync, walkthrough, and commit are deferred (see handoff).

## Prior implementation-record findings — disposition

| ID | Disposition | Independent verification |
|---|---|---|
| F-125-01 | **Closed (verified).** Three secondary-filter tests open the panel first; asserted filter params unchanged. | Scoped suite green at `ed9ec4e` (272/272); `AssignmentsPage.test.tsx:780-828`. |
| F-125-02 | **Closed (verified).** Formatting clean. | Reviewer-executed `pnpm lint` exit 0. |
| F-125-03 | **Still open — now executed by this review.** The e2e spec ran against the self-contained stack and **surfaced blocker RV-125-001**. Not closed. | DoD-10 note below; `assignments-list.spec.ts:147` fails. |
| R-125-001…006 | **Closed as recorded** (verified by the green suite and code inspection). | Full web suite 687/687 at `ed9ec4e`. |
| R-125-007 | **Closed as recorded, but it introduced RV-125-001 and RV-125-002.** Its "focus/behavior invariants kept" claim does not include subtask reachability or course-host touch targets. | `AssignmentRow.tsx:250,293`; `RowActionsMenu.tsx:105`; `AssignmentsSection.tsx:109,149`. |

## Acceptance-criterion results

| AC | Disposition | Evidence |
|---|---|---|
| 1. Two-tier filter presentation | **Satisfied** | `AssignmentsPage.tsx:100-101` (`showFilters`), `:148-155` (`secondaryActiveCount` incl. non-default sort), `:384-406` (toggle: `aria-expanded`, `aria-controls="advanced-filters-panel"`, name `Filters` / `Hide filters` / `Filters (n)`, count badge), `:412-523` (secondary panel, visible labels for Due from/Due to/Priority/Type/Sort by, order toggle in the sort cell), clear-filters at `:548-550` and `:604-613`. Test `AssignmentsPage.test.tsx:780-828`; e2e journey 2 passed. |
| 2. Scannable status on rows | **Satisfied** | `StatusPillSelect` (`AssignmentRow.tsx:38-75`): native `<select>` wearing `STATUS_SELECT_STYLES` for all five statuses (`assignmentPresentation.ts:107-113`), text+color pairing, keyboard operable, `data-assignment-focus="status:${id}"` preserved (`:48`). Test `AssignmentsPage.test.tsx:830-855` (palette incl. in-flight pending status); e2e journey 1 status step passed. |
| 3. Row hierarchy & responsive stacking | **Partially satisfied** | Desktop split and mobile stacking present (`AssignmentRow.tsx:180-181` `sm:flex-row sm:items-center sm:justify-between`; right cluster `:276-290`). **But the ≥44px mobile touch-target requirement is unmet on the course host** → RV-125-002. |
| 4. Framed subtasks panel | **Not satisfied (blocker)** | The framed panel exists (`SubtaskChecklist.tsx:253-271`: `rounded-lg border border-secondary-200/80 bg-secondary-50/75 p-3 sm:p-4`, "Subtasks" header, `{done} of {total} complete` counter), **but it is unreachable for zero-subtask assignments** → RV-125-001. Executed e2e journey 3 fails. |
| 5. Polished modal dialog | **Satisfied** | `AssignmentForm.tsx` diff: `max-w-md` → `max-w-lg`, Cancel `outline` → `secondary`, footer gains `border-t border-secondary-100 pt-4`. Tests `AssignmentsPage.test.tsx:904-915`, `AssignmentForm.test.tsx:84-85`. |
| 6. State presentation & parity | **Satisfied** (rendering/parity; the subtask-flow breakage is counted under AC-4) | Loading card (`AssignmentsPage.tsx:262-272`), error alert card with Try again (`:274-286`), unfiltered empty with both CTAs (`:552-574`), filtered no-match with subtext and a single Clear filters (`:541-551`), live region hosting the refetch spinner with `aria-busy` (`:529-537`, `:577-580`). Course-host parity: shared row + `onTitleActivate` (`AssignmentsSection.tsx:82`); e2e journeys 1–2 passed; journey 3's course-host create worked before failing at the subtask step. |
| 7. Accessibility compliance | **Satisfied, with a docs note (RV-125-003)** | Focus rings on all new controls (`AssignmentRow.tsx:54,199`; `RowActionsMenu.tsx:107`; `AssignmentsPage.tsx:513`; course chip `AssignmentRow.tsx:98`). ARIA: toggle `aria-expanded`/`aria-controls` (`AssignmentsPage.tsx:395-396`), disclosure (`AssignmentRow.tsx:256-259`), menu `aria-haspopup`/`aria-expanded`/`aria-controls` + `role="menu"`/`menuitem`, arrow cycling, Escape with trigger focus return, first-item focus on open, trigger re-focus before action (`RowActionsMenu.tsx:99-124,38-90`). Non-color-only: status labels in the select, text badges `Overdue`/`Due soon` (`AssignmentRow.tsx:205-224`), priority/type spelled out in the meta line (`:171-248`). Hooks: `add` (`AssignmentsPage.tsx:302`), `empty-add` (`:561`), `status:${id}` (`AssignmentRow.tsx:48`) preserved; `edit:${id}` preserved in value but moved to the title (`AssignmentRow.tsx:196`) per user direction R-125-007 — story file §4 is stale (RV-125-003); `data-subtask-focus` untouched. Tab-order, menu-keyboard, and focus-restoration tests green. |

## Shared Definition of Done

| # | Result | Evidence / limitation |
|---|---|---|
| 1. Functional ACs | **FAIL** | AC-4 broken (RV-125-001, blocker); AC-3 partial (RV-125-002). |
| 2. Validation | **PASS — n/a** | No new input; the form diff is class-only; the validation schema is untouched. |
| 3. Authenticated student scoping | **PASS (inspection)** | Range diff contains no API, hook, backend, or router change; `entities/assignment/model/status.ts` adds a pure presentation predicate (`isDueSoonAssignment`, `:70-90`). No new read or write; existing principal-scoped queries untouched. |
| 4. Actionable API errors | **PASS** | Unchanged toasts/alerts; initial error card with Try again retained; refetch-failure toast retained; tests green. |
| 5. Loading / empty / error states | **PASS** | Verified in code and tests (AC-6 row). |
| 6. Keyboard accessibility | **PASS** | Verified above (AC-7 row); SP-124 tab-order/focus/Escape tests unchanged and green. |
| 7. Desktop/mobile responsive | **FAIL (partial)** | Course-host mobile 44px targets unmet (RV-125-002); list host covered by the `ul` bumper (`AssignmentsPage.tsx:578`). The e2e mobile journey passes but measures only create-dialog controls. |
| 8. Automated business-rule tests | **PASS** | Reviewer-executed at `ed9ec4e`: full web suite **687/687 (50 files)** exit 0; scoped 272/272 (13 files) exit 0; `tsc --noEmit` exit 0; ESLint `--max-warnings 0` exit 0. |
| 9. API/migration documentation | **PASS — no change applicable** | No API/schema/migration change. |
| 10. Integrated environment review | **FAIL** | Reviewer-executed integrated e2e: journey 3 fails (RV-125-001); journeys 1, 2, 4 pass. F-125-03 remains open and surfaced the blocker. |
| 11. Final reviewer walkthrough | **Not applicable this pass** | Non-passing verdict: the final walkthrough is deferred until a passing re-review (the reviewer saves the report only on a non-passing verdict). |

## DoD-10 browser note (executed by this review)

| Field | Value |
|---|---|
| Date | 2026-10-27 |
| Tested Git state | Committed `ed9ec4e` (clean tree) |
| Environment | Playwright Chromium, self-contained stack: test API `:4100`, test Vite `:3100` proxying `/api`, throwaway Postgres `studypilot_e2e_test` at `localhost:5432` (created/dropped by global setup/teardown); developer stack untouched |
| Commands | `pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list`; then `pnpm exec playwright test e2e/assignments-list.spec.ts -g "keeps create controls at 44 px" --reporter=list` (both from `apps/web`) |
| Result | Journeys 1 (list create/edit/status/delete/focus), 2 (filter prefill + course link), and 4 (mobile create surface) **pass**. Journey 3 (course host subtasks + status) **fails**: 30 s timeout at `assignments-list.spec.ts:147` waiting for the zero-subtask disclosure button `Subtasks for …: No subtasks` — the R-125-007 row renders no disclosure for zero-subtask rows (RV-125-001). First run exit 1 (2 passed / 1 failed / 1 not run, serial abort); mobile-journey re-run exit 0 (1 passed). |
| Provenance | Env loaded programmatically by the spec; no `.env`/secret file read, printed, or committed; no developer database modified. |

## Findings (prioritized)

### RV-125-001 (Blocker) — Subtask creation is unreachable for assignments without subtasks

- **Requirement/source:** EP03 AC "Assignments can contain ordered, independently completable subtasks"; SP-125 D125-3 ("subtasks … behaviors are preserved"); SP-125 AC-4 / DoD-1.
- **Observed gap:** R-125-007 gates the subtask disclosure on `hasSubtasks` (`AssignmentRow.tsx:250`) and the checklist on `expanded && hasSubtasks` (`:293`). The checklist owns the only subtask-creation input (`SubtaskChecklist.tsx:344` `label="Subtask title"`; `createSubtask` call at `:170`); `AssignmentForm` has no subtask UI (no matches); `AssignmentRow` is the checklist's only renderer. A zero-subtask row therefore offers **no path to add a first subtask on either host**. The pre-SP-125 row (`3cde1ad`) rendered the disclosure unconditionally.
- **Evidence:** reviewer-executed e2e journey 3 fails at `assignments-list.spec.ts:147` (30 s timeout waiting for `Subtasks for …: No subtasks`; exit 1). Component tests pin the broken behavior: `AssignmentsSection.test.tsx:425-429` ("Zero-subtask rows render no disclosure at all (R-125-007)") and `CourseDetailPage.test.tsx:667-668` (works around it by seeding an existing subtask). The full suite is green because the pinning tests codify the regression.
- **Severity rationale:** a critical broken flow — a core EP03 capability — that prevents safe acceptance.
- **Owner:** implementer.
- **Closure condition:** restore an always-reachable subtask affordance for zero-subtask rows (e.g., render the disclosure unconditionally — its `aria-label` already uses `subtaskSummary`, which returns "No subtasks" for empty rows, matching the e2e spec's expected accessible name — and render the checklist when expanded so its "No subtasks yet." empty state provides the add input); update the pinning component tests; rerun the scoped suite, the full web suite, and the full e2e spec (4/4) on the corrected commit; independent re-review. The e2e spec itself needs no change if the disclosure is restored.

### RV-125-002 (Should-fix) — AC-3's mobile ≥44px touch targets are unmet on the course host; the implementation record's AC-3 "PASS" claim is inaccurate for that host

- **Requirement/source:** SP-125 AC-3 ("on mobile (<640px), actions wrap cleanly into an action row with ≥44px touch targets"); settled decisions §2.B ("maintaining ≥44px touch targets"); DoD-7.
- **Observed gap:** the list host's `ul` carries `max-sm:[&_button]:min-h-[44px] max-sm:[&_select]:min-h-[44px]` (`AssignmentsPage.tsx:578`); the course host's lists do not (`AssignmentsSection.tsx:109,149`). The new overflow-menu trigger is `h-9 w-9` (36 px, `RowActionsMenu.tsx:105`) and the status pill select is `py-1.5 text-xs` with no min-height (`AssignmentRow.tsx:52-57`) — both below 44 px on the course host under `sm`. The implementation record's AC-3 row claims PASS and notes the bumpers "still apply", which is true only for the list host. The e2e mobile journey measures only create-dialog controls, so nothing caught it.
- **Severity rationale:** unmet explicit AC plus an inaccurate completion claim in the implementation record.
- **Owner:** implementer.
- **Closure condition:** add the scoped mobile bumper to the section's lists (or min-height classes on the row controls) and extend test/e2e evidence to row controls on the course host at 375 px; correct the AC-3 note in the implementation record in the same correction round.

### RV-125-003 (Should-fix, docs/traceability) — The story file's settled UI/UX decisions are stale against the final R-125-007 design

- **Requirement/source:** reviewer severity contract (inaccurate claims are at least should-fix, including docs-only gaps); delivery-state traceability conventions.
- **Observed gap:** `SP-125-assignment-experience.md` §1 ("Row Action Buttons: Edit (outline) / Delete (ghost)"), §2.B (priority/type badges, course chip on the metadata line, always-visible "X subtasks, Y complete" disclosure), §4 (`edit:${id}` "on row Edit button"), and §6 (subtask counter copy) describe the pre-R-125-007 design. The final code implements the user-directed card redesign (overflow `RowActionsMenu`, neutral meta line, course chip line under the title, "X/Y subtasks" disclosure gated on subtasks, `edit:${id}` on the title). The superseding user direction is recorded only in `implementation.md` (R-125-001…007), not in the story's decision register.
- **Severity rationale:** docs-only traceability gap; the code deviation itself has recorded user provenance, so this is not a code defect.
- **Owner:** planner (docs-only).
- **Closure condition:** record R-125-001…007 as superseding decisions (with user-direction provenance and dates) in the story file, or annotate the affected sections as superseded; independent re-review of the doc change.

### RV-125-004 (Should-fix, docs/status) — Stale coordination statuses still describe SP-125 as an unrefined draft

- **Requirement/source:** delivery-state execution-queue contract ("If code/artifacts disagree with the queue, reconcile and record the evidence"); reviewer passing-sync scope (stale parent status line).
- **Observed gap:** `docs/stories/EP03/SP-125/README.md` line 5 still says "Draft (2026-10-27) … `Needs refinement` … Not implementation-ready", and its quality-gate section says the story "must not be coded", while the same file's queue row records implementation complete; `docs/stories/EP03/README.md` (status line, stories table, story-9 notes, quality-gate section) still says SP-125 is "Draft … No implementation evidence". These are stale relative to the committed implementation and this review.
- **Severity rationale:** stale required status records (docs-only).
- **Owner:** deferred — on a non-passing verdict the reviewer saves the report only; the coordinator owns these status edits (they belong to the passing-review docs sync once the blocker is fixed and the re-review passes).
- **Closure condition:** refreshed by the passing-review docs sync after a passing re-review (queue row → `Reviewed` only after the passing final review; status lines; correction-log entries for RV-125-001…004 and the F-125-03 disposition).

### P-125-001 (Polish, optional) — e2e spec coverage residuals

The e2e spec does not replicate in-browser: blank-title validation, 5xx save failure, dialog keyboard tab-order/Escape, ordered subtask move, desktop-width layout, or row-control touch targets on the course host (RV-125-002). Those behaviors are covered by the component suites. Optional hardening; not a gate.

## User-attestation note

The review request stated "all manual tests pass browser". The reviewer-executed browser evidence contradicts that for the course-host subtask-add flow (e2e journey 3 fails). The attestation is recorded as user-provided and unverified for that flow; it cannot substitute for the failing integrated gate (DoD-10).

## Verification provenance

Reviewer-executed at `ed9ec4e` (clean tree); commands run through this session's bounded PTY command-capture tool (no direct shell in the review runtime):

| Command | CWD | Exit | Result |
|---|---|---|---|
| `git status --short` | `/Users/michael/Documents/GitHub/focus-app` | 0 | Clean tree (no output) |
| `git rev-parse HEAD`; `git branch --show-current` | repo root | 0 | `ed9ec4eb8bb60868cf0ae09d751485813f008f35`, `main` |
| `git diff --stat 3cde1ad..HEAD` (+ per-file diffs, old-row comparison at `3cde1ad`) | repo root | 0 | 17 files; SP-125 scope as listed above |
| `pnpm test -- src/pages/assignments src/features/assignments src/pages/courses src/entities` | `apps/web` | 0 | 272 passed (13 files) |
| `pnpm test` | `apps/web` | 0 | 687 passed (50 files) |
| `pnpm typecheck` | `apps/web` | 0 | `tsc --noEmit` clean |
| `pnpm lint` | `apps/web` | 0 | ESLint `--max-warnings 0` clean |
| `pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` | `apps/web` | 1 | 2 passed, 1 failed (journey 3, `spec:147`), 1 not run (serial) |
| `pnpm exec playwright test e2e/assignments-list.spec.ts -g "keeps create controls at 44 px" --reporter=list` | `apps/web` | 0 | 1 passed (mobile create surface) |

Implementer-recorded results (`implementation.md`: 272 scoped, 687 full, typecheck, lint) match the reviewer-executed results exactly; no recorded gate needed reuse — all were re-executed at the reviewed commit because the standing F-125-03 gap required fresh integrated evidence.

## Dispositions and handoff

- **Verdict decided before any sync:** Changes Required. One blocker (RV-125-001), three should-fix (RV-125-002…004), one polish (P-125-001). F-125-03 remains open. The docs sync cannot close findings and is deferred.
- **Reviewer writes:** this report only, at `docs/stories/EP03/SP-125/artifacts/SP-125/review.md`. No walkthrough (deferred until a passing final review), no docs sync, no commit, and no edits to code, tests, tickets, plans, or Jira.
- **Coordinator Git handoff (non-passing — coordinator owns):** commit this report (currently untracked). Deferred status edits, in priority order: (1) after the implementer's fix pass and a **passing** re-review, perform the passing-review docs sync — SP-125 README status line + quality-gate section, queue row → `Reviewed` (only after the passing final review) with links to the final report and the reviewer's `walkthrough.md`, and correction-log entries for RV-125-001…004 plus the F-125-03 disposition; (2) EP03 README SP-125 status line / table / notes; (3) the queue's next action becomes the fix pass until then.
- **Fix ownership:** RV-125-001 and RV-125-002 → implementer (one sequential writer); RV-125-003 → planner (docs-only); RV-125-004 → coordinator / passing sync.
- **Remaining work:** implementer corrects RV-125-001/002, reruns the scoped suite + full suite + full e2e spec (4/4), and corrects the implementation record's AC-3 note; planner reconciles the story decision register; reviewer re-reviews the combined unit and, on a pass, saves the final `walkthrough.md` before any `Reviewed` marking.

**Final verdict: SP-125 does not yet meet the acceptance criteria and shared DoD — blocker RV-125-001 (the subtask-creation flow is broken for zero-subtask rows and the integrated e2e journey 3 fails) and should-fix RV-125-002 (course-host mobile touch targets), RV-125-003 (stale story decisions), RV-125-004 (stale status lines).**
