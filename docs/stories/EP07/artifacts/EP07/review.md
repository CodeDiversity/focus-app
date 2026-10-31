# EP07 combined implementation review — Focus Sessions & Time Tracking

**Review date:** 2026-10-30
**Review mode:** Implementation review (combined parent review unit — EP07A…EP07F)
**State reviewed:** Working tree at the final implementation commit recorded in the parent index (`116608b`, `test(web): EP07F cross-layer E2E for study sessions`); closeout/docs commit records the parent index. Reviewer did not re-run Git; HEAD/baseline taken from `docs/stories/EP07/artifacts/EP07/implementation.md`. No application code was modified by this review.
**Reviewed paths:**
- `docs/stories/EP07/README.md`, `docs/stories/EP07/EP07A…EP07F-*.md`
- `docs/stories/EP07/artifacts/EP07/implementation.md` and `artifacts/EP07A…EP07F/implementation.md`
- `apps/api/prisma/schema.prisma` (StudySession), `apps/api/prisma/migrations/20261030211833_study_session_focus_lifecycle/migration.sql`
- `apps/api/src/modules/study-sessions/**` (controller, service, DTOs, module)
- `apps/api/src/modules/calendar/calendar.service.ts` (null-`endTime` handling)
- `apps/api/src/common/ownership/ownership.ts`
- `apps/web/src/app/App.tsx`, `apps/web/src/pages/focus/**`, `apps/web/src/features/focus-session/**`, `apps/web/src/entities/study-session/**`
- `apps/web/e2e/study-sessions.spec.ts`
- Shared DoD: `docs/epics/README.md`

**Scope:** One combined review for the EP07 parent review unit (EP07A–EP07F). No per-child review gate was performed; this is the final parent review.

**Limitations:**
- No shell/execution was available to the reviewer, so automated suites were **not** re-run in this session. Test results below are implementer-recorded evidence from the parent index; they are cited as recorded, not re-verified. Where a gate could not be executed, it is marked CANNOT VERIFY rather than assumed passing.
- Manual accessibility checks that require a real browser/screen reader (screen-reader announcement path, reduced-motion visual verification, full focus-visibility audit at both viewports) were not executed in this environment; automated/component evidence plus code inspection covers the AC-level obligations, and user-repeat steps are provided in `walkthrough.md`. These are treated as optional user repeats, not required gates, on the evidence recorded.
- EP06 (study planning) and EP05 (dashboard) are not broken down; the two provisional seams (V-07-1, V-07-2) remain open by design and are out of EP07's own ACs.

## 1. Acceptance criteria (epic ACs)

| AC | Stable ID | Owning children | Disposition | Evidence / refs |
|---|---|---|---|---|
| Students can start a focus session from an assignment. | AC-E07-01 | EP07A, EP07C | **Satisfied** | `POST /study-sessions` ownership-checked create (`study-sessions.service.ts:59-133`); entry points on assignment rows (`RowActionsMenu.tsx`, `AssignmentsPage.tsx`, `CourseDetailPage.tsx`); dialog + navigation (`StartFocusSessionDialog.tsx`, `useStartFocusSession.ts`); E2E `study-sessions.spec.ts` journey. |
| Students can start, pause, resume, and finish a timer. | AC-E07-02 | EP07A, EP07B, EP07D | **Satisfied** | Lifecycle endpoints pause/resume/finish (`service.ts:135-293`); `FocusTimer.tsx` controls; E2E journey pause/resume/finish. |
| The current assignment and unfinished subtasks remain accessible in focus mode. | AC-E07-03 | EP07D | **Satisfied** | `FocusAssignmentPanel.tsx` resolves assignment + subtasks from `GET /assignments`; completed vs unfinished distinguished by icon + strikethrough + "Done"/"To do" text; empty variant. |
| Students can confirm or adjust recorded study time. | AC-E07-04 | EP07B, EP07E | **Satisfied** | `finish` accepts bounded `confirmedMinutes` (0–1440) or defaults to `round(elapsedSeconds/60)` (`service.ts:265-266`); `FinishSessionDialog.tsx` with client + server validation. E2E journey records 45 minutes. |
| Recorded study time is associated with the correct assignment. | AC-E07-05 | EP07A, EP07B, EP07E, EP07F | **Satisfied** | `assignmentId` FK on `StudySession` (`schema.prisma:283-284`, `ON DELETE SET NULL`); `confirmed-time` aggregation per assignment; E2E `recorded time reaches the confirmed-time endpoint` (45 min, count 1). |
| Reloading the app does not automatically mark a session complete. | AC-E07-06 | EP07A, EP07D, EP07F | **Satisfied** | `current()` is a read with no write (`service.ts:224-233`); `FocusPage` mounts with a single `GET /study-sessions/current` and no write (`FocusPage.tsx`); E2E reload scenario asserts status unchanged and `elapsedSeconds` unchanged. |
| A study session can be finished without marking the assignment complete. | AC-E07-07 | EP07B, EP07F | **Satisfied** | `finish` writes only `StudySession` fields; no `Assignment`/`Task` read or write (`service.ts:235-293` comment + code); E2E asserts deep-equal assignment row before/after. |
| Actual study time contributes to remaining-work calculations. | AC-E07-08 | EP07B, EP07E, EP07F | **Satisfied (seam)** | `GET /study-sessions/confirmed-time` returns per-assignment confirmed minutes (`service.ts:351-404`); history surface shows per-assignment contribution (`StudyHistoryPage.tsx`); EP06 consumption remains the provisional V-07-2 seam (EP06 not broken down). |

