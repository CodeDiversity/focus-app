import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { deleteMeeting } from '@/entities/course/api/courseApi';
import type { ClassMeeting } from '@/shared/types/academic';
import { formatMeetingLabel } from './meetingLabel';

export interface DeleteMeetingDialogProps {
  /** The course the meeting belongs to (the nested route's `:id`). */
  courseId: string;
  /** The meeting to delete (named in the copy via `formatMeetingLabel`). */
  meeting: ClassMeeting;
  /** Called after a successful delete (the page announces + refetches). */
  onDeleted: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Delete-confirmation dialog for a recurring meeting (SP-112B, AC 3,
 * D112B-9) — the `DeleteSemesterDialog` pattern: names the meeting ("Delete
 * Mon 09:00–10:30?"), states the effect, and confirms the `DELETE
 * /courses/:id/meetings/:meetingId`.
 *
 * Accessibility: `role="dialog"` + `aria-modal`; on open the safe action
 * (Cancel) receives focus and focus is trapped to the dialog (Tab/Shift+Tab
 * cycle within; Escape cancels); on close focus returns to the trigger that
 * opened the dialog.
 */
export function DeleteMeetingDialog({
  courseId,
  meeting,
  onDeleted,
  onCancel,
}: DeleteMeetingDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = formatMeetingLabel(meeting);

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
    try {
      await deleteMeeting(courseId, meeting.id);
      // The dialog unmounts via `onDeleted`; the flight is done.
      onDeleted();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      setError(
        apiError
          ? apiErrorMessage(apiError)
          : getErrorMessage(err) || 'We could not delete the meeting. Try again.'
      );
      // Retry is the re-clicked Delete (the button re-enables).
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isDeleting) return; // frozen while the request is in flight
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled')
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Escape/Tab handling is attached imperatively (not as a JSX handler):
  // the dialog is a non-interactive container, and focus is trapped inside
  // it, so a keydown listener on the dialog element sees every key press.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
    };
  });

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
        aria-labelledby="delete-meeting-title"
        tabIndex={-1}
        className="card relative w-full max-w-md p-6"
      >
        <h2 id="delete-meeting-title" className="text-lg font-semibold text-secondary-900">
          Delete {label}?
        </h2>
        <p className="mt-2 text-sm text-secondary-600">
          This removes the meeting from the course&apos;s weekly schedule.
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
            aria-label={`Delete ${label}`}
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
