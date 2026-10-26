# SP-120 Final Implementation Review — Assignment Subtasks

**Review date:** 2026-10-26
**Pass:** 2 (combined parent re-review)
**Reviewer:** reviewer (independent; not the implementer)
**Review unit:** SP-120 parent — SP-120I (backend) + SP-120J (frontend). One combined review. No per-child review gate. No third integration story.
**Reviewed state:** branch `main`, HEAD `dcb8273a40496cb45f14f4a30b872446fe7967b3`. Application tree identical to `a1ec58418dd67eaa47b0ae7eccd3e0c48fc3b009` (`git diff --stat a1ec584 -- apps/` empty). Commits after `a1ec584` are docs-only: `dfdd0af`, `e31eee4`, `8a91fd2`, `dcb8273`.
**Working tree at gate time:** one untracked path, this report's previous pass (`docs/stories/EP03/SP-120/artifacts/SP-120/review.md`). No application dirty paths. This pass replaces that uncommitted pass-1 report. Pass 1 was never committed.
**Final document:** [walkthrough.md](./walkthrough.md) saved beside this report and read back before passing sync.

## Prior findings

| ID | Pass 1 | This pass |
|---|---|---|
| IR-120-1 | Open. DoD-10 browser pass not executed. | **Closed.** User reported the walkthrough passed on 2026-10-26. Accepted as user-reported evidence against unchanged application code `a1ec584`, same provenance class as SP-115 F-115H-1. Environment and per-step results were not itemized. |
| IR-120-2 | Open. Automated gates not independently run. | **Closed.** Reviewer-executed gates below, application files unchanged since `a1ec584`. |

No new finding. Implementer items I-1…I-8 and J-1…J-3 remain consistent with the code. J-4's historical "not executed" note in the implementation record is left as history; the user report is the closure evidence.

## Verification

Gates were run by a bounded command helper (session `ses_e870bfc9fffeH4Q90siv6k5ZjB`) under reviewer restrictions: no file edits, no secret reads, no fix/format commands. Results below are that helper's, disclosed as reviewer-executed. They are not the implementer's recorded results. Full successful output was not pasted.

| Gate | Command | cwd | Exit | Result |
|---|---|---|---|---|
| HEAD / dirty | `git rev-parse HEAD`; `git status --short`; `git diff --stat a1ec584 -- apps/` | repo root | 0 | HEAD `dcb8273`. `apps/` unchanged. Untracked: this report's prior file only. |
| I unit | `env -u DATABASE_URL pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts courses.service.spec.ts` | repo root | 0 | 2 suites, 284 passed, 0 skipped |
| I DB-backed | `pnpm exec dotenv -e .env.local -- jest --runInBand assignments-data-scoping.spec.ts assignments-e2e.spec.ts subtasks-e2e.spec.ts courses-meetings-e2e.spec.ts` | `apps/api` | 0 | 4 suites, 134 passed, 0 skipped. Env file was not read or quoted. |
| I typecheck | `pnpm --filter @studypilot/api typecheck` | repo root | 0 | clean |
| I lint | `pnpm exec eslint src/modules/assignments src/modules/courses --max-warnings 0` | `apps/api` | 0 | clean, 0 warnings. Not `--fix`. |
| J tests | `pnpm --filter @studypilot/web test --` the seven paths in SP-120J's verification block | repo root | 0 | 7 files, 125 passed, 0 skipped |
| J typecheck | `pnpm --filter @studypilot/web typecheck` | repo root | 0 | clean |
| J lint | `pnpm --filter @studypilot/web lint` | repo root | 0 | clean, 0 warnings |

`docker compose ps` failed before listing services because `JWT_SECRET` was unset for compose interpolation. The database was not started by this review. The DB-backed Jest command still reached Postgres and did not skip. No secret value was printed.

## Combined scope

Parent index [implementation.md](./implementation.md) lists I (`5e65cfc`) and J (`a1ec584`) and does not claim the combined review. That claim was accurate at authoring time. This report is the combined review.

