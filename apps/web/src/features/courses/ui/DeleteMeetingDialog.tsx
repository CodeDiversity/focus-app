import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
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

/**
 * Delete-confirmation dialog for a recurring meeting (SP-112B, AC 3,
 * D112B-9) — the `DeleteSemesterDialog` pattern: names the meeting ("Delete
 * Mon 09:00–10:30?"), states the effect, and confirms the `DELETE
 * /courses/:id/meetings/:meetingId`.
 */
export function DeleteMeetingDialog({
  courseId,
  meeting,
  onDeleted,
  onCancel,
}: DeleteMeetingDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = formatMeetingLabel(meeting);

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

  return (
    <Dialog open onClose={onCancel} title={`Delete ${label}?`} busy={isDeleting}>
      <p className="text-sm text-text-muted">
        This removes the meeting from the course&apos;s weekly schedule.
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
          aria-label={`Delete ${label}`}
          isLoading={isDeleting}
          onClick={() => void handleConfirm()}
        >
          Delete
        </Button>
      </div>
    </Dialog>
  );
}
