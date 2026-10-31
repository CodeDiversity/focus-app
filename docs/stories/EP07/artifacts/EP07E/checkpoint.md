# EP07E checkpoint

Status: Implemented — awaiting parent review.

- Added `finishStudySession(id, confirmedMinutes?)`, `listStudySessions(params)`, `getConfirmedTime(assignmentId?)` to `apps/web/src/entities/study-session/api/studySessionApi.ts`.
- Added response types to `apps/web/src/entities/study-session/model/types.ts`.
- New `FinishSessionDialog` component in `apps/web/src/features/focus-session/ui/`.
- Modified `FocusTimer` completed state to add "View study history" link.
- Modified `FocusPage` to open dialog from finish control and apply completed session.
- New `StudyHistoryPage` at `apps/web/src/pages/focus/history/ui/`.
- Registered `/focus/history` route in `App.tsx`.
- Added "Study history" link to `AssignmentsPage` header.
- Exposed `applySession` from `useFocusSession`.

Verification: typecheck, lint, full web suite (1086 tests) passed.
