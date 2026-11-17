import type { CSSProperties } from 'react';
import { CalendarEventChip } from './CalendarEventChip';
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
}

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
}: WeekGridProps) {
  const allEvents = days.flatMap((d) => eventsByDay.get(d.date) ?? []);
  const range = hourRange(days, allEvents);
  const rows = rowCount(range);
  const hours = axisHours(range);
  const rowsStyle: CSSProperties = { gridTemplateRows: `repeat(${rows}, ${ROW_PX}px)` };

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
              onOpenEvent={onOpenEvent}
              nowMinute={day.date === today ? nowMinute : undefined}
              onEditBounds={onEditBounds}
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
}: {
  day: CalendarDay;
  events: CalendarEvent[];
  range: { start: number; end: number };
  rowsStyle: CSSProperties;
  onOpenEvent: (event: CalendarEvent) => void;
  nowMinute?: number | null;
  onEditBounds?: () => void;
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

  return (
    <div
      role="listitem"
      aria-label={dayHeaderLabel(day.date)}
      data-day={day.date}
      className="relative grid border-l border-border"
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
              className="relative z-0 mx-0.5 rounded-md border border-dashed border-accent/60 bg-accent/5"
              style={{ gridRow: `${span.rowStart} / ${span.rowEnd}`, gridColumn: 1 }}
            >
              <div className="absolute inset-x-0 top-0" style={{ height: chipRows * ROW_PX }}>
                <CalendarEventChip
                  event={event}
                  onOpen={onOpenEvent}
                  layout="grid"
                  heightPx={chipRows * ROW_PX}
                />
              </div>
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
            />
          </div>
        );
      })}

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
        className={`absolute ${place} rounded bg-surface-muted px-0.5 text-caption text-text-muted underline-offset-2 hover:text-text hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
      >
        {caption}
        <span className="sr-only">, change</span>
      </button>
    </div>
  );
}
