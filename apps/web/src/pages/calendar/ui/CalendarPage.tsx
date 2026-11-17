import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage as getErrMsg } from '@/shared/lib/errors';
import { formatDate as fmtDate } from '@/shared/lib/datetime';
import { listCalendarEvents } from '@/entities/calendar/api/calendarApi';
import type { CalendarEvent, CalendarEventsResult } from '@/entities/calendar/model/types';
import { WeekGrid } from '@/features/calendar/ui/WeekGrid';
import { CalendarAgenda } from '@/features/calendar/ui/CalendarAgenda';
import { CalendarEventDetails } from '@/features/calendar/ui/CalendarEventDetails';
import { boundsSummary } from '@/features/calendar/lib/gridModel';
import { nowMinutesIn } from '@/features/calendar/lib/now';
import { getDayBounds } from '@/entities/day-bounds/api/dayBoundsApi';
import type { DayBoundsResult } from '@/entities/day-bounds/model/types';
import { DayBoundsBanner } from '@/features/day-bounds/ui/DayBoundsBanner';
import { DayBoundsSheet } from '@/features/day-bounds/ui/DayBoundsSheet';
import { addDays, mondayOf, utcTodayGuess } from '../lib/week';

const NARROW_QUERY = '(max-width: 639px)';

/** EP15E (AC4) — the empty-week copy, verbatim. */
export const EMPTY_WEEK_COPY = 'Nothing on your calendar yet — it’s all free time';

/** Below Tailwind's `sm` breakpoint (640px) the agenda replaces the week
 * grid (D129A-01, D129A-07 — same props shape as WeekGrid). */
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

function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

/** Civil-noon instant for the week label only (no local getters; the zone is the profile's). */
const noonOf = (civil: string) => new Date(`${civil}T12:00:00Z`);

/**
 * The calendar page (SP-127B, EP15E). The visible week is anchored on a
 * Monday civil date that comes from the **server** (AC-E15-09, FU-EP04-01):
 * the first request guesses the UTC civil date's week (D-E5); if the
 * response's `today` lies outside that range the page re-requests the week
 * of `today` once before rendering; every later range derives from server
 * strings by civil-date arithmetic. No browser-local Date getter is used.
 */
