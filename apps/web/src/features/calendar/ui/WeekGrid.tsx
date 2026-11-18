import { GripHorizontal } from 'lucide-react';
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { CalendarEventChip } from './CalendarEventChip';
import {
  applyMove,
  applyResize,
  dateAtX,
  dragStarted,
  isNoOp,
  minuteAtY,
  PX_PER_MINUTE,
  selectionFromDrag,
  type ColumnRect,
} from '@/features/schedule-blocks/lib/dragModel';
import {
  axisHours,
  dayHeaderLabel,
  freeLabel,
  hourRange,
  isAllDay,
  isLabelledFree,
  layoutLanes,
  minutesOf,
  rowCount,
  rowSpan,
  ROW_PX,
  spanOf,
  STACK_OFFSET_PX,
  MAX_LANES,
  timeOf,
} from '../lib/gridModel';
import type { CalendarDay, CalendarEvent } from '@/entities/calendar/model/types';

export interface WeekGridProps {
  /** The payload's `days[]`, Monday to Sunday. */
  days: CalendarDay[];
  eventsByDay: Map<string, CalendarEvent[]>;
  today: string;
  onOpenEvent: (event: CalendarEvent) => void;
  /**
   * EP15E (D-E9): the current minute of the day in the profile zone; a thin
   * marker is drawn across today's column at that minute. Omit to draw none.
   */
  nowMinute?: number | null;
  /**
   * EP15F: when given, the "Day starts / Day ends" captions become buttons that
   * open the day-bounds sheet (the grid's second entry point, EP15F-AC2).
   */
  onEditBounds?: () => void;
  /**
   * EP15H: pointer editing. When false or omitted nothing binds and nothing
   * renders — EP15E behaviour exactly. Touch pointers are always ignored
   * (D-H3); the sheet is the keyboard path for every gesture (AC-E15-10).
   */
  editable?: boolean;
  /** EP15H-AC1: a drag-select across free/shaded cells released → open the create sheet pre-filled. */
  onCreateRange?: (range: { date: string; startTime: string; endTime: string }) => void;
  /**
   * EP15H-AC2: an EVENT/STUDY_BLOCK chip dropped at a new place. A returned
   * promise keeps the drop ghost (aria-busy) until it settles.
   */
  onMove?: (
    event: CalendarEvent,
    next: { date: string; startTime: string; endTime: string }
  ) => void | Promise<void>;
  /** EP15H-AC2: the bottom handle released at a new end. Promise semantics as `onMove`. */
  onResize?: (event: CalendarEvent, next: { endTime: string }) => void | Promise<void>;
}

/**
 * EP15H-AC3 (parity): the pointer layer is exactly these three callbacks —
 * create ↔ the Add sheet, move ↔ Edit (Date/Start/End), resize ↔ Edit (End).
 * Anything a gesture can do, the sheet can do.
 */
export const EDIT_CALLBACKS = ['onCreateRange', 'onMove', 'onResize'] as const;

type MinuteSpan = { start: number; end: number };

/** The in-flight drag (ref: no re-render per pixel) and its render state. */
type DragState =
  | {
      kind: 'select';
      date: string;
      colTop: number;
      anchorY: number;
      startX: number;
      startY: number;
      started: boolean;
      el: Element;
      pointerId: number;
      cleanup: () => void;
    }
  | {
      kind: 'move' | 'resize';
      event: CalendarEvent;
      span: MinuteSpan;
      date: string;
      columns: ColumnRect[];
      startX: number;
      startY: number;
      started: boolean;
      el: Element;
      pointerId: number;
      cleanup: () => void;
    };

export type LiveDrag =
  | { kind: 'select'; date: string; span: MinuteSpan }
  | { kind: 'move' | 'resize'; eventId: string; date: string; span: MinuteSpan; busy?: boolean };

const HATCH: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, transparent 0 7px, rgb(var(--color-border) / 0.9) 7px 8px)',
};

/**
 * The hour-axis week grid (EP15E; D-E1, D-E6, D-E7, D-E8; AC-E15-08/12).
 * Seven day columns, each a CSS grid of 15-minute rows at 60 px per hour.
 * Layers per column, bottom to top: outside-bounds shading (hatched,
 * `role="img"` with its exact accessible name), free pieces (dotted outline,
 * captioned from 30 minutes), study-block zones (full width, dashed), timed
 * chips in up to three lanes. Deadlines and FLEX_DAY planned sessions sit in
 * the all-day row above the hours. Nothing is conveyed by colour alone and
 * nothing here is interactive except the chips (D-E2).
 */
