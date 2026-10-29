import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { deleteSemester, type SemesterWithCount } from '@/entities/semester/api/semesterApi';

export interface DeleteSemesterDialogProps {
  semester: SemesterWithCount;
  /** Called after a successful delete (the page re-reads the list). */
  onDeleted: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Delete confirmation dialog (SP-110B, D110-2): names the semester and warns
 * that its courses are NOT destroyed — they remain, unaffiliated — before the
 * student confirms the `DELETE /semesters/:id`.
 *
 * Accessibility: `role="dialog"` + `aria-modal`; on open the safe action
 * (Cancel) receives focus and focus is trapped to the dialog (Tab/Shift+Tab
 * cycle within; Escape cancels); on close focus returns to the trigger that
 * opened the dialog.
 */
export function DeleteSemesterDialog({ semester, onDeleted, onCancel }: DeleteSemesterDialogProps) {
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
    try {
      await deleteSemester(semester.id);
      // The dialog unmounts via `onDeleted`; the flight is done.
      onDeleted();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      setError(
        apiError
          ? apiErrorMessage(apiError)
          : getErrorMessage(err) || 'We could not delete the semester. Try again.'
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
  // the dialog is a non-interactive container, and focus is trapped inside it,
  // so a keydown listener on the dialog element sees every key press.
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
        className="absolute inset-0 bg-text/50"
        aria-hidden="true"
        onClick={isDeleting ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-semester-title"
        tabIndex={-1}
        className="card relative w-full max-w-md p-6"
      >
        <h2 id="delete-semester-title" className="text-lg font-semibold text-text">
          Delete {semester.name}?
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          This permanently deletes the semester. Its courses will not be deleted — they will remain
          in your account, unaffiliated with any semester.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
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
            aria-label={`Delete ${semester.name}`}
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
