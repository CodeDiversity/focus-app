# EP12B Implementation Record

**Story:** EP12B — Adopt shared Dialog primitive across hand-rolled modals
**Status:** Implemented — awaiting parent review
**Baseline:** 05c9e2d

## Commits

- 950dfc1 refactor(web): add busy prop to Dialog and migrate DeleteAssignmentDialog (EP12B pilot)
- 4ccb528 refactor(web): migrate remaining delete dialogs to shared Dialog (EP12B)
- e7f9378 refactor(web): make Dialog restore focus conditional on close path (EP12B)
- ebe8b15 refactor(web): migrate form dialogs to shared Dialog (EP12B)
- 6f4788c refactor(web): migrate CalendarEventDetails to shared Dialog (EP12B)

## Changed paths

Primitive: apps/web/src/shared/ui/Dialog.tsx, apps/web/src/shared/ui/Dialog.test.tsx
Migrated dialogs: DeleteAssignmentDialog, DeleteSubtaskDialog, DeleteMeetingDialog, ArchiveCourseDialog, DeleteAvailabilitySlotDialog, DeleteSemesterDialog, AssignmentForm, CourseForm, MeetingForm, AvailabilitySlotForm, CalendarEventDetails
Tests updated: DeleteAssignmentDialog.test.tsx, MeetingForm.test.tsx, DeleteAvailabilitySlotDialog.test.tsx, Dialog.test.tsx

## AC outcomes

- AC-12B-1 busy prop implemented (Escape/backdrop inert, focus-hold, aria-busy) + T-12B-1..4.
- AC-12B-2 all 11 dialogs render via Dialog; hand-rolled trap/escape/backdrop/scroll code removed.
- AC-12B-3 per-dialog semantics preserved (busy, error role=alert, forms keep <form>, className, dirty-check requestClose, dynamic titles, aria-labels, focus restore).
- AC-12B-4 out-of-scope untouched.
- AC-12B-5 existing tests pass with shell-only updates.
- AC-12B-6 T-12B-1..5 added/passing.
- AC-12B-7 clean gates.

## Verification

- pnpm --filter @studypilot/web test: exit 0 (1094 tests)
- pnpm --filter @studypilot/web lint --max-warnings 0: exit 0
- pnpm --filter @studypilot/web typecheck: exit 0
- pnpm --filter @studypilot/web build: exit 0

## Findings/deviations

- Primitive restore-focus made conditional on close via onClose to preserve success-skip behavior without new props.
- Focus/scroll effect split from keydown listener to avoid reset on unstable onClose.
- None otherwise.