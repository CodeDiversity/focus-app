import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { deleteSemester, type SemesterWithCount } from '@/entities/semester/api/semesterApi';

export interface DeleteSemesterDialogProps {
  semester: SemesterWithCount;
  /** Called after a successful delete (the page re-reads the list). */
  onDeleted: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

/**
 * Delete confirmation dialog (SP-110B, D110-2): names the semester and warns
 * that its courses are NOT destroyed — they remain, unaffiliated — before the
 * student confirms the `DELETE /semesters/:id`.
 */
export function DeleteSemesterDialog({ semester, onDeleted, onCancel }: DeleteSemesterDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Dialog open onClose={onCancel} title={`Delete ${semester.name}?`} busy={isDeleting}>
      <p className="text-sm text-text-muted">
        This permanently deletes the semester. Its courses will not be deleted — they will remain in
        your account, unaffiliated with any semester.
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
    </Dialog>
  );
}