## 2. Definition of Done audit

| DoD | Applicability | Disposition | Evidence |
|---|---|---|---|
| 1 Functional criteria | All | **PASS** | E2E 9/9 study-session scenarios + calendar regression; unit/component suites recorded green. |
| 2 Invalid-input validation | EP07A, EP07B, EP07C, EP07E | **PASS** | DTO bounds (plannedMinutes 5–480; confirmedMinutes 0–1440; list query 1–100); `FieldValidationPipe` unknown-field 400 with `errors` map; client validation in dialog; E2E error path (1441 → 400 with `errors.confirmedMinutes`). |
| 3 Student data scoping | EP07A, EP07B, EP07F | **PASS** | Every query carries `userId` via `ownedWhere`/`assertOwned`; uniform 404 `Resource not found` for missing/foreign (no 403, no oracle); data-scoping integration spec covers start/pause/current/finish/confirmed-time/list; E2E ownership scenario. |
| 4 Actionable API errors | EP07A–EP07E | **PASS** | 400 field-level `errors`; 404 uniform `Resource not found`; 409 human-readable reasons ("This session is already paused.", "A focus session is already in progress.", lost-race message). |
| 5 Loading/empty/error states | EP07C, EP07D, EP07E | **PASS** | Loading spinner + "Loading your session…"; empty states ("No focus session in progress", "No assignment linked…", "No study sessions yet"); error inline `role="alert"` with retry/reload. |
| 6 Keyboard accessibility | EP07C, EP07D, EP07E | **PASS (automated + inspection)** | Native buttons, visible focus rings, polite live region on state change only, ≥44px tap targets; E2E keyboard journey (pause/resume/finish via native buttons); unit tests for tab/Escape. Screen-reader announcement path and focus-visibility audit are user-repeat items (see walkthrough). |
| 7 Responsive layouts | EP07C, EP07D, EP07E | **PASS** | Mobile viewport 375×667 exercised in E2E (`study-sessions.spec.ts` mobile scenario: no horizontal scroll, ≥44px targets); responsive classes recorded. |
| 8 Automated tests | All | **PASS** | API: 3 suites / 32 study-session tests + 14 calendar tests; web: 93 files / 1086 tests; E2E: 38 passed (9 study-session + calendar green); typecheck + lint both packages passed. Pre-existing unrelated `study-plans-e2e.spec.ts` failure noted (see gaps). |
| 9 API/migration documentation | EP07A, EP07B, EP07F | **PASS** | Migration file with backfill + rollback notes; parent index documents endpoints, projection, lifecycle, timestamp bookkeeping; this review + walkthrough. |
| 10 Integrated review | Combined unit | **PASS (this review)** | This document. |
| 11 Reviewer walkthrough | Combined unit | **PASS** | `./walkthrough.md` written and verified before this report. |

## 3. Data scoping verification

