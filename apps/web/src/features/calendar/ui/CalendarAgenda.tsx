import { CalendarEventChip } from './CalendarEventChip';
import { dayHeader } from './WeekView';
import type { CalendarEvent } from '@/entities/calendar/model/types';

export interface CalendarAgendaProps {
  days: string[];
  eventsByDay: Map<string, CalendarEvent[]>;
  today: string;
  onOpenEvent: (event: CalendarEvent) => void;
}

/**
 * Narrow-screen agenda (SP-129A): the week as a vertical, day-grouped list —
 * one thumb scrolls it, nothing pans sideways. Reuses the week view's day
 * header (D129A-02) and the event chip (D129A-08); groups render only for
 * days that have events (AC 5). The chip carries the type label, completed
 * badge and accessible name, so type stays identifiable without color (AC 3),
 * and renders in the agenda layout — time above title (D129A-03, R129-001).
 */
export function CalendarAgenda({ days, eventsByDay, today, onOpenEvent }: CalendarAgendaProps) {
  const daysWithEvents = days.filter((day) => (eventsByDay.get(day) ?? []).length > 0);

  return (
    <div role="list" aria-label="Week agenda" className="w-full space-y-4">
      {daysWithEvents.map((day) => {
        const isToday = day === today;
        const headerId = `agenda-day-${day}`;
        return (
          <div key={day} role="listitem" className="w-full min-w-0">
            <h3
              id={headerId}
              className={`mb-2 text-sm font-semibold ${
                isToday ? 'text-primary-700' : 'text-secondary-700'
              }`}
            >
              {dayHeader(day)}
            </h3>
            <div role="group" aria-labelledby={headerId} className="w-full min-w-0 space-y-2">
              {(eventsByDay.get(day) ?? []).map((event) => (
                <CalendarEventChip
                  key={event.id}
                  event={event}
                  onOpen={onOpenEvent}
                  layout="agenda"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
