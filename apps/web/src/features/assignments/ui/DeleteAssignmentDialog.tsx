import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { deleteAssignment } from '@/entities/assignment/api/assignmentApi';
import type { AssignmentInteractionItem } from '../model/types';

export interface DeleteAssignmentDialogProps {
  /** The assignment to delete (named in the title and aria-label). */
  assignment: AssignmentInteractionItem;
  /** Called after a successful delete (the section / page announces + refetches). */
  onDeleted: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

/**
 * Delete-confirmation dialog for an assignment (SP-114E, AC 6, D114E-3) —
 * matches the `DeleteMeetingDialog` and `DeleteSemesterDialog` precedent:
 * names the assignment ("Delete <title>?"), states the effect, and confirms
 * `DELETE /assignments/:id`.
 */
export function DeleteAssignmentDialog({
  assignment,
  onDeleted,
  onCancel,
}: DeleteAssignmentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isDeleting) return; // duplicate-submission prevention
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAssignment(assignment.id);
      onDeleted();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      // The uniform 404 copy matches the edit form (SP-124B AC 6): the record
      // is missing or belongs to another student, and the API never says which.
      setError(
        apiError?.statusCode === 404
          ? 'Resource not found — this course or assignment may no longer exist.'
          : apiError
            ? apiErrorMessage(apiError)
            : getErrorMessage(err) || 'We could not delete the assignment. Try again.'
      );
      // Retry is the re-clicked Delete (the button re-enables).
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open onClose={onCancel} title={`Delete ${assignment.title}?`} busy={isDeleting}>
      <p className="text-sm text-text-muted">
        This permanently deletes the assignment. Any subtasks will remain without an assignment.
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
          aria-label={`Delete ${assignment.title}`}
          isLoading={isDeleting}
          data-dialog-commit
          onClick={() => void handleConfirm()}
        >
          Delete
        </Button>
      </div>
    </Dialog>
  );
}
