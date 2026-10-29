import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarClock, Loader2, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  listAvailabilitySlots,
  type AvailabilitySlot,
} from '@/entities/availability/api/availabilityApi';
import { AvailabilitySlotList } from '@/features/availability/ui/AvailabilitySlotList';
import { AvailabilitySlotForm } from '@/features/availability/ui/AvailabilitySlotForm';
import { DeleteAvailabilitySlotDialog } from '@/features/availability/ui/DeleteAvailabilitySlotDialog';

/**
 * The page's change announcements (D128B-12): kind-specific on add, generic
 * on edit/delete; each one prefixes the refetched count line, like the
 * Assignments refetch prefix.
 */
function changeSentence(action: 'added' | 'updated' | 'deleted', slot: AvailabilitySlot): string {
  if (action === 'added')
    return slot.isAvailable ? 'Available window added.' : 'Blocked time added.';
  if (action === 'updated') return 'Time slot updated.';
  return 'Time slot deleted.';
}

function countLine(slots: AvailabilitySlot[]): string {
  return `Showing ${slots.length} time slot${slots.length === 1 ? '' : 's'}.`;
}

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; slot: AvailabilitySlot };

/**
 * The `/availability` settings page (SP-128B, D404-12): the student's
 * recurring weekly availability and blocked times in weekday-grouped cards,
 * with add/edit through the `AvailabilitySlotForm` dialog and delete through
 * the `DeleteAvailabilitySlotDialog` confirmation. Every change re-reads
 * `GET /availability-slots` and is announced through the always-present
 * `role="status"` region under the heading (D128B-12) — the page holds no
 * derived state beyond the last API response.
 */
export function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);

  const [formState, setFormState] = useState<FormState>({ mode: 'closed' });
  const [deletingSlot, setDeletingSlot] = useState<AvailabilitySlot | null>(null);

  const [statusMessage, setStatusMessage] = useState('');
  /** Only the newest list request may commit rows/loading/status. */
  const requestSeq = useRef(0);

  const runFetch = useCallback(async (initial: boolean, prefix?: string) => {
    const seq = ++requestSeq.current;
    const isCurrent = () => seq === requestSeq.current;
    if (initial) {
      setIsLoading(true);
      setInitialError(null);
    } else {
      setIsFetching(true);
    }
    try {
      const data = await listAvailabilitySlots();
      // A slower earlier request must not replace the newest result.
      if (!isCurrent()) return;
      setSlots(data);
      setStatusMessage(prefix ? `${prefix} ${countLine(data)}` : countLine(data));
    } catch (err) {
      if (!isCurrent()) return;
      if (initial) {
        setInitialError(getErrorMessage(err) || 'We could not load your availability. Try again.');
      } else {
        // A background refetch never clears the list; the count line stays
        // cleared (the change was already made) and the failure is an
        // actionable toast — the retry is the next action on the page.
        toast.error('We could not load your availability. Try again.');
      }
    }
    if (isCurrent()) {
      if (initial) {
        setIsLoading(false);
      } else {
        setIsFetching(false);
      }
    }
  }, []);

  /** Re-read the list after a successful change, prefixed by its sentence. */
  const refetchWithPrefix = useCallback(
    (prefix: string) => {
      // Clear before the request so a repeated sentence announces again.
      setStatusMessage('');
      void runFetch(false, prefix);
    },
    [runFetch]
  );

  useEffect(() => {
    void runFetch(true);
  }, [runFetch]);

  const handleChanged = (detail: {
    action: 'added' | 'updated' | 'deleted';
    slot: AvailabilitySlot;
  }) => {
    refetchWithPrefix(changeSentence(detail.action, detail.slot));
  };

  const handleFormClose = (options?: { requestRefetch?: boolean }) => {
    setFormState({ mode: 'closed' });
    if (options?.requestRefetch) {
      // The form's 404 path (D128B-8): re-read the truth, no action sentence.
      setStatusMessage('');
      void runFetch(false);
    }
  };

  const openCreate = () => setFormState({ mode: 'create' });
  const closeDelete = () => setDeletingSlot(null);

  const shell = (children: ReactNode) => (
    <section
      aria-labelledby="availability-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="availability-heading" className="text-3xl font-bold text-text">
            Availability
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            When you can study — and when you can&apos;t.
          </p>
        </div>
        <Button
          className="max-sm:min-h-[44px]"
          leftIcon={<Plus size={16} aria-hidden />}
          onClick={openCreate}
        >
          Add time slot
        </Button>
      </div>
      {children}
    </section>
  );

  if (isLoading) {
    return shell(
      <div className="card p-6 flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-accent" size={24} aria-hidden />
        <span className="ml-3 text-sm text-text-muted">Loading your availability…</span>
      </div>
    );
  }

  if (initialError) {
    return shell(
      <div role="alert" className="card border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger">{initialError}</p>
        <Button className="mt-4 max-sm:min-h-[44px]" onClick={() => void runFetch(true)}>
          Try again
        </Button>
      </div>
    );
  }

  const isEmpty = slots.length === 0;

  return shell(
    <>
      <div className="card p-4 sm:p-6">
        {/* Always-present, empty-at-rest live region (DoD 6, D128B-12) — it
            doubles as the count header and hosts the refetch spinner. */}
        <div
          role="status"
          className="mb-3 flex min-h-5 items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted"
        >
          {isFetching && <Loader2 className="animate-spin text-accent" size={16} aria-hidden />}
          {statusMessage}
        </div>

        {isEmpty ? (
          <div className="py-8 text-center">
            <CalendarClock size={40} aria-hidden className="mx-auto mb-3 text-text-muted" />
            <p className="text-sm text-text">No availability yet.</p>
            <p className="mt-1 text-sm text-text-muted">
              Add when you can study, and when you can&apos;t.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button className="max-sm:min-h-[44px]" onClick={openCreate}>
                Add your first time slot
              </Button>
              <Link to="/calendar">
                <Button variant="outline" className="max-sm:min-h-[44px]">
                  View your week
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <AvailabilitySlotList
            slots={slots}
            onEdit={(slot) => setFormState({ mode: 'edit', slot })}
            onDelete={(slot) => setDeletingSlot(slot)}
          />
        )}
      </div>

      {/* One dialog mount for the page (D128B-1): the form (create/edit) and
          the delete confirmation never stack — both close before the next
          opens, so focus management stays single-owner. */}
      {formState.mode === 'create' && (
        <AvailabilitySlotForm
          onSuccess={(action, slot) => {
            setFormState({ mode: 'closed' });
            handleChanged({ action: action === 'created' ? 'added' : 'updated', slot });
          }}
          onClose={handleFormClose}
        />
      )}
      {formState.mode === 'edit' && (
        <AvailabilitySlotForm
          slot={formState.slot}
          onSuccess={(action, slot) => {
            setFormState({ mode: 'closed' });
            handleChanged({ action: action === 'created' ? 'added' : 'updated', slot });
          }}
          onClose={handleFormClose}
        />
      )}

      {deletingSlot && (
        <DeleteAvailabilitySlotDialog
          slot={deletingSlot}
          onDeleted={() => {
            // Captured before unmount so the sentence reflects the row.
            const slot = deletingSlot;
            closeDelete();
            setStatusMessage('');
            void runFetch(false, changeSentence('deleted', slot));
          }}
          onCancel={closeDelete}
        />
      )}
    </>
  );
}
