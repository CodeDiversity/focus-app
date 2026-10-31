import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    onPendingChange?.(true);
    setError(null);
    try {
      await deleteSubtask(assignmentId, subtask.id);
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

  return (
    <Dialog open onClose={onCancel} title={`Delete ${subtask.title}?`} busy={isDeleting}>
      <p className="text-sm text-text-muted">This permanently deletes the subtask.</p>

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
          aria-label={`Delete ${subtask.title}`}
          isLoading={isDeleting}
          onClick={() => void handleConfirm()}
        >
          Delete
        </Button>
      </div>
    </Dialog>
  );
}
