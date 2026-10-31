# EP07 walkthrough — Focus Sessions & Time Tracking

**Review unit:** EP07 (parent) — children EP07A…EP07F.
**Final review:** [`./review.md`](./review.md) (2026-10-30, passing verdict, polish-only findings P-001…P-005).
**Parent index:** [`./implementation.md`](./implementation.md).

## 1. What changed

EP07 adds a complete focus-session workflow on top of the existing assignment/task data: a student can start a timed focus session from an assignment, pause/resume/finish a timer, confirm or adjust the recorded minutes, and review past sessions per assignment. Recorded (confirmed) time is exposed through a read API that EP06 will consume for remaining-work calculations, without ever writing to `Assignment.actualHours`/`Task.actualMinutes`.

Scope (six children, one sequential implementer):

- **EP07A** (backend): migration making `StudySession.endTime` nullable plus a status (`ACTIVE`/`PAUSED`/`COMPLETED`), assignment/task links, elapsed-seconds accumulator, planned minutes, resumed-at timestamp; lifecycle endpoints start/pause/resume/current; calendar compatibility for null `endTime`.
- **EP07B** (backend): finish endpoint with bounded confirmed adjustment; history list with filters/paging; per-assignment confirmed-time aggregation.
- **EP07C** (frontend): "Start focus session" entry points on assignment rows (assignments list and course detail), duration selection dialog, start call, navigation into focus mode.
- **EP07D** (frontend): `/focus` protected route, server-anchored timer, pause/resume/finish controls, assignment + unfinished-subtasks panel, reload recovery (no auto-complete), keyboard/live-region/reduced-motion/responsive behavior.
- **EP07E** (frontend): finish confirm/adjust dialog, `/focus/history` surface, per-assignment contribution presentation.
- **EP07F** (integration): cross-layer Playwright suite (9 scenarios), calendar regression, ownership/empty/error/mobile coverage, parent implementation index.

Key user-visible workflows: start from an assignment → focus screen with timer → pause/resume → finish with optional adjustment → completed summary → study history with per-assignment contribution.

## 2. How the code works

**Data model.** `StudySession` becomes the actual-time log (D07-1): `endTime` nullable, `status`, `assignmentId`/`taskId` (SetNull on delete), `elapsedSeconds` (raw, server-derived), `durationMinutes` (confirmed), `plannedMinutes`, `resumedAt`. Planned sessions stay in EP06's `StudyPlan`/`ScheduledTask`. Migration backfills pre-existing rows as `COMPLETED` with `elapsedSeconds = durationMinutes * 60`.

**Timestamp bookkeeping.** The server measures the running segment from persisted timestamps at pause/finish (`floor((now - segmentStart)/1000)`, where `segmentStart = resumedAt ?? startTime`); the client never posts elapsed time. A throttled/backgrounded/closed tab cannot change recorded time. The client displays `elapsedSeconds + (now - responseInstant)` and re-anchors after every pause/resume/finish/reload.

**Lifecycle.** `ACTIVE → PAUSED → ACTIVE → COMPLETED` (terminal). Open = ACTIVE/PAUSED. Pause/resume/finish use a status-guarded `updateMany` (`where: { id, userId, status: <expected> }`) and assert the affected count; a lost race affects 0 rows → 409 "The session changed; reload and try again".

**Endpoints** (relative to API root, called via `/api` proxy): `POST /study-sessions` (201, open-session 409, ownership 404, 400 field errors), `POST …/:id/pause|resume|finish`, `GET /study-sessions/current` (200 `| null`), `GET /study-sessions` (history, completed only, filters/paging), `GET /study-sessions/confirmed-time` (per-assignment aggregation). Projection exposes 12 keys and never `userId`/`resumedAt`.

**Ownership.** Every query carries the authenticated student's `userId` via `ownedWhere`/`assertOwned`; missing and foreign records return the identical uniform 404 `Resource not found` (no 403, no existence oracle). The controller uses `@CurrentUser()`, never `@Req()`.

**Frontend.** FSD layers: entity client `entities/study-session`, features `features/focus-session` (start dialog, timer, assignment panel, finish dialog, hooks), pages `pages/focus` (FocusPage, StudyHistoryPage) and routes in `App.tsx` (`/focus`, `/focus/history`). Focus mode resolves the linked assignment from a single `GET /assignments` fetch (EP03 exposes no single-assignment GET). History loads 20 per page with "Load more", assignment filter, loading/empty/error states, and a non-fatal secondary confirmed-time load for the per-assignment contribution block (confirmed total, estimate, clamped progress bar).

**Calendar.** `calendar.service.ts` query now includes open sessions (`OR: [{ endTime: null }, { endTime: { gt: rangeStart } }]`) and emits them with `endTime: null`; an in-progress session no longer silently disappears.

