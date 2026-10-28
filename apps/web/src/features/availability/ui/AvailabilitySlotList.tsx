import { Ban, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import type { AvailabilitySlot } from '@/entities/availability/model/types';
import { formatSlotLabel, formatSlotName, slotKindLabel, WEEKDAY_FULL } from './slotLabel';

export interface AvailabilitySlotListProps {
  /**
   * The student's slots in the API order (`dayOfWeek` asc, then `startTime`
   * asc). Rendered order-preserving within the presentation groups — no
   * client re-sort inside a group (D128B-3).
   */
  slots: AvailabilitySlot[];
  /**
   * Presentational callbacks that open the page-owned dialogs (the
   * `AssignmentsPage` model, D128B-2): each row's Edit and Delete (the
   * page header's "Add time slot" and the empty-state CTA live on the page).
   */
  onEdit: (slot: AvailabilitySlot) => void;
  onDelete: (slot: AvailabilitySlot) => void;
}

/**
 * The presentation ordering of the weekday groups (D128B-3): Monday →
 * Sunday, to match the calendar's week start (D127B-2). The API's
 * `dayOfWeek 0` (Sunday) is placed last; a weekday with no slots renders no
 * group, and rows keep their API order inside each group.
 */
const GROUP_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * The weekday-grouped slot list (SP-128B, AC 1, D128B-3/D128B-4): one card
 * per weekday that has slots, each row the "Mon 09:00–10:30" time label with
 * its kind badge (`CheckCircle2` + "Available" / `Ban` + "Blocked" — the
 * `CalendarEventChip` vocabulary verbatim, D127B-5; the distinction is
 * textual with a matching icon, never color-only), and per-row Edit (outline)
 * / Delete (ghost) actions whose accessible names name the row's full kind +
 * label ("Edit Available Mon 09:00–10:30"), so identical times of different
 * kinds never collide in the a11y tree (D128B-4).
 *
 * The dialogs it opens belong to the page (the single dialog mount, one
 * owner like `AssignmentDialogs`): this component renders no dialog state.
 */
export function AvailabilitySlotList({ slots, onEdit, onDelete }: AvailabilitySlotListProps) {
  return (
    <div className="space-y-4">
      {GROUP_ORDER.map((day) => {
        const group = slots.filter((slot) => slot.dayOfWeek === day);
        // A weekday with no slots renders no group (D128B-3).
        if (group.length === 0) return null;
        return (
          <section key={day} className="card p-4 sm:p-6" aria-label={WEEKDAY_FULL[day]}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-secondary-900">{WEEKDAY_FULL[day]}</h3>
              <span className="text-xs font-medium uppercase tracking-wider text-secondary-500">
                {group.length === 1 ? '1 slot' : `${group.length} slots`}
              </span>
            </div>
            <ul className="divide-y divide-secondary-100">
              {group.map((slot) => {
                const name = formatSlotName(slot);
                const isAvailable = slot.isAvailable;
                const BadgeIcon = isAvailable ? CheckCircle2 : Ban;
                return (
                  <li
                    key={slot.id}
                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-medium text-secondary-900">
                        {formatSlotLabel(slot)}
                      </span>
                      <span
                        className={
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' +
                          (isAvailable
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700')
                        }
                      >
                        <BadgeIcon aria-hidden size={12} className="shrink-0" />
                        {slotKindLabel(isAvailable)}
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="max-sm:min-h-[44px]"
                        aria-label={`Edit ${name}`}
                        onClick={() => onEdit(slot)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="max-sm:min-h-[44px]"
                        aria-label={`Delete ${name}`}
                        onClick={() => onDelete(slot)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
