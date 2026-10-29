import {
  Brain,
  Ban,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react';
import type { CalendarEvent } from '@/entities/calendar/model/types';

export interface CalendarEventChipProps {
  event: CalendarEvent;
  onOpen: (event: CalendarEvent) => void;
  /** `'agenda'` (SP-129A, D129A-03) puts the time on its own line above the
   * title; `'week'` (default) keeps the SP-127B layout. */
  layout?: 'week' | 'agenda';
}

interface TypeMeta {
  icon: typeof GraduationCap;
  label: string;
}

const TYPE_META: Record<CalendarEvent['type'], TypeMeta> = {
  CLASS: { icon: GraduationCap, label: 'Class' },
  ASSIGNMENT_DEADLINE: { icon: ClipboardList, label: 'Assignment' },
  EXAM_DEADLINE: { icon: FileText, label: 'Exam' },
  STUDY_SESSION: { icon: Brain, label: 'Study session' },
  AVAILABILITY: { icon: CheckCircle2, label: 'Available' },
  BLOCKED_TIME: { icon: Ban, label: 'Blocked' },
};

function typeLabel(event: CalendarEvent): string {
  const base = TYPE_META[event.type].label;
  if (event.type === 'STUDY_SESSION' && event.focus) {
    return `${base} (focus)`;
  }
  return base;
}

/**
 * One event chip (D127B-4): start time, title, type icon + text label. The
 * course color is a 3px left border only (secondary cue). A completed
 * deadline shows an additional "Completed" text badge. The accessible name
 * is "{type label}: {title}, {time}". The agenda layout (D129A-03) shows the
 * time above the title; the week layout keeps the title above the time.
 */
export function CalendarEventChip({ event, onOpen, layout = 'week' }: CalendarEventChipProps) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const label = typeLabel(event);

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={`${label}: ${event.title}, ${event.startTime}`}
      className="group flex w-full items-start gap-2 rounded-lg border border-border bg-surface p-2 text-left shadow-sm transition hover:border-accent hover:shadow focus:outline-none focus:ring-2 focus:ring-accent max-sm:min-h-[44px]"
      style={{ borderLeftWidth: 3, borderLeftColor: event.courseColor ?? 'transparent' }}
    >
      <Icon aria-hidden size={14} className="mt-0.5 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </span>
          {event.completed && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
              <Check aria-hidden size={10} />
              Completed
            </span>
          )}
        </div>
        {layout === 'agenda' ? (
          <>
            <p className="text-xs text-text-muted">{event.startTime}</p>
            <p className="truncate text-sm font-medium text-text">{event.title}</p>
          </>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-text">{event.title}</p>
            <p className="text-xs text-text-muted">{event.startTime}</p>
          </>
        )}
      </div>
    </button>
  );
}