**Key files/symbols:**
- API: `apps/api/src/modules/study-sessions/study-sessions.service.ts` (`start`, `pause`, `resume`, `current`, `finish`, `list`, `confirmedTime`, `toStudySessionResponse`); `study-sessions.controller.ts`; DTOs under `dto/`.
- Migration: `apps/api/prisma/migrations/20261030211833_study_session_focus_lifecycle/migration.sql`.
- Calendar: `apps/api/src/modules/calendar/calendar.service.ts` (lines 204-210, 297-314).
- Web: `apps/web/src/entities/study-session/{model/types.ts,api/studySessionApi.ts}`; `apps/web/src/features/focus-session/{model/useFocusSession.ts,model/resolveDefaultSessionMinutes.ts,ui/StartFocusSessionDialog.tsx,ui/FocusTimer.tsx,ui/FocusAssignmentPanel.tsx,ui/FinishSessionDialog.tsx}`; `apps/web/src/pages/focus/ui/{FocusPage.tsx,StudyHistoryPage.tsx}`; `apps/web/src/app/App.tsx`.
- E2E: `apps/web/e2e/study-sessions.spec.ts`.

## 3. Why it is correct

- **AC traceability:** all eight epic ACs are satisfied with file/line and E2E evidence (see review.md §1). AC-E07-06 (reload never completes) is enforced by a read-only mount plus timestamp-derived elapsed time; AC-E07-07 (finish doesn't complete assignment) is enforced by `finish` writing only `StudySession` fields and verified by deep-equal assignment row in E2E.
- **DoD:** all applicable items PASS (review.md §2), including scoping (DoD 3), validation (DoD 2), keyboard/responsive (DoD 6/7), automated tests (DoD 8), migration docs (DoD 9).
- **Security invariants:** cross-student access returns uniform 404 (data-scoping integration spec + E2E ownership scenario); elapsed time is server-derived; lost race cannot double-count; in-progress sessions remain visible in the calendar.
- **Evidence:** API 3 suites/32 study-session tests + 14 calendar tests; web 93 files/1086 tests; E2E 38 passed (9 study-session + calendar green); typecheck + lint both packages passed (implementer-recorded; reviewer did not re-run — no shell).
- **Findings closure:** review pass 1 found no blocker/should-fix; five polish items (P-001 empty-body-vs-null, P-002 non-transactional open-session check, P-003 unexecuted manual a11y items, P-004 pre-existing unrelated test failure, P-005 calendar assignment link) are documented and do not block acceptance.

## 4. Manual test workflows

All steps use disposable local/test data (throwaway accounts created via the normal registration flow). Never use shared production data or secrets. Label: each workflow's **Execution status** is given per the review skill.

### W1 — Start a focus session from an assignment (AC-E07-01)
Prerequisites: a signed-in student account with at least one unfinished assignment.
1. Go to `/assignments`. Locate an unfinished assignment row.
2. Open the row's actions menu ("Actions for {title}"); choose "Start focus session for {title}".
3. In the dialog, pick a preset (25/50/90) or enter a custom value (5–480); confirm.
Expected: exactly one `POST /study-sessions` with `{ assignmentId, plannedMinutes }`; dialog closes; browser navigates to `/focus` with the timer running and Pause/Finish controls visible. Dismissing the dialog leaves the page unchanged.
Execution status: **Not executed — user test instructions** (automated counterpart: `study-sessions.spec.ts` journey + EP07C unit tests).

### W2 — Pause / resume / finish the timer (AC-E07-02)
1. On `/focus` with a running session, click Pause → Resume → Finish session.
2. In the finish dialog, set "Minutes to record" (0–1440) and Save.
Expected: status transitions ACTIVE→PAUSED→ACTIVE→COMPLETED; completed summary shows "{n} minutes recorded" with "View study history" and "Back to assignments"; no assignment mutation.
Execution status: **Not executed — user test instructions** (automated: E2E journey).

### W3 — Reload does not complete a session (AC-E07-06)
1. Start a session, note the server `elapsedSeconds` via `GET /api/study-sessions/current`.
2. Reload `/focus`.
Expected: session stays ACTIVE/PAUSED; `elapsedSeconds` unchanged; timer re-anchors to the server value; no write request on mount.
Execution status: **Not executed — user test instructions** (automated: E2E reload scenario).

### W4 — Finish without completing the assignment (AC-E07-07)
1. Capture the assignment row JSON before finishing.
2. Finish the session.
3. Re-fetch the assignment list.
Expected: the assignment row is byte-identical (status, actualHours, etc. unchanged).
Execution status: **Not executed — user test instructions** (automated: E2E assignment-untouched).

### W5 — Recorded time reaches the confirmed-time endpoint (AC-E07-05, AC-E07-08)
1. Finish a session recording 45 minutes against an assignment.
2. `GET /api/study-sessions/confirmed-time?assignmentId={id}`.
Expected: `{ assignmentId, confirmedMinutes: 45, sessionCount: 1 }`; `GET /api/study-sessions?assignmentId={id}` returns one COMPLETED row with `durationMinutes: 45`.
Execution status: **Not executed — user test instructions** (automated: E2E confirmed-time).

### W6 — Study history surface (AC-E07-04)
1. Visit `/focus/history` directly while authenticated.
2. With sessions: verify newest-first order, 20/page "Load more" when `items.length < total`, assignment filter resets pagination, row shows title link, confirmed minutes, course line, time range, contribution block (confirmed total / estimate / clamped progress + percentage or "No estimate").
3. With no sessions: verify "No study sessions yet".
4. Error/retry: simulate a failed load; verify error state + retry.
Execution status: **Not executed — user test instructions** (automated: component tests + E2E empty state).

### W7 — Calendar shows an in-progress session (TR-E07-07)
1. Start a session (null `endTime`), then open `/calendar`.
Expected: a "Study session" event is visible; no horizontal scroll; existing calendar specs green.
Execution status: **Not executed — user test instructions** (automated: E2E calendar scenario + `calendar.spec.ts`).

### W8 — Ownership (cross-student) (DoD 3)
1. As student A, start a session against A's assignment.
2. As student B, attempt pause/finish/confirmed-time against A's ids.
Expected: all return 404 with body `{ message: "Resource not found" }`; `GET /study-sessions/current` for B returns 200 with empty/null body (B's own, never A's).
Execution status: **Not executed — user test instructions** (automated: data-scoping spec + E2E ownership).

### W9 — Mobile viewport (DoD 7)
1. Set viewport 375×667; run W1/W2.
Expected: no horizontal scroll; Pause/Resume/Finish tap targets ≥44×44px; controls stack full-width; assignment panel subtask list scrolls internally.
Execution status: **Not executed — user test instructions** (automated: E2E mobile scenario).

### W10 — Keyboard-only focus mode (DoD 6)
1. With a session open, use Tab/Enter/Space only to pause, resume, finish (via dialog).
2. Verify initial focus lands on the primary control; Escape is a no-op in focus mode.
Expected: full operability without a mouse; visible focus rings; status announced in the polite live region on state change only (not per tick).
Execution status: **Not executed — user test instructions** (automated: unit tests for tab/Escape; live-region unit tests).

### W11 — Reduced motion (DoD 6/7)
1. Enable "reduce motion" in OS settings; run W2.
Expected: progress-bar width transition disabled; spinner not animated; no animation library; global rule zeroes durations.
Execution status: **Not executed — user test instructions** (code inspection: `motion-reduce:` classes + global media query; visual verification pending).

### W12 — Screen-reader spot check (TR-E07-08)
1. Run W2 with VoiceOver/NVDA.
Expected: single polite live region announces "Focus session running/paused/complete" on state change; ticking digits are not announced (they carry an `aria-label` available on demand).
Execution status: **Not executed — user test instructions** (no assistive-technology run on record; unit tests cover the live region).

### W13 — Invalid input (DoD 2)
1. Try `plannedMinutes` 4 or 481, `confirmedMinutes` 1441 or -1, unknown body fields, foreign `assignmentId`.
Expected: 400 with field-level `errors` map (or 404 uniform for foreign assignment); dialog disables Save and shows "Enter a whole number between 0 and 1440."
Execution status: **Not executed — user test instructions** (automated: E2E error path + data-scoping spec).

### Workflows not applicable
- Starting a session from the dashboard quick action: not an EP07 AC (D07-9); remains non-functional by design.
- Subtask mutation in focus mode: read-only by design; mutation stays on assignment surfaces (EP03).
- EP06 remaining-work consumption: provisional seam V-07-2; EP06 not broken down.

## 5. Execution status summary

| Workflow | Status |
|---|---|
| W1–W5 (core journey, reload, assignment-untouched, confirmed-time) | Not executed — user test instructions (automated E2E covers) |
| W6 (history) | Not executed — user test instructions (component + E2E empty) |
| W7 (calendar) | Not executed — user test instructions (automated E2E) |
| W8 (ownership) | Not executed — user test instructions (data-scoping spec + E2E) |
| W9 (mobile) | Not executed — user test instructions (automated E2E) |
| W10 (keyboard) | Not executed — user test instructions (unit tests) |
| W11 (reduced motion) | Not executed — user test instructions (code inspection) |
| W12 (screen reader) | Not executed — user test instructions (unit tests) |
| W13 (invalid input) | Not executed — user test instructions (automated) |

Automated evidence actually executed (implementer-recorded): API 3 suites/32 tests + 14 calendar; web 93 files/1086 tests; Playwright 38 passed (9 study-session + calendar); typecheck + lint both packages. The reviewer did not re-execute (no shell); see review.md §6.

No required manual gate is claimed as executed by the reviewer. The unexecuted items above are optional user repeats; the AC/DoD-level obligations are covered by the automated suite and code inspection recorded in review.md.
