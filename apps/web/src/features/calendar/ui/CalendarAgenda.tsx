import { Sunrise } from 'lucide-react';
import { CalendarEventChip } from './CalendarEventChip';
import { dayHeaderLabel, freeLabel, isLabelledFree, minutesOf } from '../lib/gridModel';
import type { CalendarDay, CalendarEvent } from '@/entities/calendar/model/types';

export interface CalendarAgendaProps {
  /** EP15E: the payload's `days[]` — bounds and free time exist every day. */
  days: CalendarDay[];
  eventsByDay: Map<string, CalendarEvent[]>;
  today: string;
  onOpenEvent: (event: CalendarEvent) => void;
}

type Line =
  | { kind: 'event'; start: number; event: CalendarEvent }
  | { kind: 'free'; start: number; startTime: string; endTime: string };

/**
 * Narrow-screen agenda (SP-129A, EP15E): the week as a vertical, day-grouped
 * list — one thumb scrolls it, nothing pans sideways. EP15E lists **all
 * seven days** (the bounds and free time exist every day): header, a bounds
 * line "Day 08:00–23:00", then items and free lines interleaved in start
 * order (D-E4; free lines use the grid's 30-minute threshold, D-E7). Chips
 * render in the agenda layout — time above title (D129A-03) — and carry the
 * type label, so kind stays identifiable without colour.
 */
export function CalendarAgenda({ days, eventsByDay, today, onOpenEvent }: CalendarAgendaProps) {
  return (
    <div role="list" aria-label="Week agenda" className="w-full space-y-4">
      {days.map((day) => {
        const isToday = day.date === today;
        const headerId = `agenda-day-${day.date}`;
        const lines: Line[] = [
          ...(eventsByDay.get(day.date) ?? []).map<Line>((event) => ({
            kind: 'event',
            start: event.anchor === 'FLEX_DAY' ? -1 : minutesOf(event.startTime),
            event,
          })),
          ...day.free
            .filter((f) => isLabelledFree(minutesOf(f.startTime), minutesOf(f.endTime)))
            .map<Line>((f) => ({ kind: 'free', start: minutesOf(f.startTime), ...f })),
        ].sort((a, b) => a.start - b.start || (a.kind === 'event' ? -1 : 1));
        return (
          <div key={day.date} role="listitem" className="w-full min-w-0">
            <h3
              id={headerId}
              className={`mb-1 text-sm font-semibold ${isToday ? 'text-accent' : 'text-text'}`}
            >
              {dayHeaderLabel(day.date)}
              {isToday && <span className="sr-only"> (today)</span>}
            </h3>
            <p className="mb-2 flex items-center gap-1 text-xs text-text-muted">
              <Sunrise aria-hidden size={12} />
              Day {day.wakeTime}–{day.sleepTime}
            </p>
            <div role="group" aria-labelledby={headerId} className="w-full min-w-0 space-y-2">
              {lines.map((line) =>
                line.kind === 'event' ? (
                  <CalendarEventChip
                    key={line.event.id}
                    event={line.event}
                    onOpen={onOpenEvent}
                    layout="agenda"
                  />
                ) : (
                  <p
                    key={`free-${day.date}-${line.startTime}`}
                    className="rounded-md border-2 border-dotted border-border-strong px-2 py-1 text-caption text-text-muted"
                  >
                    {freeLabel(line.startTime, line.endTime)}
                  </p>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
