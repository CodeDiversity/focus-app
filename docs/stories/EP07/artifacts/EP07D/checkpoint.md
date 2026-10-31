# EP07D checkpoint

Status: Implemented — awaiting parent review.

- Route: `/focus` added inside `ProtectedRoute` in `apps/web/src/app/App.tsx`.
- Page: `apps/web/src/pages/focus/ui/FocusPage.tsx` — loading/empty/error states, recovery read on mount (no write), focus management.
- Timer: `apps/web/src/features/focus-session/ui/FocusTimer.tsx` — server-anchored elapsed display (MM:SS/H:MM:SS), secondary progress line + bar, Pause/Resume/Finish controls, completed summary, polite live region, transition error alert with Reload session on 409.
- Assignment panel: `apps/web/src/features/focus-session/ui/FocusAssignmentPanel.tsx` — read-only assignment + subtasks, empty/loading variants.
- Hook: `apps/web/src/features/focus-session/model/useFocusSession.ts` — recovery mapping, anchor/re-anchor, in-flight guard, ticking interval cleared on pause/unmount.
- Entity client: added `getCurrentStudySession`, `pauseStudySession`, `resumeStudySession`, `finishStudySession`.
- Tests: useFocusSession (7), FocusTimer (6), FocusAssignmentPanel (4), FocusPage (10); full web suite 1086 passed.
- Verification: typecheck, lint, tests passed.