Inspected production surface, unchanged since pass 1:

- API: `assignments.controller.ts`, `assignments.service.ts`, `dto/create-subtask.dto.ts`, `dto/update-subtask.dto.ts`, `courses.service.ts` detail include and projection. No migration. `Task` already had `assignmentId` and `orderIndex`.
- Web: `academic.ts`, `assignmentApi.ts`, `SubtaskChecklist.tsx`, `DeleteSubtaskDialog.tsx`, `AssignmentsSection.tsx`, `CourseDetailPage.tsx`, plus the named tests.

No AI, syllabus parsing, LMS, grade, flashcard, or native-mobile scope was added.

## Acceptance criteria

### SP-120I

| AC | Outcome | Evidence |
|---|---|---|
| 1 Routes | **Satisfied** | `assignments.controller.ts` GET/POST `:id/subtasks`, PATCH/DELETE `:id/subtasks/:subtaskId` with 204 on delete. Auth is the global guard. 401 cases are in the executed e2e and data-scoping suites. |
| 2 Ownership | **Satisfied** | `assertAssignmentOwner` uses `ownedWhere` and throws `Resource not found` before subtask queries (`assignments.service.ts` 241–248). List/create scope `{ userId, assignmentId }`. Patch and delete require `{ id, userId, assignmentId }`. Executed data-scoping and e2e cover cross-student and cross-assignment cases. No 403 path. |
| 3 Create | **Satisfied** | `CreateSubtaskDto`: title required, non-whitespace, max 200; optional `orderIndex` integer ≥ 0; null appends. Unknown fields rejected by the whitelist. Service appends `max+1` or 0 and does not take status from the client. 201 is the 6-key projection. Covered by the executed unit and e2e suites. |
| 4 Update | **Satisfied** | `UpdateSubtaskDto`: title, `PENDING`/`COMPLETED`, `orderIndex`. Empty body 400. Merged re-check. Unknown fields 400. Executed unit and e2e. |
| 5 Delete | **Satisfied** | Scoped `deleteMany` plus `assertAffected`. 204. Assignment row is not written. Executed unit and e2e. |
| 6 Course projection | **Satisfied** | `courses.service.ts` `get()` includes `tasks` with `where: { userId }` and `orderBy` `orderIndex` then `createdAt`. Response adds `subtasks` and keeps the other assignment keys. Empty tasks map to `[]`. Direct assignment responses stay 11-key. Executed course unit tests and e2e. |

### SP-120J

| AC | Outcome | Evidence |
|---|---|---|
| 1 Checklist renders | **Satisfied** | Disclosure in `AssignmentsSection.tsx` 260–282: `aria-expanded`, summary from `subtaskSummary` (38–45), accessible name includes the assignment title. Panel only while expanded. Edit/Delete stay in the badge cluster. Empty expanded copy is `No subtasks yet.` Executed section tests. |
| 2 Add | **Satisfied** | Client trim, required, ≤ 200 (`SubtaskChecklist.tsx` 45–49, 159–169). Body is `{ title }` only. 400 title stays on the input. Executed checklist and client tests. |
| 3 Toggle | **Satisfied** | Native checkbox in a label; PATCH `{ status }` only. Title is not struck through. Executed checklist tests. |
| 4 Reorder | **Satisfied** | Up/Down, disabled at the ends, two PATCH swaps for unequal indexes, one PATCH for equal indexes. One `moved` announcement. Executed checklist tests. |
| 5 Delete | **Satisfied** | Confirm calls `deleteSubtask`. Cancel and Escape send nothing. Executed dialog and checklist tests. |
| 6 Refetch | **Satisfied** | Page maps the five actions to subtask sentences and background-refetches (`CourseDetailPage.tsx` 173–186). Checklist does not call `onAssignmentChanged` or `listSubtasks`. Partial reorder calls `onRefresh` only. Executed page test. |
| 7 States | **Satisfied** | Page loading state unchanged. Empty copy, title 400, toast, delete alert, and expanded-id survival are in the executed component tests. |
| 8 Keyboard and narrow width | **Satisfied** | DOM order matches the settled tab order. Executed section tab-order test. Phone-width no-scroll is in the user-reported walkthrough (IR-120-1), not a measurement this review made. |

