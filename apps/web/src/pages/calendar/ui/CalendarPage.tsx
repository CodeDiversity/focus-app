import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
  createScheduleBlock,
  deleteScheduleBlock,
  listScheduleBlocks,
  restoreOccurrence,
  updateScheduleBlock,
} from '@/entities/schedule-block/api/scheduleBlockApi';
import { dayHeaderLabel, weekdayNumberOf } from '@/features/calendar/lib/gridModel';
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

/** EP15H: a drop's target — always a full dated span (a resize keeps date and start). */
type DropTarget = { date: string; startTime: string; endTime: string };

const weekdayOf = (date: string) => dayHeaderLabel(date).split(' ')[0];

/** EP15H-AC3 — the announcement matrix for drops ("Moved to Tue 14:00–15:00"). */
export function dropAnnouncement(
  action: 'move' | 'resize',
  next: DropTarget,
  scope: 'one' | 'this-day' | 'following'
): string {
  const base =
    action === 'move'
      ? `Moved to ${weekdayOf(next.date)} ${next.startTime}–${next.endTime}`
      : `Resized to ${next.startTime}–${next.endTime}`;
  if (scope === 'this-day') return `${base} for this day`;
  if (scope === 'following') return `${base} for this and following weeks`;
  return base;
}

/** EP15H-AC2 (D-H4) — a weekly item dragged to another day, said out loud. */
export function crossDayAnnouncement(title: string, next: DropTarget): string {
  return `Moved this day's ${title} to ${weekdayOf(next.date)} ${next.startTime}–${next.endTime}; other weeks unchanged`;
}

const DROP_FAIL_COPY = {
  move: "We couldn't move this. Try again.",
  resize: "We couldn't resize this. Try again.",
} as const;

/**
 * EP15K-AC2 — how long the follow-up strip (Undo, and for weekly items
 * "Apply to every week from here") stays after a drop. The countdown waits
 * while the pointer or keyboard focus is inside the strip (WCAG 2.2.1), and
 * restarts in full when it leaves.
 */
export const FOLLOW_UP_MS = 10_000;

/** EP15K-AC2 — the Undo outcome, one plain sentence ("Undone — back to Thu 13:00–14:00"). */
export function undoneAnnouncement(event: CalendarEvent): string {
  return `Undone — back to ${weekdayOf(event.date)} ${event.startTime}–${event.endTime}`;
}

/** EP15K-AC1 — a cross-day "every week" swap onto a weekday the series already has. */
export function alreadyRepeatsAnnouncement(date: string): string {
  return `This already repeats on ${weekdayOf(date)} — change it from its details`;
}

const UNDO_FAIL_COPY = "We couldn't undo this. Try again.";
const APPLY_FAIL_COPY = "We couldn't change every week. Try again.";

/**
 * R-EP15K-05: an "Apply to every week" failure says what the week now looks
 * like, by the step that failed (the chain is read → restore → delete → PATCH).
 */
export const APPLY_FAIL_BY_STEP = {
  beforeChange: "We couldn't change every week — your move for this day still stands.",
  afterRestore:
    "We couldn't change every week — this day shows twice; remove one from its details.",
  afterDelete: "We couldn't change every week — this day is back where it was. Try again.",
} as const;

/** A follow-up failure whose sentence is already known (no server message overrides it). */
class FollowUpFailure extends Error {}

/** Run one step; a failure becomes the given sentence. */
async function step<T>(run: () => Promise<T>, sentence: string): Promise<T> {
  try {
    return await run();
  } catch {
    throw new FollowUpFailure(sentence);
  }
}

/**
 * EP15K: the inline follow-up a drop leaves behind. `undo` restores exactly
 * the prior state; `apply` (weekly only) turns "just this day" into the
 * series change. Each returns the sentence to announce, or `null` when it
 * already reported a failure.
 */
