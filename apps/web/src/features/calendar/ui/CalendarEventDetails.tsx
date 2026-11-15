import { Link } from 'react-router-dom';
import {
  Brain,
  Ban,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { formatDate } from '@/shared/lib/datetime';
import type { CalendarEvent } from '@/entities/calendar/model/types';

export interface CalendarEventDetailsProps {
  event: CalendarEvent;
  timeZone: string;
  onClose: () => void;
}

const TYPE_META: Record<CalendarEvent['type'], { icon: typeof GraduationCap; label: string }> = {
  CLASS: { icon: GraduationCap, label: 'Class' },
  ASSIGNMENT_DEADLINE: { icon: ClipboardList, label: 'Assignment' },
  EXAM_DEADLINE: { icon: FileText, label: 'Exam' },
  STUDY_SESSION: { icon: Brain, label: 'Study session' },
  // EP13D: a session the plan proposes (not time logged).
  PLANNED_SESSION: { icon: CalendarClock, label: 'Planned' },
  AVAILABILITY: { icon: CheckCircle2, label: 'Available' },
  BLOCKED_TIME: { icon: Ban, label: 'Blocked' },
};

function typeLabel(event: CalendarEvent): string {
  const base = TYPE_META[event.type].label;
  if (event.type === 'STUDY_SESSION' && event.focus) return `${base} (focus)`;
  return base;
}

/**
 * Details dialog (D127B-6): modal dialog copying the ArchiveCourseDialog pattern
 * (role="dialog", aria-modal, Escape closes, focus trap, focus returns to the
 * trigger). Fields: type, title, date, time, course (link), completed state,
 * focus flag.
 */
export function CalendarEventDetails({ event, timeZone, onClose }: CalendarEventDetailsProps) {
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

  return (
    <Dialog open onClose={onClose} title={event.title}>
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

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
