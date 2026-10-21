import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { updateCourse, type CourseWithSemester } from '@/entities/course/api/courseApi';

export interface ArchiveCourseDialogProps {
  course: CourseWithSemester;
  /** Called after a successful archive/restore (the page re-reads the list). */
  onDone: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Archive/restore confirmation dialog (SP-111B, AC 5, D111-2): names the
 * course and states that the operation is **reversible** — archiving hides
 * the course from the active list, restoring puts it back; nothing is ever
 * deleted (no hard delete in the MVP, D111-2).  The action is the same
 * `PATCH /courses/:id` partial merge with `{ isActive }` — the dialog
 * derives archive vs restore from the row's current `isActive`.
 *
 * Accessibility: `role="dialog"` + `aria-modal`; on open the safe action
 * (Cancel) receives focus and focus is trapped to the dialog (Tab/Shift+Tab
 * cycle within; Escape cancels); on close focus returns to the trigger that
 * opened the dialog (the `DeleteSemesterDialog` pattern).
 */
export function ArchiveCourseDialog({ course, onDone, onCancel }: ArchiveCourseDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active row → archive (isActive: false); archived row → restore (true).
  const isArchiving = course.isActive;

  useEffect(() => {
    // Remember the trigger (the row's Archive/Restore button) to return
    // focus to it. Focus the safe action first: the first focusable is
    // Cancel.
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? dialogRef.current)?.focus();
    return () => {
      restoreFocusRef.current?.focus();
    };
  }, []);

  const handleConfirm = async () => {
    if (isWorking) return; // duplicate-submission prevention
    setIsWorking(true);
    setError(null);
    try {
      await updateCourse(course.id, { isActive: !isArchiving });
      // The dialog unmounts via `onDone`; the flight is done.
      onDone();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      setError(
        apiError
          ? apiErrorMessage(apiError)
          : getErrorMessage(err) || 'We could not update the course. Try again.'
      );
      // Retry is the re-clicked confirm (the button re-enables).
      setIsWorking(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isWorking) return; // frozen while the request is in flight
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
      {/* Backdrop: click closes without a request (frozen while working). */}
      <div
        className="absolute inset-0 bg-secondary-900/50"
        aria-hidden="true"
        onClick={isWorking ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-course-title"
        tabIndex={-1}
        className="card relative w-full max-w-md"
      >
        <h2 id="archive-course-title" className="text-lg font-semibold text-secondary-900">
          {isArchiving ? `Archive ${course.name}?` : `Restore ${course.name}?`}
        </h2>
        <p className="mt-2 text-sm text-secondary-600">
          {isArchiving
            ? 'This hides the course from your active list. Nothing is deleted — you can restore it at any time.'
            : 'This puts the course back in your active list. You can archive it again at any time.'}
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isWorking}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label={isArchiving ? `Archive ${course.name}` : `Restore ${course.name}`}
            isLoading={isWorking}
            onClick={() => void handleConfirm()}
          >
            {isArchiving ? 'Archive' : 'Restore'}
          </Button>
        </div>
      </div>
    </div>
  );
}
