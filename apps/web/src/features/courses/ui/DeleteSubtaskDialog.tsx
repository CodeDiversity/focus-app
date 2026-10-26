import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { deleteSubtask } from '@/entities/assignment/api/assignmentApi';
import type { Subtask } from '@/shared/types/academic';

export interface DeleteSubtaskDialogProps {
  assignmentId: string;
  /** Named in the title and the confirm button's accessible name. */
  subtask: Subtask;
  /** Called after a successful delete (the checklist announces + the page refetches). */
  onDeleted: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
  /** True while the delete request is in flight (the checklist locks its controls). */
  onPendingChange?: (pending: boolean) => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Delete-confirmation dialog for a subtask (SP-120J). Copies the
 * `DeleteAssignmentDialog` trap, initial Cancel focus, Escape, and in-flight
 * lock. The effect sentence is subtask-specific — it must not mention
 * orphaned subtasks.
 */
export function DeleteSubtaskDialog({
  assignmentId,
  subtask,
  onDeleted,
  onCancel,
  onPendingChange,
}: DeleteSubtaskDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const skipRestoreRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? dialogRef.current)?.focus();
    return () => {
      const trigger = restoreFocusRef.current;
      if (!skipRestoreRef.current && trigger?.isConnected) trigger.focus();
    };
  }, []);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    onPendingChange?.(true);
    setError(null);
    dialogRef.current?.focus();
    try {
      await deleteSubtask(assignmentId, subtask.id);
      skipRestoreRef.current = true;
      onDeleted();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      setError(
        apiError
          ? apiErrorMessage(apiError)
          : getErrorMessage(err) || 'We could not delete the subtask. Try again.'
      );
      setIsDeleting(false);
      onPendingChange?.(false);
    }
  };

  useEffect(() => {
    if (isDeleting) dialogRef.current?.focus();
  }, [isDeleting]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
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
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isDeleting, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-secondary-900/50"
        aria-hidden="true"
        onClick={isDeleting ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-subtask-title"
        tabIndex={-1}
        className="card relative w-full max-w-md p-6"
      >
        <h2 id="delete-subtask-title" className="text-lg font-semibold text-secondary-900">
          Delete {subtask.title}?
        </h2>
        <p className="mt-2 text-sm text-secondary-600">This permanently deletes the subtask.</p>

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
            aria-label={`Delete ${subtask.title}`}
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
