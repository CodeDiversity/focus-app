# EP07E implementation

## Scope

Frontend — completion confirm/adjust dialog and study-history surface: `/focus/history` protected route, FinishSessionDialog (bounded 0–1440 adjustment, validation, server 400 mapping, in-flight guard), completed-state link onward to history, per-assignment contribution presentation using confirmed-time endpoint, entry points from focus completed state and assignments page.

## Changes

- `apps/web/src/entities/study-session/model/types.ts` (modified — added StudySessionListResponse, ConfirmedTimeAssignment, ConfirmedTimeListResponse, ConfirmedTimeSingleResponse).
- `apps/web/src/entities/study-session/api/studySessionApi.ts` (modified — finishStudySession now accepts optional confirmedMinutes; added listStudySessions and getConfirmedTime overloads).
- `apps/web/src/features/focus-session/ui/FinishSessionDialog.tsx` (new).
- `apps/web/src/features/focus-session/ui/FocusTimer.tsx` (modified — completed state adds "View study history" link to /focus/history).
- `apps/web/src/pages/focus/ui/FocusPage.tsx` (modified — finish control opens dialog; applies completed session; renders dialog).
- `apps/web/src/features/focus-session/model/useFocusSession.ts` (modified — exposed applySession).
- `apps/web/src/pages/focus/history/ui/StudyHistoryPage.tsx` (new).
- `apps/web/src/app/App.tsx` (modified — registered /focus/history route).
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (modified — added "Study history" link).

## Behavior

- Finish control opens FinishSessionDialog instead of calling finish directly; no request until confirm; cancel sends nothing and restores focus.
- Dialog pre-fills "Minutes to record" with `Math.round(session.elapsedSeconds / 60)`; shows "Recorded time" {n} min and assignment context (title, due date, estimated hours, target minutes).
- Client validation rejects non-integer/negative/>1440 with "Enter a whole number between 0 and 1440." and disables confirm; server 400 maps `errors.confirmedMinutes` onto the field; other failures show `role="alert"` via `getErrorMessage`; 409 offers reload.
- Confirm disabled with `aria-busy` while in flight; second click/Enter ignored via ref guard.
- Success closes dialog and calls `onFinished(completedSession)`; FocusPage applies it so completed state renders "{n} minutes recorded" plus "View study history" and "Back to assignments".
- History surface lists completed sessions newest first (server order), 20 per page with "Load more" when `items.length < total`; assignment filter (component state, resets pagination); loading skeleton (3 rows, aria-busy), empty state, error state with retry.
- Each row shows title (link), confirmed minutes, course line, time range, and a contribution block: confirmed total for the assignment (from confirmed-time endpoint), estimate (from assignment projection), clamped progress bar + percentage label; "No estimate" badge when no estimate. No cross-assignment total, ranking, or shortfall warning.
- Secondary loads (assignments, confirmed-time) are non-fatal.
- Direct visit to /focus/history works for authenticated students (protected route).

## Verification

- `pnpm --filter web typecheck` — passed.
- `pnpm --filter web lint` — passed.
- `pnpm --filter web test` — 93 files, 1086 tests passed (flaky timing tests pass in isolation).

## Findings/deviations

- Assignment context in the dialog is resolved from `GET /assignments` when not passed via prop (EP03 exposes no single-assignment GET), matching FocusAssignmentPanel's pattern.
- `actualHours` is never read; confirmed time comes from session log / confirmed-time endpoint (D07-2).
- Route name `/focus/history` is provisional per parent README.

## Commit

- `ffc1b930f940c0d724d3dc6adc1380771d9ec95f` — feat(web): EP07E completion confirm/adjust + study history
