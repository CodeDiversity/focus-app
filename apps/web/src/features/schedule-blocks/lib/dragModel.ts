import { ROW_MINUTES, ROW_PX, type MinuteRange } from '@/features/calendar/lib/gridModel';

/**
 * The drag math (EP15H, pure — no DOM, no clock). The grid draws 60 px per
 * hour (D-E7), so one pixel is one minute; every result snaps to 15 minutes
 * (D-H1) and stays inside the visible range. The pointer layer persists
 * nothing itself — it only derives the date/start/end the sheet and EP15G's
 * requests already understand (AC-E15-10 "identical results").
 */

/** A press becomes a drag only after this much movement (D-H5). */
export const DRAG_THRESHOLD_PX = 4;
/** The snap grid in minutes (D-H1). */
export const SNAP_MIN = 15;
/** Pixels per minute (60 px per hour, D-E7). */
export const PX_PER_MINUTE = ROW_PX / ROW_MINUTES;

export type SnapMode = 'floor' | 'ceil' | 'round';

/** Snap a minute value to the 15-minute grid. */
export function snapTo15(minute: number, mode: SnapMode): number {
  const q = minute / SNAP_MIN;
  const snapped = mode === 'floor' ? Math.floor(q) : mode === 'ceil' ? Math.ceil(q) : Math.round(q);
  return snapped * SNAP_MIN;
}

/** `true` once the pointer has moved at least `DRAG_THRESHOLD_PX` from pointerdown (D-H5). */
export function dragStarted(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
}

/**
 * The (unsnapped) minute under a pointer: `clientY` within a column whose
 * rect starts at `colTop` maps to `range.start + (y − colTop) / pxPerMinute`,
 * clamped to the visible range.
 */
export function minuteAtY(clientY: number, colTop: number, range: MinuteRange): number {
  const minute = range.start + (clientY - colTop) / PX_PER_MINUTE;
  return Math.min(range.end, Math.max(range.start, minute));
}

/**
 * The selection a create-drag describes: ordered (dragging up works), start
 * floored and end ceiled to the snap grid, clamped to the range. `null` when
 * the snapped selection is shorter than 15 minutes — that release is a click.
 */
export function selectionFromDrag(
  anchorMinute: number,
  currentMinute: number,
  range: MinuteRange
): MinuteRange | null {
  const lo = Math.min(anchorMinute, currentMinute);
  const hi = Math.max(anchorMinute, currentMinute);
  const start = Math.max(range.start, snapTo15(lo, 'floor'));
  const end = Math.min(range.end, snapTo15(hi, 'ceil'));
  if (end - start < SNAP_MIN) return null;
  return { start, end };
}

/**
 * A move keeps the duration: the delta snaps to 15 minutes (round), then the
 * whole span clamps so `start ≥ range.start` and `end ≤ range.end` (24:00 is
 * the absolute ceiling — the range never exceeds it).
 */
export function applyMove(
  span: MinuteRange,
  deltaMinutes: number,
  range: MinuteRange
): MinuteRange {
  const duration = span.end - span.start;
  const snapped = snapTo15(deltaMinutes, 'round');
  const start = Math.min(Math.max(span.start + snapped, range.start), range.end - duration);
  return { start, end: start + duration };
}

/** A resize moves the end only: snapped (round), never below start + 15, never above the range end. */
export function applyResize(span: MinuteRange, rawEnd: number, range: MinuteRange): MinuteRange {
  const end = Math.min(Math.max(snapTo15(rawEnd, 'round'), span.start + SNAP_MIN), range.end);
  return { start: span.start, end };
}

export interface ColumnRect {
  date: string;
  left: number;
  right: number;
}

/** The date of the column under `clientX`; `null` outside every column (the drop reverts). */
export function dateAtX(clientX: number, columns: ColumnRect[]): string | null {
  for (const col of columns) {
    if (clientX >= col.left && clientX < col.right) return col.date;
  }
  return null;
}

export interface DatedSpan {
  date: string;
  start: number;
  end: number;
}

/** Same date, start and end → nothing happened; no request, no prompt. */
export function isNoOp(a: DatedSpan, b: DatedSpan): boolean {
  return a.date === b.date && a.start === b.start && a.end === b.end;
}
