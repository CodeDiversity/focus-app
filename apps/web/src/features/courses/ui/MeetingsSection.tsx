import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import type { ClassMeeting } from '@/shared/types/academic';
import { formatMeetingLabel } from './meetingLabel';
import { MeetingForm } from './MeetingForm';
import { DeleteMeetingDialog } from './DeleteMeetingDialog';

export interface MeetingsSectionProps {
  /** The course the meetings belong to (the nested routes' `:id`). */
  courseId: string;
  /**
   * The course's recurring meetings in the API order (`dayOfWeek` asc, then
   * `startTime` asc — from `getCourse`'s projection, D112B-13). Rendered
   * as-is — no client re-sort.
   */
  meetings: ClassMeeting[];
  /**
   * Called after a successful add/edit/delete (D112B-10): the page announces
   * through its live region and refetches the detail (the list re-derives
   * from the API response).
   */
  onMeetingChanged: (action: 'added' | 'updated' | 'deleted') => void;
}

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; meeting: ClassMeeting };

/**
 * The course's recurring weekly meetings (SP-112B, AC 3, AC-E02-04): the
 * "Mon 09:00–10:30" rows (D112B-7) with per-meeting Edit / Delete actions,
 * and the **Add meeting** button on the section header row.
 *
 * Add and edit both open the `MeetingForm` dialog (D112B-3); delete opens the
 * lightweight `DeleteMeetingDialog` confirmation (D112B-9).  On success the
 * dialog closes and the page is told to announce + refetch (D112B-10) — the
 * section itself holds no meeting state (the detail projection is the source
 * of truth).  Empty state: "No meetings yet" + an **Add your first meeting**
 * CTA (DoD 5).
 */
export function MeetingsSection({ courseId, meetings, onMeetingChanged }: MeetingsSectionProps) {
  const [formState, setFormState] = useState<FormState>({ mode: 'closed' });
  const [deletingMeeting, setDeletingMeeting] = useState<ClassMeeting | null>(null);

  const openCreate = () => {
    setFormState({ mode: 'create' });
  };

  const openEdit = (meeting: ClassMeeting) => {
    setFormState({ mode: 'edit', meeting });
  };

  const closeForm = () => {
    setFormState({ mode: 'closed' });
  };

  const handleFormSuccess = (action: 'created' | 'updated') => {
    closeForm();
    onMeetingChanged(action === 'created' ? 'added' : 'updated');
  };

  const handleDeleted = () => {
    setDeletingMeeting(null);
    onMeetingChanged('deleted');
  };

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">Meetings</h2>
        <Button size="sm" variant="primary" onClick={openCreate}>
          Add meeting
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-text">No meetings yet</p>
          <Button className="mt-4" onClick={openCreate}>
            Add your first meeting
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {meetings.map((meeting) => {
            const label = formatMeetingLabel(meeting);
            return (
              <li
                key={meeting.id}
                className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-text">{label}</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Edit ${label}`}
                    onClick={() => openEdit(meeting)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${label}`}
                    onClick={() => setDeletingMeeting(meeting)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formState.mode === 'create' && (
        <MeetingForm courseId={courseId} onSuccess={handleFormSuccess} onClose={closeForm} />
      )}
      {formState.mode === 'edit' && (
        <MeetingForm
          courseId={courseId}
          meeting={formState.meeting}
          onSuccess={handleFormSuccess}
          onClose={closeForm}
        />
      )}

      {deletingMeeting && (
        <DeleteMeetingDialog
          courseId={courseId}
          meeting={deletingMeeting}
          onDeleted={handleDeleted}
          onCancel={() => setDeletingMeeting(null)}
        />
      )}
    </section>
  );
}
