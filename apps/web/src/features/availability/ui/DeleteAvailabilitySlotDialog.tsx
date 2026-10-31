import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { deleteAvailabilitySlot } from '@/entities/availability/api/availabilityApi';
import type { AvailabilitySlot } from '@/entities/availability/model/types';
import { formatSlotLabel, formatSlotName } from './slotLabel';

export interface DeleteAvailabilitySlotDialogProps {
  slot: AvailabilitySlot;
  /** Called after a successful delete (the page re-reads the list). */
  onDeleted: () => void;
  /** Close the dialog without a request. */
  onCancel: () => void;
}

/**
 * Delete confirmation dialog (SP-128B, AC 4; the `DeleteSemesterDialog`
 * pattern, D128B-9): names the time range and states the effect on both
 * surfaces (the availability list **and** the calendar) before the student
 * confirms the `DELETE /availability-slots/:id`.
 */
export function DeleteAvailabilitySlotDialog({
  slot,
  onDeleted,
  onCancel,
}: DeleteAvailabilitySlotDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isDeleting) return; // duplicate-submission prevention
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAvailabilitySlot(slot.id);
      // The dialog unmounts via `onDeleted`; the flight is done.
      onDeleted();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      setError(
        apiError
          ? apiErrorMessage(apiError)
          : getErrorMessage(err) || 'We could not delete the time slot. Try again.'
      );
      // Retry is the re-clicked Delete (the button re-enables).
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open onClose={onCancel} title={`Delete ${formatSlotLabel(slot)}?`} busy={isDeleting}>
      <p className="text-sm text-text-muted">
        This permanently deletes that recurring time. It will stop appearing on your availability
        list and your calendar.
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
          aria-label={`Delete ${formatSlotName(slot)}`}
          isLoading={isDeleting}
          onClick={() => void handleConfirm()}
        >
          Delete
        </Button>
      </div>
    </Dialog>
  );
}
