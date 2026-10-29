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
 * is "{type label}: {title}, {time}".
 */
export function CalendarEventChip({ event, onOpen }: CalendarEventChipProps) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const label = typeLabel(event);

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={`${label}: ${event.title}, ${event.startTime}`}
      className="group flex w-full items-start gap-2 rounded-lg border border-secondary-200 bg-white p-2 text-left shadow-sm transition hover:border-primary-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-500 max-sm:min-h-[44px]"
      style={{ borderLeftWidth: 3, borderLeftColor: event.courseColor ?? 'transparent' }}
    >
      <Icon aria-hidden size={14} className="mt-0.5 shrink-0 text-secondary-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary-500">
            {label}
          </span>
          {event.completed && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              <Check aria-hidden size={10} />
              Completed
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-secondary-900">{event.title}</p>
        <p className="text-xs text-secondary-500">{event.startTime}</p>
      </div>
    </button>
  );
}
