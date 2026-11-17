import {
  BookOpen,
  Brain,
  Briefcase,
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  GraduationCap,
  Repeat,
} from 'lucide-react';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { chipTier } from '../lib/gridModel';

export interface CalendarEventChipProps {
  event: CalendarEvent;
  onOpen: (event: CalendarEvent) => void;
  /**
   * `'agenda'` (SP-129A, D129A-03) puts the time on its own line above the
   * title; `'week'` (default) keeps the SP-127B layout; `'grid'` (EP15E) is
   * the positioned chip whose content follows the density tier of its
   * rendered height (D-E8).
   */
  layout?: 'week' | 'agenda' | 'grid';
  /** Rendered height of a grid chip, in px — selects the density tier (D-E8). */
  heightPx?: number;
}

interface TypeMeta {
  icon: typeof GraduationCap;
  label: string;
  /** The server's default title for the kind; a chip whose title equals it shows the kind once. */
  defaultTitle?: string;
}

export const TYPE_META: Record<CalendarEvent['type'], TypeMeta> = {
  CLASS: { icon: GraduationCap, label: 'Class' },
  ASSIGNMENT_DEADLINE: { icon: ClipboardList, label: 'Assignment' },
  EXAM_DEADLINE: { icon: FileText, label: 'Exam' },
  STUDY_SESSION: { icon: Brain, label: 'Study session' },
  // EP13D: a session the plan proposes (not time logged). Icon + text, so the
  // distinction is never colour-only.
  PLANNED_SESSION: { icon: CalendarClock, label: 'Planned' },
  // EP15E (D15-3): busy time the student put on the calendar, and time they
  // set aside to study. Icon + text, never colour alone.
  EVENT: { icon: Briefcase, label: 'Busy', defaultTitle: 'Busy' },
  STUDY_BLOCK: { icon: BookOpen, label: 'Study block', defaultTitle: 'Study' },
};

export function typeLabel(event: CalendarEvent): string {
  const base = TYPE_META[event.type].label;
  if (event.type === 'STUDY_SESSION' && event.focus) {
    return `${base} (focus)`;
  }
  return base;
}

/** EP13J (D-J6) carried over: a STUDY_BLOCK's non-default energy, as text. */
export function energyTagOf(event: CalendarEvent): string | null {
  if (event.type !== 'STUDY_BLOCK') return null;
  if (event.energy === 'HIGH') return 'High energy';
  if (event.energy === 'LOW') return 'Low energy';
  return null;
}

/** Time text: "Anytime" for a day-anchored planned session, else the clock (range in the grid). */
function timeTextOf(event: CalendarEvent, layout: 'week' | 'agenda' | 'grid'): string {
  if (event.anchor === 'FLEX_DAY') return 'Anytime';
  // EP15E (D-E10, user ruling 2026-11-17): the grid and the agenda show the
  // range, so a four-hour shift and a fifteen-minute errand never read alike.
  if (layout !== 'week' && event.endTime) return `${event.startTime}–${event.endTime}`;
  return event.startTime;
}

/**
 * One event chip (D127B-4): type icon + text label, title, time. The course
 * color is a 3px left border only (secondary cue). A completed deadline
 * shows an additional "Completed" text badge; a recurring block shows the
 * Repeat icon with sr-only "repeats weekly"; a study block's energy is a
 * text pill. The agenda layout (D129A-03) shows the time above the title;
 * the week layout keeps the title above the time; the grid layout (EP15E)
 * reads label · title · time and hides parts sr-only as it gets shorter.
 *
 * EP14D (D-D3, F-EP13M-05): the accessible name is the visible content in its
 * visible order — no `aria-label` — so WCAG 2.5.3 label-in-name holds by
 * construction; screen-reader-only ":" and "," give it the old punctuation.
 * In the grid the hidden parts are sr-only, so the name is identical in
 * every density tier (D-E8).
 */
