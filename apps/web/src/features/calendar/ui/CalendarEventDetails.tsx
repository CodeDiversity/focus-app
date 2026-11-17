import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { formatDate } from '@/shared/lib/datetime';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { TYPE_META, typeLabel } from './CalendarEventChip';

export interface CalendarEventDetailsProps {
  event: CalendarEvent;
  timeZone: string;
  onClose: () => void;
  /** EP15E (D-E3): footer actions EP15G fills (edit / delete); rendered left of Close. */
  actions?: ReactNode;
}

const ENERGY_TEXT = { HIGH: 'High energy', NORMAL: 'Normal', LOW: 'Low energy' } as const;

/**
 * Details dialog (D127B-6): modal dialog copying the ArchiveCourseDialog pattern
 * (role="dialog", aria-modal, Escape closes, focus trap, focus returns to the
 * trigger). Fields: type, title, date, time, repeats (weekly blocks), course
 * (link), energy (study blocks), completed state, focus flag. EP15E keeps it
 * on the shared Dialog (D-E3) and adds the `actions` slot; the Close button
 * stays last in DOM order.
 */
export function CalendarEventDetails({
  event,
  timeZone,
  onClose,
  actions,
}: CalendarEventDetailsProps) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const label = typeLabel(event);
  const dateLabel = formatDate(new Date(`${event.date}T12:00:00Z`), timeZone);
  // EP13H2 (F-EP13H-03): a day-anchored session's stored times are the
  // engine's *suggestion* — the dialog must not re-promise the clock slot the
  // chip deliberately hides. Time reads "Anytime"; the suggestion gets its
  // own honestly-labelled row below.
  const flex = event.anchor === 'FLEX_DAY';
  const clockLabel = event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime;
  const timeLabel = flex ? 'Anytime' : clockLabel;
  const isDeadline = event.type === 'ASSIGNMENT_DEADLINE' || event.type === 'EXAM_DEADLINE';
  const isBlock = event.type === 'EVENT' || event.type === 'STUDY_BLOCK';

  return (
    <Dialog open onClose={onClose} title={event.title} size="md">
      <dl className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <dt className="font-medium text-text-muted">Type</dt>
          <dd className="flex items-center gap-1 text-text">
            <Icon aria-hidden size={14} />
            {label}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Date</dt>
          <dd className="text-text">{dateLabel}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Time</dt>
          <dd className="text-text">{timeLabel}</dd>
        </div>
        {flex && (
          <div>
            <dt className="font-medium text-text-muted">Suggested</dt>
            <dd className="text-text">{clockLabel}</dd>
          </div>
        )}
        {isBlock && event.recurring && (
          <div>
            <dt className="font-medium text-text-muted">Repeats</dt>
            <dd className="text-text">Weekly</dd>
          </div>
        )}
        {event.courseName && (
          <div>
            <dt className="font-medium text-text-muted">Course</dt>
            <dd className="flex items-center gap-2 text-text">
              {event.courseColor && (
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: event.courseColor }}
                />
              )}
              {event.courseId ? (
                <Link
                  to={event.link ?? `/courses/${event.courseId}`}
                  className="text-accent underline focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {event.courseName}
                </Link>
              ) : (
                event.courseName
              )}
            </dd>
          </div>
        )}
        {event.type === 'STUDY_BLOCK' && (
          <div>
            <dt className="font-medium text-text-muted">Energy</dt>
            <dd className="text-text">{ENERGY_TEXT[event.energy ?? 'NORMAL']}</dd>
          </div>
        )}
        {isDeadline && (
          <div>
            <dt className="font-medium text-text-muted">Status</dt>
            <dd className="text-text">{event.completed ? 'Completed' : 'Not completed'}</dd>
          </div>
        )}
        {event.type === 'STUDY_SESSION' && (
          <div>
            <dt className="font-medium text-text-muted">Focus</dt>
            <dd className="text-text">{event.focus ? 'Focus session' : 'Study session'}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        {actions && (
          <div data-testid="details-actions" className="flex items-center gap-2">
            {actions}
          </div>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
