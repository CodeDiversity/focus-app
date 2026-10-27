# SP-125 independent implementation review — pass 2 (re-review)

**Date:** 2026-10-27
**Pass:** 2 (re-review of pass 1, which returned Changes Required)
**Review task:** Complete — **PASS**, with two optional polish notes. Parent approval granted; the passing docs sync follows in this pass.
**Reviewed state:** committed `00be8ee5a7678b342e84cab8daac58b4b2b360b7` on `main` (HEAD; working tree clean except this report's target). Combined scope `3cde1ad..00be8ee` reviewed; the correction commit's diff inspected in full (10 files: 5 web source/test files, the e2e spec, and 4 SP-125 docs).
**Review unit:** SP-125 standalone (one frontend story; no substories).
**Canonical queue:** [../../README.md](../../README.md#execution-queue).
**Implementation index:** [implementation.md](./implementation.md).
**Prior report:** pass 1 (same path; committed verbatim in `1d4329d` before this report replaced the working-tree copy).

## Scope and method

Re-reviewed the complete unit end to end: the pass-1 report, the correction commit `00be8ee` in full, the changed components' actual source, the updated and new tests, and the e2e spec. Independently verified both pass-1 implementer findings against the persisted code and re-executed every gate at the reviewed commit rather than trusting the implementer's recorded results. Re-checked all seven ACs and all eleven DoD conditions. The reviewing session had no direct shell; gates were executed through this session's bounded PTY command-capture tool under the reviewer's control.

No code, tests, migrations, tickets, plans, or Jira were modified in this review. No secrets were read.

## Prior findings — disposition (pass 1, IDs preserved)

| ID | Disposition | Independent verification |
|---|---|---|
| RV-125-001 (blocker) | **Closed.** The subtask disclosure always renders (`AssignmentRow.tsx:251-273`; empty rows show the text "No subtasks" with accessible name `Subtasks for {title}: No subtasks`) and `SubtaskChecklist` mounts whenever the row is expanded (`:294`), so the only add-subtask field is reachable on both hosts. The pinning tests were updated and a dedicated zero-subtask add test was added; the course-page add test now starts from a zero-subtask row. | Code inspection at `00be8ee`; reviewer-executed scoped suite 274/274 and full suite 689/689; e2e journey 3 — the pass-1 failure at `spec:147` — passes. |
| RV-125-002 (should-fix) | **Closed.** Both `AssignmentsSection` lists (unfinished `:109`, finished `:149`) carry the list host's `max-sm:[&_button]:min-h-[44px] max-sm:[&_select]:min-h-[44px]` bumper. AC-3's ≥44px mobile requirement now holds on the course host. | Class assertion on both lists; reviewer-executed e2e journey 5 measures the course-host status selector, actions trigger, and disclosure at ≥44px in a 375×667 viewport — passed. |
| RV-125-003 (should-fix in pass 1) | **Reclassified to polish; open, optional, planner-owned.** The story file's settled-decision text still describes the pre-card design (verified: "Row Action Buttons" et seq.). Reclassification rationale, per the severity contract ("classify against the current requirements, not … a previous review's severity precedent"): all seven ACs are accurate and now met; the superseding user direction (R-125-001…007) is recorded with provenance in `implementation.md`; there is no unmet explicit AC, applicable DoD condition, required deliverable, or mandatory workflow obligation, and the stale text does not affect the ability to verify the review scope. Optional traceability cleanup for the planner; does not block. | Story file decisions unchanged; `implementation.md` "Review correction" section records the deviations and their user-direction provenance. |
| RV-125-004 (should-fix in pass 1) | **Closed by this pass's passing docs sync.** The stale "Draft / Needs refinement / No implementation evidence" claims are refreshed: SP-125 README status line and quality-gate outcome, EP03 index status line, stories-table row, queue note, and quality-gate section. | Sync commit of this pass (same commit as this report and the walkthrough). |
| P-125-001 (polish) | **Open, optional** — unchanged. e2e residual scenarios (blank-title validation, 5xx save failure, dialog tab-order, ordered subtask move, desktop width) remain covered by component tests only. | — |
| F-125-03 (open gate in pass 1) | **Closed.** The e2e spec is now executed by the reviewer at the reviewed commit: 5/5 passed on the self-contained stack. DoD-10 has real integrated evidence, consistent with the user's 2026-10-27 browser attestation. | DoD-10 note below. |

## Acceptance-criterion results (re-checked at `00be8ee`)

| AC | Disposition | Evidence |
|---|---|---|
| 1. Two-tier filter presentation | **Satisfied** (unchanged) | `AssignmentsPage.tsx:100-155,384-523`; test `toggles the secondary filter panel…`; e2e journey 2 passed. |
| 2. Scannable status on rows | **Satisfied** (unchanged) | `StatusPillSelect` (`AssignmentRow.tsx:38-75`) + `STATUS_SELECT_STYLES`; palette test; e2e journey 1 status step passed. |
| 3. Row hierarchy & responsive stacking | **Satisfied** (was partial in pass 1) | Desktop split/mobile stacking unchanged; **both hosts** now carry the 44px mobile bumper (`AssignmentsPage.tsx:578`, `AssignmentsSection.tsx:109,149`); class test on both section lists; e2e journey 5 real measurements ≥44px at 375×667. |
| 4. Framed subtasks panel | **Satisfied** (was failing in pass 1) | Framed panel unchanged (`SubtaskChecklist.tsx:253-271`) and now reachable on zero-subtask rows (`AssignmentRow.tsx:251-273,294`); new component tests on both hosts; e2e journey 3 passes end to end (add first subtask → complete → status). |
| 5. Polished modal dialog | **Satisfied** (unchanged) | `AssignmentForm.tsx` `max-w-lg` / secondary Cancel / footer divider; tests pass. |
| 6. State presentation & parity | **Satisfied** (unchanged) | Loading/error/empty/no-match states verified in pass 1 and unchanged by the correction; journeys 1–3 passed. |
| 7. Accessibility compliance | **Satisfied** | Disclosure now carries `aria-expanded`/`aria-controls`/label on **all** rows (pass 1 covered only rows with subtasks); focus rings, menu ARIA model, non-color-only badges, and all focus hooks preserved; tab-order/menu/focus tests green in the 689/689 run. |

## Shared Definition of Done (re-checked)

| # | Result | Evidence / limitation |
|---|---|---|
| 1. Functional ACs | **PASS** | AC table above; RV-125-001/002 closed with regression tests. |
| 2. Validation | **PASS — n/a** | No new input; the correction is markup/class/test-only. |
| 3. Authenticated student scoping | **PASS (inspection)** | The correction diff touches no API, hook, backend, or router file — only `AssignmentRow`, `AssignmentsSection`, tests, the e2e spec, and docs. No new read or write. |
| 4. Actionable API errors | **PASS** | Unchanged toasts/alerts; initial error card with Try again; tests green. |
| 5. Loading / empty / error states | **PASS** | Unchanged and covered (AC-6). |
| 6. Keyboard accessibility | **PASS** | Tab-order, menu keyboard model, Escape/focus-return tests green; e2e journey 1. |
| 7. Desktop/mobile responsive | **PASS** | RV-125-002 closed; e2e journeys 4–5 measure real heights and overflow at 375×667. |
| 8. Automated business-rule tests | **PASS** | Reviewer-executed at `00be8ee`: full web suite **689/689** (50 files), scoped **274/274** (13 files), `tsc --noEmit` exit 0, ESLint `--max-warnings 0` exit 0. |
| 9. API/migration documentation | **PASS — no change applicable** | No API/schema/migration change across the whole unit. |
| 10. Integrated environment review | **PASS** | Reviewer-executed e2e 5/5 at `00be8ee` (note below); user browser attestation 2026-10-27 consistent. |
| 11. Final reviewer walkthrough | **PASS** | `walkthrough.md` saved and verified beside this report before the completion sync. |

## DoD-10 browser note (executed by this review)

| Field | Value |
|---|---|
| Date | 2026-10-27 |
| Tested Git state | Committed `00be8ee` (clean tree) |
| Environment | Playwright Chromium, self-contained stack: test API `:4100`, test Vite `:3100` proxying `/api`, throwaway Postgres `studypilot_e2e_test` at `localhost:5432` (created/dropped by global setup/teardown); developer stack untouched |
| Command | `pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` (cwd `apps/web`) |
| Result | Exit 0 — **5 passed** (7.9 s, serial): (1) list create/focus/edit/status/delete through the shared row; (2) filter prefill + course link; (3) course host fixed course + **subtasks incl. adding the first one** + status + show-completed; (4) mobile create controls ≥44px, no overflow; (5) **mobile course-host row controls ≥44px** (new in the correction) |
| Provenance | Env loaded programmatically by the spec; no `.env`/secret file read, printed, or committed; no developer database modified. The pass-1 failure (journey 3 timeout at `spec:147`) is resolved by `00be8ee`. |

## Verification provenance

Reviewer-executed at `00be8ee` (clean tree); commands run through this session's bounded PTY command-capture tool (no direct shell in the review runtime):

| Command | CWD | Exit | Result |
|---|---|---|---|
| `git status --short` | repo root | 0 | Only the untracked pass-1 `review.md` (committed verbatim in `1d4329d` before replacement) |
| `git rev-parse HEAD`; `git show --stat 00be8ee` | repo root | 0 | `00be8ee5…` on `main`; 10-file correction scope as listed above |
| `pnpm test -- src/pages/assignments src/features/assignments src/pages/courses src/entities` | `apps/web` | 0 | 274 passed (13 files) |
| `pnpm test` | `apps/web` | 0 | 689 passed (50 files) |
| `pnpm typecheck` | `apps/web` | 0 | `tsc --noEmit` clean |
| `pnpm lint` | `apps/web` | 0 | ESLint `--max-warnings 0` clean |
| `pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` | `apps/web` | 0 | 5 passed |

The implementer's recorded correction results (`implementation.md`) match the reviewer-executed results; nothing was reused without re-execution.

## Dispositions and handoff

- **Verdict decided before any sync:** PASS. No open blocker or should-fix finding. Polish only: RV-125-003 (optional, planner) and P-125-001 (optional, implementer).
- **Reviewer writes:** this report at `docs/stories/EP03/SP-125/artifacts/SP-125/review.md` (pass 1 preserved in `1d4329d`), the final `walkthrough.md` at the same directory, and the passing docs sync — all in one commit.
- **Passing docs sync (this commit):** correction-log entries for RV-125-001…004, P-125-001, and F-125-03; queue row → `Reviewed`; `Active substory`/`Next substory` → `None` (unit complete); SP-125 README status line and quality-gate outcome; EP03 index SP-125 entries; story/checkpoint/implementation status lines.
- **Remaining optional work (does not block):** planner may record R-125-001…007 as superseding decisions in the story file (RV-125-003); the e2e spec may gain the residual scenarios in P-125-001.

**Final verdict: SP-125 meets the acceptance criteria and shared DoD.** The pass-1 blocker RV-125-001 and should-fix RV-125-002 are corrected in `00be8ee` and independently verified; F-125-03 is closed by the executed integrated spec (5/5). Two optional polish notes remain (RV-125-003, P-125-001). Final walkthrough saved at `./walkthrough.md`.
