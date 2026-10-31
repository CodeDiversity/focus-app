# EP07C checkpoint

Status: Implemented — awaiting parent review.

- Entry point: "Start focus session" added to `RowActionsMenu` (first item, above Edit/Delete), hidden on finished assignments, disabled while row busy.
- Dialog: `StartFocusSessionDialog` using EP10 `Dialog` (size sm), assignment context block, preset chips (25/50/90) + numeric input (5–480), validation, loading/error/409 states.
- Default duration: `resolveDefaultSessionMinutes(user)` reads `preferences.studyDefaults.sessionMinutes`, fallback 25.
- Entity client: `entities/study-session` (`StudySession` projection + `startStudySession`).
- Wiring: assignments page and course-detail page (`startingAssignment` state + dialog mount).
- Navigation: `navigate('/focus')` on success and on 409 "View current session" (inter-commit transient until EP07D).
- Tests: resolveDefaultSessionMinutes, StartFocusSessionDialog, RowActionsMenu/AssignmentRow surfaces, pages; full web suite green.
- Verification: typecheck, lint, tests passed.