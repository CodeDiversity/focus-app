# EP08D implementation record
Updated: 2026-10-31T14:42:30Z
Story: docs/stories/EP08/EP08D-recovery-summary-and-replanning-entry-point-ui.md
Status: Implemented — awaiting parent review
Checkpoint: ./checkpoint.md

## AC-by-AC outcomes
- AC 1: Recovery summary renders missed sessions from API (date/time/duration/locked) — Done (MissedSessionRow/MissedSessionsList)
- AC 2: Completed assignments' planned sessions not shown as missed — Done (API contract enforced; no client filtering)
- AC 3: Unfinished-work rows reuse EP06 shape/order — Done (UnfinishedWorkList mirrors RemainingWorkSection)
- AC 4: Neutral, non-blaming message when needed; no punitive copy — Done (API message rendered verbatim; copy per ui-refiner decisions)
- AC 5: Empty state when nothing to recover — Done ("You're all caught up." / description)
- AC 6: Loading and error states handled with actionable messages — Done (skeletons aria-busy, role="alert" with Try again)
- AC 7: Manual entry point navigates to catch-up preview flow — Done (Create catch-up plan -> /catch-up/preview, disabled when empty)
- AC 8: Keyboard-operable, visible focus, responsive — Done (native buttons, focus classes, responsive layout)
- AC 9: No StudySession/Assignment/Task mutated — Done (read-only)

## Changed paths
- apps/web/src/entities/study-plan/model/types.ts (added MissedSession, RecoverySummary)
- apps/web/src/entities/study-plan/api/studyPlanApi.ts (added getRecoverySummary, re-exports)
- apps/web/src/app/App.tsx (added CatchUpPage import and /catch-up route in ProtectedRoute)
- apps/web/src/pages/catch-up/ui/CatchUpPage.tsx (new)
- apps/web/src/pages/catch-up/ui/CatchUpPage.test.tsx (new)
- apps/web/src/features/recovery/ui/MissedSessionRow.tsx (new)
- apps/web/src/features/recovery/ui/MissedSessionsList.tsx (new)
- apps/web/src/features/recovery/ui/MissedSessionsList.test.tsx (new)
- apps/web/src/features/recovery/ui/UnfinishedWorkList.tsx (new)
- apps/web/src/features/recovery/ui/UnfinishedWorkList.test.tsx (new)
- apps/web/src/features/recovery/ui/RecoverySummary.tsx (new)
- apps/web/src/features/recovery/ui/RecoverySummary.test.tsx (new)
- docs/stories/EP08/artifacts/EP08D/checkpoint.md (new)
- docs/stories/EP08/artifacts/EP08D/implementation.md (new)

## Verification
- npm run typecheck --workspace=apps/web (cwd: /Users/michaelrobert/Desktop/focus-app): PASS
- npm run lint --workspace=apps/web (cwd: /Users/michaelrobert/Desktop/focus-app): PASS
- npm run test --workspace=apps/web focused on recovery/catch-up tests (cwd: /Users/michaelrobert/Desktop/focus-app/apps/web): PASS (8 tests passed)

## Findings/deviations
None

## Commit scope (proposed)
As per instructions, do NOT commit - coordinator owns commits. Scoped paths listed above.