type FollowUp = {
  undo: () => Promise<string | null>;
  apply?: () => Promise<string | null>;
};

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

  // EP15K (D-K1/D-K2): no question after a gesture — a drop applies, is said
  // out loud, and leaves one calm follow-up strip (Undo; for weekly items also
  // "Apply to every week from here") that closes after FOLLOW_UP_MS.
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpFocused, setFollowUpFocused] = useState(false);
  const [followUpHovered, setFollowUpHovered] = useState(false);
  const followUpPaused = followUpFocused || followUpHovered;
  useEffect(() => {
    if (!followUp || followUpPaused || followUpBusy) return;
    const t = window.setTimeout(() => setFollowUp(null), FOLLOW_UP_MS);
    return () => window.clearTimeout(t);
  }, [followUp, followUpPaused, followUpBusy]);
  const closeFollowUp = () => {
    setFollowUp(null);
    setFollowUpFocused(false);
    setFollowUpHovered(false);
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
    closeFollowUp();
    setAnnouncement('');
    setAnchorFrom(addDays(anchorFrom, -7));
  };
  const handleNext = () => {
    closeFollowUp();
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
    closeFollowUp();
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
    closeFollowUp();
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
    closeFollowUp();
    setSelectedEvent(null);
    setAnnouncement(deleteAnnouncement(event, choice));
    focusBlockTrigger();
    void fetchWeek(from, to, false);
  };

  // ---- EP15H: pointer drops --------------------------------------------
  /** The create gesture: the selection opens the same sheet "Add" opens (AC1). */
  const handleCreateRange = (rangeSel: DropTarget) => {
    blockTriggerRef.current = document.activeElement as HTMLElement | null;
    setBlockSheet({ mode: 'create', initial: rangeSel });
  };

  /** EP15G's one-off POST body for a weekly item's "just this day" (same order, R-EP15-03). */
  const oneOffBody = (event: CalendarEvent, next: DropTarget) => {
    const kind = blockKindOf(event);
    const defaultTitle = kind === 'STUDY' ? 'Study' : 'Busy';
    return {
      kind,
      ...(event.title !== defaultTitle ? { title: event.title } : {}),
      ...(kind === 'STUDY' && event.courseId ? { courseId: event.courseId } : {}),
      ...(kind === 'STUDY' ? { energy: event.energy ?? 'NORMAL' } : {}),
      startDate: next.date,
      startTime: next.startTime,
      endTime: next.endTime,
    };
  };

  /**
   * POST the one-off, then cancel the source occurrence; partial → the EP15G
   * sentence. Resolves to the created one-off's id when both steps succeeded
   * (Undo and Apply delete it), else `null`.
   */
  const thisDayDrop = async (
    event: CalendarEvent,
    next: DropTarget,
    action: 'move' | 'resize',
    announceDone: string
  ): Promise<string | null> => {
    const blockId = event.blockId;
    if (!blockId) return null;
    let createdId: string;
    try {
      createdId = (await createScheduleBlock(oneOffBody(event, next))).id;
    } catch (err) {
      toast.error(getErrMsg(err) || DROP_FAIL_COPY[action]);
      return null;
    }
    try {
      await cancelOccurrence(blockId, event.date);
    } catch {
      setAnnouncement(PARTIAL_SAVE_COPY);
      void fetchWeek(from, to, false);
      return null;
    }
    setAnnouncement(announceDone);
    void fetchWeek(from, to, false);
    return createdId;
  };

  /**
   * Run one follow-up step chain. On failure: toast, close the strip and
   * re-read the week so the grid shows the truth. Ordering inside each chain
   * puts "restore" first, so a mid-chain failure can at worst show a day
   * twice — never lose one (F-EP15K-01).
   */
  const runFollowUp = async (step: () => Promise<string | null>, failCopy: string) => {
    setFollowUpBusy(true);
    try {
      const sentence = await step();
      if (sentence) {
        setAnnouncement(sentence);
        closeFollowUp();
        void fetchWeek(from, to, false);
      }
    } catch (err) {
      toast.error(err instanceof FollowUpFailure ? err.message : getErrMsg(err) || failCopy);
      closeFollowUp();
      void fetchWeek(from, to, false);
    } finally {
      setFollowUpBusy(false);
    }
  };

  /** Undo for a weekly "just this day": bring the occurrence back, then drop the one-off. */
  const undoThisDay = (event: CalendarEvent, createdId: string) => async () => {
    await restoreOccurrence(event.blockId as string, event.date);
    await deleteScheduleBlock(createdId);
    return undoneAnnouncement(event);
  };

  /**
   * "Apply to every week from here" (EP15K-AC1). The occurrence is restored
   * first: a PATCH split moves the source's exceptions dated ≥ effectiveFrom
   * into the new series, so a still-cancelled day would stay cancelled every
   * week from here on (F-EP15K-01). Same day → the time change from this
   * date; cross day → the series swaps the source weekday for the target's
   * from the earlier of the two dates, unless the target weekday is already
   * in the series (then nothing changes and the sentence says why). At the
   * series' edges the dates move too, so the dropped-on day always keeps the
   * block (R-EP15K-01): an earlier target before `startDate` moves the start;
   * a later target after `endDate` extends the end.
   */
  const applyEveryWeek =
    (event: CalendarEvent, next: DropTarget, action: 'move' | 'resize', createdId: string) =>
    async (): Promise<string | null> => {
      const blockId = event.blockId as string;
      const crossDay = action === 'move' && next.date !== event.date;
      const series = await step(
        async () => (await listScheduleBlocks()).find((b) => b.id === blockId),
        APPLY_FAIL_BY_STEP.beforeChange
      );
      if (!series?.weekdays) throw new FollowUpFailure(APPLY_FAIL_BY_STEP.beforeChange);
      let body: Parameters<typeof updateScheduleBlock>[1];
      let weekdays = series.weekdays;
      if (!crossDay) {
        body =
          action === 'resize'
            ? { endTime: next.endTime, effectiveFrom: event.date }
            : { startTime: next.startTime, endTime: next.endTime, effectiveFrom: event.date };
      } else {
        const source = weekdayNumberOf(event.date);
        const target = weekdayNumberOf(next.date);
        if (series.weekdays.includes(target)) {
          // Nothing changes; Undo stays available for the day's move.
          setAnnouncement(alreadyRepeatsAnnouncement(next.date));
          setFollowUp((f) => (f ? { undo: f.undo } : f));
          return null;
        }
        weekdays = [...series.weekdays.filter((d) => d !== source), target].sort((a, b) => a - b);
        const effectiveFrom = next.date < event.date ? next.date : event.date;
        body = {
          weekdays,
          startTime: next.startTime,
          endTime: next.endTime,
          effectiveFrom,
          ...(effectiveFrom < series.startDate ? { startDate: effectiveFrom } : {}),
          ...(series.endDate !== null && next.date > series.endDate ? { endDate: next.date } : {}),
        };
      }
      await step(() => restoreOccurrence(blockId, event.date), APPLY_FAIL_BY_STEP.beforeChange);
      await step(() => deleteScheduleBlock(createdId), APPLY_FAIL_BY_STEP.afterRestore);
      await step(() => updateScheduleBlock(blockId, body), APPLY_FAIL_BY_STEP.afterDelete);
      // R-EP15K-04: the new times apply to every weekday of the series.
      const sentence = dropAnnouncement(action, next, 'following');
      return weekdays.length > 1 ? `${sentence}, on all its days` : sentence;
    };

  /**
   * One drop, resolved (EP15K D-K1, overrides EP15H D-H2/D-H4 for gestures):
   * one-off → PATCH in place; weekly (same day or another day) → always
   * "just this day", immediately, announced, with no dialog. Every outcome
   * leaves the follow-up strip: Undo, plus — for weekly items — "Apply to
   * every week from here". The returned promise keeps the grid's ghost until
   * the save settles.
   */
  const resolveDrop = async (
    event: CalendarEvent,
    next: DropTarget,
    action: 'move' | 'resize'
  ): Promise<void> => {
    const blockId = event.blockId;
    if (!blockId) return;
    closeFollowUp();
    const weekly = event.recurring === true;
    if (!weekly) {
      const body =
        action === 'resize'
          ? { endTime: next.endTime }
          : next.date === event.date
            ? { startTime: next.startTime, endTime: next.endTime }
            : { startDate: next.date, startTime: next.startTime, endTime: next.endTime };
      // The exact inverse: the same fields, back to the event's values.
      const undoBody =
        action === 'resize'
          ? { endTime: event.endTime as string }
          : next.date === event.date
            ? { startTime: event.startTime, endTime: event.endTime as string }
            : {
                startDate: event.date,
                startTime: event.startTime,
                endTime: event.endTime as string,
              };
      try {
        await updateScheduleBlock(blockId, body);
      } catch (err) {
        toast.error(getErrMsg(err) || DROP_FAIL_COPY[action]);
        return;
      }
      setAnnouncement(dropAnnouncement(action, next, 'one'));
      void fetchWeek(from, to, false);
      setFollowUp({
        undo: async () => {
          await updateScheduleBlock(blockId, undoBody);
          return undoneAnnouncement(event);
        },
      });
      return;
    }
    const crossDay = action === 'move' && next.date !== event.date;
    const sentence = crossDay
      ? crossDayAnnouncement(event.title, next)
      : dropAnnouncement(action, next, 'this-day');
    const createdId = await thisDayDrop(event, next, action, sentence);
    if (!createdId) return;
    setFollowUp({
      undo: undoThisDay(event, createdId),
      apply: applyEveryWeek(event, next, action, createdId),
    });
  };
  // ---- end EP15H ---------------------------------------------------------

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
        {/* R-EP15K-03: the status line and the follow-up strip share one
            reserved row, so the grid never moves when the strip comes and goes. */}
        <div
          data-testid="calendar-status-row"
          className="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2"
        >
          <div
            role="status"
            className="flex min-h-5 items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted"
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

          {/* EP15K (D-K1/D-K2): the follow-up strip — outside the live region,
            so the sentence above is announced once and the controls are not
            read as status. Pointer or focus inside pauses its countdown. */}
          {followUp && (
            <div
              role="group"
              aria-label="Last change"
              data-testid="drop-followup"
              className="flex flex-wrap items-center gap-2"
              onFocus={() => setFollowUpFocused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setFollowUpFocused(false);
                }
              }}
              onPointerEnter={() => setFollowUpHovered(true)}
              onPointerLeave={() => setFollowUpHovered(false)}
            >
              {followUp.apply && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={followUpBusy}
                  onClick={() => {
                    const apply = followUp.apply;
                    if (apply) void runFollowUp(apply, APPLY_FAIL_COPY);
                  }}
                >
                  Apply to every week from here
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={followUpBusy}
                onClick={() => void runFollowUp(followUp.undo, UNDO_FAIL_COPY)}
              >
                Undo
              </Button>
            </div>
          )}
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
            editable={!isNarrow}
            onCreateRange={handleCreateRange}
            onMove={(event, next) => resolveDrop(event, next, 'move')}
            onResize={(event, next) =>
              resolveDrop(
                event,
                { date: event.date, startTime: event.startTime, endTime: next.endTime },
                'resize'
              )
            }
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