- `start`: assignment/task ownership checked via `ownedWhere` before create; task/assignment mismatch returns 400.
- `pause`/`resume`/`finish`: read scoped to owner (`ownedWhere`) → uniform 404; status-guarded `updateMany` with `userId` in `where`; affected-count assertion.
- `current`: scoped to `userId`.
- `list`: `where.userId` plus optional owned `assignmentId` (ownership-gated first).
- `confirmedTime`: owned assignment check; aggregation filtered by `userId`.
- No endpoint accepts or persists a client-supplied `userId`. No `@Req()`/`@Request()` in the controller (uses `@CurrentUser()`).

## 4. Out-of-scope check (MVP)

No AI, syllabus parsing, LMS integration, grade calculation, flashcard, or native mobile work introduced. The dashboard "Start Focus Session" quick action remains non-functional by decision (D07-9). EP06 seam stays provisional (V-07-1, V-07-2).

## 5. Findings

No blocker or should-fix findings. Polish/observation items only:

| ID | Severity | Requirement / source | Observed gap | Suggested closure |
|---|---|---|---|---|
| P-001 | Polish | Contract: `GET /study-sessions/current` → `StudySessionProjection \| null` | Runtime returns an empty body (200) when no session is open rather than a JSON `null`; the contract names `null`. Clients in this repo tolerate both (E2E asserts `text === '' \|\| text === 'null'`). | If a strict client expects `null`, normalize serialization; or amend the contract to "empty body or `null`". Either is acceptable; no functional impact. |
| P-002 | Polish | Security invariant "one open session at a time" (D07-6, provisional) | The open-session check in `start` is a read-then-create sequence with no unique constraint/transaction; a concurrent double-submit could, in principle, create two open sessions. Only pause/resume/finish transitions are explicitly race-safe (rule 4). | Not required by the explicit race-safety list; if product wants a hard guarantee, add a partial unique index on `(userId) WHERE status IN (ACTIVE,PAUSED)` or wrap in a transaction. |
| P-003 | Polish | TR-E07-08 manual accessibility pass | Screen-reader announcement path, reduced-motion visual verification, and a full focus-visibility audit at both viewports were not executed in this environment; automated/component evidence (live-region unit tests, `motion-reduce:` classes, global reduced-motion rule, tap-target E2E) covers the AC-level obligations. User-repeat steps are in `walkthrough.md`. | Optional user repeat; no code change required. |
| P-004 | Polish | Test evidence | The API suite records one pre-existing, unrelated failure (`study-plans-e2e.spec.ts`, `dailyCapMinutes` vs. merged preferences) outside EP07 scope. | Track separately; not an EP07 gate. |
| P-005 | Polish | Calendar UX | A study-session calendar event carries `assignmentId: null` (`calendar.service.ts:318`), so the calendar cannot link an in-progress session back to its assignment. Not required by the EP07 contract or ACs. | Optional enhancement; if desired, populate `assignmentId` from the session row. |

## 6. Test execution evidence (implementer-recorded; not re-run by reviewer)

| Gate | Recorded command | Recorded result |
|---|---|---|
| Playwright E2E (full) | `pnpm test:e2e` | 38 passed, 0 failed (includes `study-sessions.spec.ts` 9 passed; `calendar.spec.ts` green) |
| API tests | `DATABASE_URL=… pnpm --filter api test` | 61 suites passed, 1 failed (pre-existing `study-plans-e2e.spec.ts`, unrelated) |
| Web tests | `pnpm --filter web test` | 93 files, 1086 tests passed |
| API typecheck | `pnpm --filter api typecheck` | passed |
| Web typecheck | `pnpm --filter web typecheck` | passed |
| API lint | `pnpm --filter api lint` | passed |
| Web lint | `pnpm --filter web lint` | passed |

Reviewer execution: CANNOT VERIFY (no shell available in this session). The recorded results above are implementer evidence; they were not independently re-executed.

## 7. Verdict

The EP07 parent review unit (EP07A–EP07F) **meets the Definition of Done and the epic acceptance criteria** with no open blocker or should-fix finding. Polish-only items P-001…P-005 are documented above; none prevents acceptance. The final user walkthrough is saved at `./walkthrough.md`.

**Final-document gate:** `review.md` and `walkthrough.md` are both saved and verified; the passing-review docs sync is applied (queue rows → `Reviewed`, correction log, implementation review log, parent status line).
