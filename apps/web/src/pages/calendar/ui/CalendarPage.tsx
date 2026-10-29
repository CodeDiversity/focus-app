import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage as getErrMsg } from '@/shared/lib/errors';
import { formatDate as fmtDate } from '@/shared/lib/datetime';
import { listCalendarEvents } from '@/entities/calendar/api/calendarApi';
import type { CalendarEvent, CalendarEventsResult } from '@/entities/calendar/model/types';
import { WeekView } from '@/features/calendar/ui/WeekView';
import { CalendarAgenda } from '@/features/calendar/ui/CalendarAgenda';
import { CalendarEventDetails } from '@/features/calendar/ui/CalendarEventDetails';

const NARROW_QUERY = '(max-width: 639px)';

/** Below Tailwind's `sm` breakpoint (640px) the agenda replaces the week
 * grid (D129A-01, D129A-07 — same props shape as WeekView). */
function useNarrowViewport(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(NARROW_QUERY).matches
  );
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // Monday = 0 diff
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

export function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [data, setData] = useState<CalendarEventsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const isNarrow = useNarrowViewport();

  const requestSeq = useRef(0);
  const initialDoneRef = useRef(false);

  const weekStart = useMemo(() => mondayOf(selectedDate), [selectedDate]);
  const from = formatYMD(weekStart);
  const sunday = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);
  const to = formatYMD(sunday);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      out.push(formatYMD(d));
    }
    return out;
  }, [weekStart]);

  const fetchWeek = useCallback(async (f: string, t: string, initial: boolean) => {
    const seq = ++requestSeq.current;
    const isCurrent = () => seq === requestSeq.current;
    if (initial) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsFetching(true);
    }
    try {
      const result = await listCalendarEvents({ from: f, to: t });
      if (!isCurrent()) return;
      setData(result);
      const count = result.events.length;
      const weekLabel = `${fmtDate(new Date(`${result.from}T12:00:00Z`), result.timeZone)} – ${fmtDate(
        new Date(`${result.to}T12:00:00Z`),
        result.timeZone
      )}`;
      setStatusMessage(`Showing ${count} event${count === 1 ? '' : 's'} for ${weekLabel}.`);
    } catch (err) {
      if (!isCurrent()) return;
      const msg = getErrMsg(err) || 'We could not load your calendar. Try again.';
      if (initial) {
        setError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      if (isCurrent()) {
        if (initial) {
          setIsLoading(false);
          initialDoneRef.current = true;
        } else {
          setIsFetching(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    const initial = !initialDoneRef.current;
    void fetchWeek(from, to, initial);
  }, [from, to, fetchWeek]);

  const handlePrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };
  const handleNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };
  const handleToday = () => setSelectedDate(new Date());
  const handleRetry = () => {
    void fetchWeek(from, to, true);
  };

  const eventsByDay = useMemo(
    () => (data ? groupByDay(data.events) : new Map<string, CalendarEvent[]>()),
    [data]
  );

  const timeZone = data?.timeZone ?? 'UTC';
  const weekRangeLabel = data
    ? `${fmtDate(new Date(`${data.from}T12:00:00Z`), data.timeZone)} – ${fmtDate(
        new Date(`${data.to}T12:00:00Z`),
        data.timeZone
      )} · ${data.timeZone}`
    : `${from} – ${to}`;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">Calendar</h1>
        <p className="text-sm text-secondary-600 mb-6">Your week at a glance.</p>
        <div className="card p-4 sm:p-6">
          <div className="sr-only">Loading your calendar…</div>
          <div className="grid grid-cols-7 gap-2 overflow-x-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="min-w-[140px] space-y-2 rounded-lg border border-secondary-200 p-2"
              >
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="h-12 animate-pulse rounded-lg bg-secondary-100" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">Calendar</h1>
        <p className="text-sm text-secondary-600 mb-6">Your week at a glance.</p>
        <div role="alert" className="card border border-red-200 bg-red-50/60 p-6">
          <p className="text-sm text-red-600">{error}</p>
          <Button className="mt-4 max-sm:min-h-[44px]" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = (data?.events.length ?? 0) === 0;

  return (
    <section
      aria-labelledby="calendar-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="calendar-heading" className="text-3xl font-bold text-secondary-900">
            Calendar
          </h1>
          <p className="text-sm text-secondary-600">Your week at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" className="max-sm:min-h-[44px]" onClick={handleToday}>
            Today
          </Button>
          <button
            type="button"
            aria-label="Previous week"
            onClick={handlePrev}
            className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={handleNext}
            className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
          <Link to="/availability">
            <Button variant="outline" className="max-sm:min-h-[44px]">
              Manage availability
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-secondary-700">{weekRangeLabel}</p>
        {isFetching && <Loader2 className="animate-spin text-primary-600" size={16} aria-hidden />}
      </div>

      <div className="card p-4 sm:p-6">
        <div
          role="status"
          className="mb-3 flex min-h-5 items-center gap-2 text-xs font-medium uppercase tracking-wider text-secondary-500"
        >
          {isFetching && (
            <Loader2 className="animate-spin text-primary-600" size={14} aria-hidden />
          )}
          {statusMessage}
        </div>

        {isEmpty ? (
          <div className="grid grid-cols-7 gap-2 overflow-x-auto">
            <div className="col-span-7 py-8 text-center">
              <p className="text-sm text-secondary-700">No events this week</p>
              <p className="mt-1 text-sm text-secondary-500">
                Try another week, or add a course meeting or assignment.
              </p>
              <Link
                to="/availability"
                className="mt-3 inline-block text-sm text-primary-600 underline"
              >
                Manage availability
              </Link>
            </div>
          </div>
        ) : isNarrow ? (
          <CalendarAgenda
            days={days}
            eventsByDay={eventsByDay}
            today={data?.today ?? ''}
            onOpenEvent={setSelectedEvent}
          />
        ) : (
          <WeekView
            days={days}
            eventsByDay={eventsByDay}
            today={data?.today ?? ''}
            onOpenEvent={setSelectedEvent}
          />
        )}
      </div>

      {selectedEvent && (
        <CalendarEventDetails
          event={selectedEvent}
          timeZone={timeZone}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </section>
  );
}
