# SP-123 implementation review — pass 4 (re-review after IR-003 count correction)

**Review date:** 2026-10-26
**Mode:** Implementation review (final combined parent review unit)
**Reviewed state:** working tree on `main`; parent baseline `3c48619`; A commit `6bb825f`; B commit `97c5746`; uncommitted docs count corrections on top (no code change). Combined scope SP-123A + SP-123B. No code changes by this review.
**Scope:** SP-123A (shared `isOverdueAssignment` predicate + overdue pill on course detail and list page) + SP-123B (show-completed disclosure on course page + parent index + DoD-10 note). Integration/index owner: SP-123B. Excludes story 7 backend work, filters/sort (SP-122), status transitions (SP-121), dashboard widgets (EP05).
**Reviewer:** reviewer (read-only on code/tests; report is a reviewer-owned write).

## Scope and evidence boundaries

Read the canonical queue (`docs/stories/EP03/SP-123/README.md`), parent coordination record, both child tickets, both child implementation records/checkpoints, the parent implementation index, the shared DoD, and EP03 acceptance criteria. Independently re-inspected `status.ts`, `status.test.ts`, `AssignmentsSection.tsx`, `AssignmentsSection.test.tsx`, `AssignmentsPage.tsx`, `AssignmentsPage.test.tsx`, both implementation records, and the parent index. No code, tests, migrations, story tickets, or plans were modified by this review.

### Browser exception (D123B-DoD10)

Updated: the manual browser pass of the completed view (reveal/hide, empty states, keyboard, narrow width) was executed and passed (user-reported 2026-10-26). The D123B-DoD10 documented exception is cleared. DoD item 10 is **PASS**. Automated coverage: full web suite recorded at 630/630 plus typecheck + lint at `97c5746`, plus the new component assertions (62 = 8 + 38 + 16).

### Execution evidence

- Reviewer execution: **not available in this context** (no shell). Gates below are implementer-recorded evidence plus code inspection. Where a suite does not cover a required behavior, the condition is marked FAIL rather than CANNOT VERIFY.
- Recorded implementer evidence (pre-correction baseline): `pnpm --filter @studypilot/web typecheck` exit 0; lint exit 0; full suite 49 files, 630/630 passed at `97c5746`.
- Correction sessions: component tests added in `AssignmentsSection.test.tsx` and `AssignmentsPage.test.tsx`; typecheck/lint/tests **not re-run**. The records cite focused counts (see IR-003). New-test execution is therefore **CANNOT VERIFY** in this review; the tests were inspected for structural consistency instead.
- Independently counted `it()` cases in the three focused files (grep `^\s*(it|test)\(`): `status.test.ts` = 8; `AssignmentsSection.test.tsx` = 38; `AssignmentsPage.test.tsx` = 16. Focused total = 62 (IR-003 closed).

## Findings

### IR-001 — closed: required component tests now present (coverage complete)

- **Requirement / source:** SP-123A AC 6; SP-123B AC 7; DoD item 8.
- **Status:** Closed on coverage. `AssignmentsSection.test.tsx` contains the `AssignmentsSection overdue + completed views (SP-123A/B)` block (9 cases: 3 overdue-pill + 6 show-completed) and `AssignmentsPage.test.tsx` now contains four overdue-pill cases: presence on an overdue row; absence on a non-overdue row; absence on a finished past-due row; and a neutral due-date color assertion on an overdue row. All originally listed residual coverage gaps are now addressed. Execution of the new tests remains **CANNOT VERIFY** (no shell; recorded limitation, not a code defect).
- **Severity rationale:** The coverage gap that made this a should-fix is closed. Remaining execution uncertainty is an environmental limitation already recorded as CANNOT VERIFY.
- **Owner:** none (closed).
- **Closure condition:** met for coverage. Execution verification deferred to a shell-enabled session.

### IR-002 — closed: parent index links resolve

