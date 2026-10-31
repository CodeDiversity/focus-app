import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { updateCourse, type CourseWithSemester } from '@/entities/course/api/courseApi';

export interface ArchiveCourseDialogProps {
  course: CourseWithSemester;
  /** Called after a successful archive/restore (the page re-reads the list). */
  onDone: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

/**
 * Archive/restore confirmation dialog (SP-111B, AC 5, D111-2): names the
 * course and states that the operation is **reversible** — archiving hides
 * the course from the active list, restoring puts it back; nothing is ever
 * deleted (no hard delete in the MVP, D111-2).  The action is the same
 * `PATCH /courses/:id` partial merge with `{ isActive }` — the dialog
 * derives archive vs restore from the row's current `isActive`.
 */
export function ArchiveCourseDialog({ course, onDone, onCancel }: ArchiveCourseDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active row → archive (isActive: false); archived row → restore (true).
  const isArchiving = course.isActive;

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

  return (
    <Dialog
      open
      onClose={onCancel}
      title={isArchiving ? `Archive ${course.name}?` : `Restore ${course.name}?`}
      busy={isWorking}
    >
      <p className="text-sm text-text-muted">
        {isArchiving
          ? 'This hides the course from your active list. Nothing is deleted — you can restore it at any time.'
          : 'This puts the course back in your active list. You can archive it again at any time.'}
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isWorking}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={isArchiving ? `Archive ${course.name}` : `Restore ${course.name}`}
          isLoading={isWorking}
          data-dialog-commit
          onClick={() => void handleConfirm()}
        >
          {isArchiving ? 'Archive' : 'Restore'}
        </Button>
      </div>
    </Dialog>
  );
}
