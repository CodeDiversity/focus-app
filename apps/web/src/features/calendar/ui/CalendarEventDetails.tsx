import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Ban, CheckCircle2, ClipboardList, FileText, GraduationCap, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
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
  AVAILABILITY: { icon: CheckCircle2, label: 'Available' },
  BLOCKED_TIME: { icon: Ban, label: 'Blocked' },
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? dialogRef.current)?.focus();
    return () => {
      restoreFocusRef.current?.focus();
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled')
    );
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  });

  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const label = typeLabel(event);
  const dateLabel = formatDate(new Date(`${event.date}T12:00:00Z`), timeZone);
  const timeLabel = event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime;
  const isDeadline = event.type === 'ASSIGNMENT_DEADLINE' || event.type === 'EXAM_DEADLINE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-text/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-title"
        tabIndex={-1}
        className="card relative w-full max-w-md"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="calendar-event-title" className="text-lg font-semibold text-text">
            {event.title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X aria-hidden size={16} />
          </button>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
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
      </div>
    </div>
  );
}