- **Requirement / source:** SP-123B AC 8; parent index deliverable.
- **Status:** Closed. `docs/stories/EP03/SP-123/artifacts/SP-123/implementation.md` records `../SP-123A/implementation.md`, `../SP-123A/checkpoint.md`, `../SP-123B/implementation.md`, `../SP-123B/checkpoint.md`. Both checkpoint files exist at those locations. Links resolve from `artifacts/SP-123/`.

### IR-003 — closed: focused count restated as 62 = 8 + 38 + 16

- **Requirement / source:** Severity contract (inaccurate completion claims are should-fix); A/B implementation records; parent index.
- **Status:** Closed. The implementer's docs-only correction restated the focused verification as 3 files / 62 tests (8 + 38 + 16) in `artifacts/SP-123A/implementation.md` (line 49) and `artifacts/SP-123/implementation.md` (line 40), and the parent index findings line now reads "IR-003 corrected (counts restated as 62 = 8 + 38 + 16)". The reviewer independently counted the `it()` cases (8 / 38 / 16 = 62) and confirmed the stale "60"/"14" figures are removed from the records. The only remaining "60 = 8 + 38 + 14" references are historical (pass-3 `review.md` lines 42/103), which is expected and not a live record. Execution of the new tests remains CANNOT VERIFY (no shell).
- **Severity rationale:** The count inaccuracy that made this a should-fix is corrected and independently verified.
- **Owner:** none (closed).
- **Closure condition:** met. Residual attribution note (B record's "9 added" for the show-completed disclosure covers 3 overdue-pill + 6 show-completed cases in the same file) is informational and does not affect the verified total; retained as optional polish below, not a blocker.
- **Evidence:** `artifacts/SP-123A/implementation.md` line 49; `artifacts/SP-123/implementation.md` lines 38–41; independent grep counts above.

### IR-004 — polish (optional, not blocking): overdue pill is an inline span rather than a shared primitive

- **Requirement / source:** A element decisions ("No new shared primitive").
- **Status:** Unchanged and optional. `OVERDUE_STYLE`/`OVERDUE_LABEL` remain the single source of truth for style/label; the pill is duplicated as an inline `<span>` in both surfaces.
- **Owner:** implementer (optional).
- **Closure condition:** None required.

## Acceptance-criterion assessment

### SP-123A — AC 1–6

| AC | Disposition | Evidence / limitation |
|---|---|---|
| 1 Predicate | PASS | `isOverdueAssignment(value, now?)` in `status.ts`: unfinished + non-null `dueDate` strictly before `now`; null due dates, finished statuses, not-yet-due rows return false; accepts `{ status, dueDate }`; supports `Date`/epoch/ISO `now`. `status.test.ts` covers all listed cases (8). |
| 2 Course detail | PASS (code) | Red pill "Overdue" on the due-date line beside `Due <date>`; due date keeps neutral color. `AssignmentsSection.tsx`. |
| 3 List page | PASS (code) | Same pill on each overdue row, reusing exported `OVERDUE_STYLE`/`OVERDUE_LABEL`. `AssignmentsPage.tsx`. |
| 4 Accessibility | PASS (code) | Text label (not icon-only); due date remains in row text. No new interactive control. |
| 5 No regression | PASS (code + recorded suite) | Status control, subtasks, edit/delete, filters/sort/search unchanged; no new request sent. Full web suite recorded green at `97c5746`. |
| 6 Tests | PASS (code) | Helper unit tests present (`status.test.ts`, 8 cases). Component tests now present on both surfaces for overdue/non-overdue, finished past-due omission, and neutral due-date color (IR-001 closed). Execution CANNOT VERIFY. |

### SP-123B — AC 1–9

| AC | Disposition | Evidence / limitation |
|---|---|---|
| 1 Default view unchanged | PASS (code) | Collapsed → only `isUnfinishedAssignment` rows render, in API order. |
| 2 Reveal | PASS (code) | Ghost `Button` (`size="sm"`, `ChevronDown` leftIcon) below the unfinished list and inside the all-complete empty state reveals finished rows in a `role="region"` container without a request. Labels `Show completed (N)` / `Hide completed (N)`; `aria-expanded` + `aria-controls="completed-assignments"`; button id `completed-assignments-toggle`; region `aria-labelledby="completed-assignments-toggle"`. Focus stays on the toggle. |
| 3 Counts | PASS (code) | `N = finished.length`; control not rendered when `N === 0`. |
| 4 Empty states | PASS (code) | No assignments → `No assignments yet.` + CTA. All finished → `All assignments are complete.` plus affordance. Mixed → unfinished list plus affordance. |
| 5 Toggle semantics | PASS (code) | Reveal/hide mutates no data and sends no request; `showCompleted` resets to `false` on `assignments` identity change. |
| 6 Accessibility | PASS (code) | Keyboard-operable Button with accessible name and `aria-expanded`/`aria-controls`; region `role="region"` with `aria-labelledby`; Tab-reachable rows keep status Select/Edit/Delete/subtasks. Live browser keyboard not executed (D123B-DoD10). |
| 7 Tests | PASS (code) | Component tests cover default unfinished-only; reveal/hide without requests; counts; three empty states; revealed rows retain status control; no DELETE/PATCH sent; aria attributes; identity reset. Execution CANNOT VERIFY. |
| 8 Parent index | PASS | Index exists and child record/checkpoint links resolve (IR-002 closed). |
| 9 DoD-10 | PASS | Manual browser pass executed and passed (user-reported 2026-10-26); D123B-DoD10 exception cleared. |

## Definition of Done audit

| # | Condition | Disposition | Evidence / limitation |
|---|---|---|---|
| 1 | Functional criteria | PASS (code) | A overdue indicator and B completed view implemented and code-inspected; A AC 6 and B AC 7/8 now have component tests (IR-001 closed). |
| 2 | Invalid-input validation | N/A | No new input surface. |
| 3 | Student data scoping | N/A | No new read/write; existing surfaces remain principal-scoped. |
| 4 | Actionable API errors | N/A | No API change. |
| 5 | Loading/empty/error states | PASS (code) | B implements all three empty-state variants; A inherits existing states. |
| 6 | Keyboard accessibility | PASS (code) | Overdue pill is non-interactive text; disclosure is a native Button; rows retain keyboard behavior. Live browser keyboard not executed (D123B-DoD10). |
| 7 | Responsive layouts | PASS (code) | Inline pill wraps naturally; disclosure is an inline Button; existing row stacking. Live mobile rendering not executed (D123B-DoD10). |
| 8 | Automated business-rule tests | PASS (code) | Helper tests present (`status.test.ts`, 8 cases). Component tests now present (38 + 16 cases) but execution CANNOT VERIFY. IR-001 coverage closed. |
| 9 | API/migration documentation | N/A | No API or migration change. |
| 10 | Integrated development review | PASS | Manual browser pass executed and passed (user-reported 2026-10-26); D123B-DoD10 exception cleared. |
| 11 | Reviewer walkthrough | PASS (saved) | `./artifacts/SP-123/walkthrough.md` saved and verified in this pass (see link). |

## Ownership / security check

No new read/write surface; the overdue predicate is pure presentation over rows already scoped by `GET /assignments` and `GET /courses/:id`. No cross-student exposure introduced. The completed view only filters the already-fetched `assignments` array. No secrets touched. No blocker.

## Verdict

**Pass.** SP-123 (A + B) meets the DoD and acceptance criteria (AC-E03-05 view half, AC-E03-06) with no open blocker or should-fix finding. IR-001, IR-002, and IR-003 are closed (IR-003 verified by independent count 62 = 8 + 38 + 16). IR-004 remains optional polish. DoD item 10 is PASS (manual browser pass executed and passed, user-reported 2026-10-26; D123B-DoD10 exception cleared). DoD item 11 is satisfied by the saved walkthrough. Execution of the new component tests remains CANNOT VERIFY (no shell) and is recorded as a limitation, not a defect.

Passing-review docs sync performed: queue rows A/B set to `Reviewed`; `Active substory`/`Next substory` updated; correction-log entries appended; parent status line refreshed; walkthrough saved. See `./artifacts/SP-123/walkthrough.md`.

No walkthrough-scope or implementation gap was found during this pass.