### Original parent criterion

| Req | Outcome | Note |
|---|---|---|
| AC-E03-03 | **Satisfied** | Ordered, independently completable subtasks on the API and on the course-page checklist. |

## Definition of Done

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | **PASS** | AC table above. Reviewer-executed suites, exit 0. |
| 2 | Invalid input handled | **PASS** | DTO and service re-check; client title rules. Covered by the executed unit, e2e, and component tests. |
| 3 | Academic data scoped to the authenticated student | **PASS** | `userId` on every subtask query; assignment gate first. Executed data-scoping and e2e, 0 skipped. Uniform 404, not 403. |
| 4 | Actionable API errors | **PASS** | Field-level 400 (`assignments.service.ts` 431–441). Title 400 renders on the input. Executed tests. |
| 5 | Loading, empty, and error states | **PASS** | Page loading; `No subtasks yet.`; toast and dialog alert. Executed component tests plus the user walkthrough. |
| 6 | Keyboard accessibility | **PASS** | Disclosure, checkbox, Up/Down, Delete, dialog trap. Executed jsdom tab order plus the user walkthrough. |
| 7 | Responsive desktop and mobile | **PASS** | Settled wrap/stack classes. Phone-width clause is in the user-reported walkthrough, not independently measured here. |
| 8 | Business rules have automated tests | **PASS** | Unit, data-scoping, e2e (including `subtasks-e2e.spec.ts`), and component tests executed, 0 skipped. |
| 9 | API changes and migrations documented | **PASS** | No migration (D120-1). Shared contract in the parent README matches the routes, 6-key projection, status pair, and course-detail `subtasks` key. |
| 10 | Reviewed in an integrated development environment | **PASS** | User-reported browser pass, 2026-10-26, against unchanged application code, plus this combined review. Component tests are not the substitute; the user report is the manual evidence. |
| 11 | Reviewer walkthrough before completion | **PASS** | [walkthrough.md](./walkthrough.md) saved and read back before `Reviewed` sync. |

## Findings

| ID | Severity | Disposition |
|---|---|---|
| IR-120-1 | Should-fix | **Closed** 2026-10-26. User attestation. Not reviewer-watched. |
| IR-120-2 | Should-fix | **Closed** 2026-10-26. Helper-executed gates above. Application code unchanged since `a1ec584`. |

No blocker. No new should-fix. No polish finding is required to accept this pass.

### IR-120-1 — closed

- **Original:** DoD 10 and J's required browser pass were not executed.
- **Closure:** On 2026-10-26 the user reported `SP-120 walkthru passed` after being asked to run J's browser note, including phone width. Recorded in the SP-120 correction log before this pass (`dcb8273`). Application files are unchanged since `a1ec584`, so the report applies to the reviewed code.
- **Limitation:** environment and per-step observations were not provided. That does not reopen the finding. SP-115 closed the same kind of report without a per-step log.

### IR-120-2 — closed

- **Original:** Pass 1 could not run the automated gates.
- **Closure:** The verification table above. Exit 0. DB suites not skipped. Includes `subtasks-e2e.spec.ts`. No product failure, so no new finding ID.

## Verdict

**SP-120 meets the Definition of Done and acceptance criteria.** IR-120-1 and IR-120-2 are closed. No open blocker or should-fix finding.

## Final document gate

[walkthrough.md](./walkthrough.md) covers both children, the request/UI/data flow, the executed test evidence, the user-reported browser pass, and the manual steps with expected results. Execution labels distinguish the user report from optional unexecuted repeats. Both documents were saved before passing sync marks `Reviewed`.

## Handoff

Passing-review docs sync follows this save: correction-log closure, queue `Reviewed`, parent status line, and the scoped commit of this report, the walkthrough, and those status updates. No implementer code change.