export function CalendarPage() {
  const [anchorFrom, setAnchorFrom] = useState<string>(() => mondayOf(utcTodayGuess()));
  const [data, setData] = useState<CalendarEventsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const isNarrow = useNarrowViewport();

  // EP15F: the day-bounds read drives the first-run banner; the sheet edits
  // them where they are seen (D15-14 rule 7). A failed read just means no
  // banner — the calendar itself never depends on it.
  const [bounds, setBounds] = useState<DayBoundsResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  /** The element that opened the sheet; a successful save returns focus to it (EP15F-AC3). */
  const sheetTriggerRef = useRef<HTMLElement | null>(null);
  const openSheet = () => {
    sheetTriggerRef.current = document.activeElement as HTMLElement | null;
    setSheetOpen(true);
  };
  useEffect(() => {
    let cancelled = false;
    getDayBounds()
      .then((result) => {
        if (!cancelled) setBounds(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const requestSeq = useRef(0);
  const bootstrappedRef = useRef(false);

  // EP15E (D-E9): the "now" marker's minute in the profile zone, refreshed
  // every minute. Read through Intl — no browser-local getters.
  const timeZoneForNow = data?.timeZone ?? null;
  const [nowMinute, setNowMinute] = useState<number | null>(null);
  useEffect(() => {
    if (!timeZoneForNow) return;
    const tick = () => setNowMinute(nowMinutesIn(timeZoneForNow, new Date()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [timeZoneForNow]);

  const from = anchorFrom;
  const to = addDays(anchorFrom, 6);

  const fetchWeek = useCallback(async (f: string, t: string, initial: boolean) => {
    const seq = ++requestSeq.current;
    const isCurrent = () => seq === requestSeq.current;
    let redirected = false;
    if (initial) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsFetching(true);
    }
    try {
      const result = await listCalendarEvents({ from: f, to: t });
      if (!isCurrent()) return;
      // D-E5: the bootstrap guess may straddle a zone boundary — follow the
      // server's today once, before anything renders.
      if (!bootstrappedRef.current) {
        bootstrappedRef.current = true;
        if (result.today < result.from || result.today > result.to) {
          redirected = true;
          setAnchorFrom(mondayOf(result.today));
          return; // the effect refetches with the corrected range; stay loading
        }
      }
      setData(result);
      const count = result.events.length;
      const weekLabel = `${fmtDate(noonOf(result.from), result.timeZone)} – ${fmtDate(
        noonOf(result.to),
        result.timeZone
      )}`;
      const bounds = boundsSummary(result.days ?? []);
      setStatusMessage(
        `Showing ${count} item${count === 1 ? '' : 's'} for ${weekLabel}${bounds ? ` · ${bounds}` : ''}.`
      );
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
          // Stay in the loading state while a bootstrap correction is in flight.
          if (!redirected) setIsLoading(false);
        } else {
          setIsFetching(false);
        }
      }
    }
  }, []);

  const hasData = data !== null;
  useEffect(() => {
    void fetchWeek(from, to, !hasData);
    // `hasData` is intentionally not a dependency: a range change decides
    // initial-vs-refetch from the data present at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, fetchWeek]);

  const handlePrev = () => {
    setAnnouncement('');
    setAnchorFrom(addDays(anchorFrom, -7));
  };
  const handleNext = () => {
    setAnnouncement('');
    setAnchorFrom(addDays(anchorFrom, 7));
  };
  const handleBoundsSaved = (saved: DayBoundsResult) => {
    setBounds(saved);
    setSheetOpen(false);
    setAnnouncement('Day start and end saved.');
    // The dialog restores focus only on cancel paths; a save is a commit, so
    // the page returns focus to the trigger itself once the dialog is gone.
    window.setTimeout(() => sheetTriggerRef.current?.focus(), 0);
    void fetchWeek(from, to, false); // shading and free time re-read (EP15F-AC3)
  };
  const handleToday = () => {
    if (!data) return;
    const monday = mondayOf(data.today);
    if (monday === anchorFrom) void fetchWeek(from, to, false);
    else setAnchorFrom(monday);
  };
  const handleRetry = () => {
    void fetchWeek(from, to, true);
  };

  const eventsByDay = useMemo(
    () => (data ? groupByDay(data.events) : new Map<string, CalendarEvent[]>()),
    [data]
  );

  const timeZone = data?.timeZone ?? 'UTC';
  const weekRangeLabel = data
    ? `${fmtDate(noonOf(data.from), data.timeZone)} – ${fmtDate(noonOf(data.to), data.timeZone)} · ${
        data.timeZone
      }`
    : `${from} – ${to}`;

  if (isLoading && !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-text mb-2">Calendar</h1>
        <p className="text-sm text-text-muted mb-6">Your week at a glance.</p>
        <div className="card p-4 sm:p-6">
          <div className="sr-only">Loading your calendar…</div>
          <div
            className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-2 overflow-x-auto"
            aria-hidden
          >
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
                />
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                data-testid="skeleton-column"
                className="space-y-2 rounded-lg border border-border p-2"
              >
                {Array.from({ length: 3 }).map((__, j) => (
                  <div
                    key={j}
                    className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-text mb-2">Calendar</h1>
        <p className="text-sm text-text-muted mb-6">Your week at a glance.</p>
        <div role="alert" className="card border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">{error}</p>
          <Button className="mt-4 max-sm:min-h-[44px]" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const days = data?.days ?? [];
  const isEmpty = (data?.events.length ?? 0) === 0;

  return (
    <section
      aria-labelledby="calendar-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="calendar-heading" className="text-3xl font-bold text-text">
            Calendar
          </h1>
          <p className="text-sm text-text-muted">Your week at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" className="max-sm:min-h-[44px]" onClick={handleToday}>
            Today
          </Button>
          <button
            type="button"
            aria-label="Previous week"
            onClick={handlePrev}
            className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-lg border border-border bg-surface text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={handleNext}
            className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-lg border border-border bg-surface text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
          {/* Interim link until EP15I retires the availability page (D15-15). */}
          <Link to="/availability">
            <Button variant="outline" className="max-sm:min-h-[44px]">
              Manage availability
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-text">{weekRangeLabel}</p>
        {isFetching && (
          <Loader2
            className="animate-spin text-accent motion-reduce:animate-none"
            size={16}
            aria-hidden
          />
        )}
      </div>

      <div className="card p-4 sm:p-6">
        <div
          role="status"
          className="mb-3 flex min-h-5 items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted"
        >
          {isFetching && (
            <Loader2
              className="animate-spin text-accent motion-reduce:animate-none"
              size={14}
              aria-hidden
            />
          )}
          {announcement ? `${announcement} ${statusMessage}` : statusMessage}
        </div>

        <DayBoundsBanner bounds={bounds} onOpen={openSheet} />

        {/* EP15E (D-E12, user ruling 2026-11-17): the empty-week copy is one
            full-width line above the view, not a note in one column. */}
        {isEmpty && (
          <p className="mb-3 rounded-lg border border-dashed border-border-strong px-3 py-2 text-center text-sm text-text-muted">
            {EMPTY_WEEK_COPY}
          </p>
        )}
        {isNarrow ? (
          <CalendarAgenda
            days={days}
            eventsByDay={eventsByDay}
            today={data?.today ?? ''}
            onOpenEvent={setSelectedEvent}
          />
        ) : (
          <WeekGrid
            days={days}
            eventsByDay={eventsByDay}
            today={data?.today ?? ''}
            onOpenEvent={setSelectedEvent}
            nowMinute={nowMinute}
            onEditBounds={bounds ? openSheet : undefined}
          />
        )}
      </div>

      {sheetOpen && bounds && (
        <DayBoundsSheet
          bounds={bounds}
          onClose={() => setSheetOpen(false)}
          onSaved={handleBoundsSaved}
        />
      )}

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
