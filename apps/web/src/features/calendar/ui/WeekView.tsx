import { CalendarEventChip } from './CalendarEventChip';
import type { CalendarEvent } from '@/entities/calendar/model/types';

export interface WeekViewProps {
  days: string[];
  eventsByDay: Map<string, CalendarEvent[]>;
  today: string;
  onOpenEvent: (event: CalendarEvent) => void;
}

/** "Mon 26" style header (D127B-3, shared with CalendarAgenda per D129A-02).
 * Parse as civil noon to avoid TZ drift. */
export function dayHeader(day: string): string {
  // "Mon 26" style (D127B-3). Parse as civil noon to avoid TZ drift.
  const d = new Date(`${day}T12:00:00`);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const num = d.getDate();
  return `${weekday} ${num}`;
}

/**
 * Seven day columns, each a vertical stack of event chips sorted by startTime
 * (the server already sorts; we group by date). No hour grid (D127B-1).
 */
export function WeekView({ days, eventsByDay, today, onOpenEvent }: WeekViewProps) {
  return (
    <div
      className="grid grid-cols-7 gap-2 overflow-x-auto snap-x"
      role="list"
      aria-label="Week view"
    >
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        const isToday = day === today;
        return (
          <div
            key={day}
            role="listitem"
            className={`min-w-[140px] snap-start rounded-lg border border-secondary-200 bg-white ${
              isToday ? 'bg-primary-50' : ''
            }`}
          >
            <div
              className={`border-b border-secondary-200 px-2 py-1 text-sm ${
                isToday ? 'font-bold text-primary-700' : 'font-medium text-secondary-700'
              }`}
            >
              {dayHeader(day)}
            </div>
            <div className="space-y-2 p-2">
              {events.map((event) => (
                <CalendarEventChip key={event.id} event={event} onOpen={onOpenEvent} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
