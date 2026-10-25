import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { deleteAssignment } from '@/entities/assignment/api/assignmentApi';
import type { CourseAssignment } from '@/shared/types/academic';

export interface DeleteAssignmentDialogProps {
  /** The assignment to delete (named in the title and aria-label). */
  assignment: CourseAssignment;
  /** Called after a successful delete (the section / page announces + refetches). */
  onDeleted: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Delete-confirmation dialog for an assignment (SP-114E, AC 6, D114E-3) —
 * matches the `DeleteMeetingDialog` and `DeleteSemesterDialog` precedent:
 * names the assignment ("Delete <title>?"), states the effect, and confirms
 * `DELETE /assignments/:id`.
 *
 * Accessibility: `role="dialog"` + `aria-modal="true"`; on open the safe action
 * (Cancel) receives initial focus and focus is trapped to the dialog (Tab/Shift+Tab
 * cycle within; Escape cancels when not in flight); on close focus returns to the
 * trigger that opened the dialog.
 */
export function DeleteAssignmentDialog({
  assignment,
  onDeleted,
  onCancel,
}: DeleteAssignmentDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Remember the trigger (the row's Delete button) to return focus to it.
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    // Focus the safe action first: the first focusable is Cancel.
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? dialogRef.current)?.focus();
    return () => {
      restoreFocusRef.current?.focus();
    };
  }, []);

  const handleConfirm = async () => {
    if (isDeleting) return; // duplicate-submission prevention
    setIsDeleting(true);
    setError(null);
    // Move focus before the buttons disable so Tab cannot escape during the gap.
    dialogRef.current?.focus();
    try {
      await deleteAssignment(assignment.id);
      onDeleted();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      setError(
        apiError
          ? apiErrorMessage(apiError)
          : getErrorMessage(err) || 'We could not delete the assignment. Try again.'
      );
      // Retry is the re-clicked Delete (the button re-enables).
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    // Disabled controls drop focus in real browsers. Hold it on the dialog.
    if (isDeleting) dialogRef.current?.focus();
  }, [isDeleting]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      // Escape is the only key suspended in flight. Tab stays contained.
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!isDeleting) onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled')
      );
      const active = document.activeElement;
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outside = !active || !dialog.contains(active) || active === dialog;
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !active || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    // Capture on document so Tab is contained even after focus has left the modal.
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isDeleting, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop: click closes without a request (frozen while deleting). */}
      <div
        className="absolute inset-0 bg-secondary-900/50"
        aria-hidden="true"
        onClick={isDeleting ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-assignment-title"
        tabIndex={-1}
        className="card relative w-full max-w-md p-6"
      >
        <h2 id="delete-assignment-title" className="text-lg font-semibold text-secondary-900">
          Delete {assignment.title}?
        </h2>
        <p className="mt-2 text-sm text-secondary-600">
          This permanently deletes the assignment. Any subtasks will remain without an assignment.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            aria-label={`Delete ${assignment.title}`}
            isLoading={isDeleting}
            onClick={() => void handleConfirm()}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