export function WeekGrid({
  days,
  eventsByDay,
  today,
  onOpenEvent,
  nowMinute,
  onEditBounds,
  editable = false,
  onCreateRange,
  onMove,
  onResize,
}: WeekGridProps) {
  const allEvents = days.flatMap((d) => eventsByDay.get(d.date) ?? []);
  const range = hourRange(days, allEvents);
  const rows = rowCount(range);
  const hours = axisHours(range);
  const rowsStyle: CSSProperties = { gridTemplateRows: `repeat(${rows}, ${ROW_PX}px)` };

  // ---- EP15H pointer layer ------------------------------------------------
  // The drag lives in a ref (per-pixel math never re-renders the grid); one
  // state drives the preview/ghost. Document-level move/up listeners follow
  // the pointer wherever it goes; Escape cancels with nothing persisted.
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pendingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [live, setLive] = useState<LiveDrag | null>(null);

  /** A click right after a completed or cancelled drag must not open details (D-H5). */
  const openEvent = useCallback(
    (event: CalendarEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      onOpenEvent(event);
    },
    [onOpenEvent]
  );

  const cancelDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    if (d.started) suppressClickRef.current = true;
    d.cleanup();
    dragRef.current = null;
    setLive(null);
  }, []);

  /** Resolve the drop; a promise keeps the ghost (`aria-busy`) until it settles. */
  const settle = (outcome: void | Promise<void>) => {
    if (outcome && typeof (outcome as Promise<void>).then === 'function') {
      pendingRef.current = true;
      setLive((l) => (l && l.kind !== 'select' ? { ...l, busy: true } : l));
      void (outcome as Promise<void>)
        .catch(() => undefined)
        .finally(() => {
          pendingRef.current = false;
          setLive(null);
        });
    } else {
      setLive(null);
    }
  };

  const beginDrag = (
    e: ReactPointerEvent<Element>,
    make: (cleanup: () => void) => DragState
  ): boolean => {
    if (!editable || e.button !== 0 || e.pointerType === 'touch') return false;
    if (dragRef.current || pendingRef.current) return false;
    const onPointerMove = (ev: PointerEvent) => handleMove(ev);
    const onPointerUp = (ev: PointerEvent) => handleUp(ev);
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        cancelDrag();
      }
    };
    const cleanup = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown, true);
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        /* capture may already be gone */
      }
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown, true);
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* jsdom or an exotic target */
    }
    dragRef.current = make(cleanup);
    return true;
  };

  const columnRects = (): ColumnRect[] => {
    const nodes = gridRef.current?.querySelectorAll<HTMLElement>('[data-day]') ?? [];
    return Array.from(nodes).map((el) => {
      const rect = el.getBoundingClientRect();
      return { date: el.dataset.day as string, left: rect.left, right: rect.right };
    });
  };

  const handleMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.started) {
      if (!dragStarted(e.clientX - d.startX, e.clientY - d.startY)) return;
      d.started = true;
    }
    if (d.kind === 'select') {
      const anchor = minuteAtY(d.anchorY, d.colTop, range);
      const current = minuteAtY(e.clientY, d.colTop, range);
      const span = selectionFromDrag(anchor, current, range);
      setLive(span ? { kind: 'select', date: d.date, span } : null);
      return;
    }
    if (d.kind === 'move') {
      const span = applyMove(d.span, (e.clientY - d.startY) / PX_PER_MINUTE, range);
      const date = dateAtX(e.clientX, d.columns) ?? d.date;
      setLive({ kind: 'move', eventId: d.event.id, date, span });
      return;
    }
    const span = applyResize(d.span, d.span.end + (e.clientY - d.startY) / PX_PER_MINUTE, range);
    setLive({ kind: 'resize', eventId: d.event.id, date: d.date, span });
  };

  const handleUp = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    d.cleanup();
    dragRef.current = null;
    if (!d.started) {
      // Under 4 px this never was a drag: a chip press stays a click (details)
      // and a free-cell press does nothing (D-H5).
      setLive(null);
      return;
    }
    suppressClickRef.current = true;
    if (d.kind === 'select') {
      const anchor = minuteAtY(d.anchorY, d.colTop, range);
      const current = minuteAtY(e.clientY, d.colTop, range);
      const span = selectionFromDrag(anchor, current, range);
      setLive(null);
      if (span && onCreateRange) {
        onCreateRange({ date: d.date, startTime: timeOf(span.start), endTime: timeOf(span.end) });
      }
      return;
    }
    if (d.kind === 'move') {
      const span = applyMove(d.span, (e.clientY - d.startY) / PX_PER_MINUTE, range);
      const date = dateAtX(e.clientX, d.columns);
      if (
        !date ||
        isNoOp(
          { date: d.date, start: d.span.start, end: d.span.end },
          { date, start: span.start, end: span.end }
        ) ||
        !onMove
      ) {
        setLive(null); // released outside every column, or nothing changed — revert
        return;
      }
      settle(onMove(d.event, { date, startTime: timeOf(span.start), endTime: timeOf(span.end) }));
      return;
    }
    const span = applyResize(d.span, d.span.end + (e.clientY - d.startY) / PX_PER_MINUTE, range);
    if (span.end === d.span.end || !onResize) {
      setLive(null);
      return;
    }
    settle(onResize(d.event, { endTime: timeOf(span.end) }));
  };

  const onColumnPointerDown = (day: CalendarDay, e: ReactPointerEvent<HTMLDivElement>) => {
    // Chips, captions and handles manage themselves — only bare cells select.
    if ((e.target as Element).closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    beginDrag(e, (cleanup) => ({
      kind: 'select',
      date: day.date,
      colTop: rect.top,
      anchorY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      el: e.currentTarget,
      pointerId: e.pointerId,
      cleanup,
    }));
  };

  const onChipPointerDown = (event: CalendarEvent, e: ReactPointerEvent<Element>) => {
    if ((e.target as Element).closest('[data-resize-handle]')) return; // the handle resizes
    beginDrag(e, (cleanup) => ({
      kind: 'move',
      event,
      span: spanOf(event),
      date: event.date,
      columns: columnRects(),
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      el: e.currentTarget,
      pointerId: e.pointerId,
      cleanup,
    }));
  };

  const onHandlePointerDown = (event: CalendarEvent, e: ReactPointerEvent<Element>) => {
    e.stopPropagation();
    beginDrag(e, (cleanup) => ({
      kind: 'resize',
      event,
      span: spanOf(event),
      date: event.date,
      columns: [],
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      el: e.currentTarget,
      pointerId: e.pointerId,
      cleanup,
    }));
  };
  // ---- end EP15H pointer layer --------------------------------------------

  return (
    <div className="overflow-x-auto" role="list" aria-label="Week view">
      <div className="min-w-[840px]">
        {/* Header row */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(112px, 1fr))` }}
        >
          <div className="sticky left-0 z-20 bg-surface" aria-hidden />
          {days.map((day) => {
            const isToday = day.date === today;
            return (
              <div
                key={day.date}
                data-today={isToday || undefined}
                className={`border-b px-2 py-1 text-sm ${
                  isToday
                    ? 'border-t-2 border-t-accent border-b-border font-bold text-accent'
                    : 'border-b-border font-medium text-text'
                }`}
              >
                {dayHeaderLabel(day.date)}
                {isToday && <span className="sr-only"> (today)</span>}
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(112px, 1fr))` }}
        >
          <div className="sticky left-0 z-20 bg-surface px-1 py-1 text-caption text-text-muted">
            All day
          </div>
          {days.map((day) => {
            const allDay = (eventsByDay.get(day.date) ?? []).filter(isAllDay);
            return (
              <div
                key={day.date}
                role="listitem"
                aria-label={`${dayHeaderLabel(day.date)} all day`}
                data-all-day-for={day.date}
                className="min-h-8 space-y-1 border-l border-border p-1"
              >
                {allDay.map((event) => (
                  <CalendarEventChip key={event.id} event={event} onOpen={onOpenEvent} />
                ))}
              </div>
            );
          })}
        </div>

        {/* Hour grid */}
        <div
          ref={gridRef}
          className="grid"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(112px, 1fr))` }}
        >
          <div className="sticky left-0 z-20 grid bg-surface" style={rowsStyle} aria-hidden>
            {hours.map((m) => {
              const span = rowSpan(m, m + 15, range);
              if (!span) return null;
              return (
                <div
                  key={m}
                  className="-mt-2 pr-1 text-right text-caption text-text-muted"
                  style={{ gridRow: `${span.rowStart} / ${span.rowEnd}` }}
                >
                  {timeOf(m)}
                </div>
              );
            })}
          </div>
          {days.map((day) => (
            <DayColumn
              key={day.date}
              day={day}
              events={eventsByDay.get(day.date) ?? []}
              range={range}
              rowsStyle={rowsStyle}
              onOpenEvent={openEvent}
              nowMinute={day.date === today ? nowMinute : undefined}
              onEditBounds={onEditBounds}
              editable={editable}
              live={live}
              onColumnPointerDown={onColumnPointerDown}
              onChipPointerDown={onChipPointerDown}
              onHandlePointerDown={onHandlePointerDown}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  events,
  range,
  rowsStyle,
  onOpenEvent,
  nowMinute,
  onEditBounds,
  editable,
  live,
  onColumnPointerDown,
  onChipPointerDown,
  onHandlePointerDown,
}: {
  day: CalendarDay;
  events: CalendarEvent[];
  range: { start: number; end: number };
  rowsStyle: CSSProperties;
  onOpenEvent: (event: CalendarEvent) => void;
  nowMinute?: number | null;
  onEditBounds?: () => void;
  editable?: boolean;
  live?: LiveDrag | null;
  onColumnPointerDown?: (day: CalendarDay, e: ReactPointerEvent<HTMLDivElement>) => void;
  onChipPointerDown?: (event: CalendarEvent, e: ReactPointerEvent<Element>) => void;
  onHandlePointerDown?: (event: CalendarEvent, e: ReactPointerEvent<Element>) => void;
}) {
  const wake = minutesOf(day.wakeTime);
  const sleep = minutesOf(day.sleepTime);
  const before = rowSpan(range.start, wake, range);
  const after = sleep < 1440 ? rowSpan(sleep, range.end, range) : null;
  type Positioned =
    | { kind: 'zone'; event: CalendarEvent; span: { start: number; end: number }; start: number }
    | {
        kind: 'chip';
        event: CalendarEvent;
        span: { start: number; end: number };
        lane: number;
        laneCount: number;
        start: number;
      };
  const positioned: Positioned[] = [
    ...events
      .filter((e) => e.type === 'STUDY_BLOCK')
      .map<Positioned>((event) => ({
        kind: 'zone',
        event,
        span: spanOf(event),
        start: spanOf(event).start,
      })),
    ...layoutLanes(events).map<Positioned>((l) => ({ kind: 'chip', ...l, start: l.span.start })),
  ].sort((a, b) => a.start - b.start || (a.kind === 'zone' ? -1 : 1));

  // EP15H: a chip is draggable only for the two block kinds, and only when
  // the grid is editable (D-H7: no handles, no handlers otherwise).
  const isDraggable = (event: CalendarEvent) =>
    Boolean(editable) && (event.type === 'EVENT' || event.type === 'STUDY_BLOCK');
  const liveFor = (event: CalendarEvent) =>
    live && live.kind !== 'select' && live.eventId === event.id ? live : null;
  const liveTimeOf = (event: CalendarEvent) => {
    const l = liveFor(event);
    return l ? `${timeOf(l.span.start)}–${timeOf(l.span.end)}` : null;
  };
  const ghost =
    live && live.kind !== 'select' && live.date === day.date
      ? rowSpan(live.span.start, live.span.end, range)
      : null;
  const preview =
    live && live.kind === 'select' && live.date === day.date
      ? rowSpan(live.span.start, live.span.end, range)
      : null;

  return (
    <div
      role="listitem"
      aria-label={dayHeaderLabel(day.date)}
      data-day={day.date}
      onPointerDown={
        editable && onColumnPointerDown ? (e) => onColumnPointerDown(day, e) : undefined
      }
      className={`relative grid border-l border-border${editable ? ' cursor-crosshair' : ''}`}
      style={rowsStyle}
    >
      {/* Hour lines */}
      {axisHours(range).map((m) => {
        const span = rowSpan(m, m + 15, range);
        return span ? (
          <div
            key={m}
            aria-hidden
            className="border-t border-border/60"
            style={{ gridRow: `${span.rowStart} / ${span.rowEnd}`, gridColumn: 1 }}
          />
        ) : null;
      })}

      {/* 1. Outside-bounds shading (EP15F: the caption is a button when the
          sheet can be opened — it sits beside the img, never inside it, so
          it stays reachable). */}
      {before && (
        <ShadedRegion
          span={before}
          name="Before your day starts"
          caption={`Day starts ${day.wakeTime}`}
          edge="bottom"
          onEditBounds={onEditBounds}
        />
      )}
      {after && (
        <ShadedRegion
          span={after}
          name="After your day ends"
          caption={`Day ends ${day.sleepTime}`}
          edge="top"
          onEditBounds={onEditBounds}
        />
      )}

      {/* 2. Free pieces */}
      {day.free.map((f) => {
        const start = minutesOf(f.startTime);
        const end = minutesOf(f.endTime);
        const span = rowSpan(start, end, range);
        if (!span) return null;
        const labelled = isLabelledFree(start, end);
        return (
          <div
            key={`free-${f.startTime}`}
            data-free={`${f.startTime}-${f.endTime}`}
            aria-hidden={labelled ? undefined : true}
            className="pointer-events-none mx-0.5 rounded-md border-2 border-dotted border-border-strong"
            style={{ gridRow: `${span.rowStart} / ${span.rowEnd}`, gridColumn: 1 }}
          >
            {labelled && (
              <p className="px-1 pt-0.5 text-caption text-text-muted">
                {freeLabel(f.startTime, f.endTime)}
              </p>
            )}
          </div>
        );
      })}

      {/* 3 + 4. Study-block zones (under, full width) and timed chips (lanes), in one
          time-sorted DOM sequence so keyboard order is start order (AC4); z-index keeps
          zones beneath the chips. */}
      {positioned.map((item) => {
        if (item.kind === 'zone') {
          const { event, span: s } = item;
          const span = rowSpan(s.start, s.end, range);
          if (!span) return null;
          // Up to 90 px of chip (label, title, time · course, energy pill) at the
          // zone's top (D-E11); the rest is zone.
          const chipRows = Math.min(span.rows, 6);
          return (
            <div
              key={event.id}
              data-start={s.start}
              data-end={s.end}
              data-kind="STUDY_BLOCK"
              className="group relative z-0 mx-0.5 rounded-md border border-dashed border-accent/60 bg-accent/5"
              style={{ gridRow: `${span.rowStart} / ${span.rowEnd}`, gridColumn: 1 }}
            >
              <div
                className={`absolute inset-x-0 top-0${
                  liveFor(event)
                    ? ' transition-transform duration-base motion-reduce:transition-none'
                    : ''
                }`}
                style={{ height: chipRows * ROW_PX }}
              >
                <CalendarEventChip
                  event={event}
                  onOpen={onOpenEvent}
                  layout="grid"
                  heightPx={chipRows * ROW_PX}
                  draggable={isDraggable(event)}
                  dragging={Boolean(liveFor(event))}
                  liveTime={liveTimeOf(event)}
                  onDragPointerDown={
                    isDraggable(event) && onChipPointerDown
                      ? (e) => onChipPointerDown(event, e)
                      : undefined
                  }
                  showResizeHandle={false}
                />
              </div>
              {/* EP15K (D-K3, F-EP15H-03): the zone's resize strip sits on the
                  zone's visible bottom edge — where the block ends — not under
                  the ≤ 90 px chip. Pointer-only; the keyboard equivalent is the
                  sheet's End field (EP15H D-H7). */}
              {isDraggable(event) && onHandlePointerDown && (
                <span
                  aria-hidden="true"
                  tabIndex={-1}
                  data-resize-handle
                  onPointerDown={(e) => onHandlePointerDown(event, e)}
                  className="absolute inset-x-0 bottom-0 z-10 flex h-2 cursor-ns-resize items-center justify-center opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                >
                  <GripHorizontal size={12} className="text-text-muted" />
                </span>
              )}
            </div>
          );
        }
        const { event, span: s, lane, laneCount } = item;
        const span = rowSpan(s.start, s.end, range);
        if (!span) return null;
        const visibleLane = Math.min(lane, MAX_LANES - 1);
        const stacked = lane >= MAX_LANES ? (lane - MAX_LANES + 1) * STACK_OFFSET_PX : 0;
        const width = `calc(${100 / laneCount}% - 2px)`;
        return (
          <div
            key={event.id}
            data-start={s.start}
            data-end={s.end}
            data-kind={event.type}
            className="relative"
            style={{
              gridRow: `${span.rowStart} / ${span.rowEnd}`,
              gridColumn: 1,
              marginLeft: `calc(${(100 / laneCount) * visibleLane}% + ${1 + stacked}px)`,
              width,
              zIndex: 10 + lane,
            }}
          >
            <CalendarEventChip
              event={event}
              onOpen={onOpenEvent}
              layout="grid"
              heightPx={span.rows * ROW_PX}
              draggable={isDraggable(event)}
              dragging={Boolean(liveFor(event))}
              liveTime={liveTimeOf(event)}
              onDragPointerDown={
                isDraggable(event) && onChipPointerDown
                  ? (e) => onChipPointerDown(event, e)
                  : undefined
              }
              onResizePointerDown={
                isDraggable(event) && onHandlePointerDown
                  ? (e) => onHandlePointerDown(event, e)
                  : undefined
              }
            />
          </div>
        );
      })}

      {/* EP15H: the live drag-select preview — discrete 15-minute steps are
          the snap feedback (D-H8); screen-reader users hear only the result. */}
      {preview && live?.kind === 'select' && (
        <div
          role="presentation"
          data-testid="drag-preview"
          className="pointer-events-none z-40 mx-0.5 rounded-md border-2 border-dashed border-accent bg-accent/15"
          style={{ gridRow: `${preview.rowStart} / ${preview.rowEnd}`, gridColumn: 1 }}
        >
          <p className="px-1 pt-0.5 text-caption text-text">
            {timeOf(live.span.start)} – {timeOf(live.span.end)}
          </p>
        </div>
      )}
      {/* EP15H: the move/resize ghost at the drop target; it stays, aria-busy,
          while the drop's request runs, then the week refetches. */}
      {ghost && live && live.kind !== 'select' && (
        <div
          role="presentation"
          data-testid="drag-ghost"
          aria-busy={live.busy || undefined}
          className="pointer-events-none z-40 mx-0.5 rounded-md border-2 border-accent bg-accent/15"
          style={{ gridRow: `${ghost.rowStart} / ${ghost.rowEnd}`, gridColumn: 1 }}
        >
          <p className="px-1 pt-0.5 text-caption text-text">
            {timeOf(live.span.start)} – {timeOf(live.span.end)}
          </p>
        </div>
      )}

      {/* 5. The "now" marker on today's column (D-E9): a 2 px accent line with a
          dot at the axis side, positioned to the minute (1 px ≈ 1 min). */}
      {nowMinute !== undefined &&
        nowMinute !== null &&
        nowMinute >= range.start &&
        nowMinute < range.end && (
          <div
            role="img"
            aria-label={`Now, ${timeOf(nowMinute)}`}
            data-now={nowMinute}
            className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-accent"
            style={{ top: `${nowMinute - range.start}px` }}
          >
            <span
              aria-hidden
              className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent"
            />
          </div>
        )}
    </div>
  );
}

function ShadedRegion({
  span,
  name,
  caption,
  edge,
  onEditBounds,
}: {
  span: { rowStart: number; rowEnd: number };
  name: string;
  caption: string;
  edge: 'top' | 'bottom';
  onEditBounds?: () => void;
}) {
  const place = edge === 'bottom' ? 'bottom-0.5 left-1' : 'left-1 top-0.5';
  if (!onEditBounds) {
    return (
      <div
        role="img"
        aria-label={name}
        className="relative bg-surface-muted"
        style={{ ...HATCH, gridRow: `${span.rowStart} / ${span.rowEnd}`, gridColumn: 1 }}
      >
        <span
          aria-hidden
          className={`absolute ${place} bg-surface-muted px-0.5 text-caption text-text-muted`}
        >
          {caption}
        </span>
      </div>
    );
  }
  return (
    <div
      className="relative"
      style={{ gridRow: `${span.rowStart} / ${span.rowEnd}`, gridColumn: 1 }}
    >
      <div
        role="img"
        aria-label={name}
        className="absolute inset-0 bg-surface-muted"
        style={HATCH}
      />
      <button
        type="button"
        onClick={onEditBounds}
        // EP15J (F-EP15J-01, WCAG 2.2 target size): at least 24 × 24 px — a
        // chip can sit right against this caption, so spacing cannot excuse it.
        className={`absolute ${place} inline-flex min-h-6 min-w-6 items-center rounded bg-surface-muted px-1 text-caption text-text-muted underline-offset-2 hover:text-text hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
      >
        {caption}
        <span className="sr-only">, change</span>
      </button>
    </div>
  );
}