export function CalendarEventChip({
  event,
  onOpen,
  layout = 'week',
  heightPx,
}: CalendarEventChipProps) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const label = typeLabel(event);
  const timeText = timeTextOf(event, layout);
  const energyTag = energyTagOf(event);
  const recurring = event.recurring === true;
  // "Busy, Busy" reads badly: when the title is the kind's default, show the kind once.
  const showTitle = meta.defaultTitle === undefined || event.title !== meta.defaultTitle;
  const busy = event.type === 'EVENT';

  // EP15E (D-E11, user ruling 2026-11-17): in the grid the energy pill is
  // visible only when the chip is tall enough for a fourth line (≥ 90 px);
  // below that it stays in the accessible name (sr-only) and in the dialog.
  const energyVisible = layout !== 'grid' || (heightPx ?? 60) >= 90;
  const markers = (
    <>
      {event.completed && (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success-strong">
          <Check aria-hidden size={10} />
          Completed
        </span>
      )}
      {energyTag && (
        <span
          data-testid="energy-tag"
          className={
            energyVisible
              ? 'inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-text'
              : 'sr-only'
          }
        >
          {energyTag}
        </span>
      )}
    </>
  );
  const repeatMarker = recurring ? (
    <span className="inline-flex shrink-0 items-center text-text-muted">
      <Repeat aria-hidden size={14} data-testid="repeat-marker" />
      <span className="sr-only">repeats weekly</span>
    </span>
  ) : null;

  if (layout === 'grid') {
    const tier = chipTier(heightPx ?? 60);
    const hideTime = tier !== 'full';
    const hideLabel = tier === 'mini';
    return (
      <button
        type="button"
        onClick={() => onOpen(event)}
        data-tier={tier}
        className={`group flex h-full w-full min-w-0 items-start gap-1.5 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm transition hover:border-accent hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 motion-reduce:transition-none ${
          busy ? 'border-border-strong bg-surface-muted' : 'border-border bg-surface'
        }`}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: event.courseColor ?? (busy ? undefined : 'transparent'),
        }}
      >
        <Icon aria-hidden size={14} className="mt-0.5 shrink-0 text-text-muted" />
        <span className="min-w-0 flex-1">
          <span
            className={`${hideLabel ? 'sr-only' : 'block truncate'} text-[10px] font-semibold uppercase tracking-wide text-text-muted`}
          >
            {label}
            <span className="sr-only">:</span>
          </span>
          {showTitle && (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-sm font-medium text-text">{event.title}</span>
              {repeatMarker}
              <span className="sr-only">,</span>
            </span>
          )}
          {!showTitle && repeatMarker}
          <span
            className={`${hideTime ? 'sr-only' : 'flex flex-wrap items-center gap-1'} text-xs text-text-muted`}
          >
            <span>{timeText}</span>
            {event.type === 'STUDY_BLOCK' && event.subtitle && (
              <span className="truncate">· {event.subtitle}</span>
            )}
            {markers}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className={`group flex w-full items-start gap-2 rounded-lg border p-2 text-left shadow-sm transition hover:border-accent hover:shadow focus:outline-none focus:ring-2 focus:ring-accent motion-reduce:transition-none max-sm:min-h-[44px] ${
        busy ? 'border-border-strong bg-surface-muted' : 'border-border bg-surface'
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: event.courseColor ?? 'transparent' }}
    >
      <Icon aria-hidden size={14} className="mt-0.5 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            {label}
            <span className="sr-only">:</span>
          </span>
          {markers}
        </div>
        {layout === 'agenda' ? (
          <>
            <p className="text-xs text-text-muted">
              {timeText}
              <span className="sr-only">,</span>
            </p>
            {showTitle && (
              <p className="flex items-center gap-1 text-sm font-medium text-text">
                <span className="truncate">{event.title}</span>
                {repeatMarker}
              </p>
            )}
            {!showTitle && repeatMarker}
          </>
        ) : (
          <>
            {showTitle && (
              <p className="flex items-center gap-1 text-sm font-medium text-text">
                <span className="truncate">{event.title}</span>
                {repeatMarker}
                <span className="sr-only">,</span>
              </p>
            )}
            {!showTitle && repeatMarker}
            <p className="text-xs text-text-muted">{timeText}</p>
          </>
        )}
      </div>
    </button>
  );
}
