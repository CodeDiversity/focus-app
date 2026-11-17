import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
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
import {
  BlockSheet,
  KIND_LABEL,
  blockKindOf,
  isBlockEvent,
  type BlockSaveResult,
} from '@/features/schedule-blocks/ui/BlockSheet';
import { defaultStart } from '@/features/schedule-blocks/lib/defaults';
import { addMinutesCapped } from '@/features/schedule-blocks/lib/blockForm';
import {
  cancelOccurrence,
  deleteScheduleBlock,
} from '@/entities/schedule-block/api/scheduleBlockApi';
import type { DeleteChoice } from '@/features/calendar/ui/CalendarEventDetails';
import { addDays, mondayOf, utcTodayGuess } from '../lib/week';

const NARROW_QUERY = '(max-width: 639px)';

/** EP15E (AC4) — the empty-week copy, verbatim. */
export const EMPTY_WEEK_COPY = 'Nothing on your calendar yet — it’s all free time';

/** EP15G-AC2 — the partial "just this day" outcome, verbatim. */
export const PARTIAL_SAVE_COPY =
  'Saved your change, but the original block is still showing for this day — remove it from its details.';

/** EP15G-AC4 — the announcement matrix for saves. */
export function saveAnnouncement(result: BlockSaveResult): string {
  const label = KIND_LABEL[result.kind];
  switch (result.action) {
    case 'created':
      return `${label} added`;
    case 'updated':
      return `${label} updated`;
    case 'this-day':
      return `${label} updated for this day`;
    case 'following':
      return `${label} updated for this and following weeks`;
    case 'this-day-partial':
      return PARTIAL_SAVE_COPY;
  }
}

/** EP15G-AC4 — the announcement matrix for removals. */
export function deleteAnnouncement(event: CalendarEvent, choice: DeleteChoice): string {
  if (choice === 'this-day') return 'Removed for this day';
  if (choice === 'following') return 'Removed for this and following weeks';
  return `${KIND_LABEL[blockKindOf(event)]} removed`;
}

type BlockSheetState =
  | { mode: 'create'; initial: { date: string; startTime: string; endTime: string } }
  | { mode: 'edit'; event: CalendarEvent };

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

  // EP15G: the one editor for events and study blocks. The trigger (the
  // "Add" button or the chip whose details opened) gets focus back after a
  // save or removal — the dialog restores focus only on its cancel paths.
  const [blockSheet, setBlockSheet] = useState<BlockSheetState | null>(null);
  const blockTriggerRef = useRef<HTMLElement | null>(null);
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

  const focusBlockTrigger = () => {
    window.setTimeout(() => blockTriggerRef.current?.focus(), 0);
  };
  /** EP15G-AC1: "Add" — today when it is in view, else the week's Monday; next whole hour inside the day's bounds. */
  const openCreate = () => {
    if (!data) return;
    blockTriggerRef.current = document.activeElement as HTMLElement | null;
    const inView = data.today >= data.from && data.today <= data.to;
    const date = inView ? data.today : data.from;
    const day = data.days.find((d) => d.date === date);
    const startTime = defaultStart(
      inView,
      day?.wakeTime ?? '08:00',
      day?.sleepTime ?? '23:00',
      nowMinute
    );
    setBlockSheet({
      mode: 'create',
      initial: { date, startTime, endTime: addMinutesCapped(startTime, 60) },
    });
  };
  const handleOpenEvent = (event: CalendarEvent) => {
    blockTriggerRef.current = document.activeElement as HTMLElement | null;
    setSelectedEvent(event);
  };
  const handleEdit = (event: CalendarEvent) => {
    setSelectedEvent(null); // one dialog at a time
    setBlockSheet({ mode: 'edit', event });
  };
  const handleBlockSaved = (result: BlockSaveResult) => {
    setBlockSheet(null);
    setAnnouncement(saveAnnouncement(result));
    focusBlockTrigger();
    void fetchWeek(from, to, false);
  };
  /** EP15G-AC2 wiring 6–8: one-off → DELETE; this day → cancel the occurrence; following → DELETE ?from=. */
  const handleDelete = async (event: CalendarEvent, choice: DeleteChoice) => {
    const blockId = event.blockId;
    if (!blockId) return;
    try {
      if (choice === 'this-day') await cancelOccurrence(blockId, event.date);
      else if (choice === 'following') await deleteScheduleBlock(blockId, { from: event.date });
      else await deleteScheduleBlock(blockId);
    } catch (err) {
      toast.error(getErrMsg(err) || "We couldn't remove this. Try again.");
      throw err; // the details dialog restores its footer
    }
    setSelectedEvent(null);
    setAnnouncement(deleteAnnouncement(event, choice));
    focusBlockTrigger();
    void fetchWeek(from, to, false);
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
          {/* EP15G: the one primary action (D15-14 rule 1) — serves the grid and the agenda. */}
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            className="max-sm:min-h-[44px]"
            onClick={openCreate}
          >
            Add
          </Button>
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
            onOpenEvent={handleOpenEvent}
          />
        ) : (
          <WeekGrid
            days={days}
            eventsByDay={eventsByDay}
            today={data?.today ?? ''}
            onOpenEvent={handleOpenEvent}
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

      {blockSheet?.mode === 'create' && (
        <BlockSheet
          mode="create"
          initial={blockSheet.initial}
          onSaved={handleBlockSaved}
          onClose={() => setBlockSheet(null)}
        />
      )}
      {blockSheet?.mode === 'edit' && (
        <BlockSheet
          mode="edit"
          block={blockSheet.event}
          onSaved={handleBlockSaved}
          onClose={() => setBlockSheet(null)}
        />
      )}

      {selectedEvent && (
        <CalendarEventDetails
          event={selectedEvent}
          timeZone={timeZone}
          onClose={() => setSelectedEvent(null)}
          onEdit={isBlockEvent(selectedEvent) ? () => handleEdit(selectedEvent) : undefined}
          onDelete={
            isBlockEvent(selectedEvent)
              ? (choice) => handleDelete(selectedEvent, choice)
              : undefined
          }
        />
      )}
    </section>
  );
}
