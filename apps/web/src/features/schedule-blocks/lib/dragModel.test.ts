import { describe, expect, it } from 'vitest';
import {
  applyMove,
  applyResize,
  dateAtX,
  dragStarted,
  isNoOp,
  minuteAtY,
  selectionFromDrag,
  snapTo15,
} from './dragModel';

const range = { start: 7 * 60, end: 24 * 60 }; // 07:00–24:00 (the default grid)

describe('dragModel (EP15H, pure)', () => {
  it('EP15H-AC1: minuteAtY — y within a column rect maps to rangeStart + y / pxPerMinute (60 px per hour, D-E7)', () => {
    expect(minuteAtY(0, 0, range)).toBe(7 * 60);
    expect(minuteAtY(90, 0, range)).toBe(7 * 60 + 90); // 1 px = 1 min
    expect(minuteAtY(130, 40, range)).toBe(7 * 60 + 90); // column offset respected
    expect(minuteAtY(-20, 0, range)).toBe(range.start); // clamped above
    expect(minuteAtY(100000, 0, range)).toBe(range.end); // clamped below
  });

  it('EP15H-AC1: snapTo15 — floor for a selection start, ceil for its end, round for a move delta; 7 → 0/15, 8 → 15', () => {
    expect(snapTo15(7, 'floor')).toBe(0);
    expect(snapTo15(7, 'ceil')).toBe(15);
    expect(snapTo15(7, 'round')).toBe(0);
    expect(snapTo15(8, 'round')).toBe(15);
    expect(snapTo15(-8, 'round')).toBe(-15);
    expect(snapTo15(30, 'floor')).toBe(30);
  });

  it('EP15H-AC1: selectionFromDrag — dragging up (end above start) yields the same ordered interval; a drag shorter than 15 min after snapping is a click (null)', () => {
    const down = selectionFromDrag(9 * 60 + 2, 10 * 60 + 20, range);
    const up = selectionFromDrag(10 * 60 + 20, 9 * 60 + 2, range);
    expect(down).toEqual({ start: 9 * 60, end: 10 * 60 + 30 });
    expect(up).toEqual(down);
    expect(selectionFromDrag(9 * 60, 9 * 60, range)).toBeNull(); // no movement on a grid line
    expect(selectionFromDrag(0, 7 * 60 + 20, range)).toEqual({ start: 7 * 60, end: 7 * 60 + 30 }); // clamped to the range
  });

  it('EP15H-AC2: applyMove — keeps duration; clamps start ≥ rangeStart and end ≤ rangeEnd (24:00 max); crossing a column yields the target date', () => {
    const span = { start: 9 * 60, end: 10 * 60 };
    expect(applyMove(span, 67, range)).toEqual({ start: 10 * 60, end: 11 * 60 }); // 67 → 60
    expect(applyMove(span, -1000, range)).toEqual({ start: 7 * 60, end: 8 * 60 }); // floor clamp
    expect(applyMove(span, 10000, range)).toEqual({ start: 23 * 60, end: 24 * 60 }); // 24:00 ceiling
    // Crossing a column changes only the date (dateAtX); the span math is unchanged.
    const cols = [
      { date: '2026-10-26', left: 0, right: 100 },
      { date: '2026-10-27', left: 100, right: 200 },
    ];
    expect(dateAtX(150, cols)).toBe('2026-10-27');
  });

  it('EP15H-AC2: applyResize — end snaps to 15, never below start + 15, never above rangeEnd', () => {
    const span = { start: 9 * 60, end: 10 * 60 };
    expect(applyResize(span, 10 * 60 + 38, range)).toEqual({ start: 9 * 60, end: 10 * 60 + 45 });
    expect(applyResize(span, 9 * 60 + 1, range)).toEqual({ start: 9 * 60, end: 9 * 60 + 15 });
    expect(applyResize(span, 10000, range)).toEqual({ start: 9 * 60, end: 24 * 60 });
  });

  it('EP15H-AC2: dateAtX — x inside the k-th column rect gives days[k]; outside every column gives null (drop reverts)', () => {
    const cols = [
      { date: 'a', left: 56, right: 156 },
      { date: 'b', left: 156, right: 256 },
      { date: 'c', left: 256, right: 356 },
    ];
    expect(dateAtX(60, cols)).toBe('a');
    expect(dateAtX(156, cols)).toBe('b');
    expect(dateAtX(355, cols)).toBe('c');
    expect(dateAtX(10, cols)).toBeNull();
    expect(dateAtX(356, cols)).toBeNull();
  });

  it('EP15H-AC2: isNoOp — same date, start and end → true (no request, no prompt)', () => {
    const a = { date: '2026-10-28', start: 540, end: 600 };
    expect(isNoOp(a, { ...a })).toBe(true);
    expect(isNoOp(a, { ...a, date: '2026-10-29' })).toBe(false);
    expect(isNoOp(a, { ...a, end: 615 })).toBe(false);
  });

  it('EP15H-AC1: dragStarted — false until the pointer has moved ≥ 4 px from pointerdown (D-H5)', () => {
    expect(dragStarted(0, 0)).toBe(false);
    expect(dragStarted(3, 0)).toBe(false);
    expect(dragStarted(2, 2)).toBe(false); // hypot ≈ 2.83
    expect(dragStarted(4, 0)).toBe(true);
    expect(dragStarted(3, 3)).toBe(true);
  });
});
