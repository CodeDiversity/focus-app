import type { CalendarDay, CalendarEvent } from '@/entities/calendar/model/types';

/**
 * The week grid's pure geometry (EP15E, D-E1 / D-E6 / D-E7 / D-E8). No DOM,
 * no clock: minutes in, rows and lanes out. EP15H's drag model shares these
 * constants (1 px ≈ 1 min).
 */

/** 60 px per hour → 15 px per 15-minute row (D-E7). */
export const PX_PER_HOUR = 60;
export const ROW_MINUTES = 15;
export const ROW_PX = PX_PER_HOUR / (60 / ROW_MINUTES);
/** Free pieces shorter than this are drawn but not captioned (D-E7). */
export const FREE_LABEL_MIN = 30;
/** The grid never shows less than this range (D-E1). */
export const MIN_RANGE_START = 8 * 60;
export const MIN_RANGE_END = 22 * 60;
/** Lanes for overlapping timed chips before stacking kicks in (D-E6). */
export const MAX_LANES = 3;
export const STACK_OFFSET_PX = 8;

export type MinuteRange = { start: number; end: number };

/** `HH:mm` → minutes from midnight; `"24:00"` → 1440. Malformed → 0. */
export function minutesOf(time: string | null | undefined): number {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return 0;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** Minutes from midnight → `HH:mm`; 1440 → `"24:00"`. */
export function timeOf(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Deadlines and day-anchored planned sessions live in the all-day row, not the hours. */
export function isAllDay(event: CalendarEvent): boolean {
  return (
    event.type === 'ASSIGNMENT_DEADLINE' ||
    event.type === 'EXAM_DEADLINE' ||
    (event.type === 'PLANNED_SESSION' && event.anchor === 'FLEX_DAY')
  );
}

/** A timed item: positioned by its start and end (STUDY_BLOCK included — it is a zone). */
export function isTimed(event: CalendarEvent): boolean {
  return !isAllDay(event);
}

/** `[start, end)` minutes of a timed item; an open-ended item (no end) spans one row. */
export function spanOf(event: CalendarEvent): MinuteRange {
  const start = minutesOf(event.startTime);
  const end = event.endTime ? minutesOf(event.endTime) : start + ROW_MINUTES;
  return { start, end: Math.max(end, start + ROW_MINUTES) };
}

const floorHour = (m: number) => Math.floor(m / 60) * 60;
const ceilHour = (m: number) => Math.ceil(m / 60) * 60;

/**
 * The visible hour range (D-E1): the week's earliest wake, floored to the
 * hour, minus one hour; the latest sleep, ceiled, plus one hour; widened to
 * include every timed item (same padding), never narrower than 08:00–22:00,
 * clamped to 00:00–24:00. Defaults (08:00–23:00) give 07:00–24:00.
 */
export function hourRange(days: CalendarDay[], events: CalendarEvent[]): MinuteRange {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const day of days) {
    start = Math.min(start, minutesOf(day.wakeTime));
    end = Math.max(end, minutesOf(day.sleepTime));
  }
  for (const event of events) {
    if (!isTimed(event)) continue;
    const span = spanOf(event);
    start = Math.min(start, span.start);
    end = Math.max(end, span.end);
  }
  if (!Number.isFinite(start)) start = MIN_RANGE_START;
  if (!Number.isFinite(end)) end = MIN_RANGE_END;
  start = floorHour(start) - 60;
  end = ceilHour(end) + 60;
  start = Math.min(start, MIN_RANGE_START);
  end = Math.max(end, MIN_RANGE_END);
  return { start: Math.max(0, start), end: Math.min(1440, end) };
}

export type RowSpan = { rowStart: number; rowEnd: number; rows: number };

/**
 * CSS grid lines (1-based) for `[startMinute, endMinute)` inside `range`,
 * on 15-minute rows; the span is clipped to the visible range. `null` when
 * nothing of it is visible.
 */
export function rowSpan(
  startMinute: number,
  endMinute: number,
  range: MinuteRange
): RowSpan | null {
  const start = Math.max(startMinute, range.start);
  const end = Math.min(endMinute, range.end);
  if (end <= start) return null;
  const rowStart = Math.floor((start - range.start) / ROW_MINUTES) + 1;
  const rowEnd = Math.ceil((end - range.start) / ROW_MINUTES) + 1;
  return { rowStart, rowEnd, rows: rowEnd - rowStart };
}

/** Number of 15-minute rows in the range (the grid's `repeat(rows, 15px)`). */
export function rowCount(range: MinuteRange): number {
  return Math.ceil((range.end - range.start) / ROW_MINUTES);
}

/** Whole hours printed on the axis: every hour from `start` to `end` inclusive-start. */
export function axisHours(range: MinuteRange): number[] {
  const hours: number[] = [];
  for (let m = ceilHour(range.start); m < range.end; m += 60) hours.push(m);
  return hours;
}

export type LaidOut = {
  event: CalendarEvent;
  span: MinuteRange;
  /** 0-based lane; lanes ≥ MAX_LANES stack with an offset (D-E6). */
  lane: number;
  /** Lanes the item's overlap cluster uses (capped at MAX_LANES). */
  laneCount: number;
};

/**
 * Greedy lane assignment for one day's timed chips (D-E6). STUDY_BLOCK never
 * takes a lane — it is a zone under the chips (filter it before calling, or
 * it is skipped here). Items are processed by start, then longer first, then
 * id, so the output is total and stable. Within an overlap cluster every
 * item shares the cluster's lane count, capped at three; a fourth concurrent
 * item gets lane 3+ and the caller stacks it with an offset.
 */
export function layoutLanes(events: CalendarEvent[]): LaidOut[] {
  const timed = events
    .filter((e) => isTimed(e) && e.type !== 'STUDY_BLOCK')
    .map((event) => ({ event, span: spanOf(event) }))
    .sort(
      (a, b) =>
        a.span.start - b.span.start ||
        b.span.end - a.span.end ||
        (a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0)
    );
  const out: LaidOut[] = [];
  let cluster: LaidOut[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const closeCluster = () => {
    const used = Math.min(MAX_LANES, Math.max(1, ...cluster.map((c) => c.lane + 1)));
    for (const item of cluster) item.laneCount = used;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const { event, span } of timed) {
    if (cluster.length > 0 && span.start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= span.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.end);
    } else {
      laneEnds[lane] = span.end;
    }
    cluster.push({ event, span, lane, laneCount: 1 });
    clusterEnd = Math.max(clusterEnd, span.end);
  }
  if (cluster.length > 0) closeCluster();
  return out;
}

/** A free piece is captioned only from 30 minutes (D-E7). */
export function isLabelledFree(startMinute: number, endMinute: number): boolean {
  return endMinute - startMinute >= FREE_LABEL_MIN;
}

/** "Free · 14:00–16:00" */
export function freeLabel(startTime: string, endTime: string): string {
  return `Free · ${startTime}–${endTime}`;
}

export type ChipTier = 'full' | 'compact' | 'mini';

/** Density tier by rendered height (D-E8): ≥ 60 px full, 30–59 compact, < 30 mini. */
export function chipTier(heightPx: number): ChipTier {
  if (heightPx >= 60) return 'full';
  if (heightPx >= 30) return 'compact';
  return 'mini';
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon 26" for `2026-10-26`, via `Date.UTC` / `getUTCDay` only (no local getters). */
export function dayHeaderLabel(civil: string): string {
  const year = Number(civil.slice(0, 4));
  const month = Number(civil.slice(5, 7));
  const day = Number(civil.slice(8, 10));
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAY[weekday]} ${day}`;
}

/** "Your day 08:00–23:00" when all seven bounds agree, else "Day bounds vary by weekday". */
export function boundsSummary(days: CalendarDay[]): string {
  if (days.length === 0) return '';
  const first = days[0];
  const same = days.every((d) => d.wakeTime === first.wakeTime && d.sleepTime === first.sleepTime);
  return same ? `Your day ${first.wakeTime}–${first.sleepTime}` : 'Day bounds vary by weekday';
}
