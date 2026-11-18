import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WeekGrid } from './WeekGrid';
import type { CalendarDay, CalendarEvent } from '@/entities/calendar/model/types';

/**
 * EP15H (TR-E15-08): pointer gestures on the grid. jsdom has no pointer
 * capture and no layout, so capture is stubbed and every column gets a known
 * rect: top 0, 100 px wide starting at x = 56, height = rows × 15 px. The
 * visible range for these fixtures is 07:00–24:00 (default bounds), so
 * minute m sits at y = m − 420 (1 px = 1 min, D-E7).
 */

const WEEK = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
];
const days: CalendarDay[] = WEEK.map((date) => ({
  date,
  wakeTime: '08:00',
  sleepTime: '23:00',
  free: [],
}));

const base: CalendarEvent = {
  id: 'event:b1:2026-10-28',
  type: 'EVENT',
  title: 'Work shift',
  subtitle: null,
  date: '2026-10-28',
  startTime: '09:00',
  endTime: '10:00',
  courseId: null,
  courseName: null,
  courseColor: null,
  assignmentId: null,
  completed: false,
  focus: false,
  link: null,
  blockId: 'b1',
  recurring: false,
  energy: null,
};
const studyBlock: CalendarEvent = {
  ...base,
  id: 'study-block:b2:2026-10-29',
  type: 'STUDY_BLOCK',
  title: 'Study',
  date: '2026-10-29',
  blockId: 'b2',
  energy: 'NORMAL',
};
const classEvent: CalendarEvent = {
  ...base,
  id: 'class:m1:2026-10-27',
  type: 'CLASS',
  title: 'Calculus',
  date: '2026-10-27',
  blockId: null,
  recurring: null,
};

const Y = (minute: number) => minute - 420; // range starts at 07:00

const eventsByDay = (events: CalendarEvent[]) => {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e]);
  return map;
};

const renderGrid = (
  events: CalendarEvent[],
  props: Partial<Parameters<typeof WeekGrid>[0]> = {}
) => {
  const onOpenEvent = vi.fn();
  const onCreateRange = vi.fn();
  const onMove = vi.fn();
  const onResize = vi.fn();
  const view = render(
    <WeekGrid
      days={days}
      eventsByDay={eventsByDay(events)}
      today="2026-10-28"
      onOpenEvent={onOpenEvent}
      editable
      onCreateRange={onCreateRange}
      onMove={onMove}
      onResize={onResize}
      {...props}
    />
  );
  // Known geometry for every day column: k-th column at [56 + 100k, 56 + 100(k+1)).
  const cols = Array.from(view.container.querySelectorAll<HTMLElement>('[data-day]'));
  cols.forEach((col, k) => {
    vi.spyOn(col, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: (24 * 60 - 420) * 1,
      left: 56 + 100 * k,
      right: 56 + 100 * (k + 1),
      width: 100,
      height: (24 * 60 - 420) * 1,
      x: 56 + 100 * k,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });
  return { ...view, cols, onOpenEvent, onCreateRange, onMove, onResize };
};

const col = (date: string) => document.querySelector<HTMLElement>(`[data-day="${date}"]`)!;

/**
 * jsdom synthesizes pointer events without coordinates, so a drag never
 * crosses the 4 px threshold. Dispatch a real MouseEvent with the pointer
 * fields defined on it — React's onPointer* handlers read them off the
 * native event by type name.
 */
type PointerOpts = { clientX: number; clientY: number; pointerType?: string; pointerId?: number };
function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  o: PointerOpts
) {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: o.clientX,
    clientY: o.clientY,
  });
  Object.defineProperty(ev, 'pointerId', { value: o.pointerId ?? 1 });
  Object.defineProperty(ev, 'pointerType', { value: o.pointerType ?? 'mouse' });
  fireEvent(el, ev);
}

describe('WeekGrid drag (EP15H)', () => {
  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("EP15H-AC1: pointerdown on a free cell, move 90 px, pointerup → onCreateRange({ date, startTime: '09:00', endTime: '10:30' }) with the selection preview shown during the drag", () => {
    const { onCreateRange } = renderGrid([base]);
    const wed = col('2026-10-28');
    firePointer(wed, 'pointerdown', { clientX: 260, clientY: Y(540) });
    firePointer(wed, 'pointermove', { clientX: 260, clientY: Y(630) });
    const preview = screen.getByTestId('drag-preview');
    expect(preview).toHaveTextContent('09:00 – 10:30');
    expect(preview).toHaveAttribute('role', 'presentation');
    firePointer(wed, 'pointerup', { clientX: 260, clientY: Y(630) });
    expect(onCreateRange).toHaveBeenCalledWith({
      date: '2026-10-28',
      startTime: '09:00',
      endTime: '10:30',
    });
    expect(screen.queryByTestId('drag-preview')).toBeNull();
  });

  it('EP15H-AC1: Escape during a selection removes the preview and calls nothing', () => {
    const { onCreateRange } = renderGrid([base]);
    const wed = col('2026-10-28');
    firePointer(wed, 'pointerdown', { clientX: 260, clientY: Y(540) });
    firePointer(wed, 'pointermove', { clientX: 260, clientY: Y(630) });
    expect(screen.getByTestId('drag-preview')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('drag-preview')).toBeNull();
    firePointer(wed, 'pointerup', { clientX: 260, clientY: Y(630) });
    expect(onCreateRange).not.toHaveBeenCalled();
  });

  it('EP15H-AC1: pointerdown + pointerup without 4 px of movement calls nothing (click on free space)', () => {
    const { onCreateRange, onMove, onResize } = renderGrid([base]);
    const wed = col('2026-10-28');
    firePointer(wed, 'pointerdown', { clientX: 260, clientY: Y(540) });
    firePointer(wed, 'pointermove', { clientX: 261, clientY: Y(540) + 2 });
    expect(screen.queryByTestId('drag-preview')).toBeNull();
    firePointer(wed, 'pointerup', { clientX: 261, clientY: Y(540) + 2 });
    expect(onCreateRange).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it("EP15H-AC1: a touch pointer (pointerType 'touch') is ignored (D-H3)", () => {
    const { onCreateRange } = renderGrid([base]);
    const wed = col('2026-10-28');
    firePointer(wed, 'pointerdown', { pointerType: 'touch', clientX: 260, clientY: Y(540) });
    firePointer(wed, 'pointermove', { pointerType: 'touch', clientX: 260, clientY: Y(630) });
    expect(screen.queryByTestId('drag-preview')).toBeNull();
    firePointer(wed, 'pointerup', { pointerType: 'touch', clientX: 260, clientY: Y(630) });
    expect(onCreateRange).not.toHaveBeenCalled();
  });

  it('EP15H-AC2 + EP15K-AC3: EVENT chips carry the bottom handle inside the chip; STUDY_BLOCK zones carry it on the zone edge, not the chip; CLASS chips carry neither', () => {
    renderGrid([base, studyBlock, classEvent]);
    const busyChip = screen.getByRole('button', { name: /Work shift/ });
    const studyChip = screen.getByRole('button', { name: /Study block/ });
    const classChip = screen.getByRole('button', { name: /Calculus/ });
    const zone = document.querySelector<HTMLElement>('[data-kind="STUDY_BLOCK"]')!;
    expect(busyChip.className).toContain('cursor-grab');
    expect(studyChip.className).toContain('cursor-grab');
    const busyHandle = busyChip.querySelector('[data-resize-handle]')!;
    expect(studyChip.querySelector('[data-resize-handle]')).toBeNull();
    const zoneHandle = zone.querySelector(':scope > [data-resize-handle]')!;
    for (const handle of [busyHandle, zoneHandle]) {
      expect(handle).not.toBeNull();
      expect(handle).toHaveAttribute('aria-hidden', 'true');
      expect(handle).toHaveAttribute('tabindex', '-1');
      expect(handle.className).toContain('cursor-ns-resize');
      expect(handle.className).toContain('bottom-0');
    }
    expect(classChip.className).not.toContain('cursor-grab');
    expect(classChip.querySelector('[data-resize-handle]')).toBeNull();
  });

  it('EP15K-AC3: a tall study block (09:00–12:00) resizes from the zone’s bottom edge, past the 90 px chip', () => {
    const tall = { ...studyBlock, endTime: '12:00' };
    const { onResize, onMove } = renderGrid([tall]);
    const zone = document.querySelector<HTMLElement>('[data-kind="STUDY_BLOCK"]')!;
    const handle = zone.querySelector(':scope > [data-resize-handle]')!;
    firePointer(handle, 'pointerdown', { clientX: 360, clientY: Y(720) });
    firePointer(handle, 'pointermove', { clientX: 360, clientY: Y(720) + 60 });
    expect(screen.getByTestId('drag-ghost')).toHaveTextContent('09:00 – 13:00');
    firePointer(handle, 'pointerup', { clientX: 360, clientY: Y(720) + 60 });
    expect(onResize).toHaveBeenCalledWith(tall, { endTime: '13:00' });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('EP15H-AC2: dragging an EVENT 60 px down calls onMove(event, { date, startTime +1 h, endTime +1 h }) after release; the ghost shows the live time while dragging', () => {
    const { onMove } = renderGrid([base]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 260, clientY: Y(545) + 60 });
    const ghost = screen.getByTestId('drag-ghost');
    expect(ghost).toHaveTextContent('10:00 – 11:00');
    expect(screen.getByTestId('live-time')).toHaveTextContent('10:00–11:00');
    expect(chip.className).toContain('cursor-grabbing');
    firePointer(chip, 'pointerup', { clientX: 260, clientY: Y(545) + 60 });
    expect(onMove).toHaveBeenCalledWith(base, {
      date: '2026-10-28',
      startTime: '10:00',
      endTime: '11:00',
    });
    expect(screen.queryByTestId('drag-ghost')).toBeNull();
  });

  it('EP15H-AC2: dragging an EVENT into the next column calls onMove with the next date and unchanged times', () => {
    const { onMove } = renderGrid([base]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 370, clientY: Y(545) }); // into Thu's column
    expect(screen.getByTestId('drag-ghost')).toBeInTheDocument();
    firePointer(chip, 'pointerup', { clientX: 370, clientY: Y(545) });
    expect(onMove).toHaveBeenCalledWith(base, {
      date: '2026-10-29',
      startTime: '09:00',
      endTime: '10:00',
    });
  });

  it('EP15H-AC2: dragging the handle 30 px calls onResize(event, { endTime +30 min })', () => {
    const { onMove, onResize } = renderGrid([base]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    const handle = chip.querySelector('[data-resize-handle]')!;
    firePointer(handle, 'pointerdown', { clientX: 260, clientY: Y(600) });
    firePointer(handle, 'pointermove', { clientX: 260, clientY: Y(600) + 30 });
    expect(screen.getByTestId('drag-ghost')).toHaveTextContent('09:00 – 10:30');
    firePointer(handle, 'pointerup', { clientX: 260, clientY: Y(600) + 30 });
    expect(onResize).toHaveBeenCalledWith(base, { endTime: '10:30' });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('EP15H-AC2: move/resize clamp at the visible range edges (end never past 24:00 or the range end)', () => {
    const { onMove, onResize } = renderGrid([base]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 260, clientY: Y(545) + 5000 });
    firePointer(chip, 'pointerup', { clientX: 260, clientY: Y(545) + 5000 });
    expect(onMove).toHaveBeenCalledWith(base, {
      date: '2026-10-28',
      startTime: '23:00',
      endTime: '24:00',
    });
    const handle = chip.querySelector('[data-resize-handle]')!;
    firePointer(handle, 'pointerdown', { clientX: 260, clientY: Y(600) });
    firePointer(handle, 'pointermove', { clientX: 260, clientY: Y(600) + 5000 });
    firePointer(handle, 'pointerup', { clientX: 260, clientY: Y(600) + 5000 });
    expect(onResize).toHaveBeenCalledWith(base, { endTime: '24:00' });
  });

  it('EP15H-AC2: releasing outside every column reverts and calls nothing', () => {
    const { onMove } = renderGrid([base]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 10, clientY: Y(545) }); // left of the axis
    firePointer(chip, 'pointerup', { clientX: 10, clientY: Y(545) });
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByTestId('drag-ghost')).toBeNull();
  });

  it('EP15H-AC2: a 4 px-or-less pointer sequence on a chip is a click → onOpenEvent (details), not a move (D-H5)', () => {
    const { onOpenEvent, onMove } = renderGrid([base]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 261, clientY: Y(545) + 2 });
    firePointer(chip, 'pointerup', { clientX: 261, clientY: Y(545) + 2 });
    fireEvent.click(chip);
    expect(onOpenEvent).toHaveBeenCalledWith(base);
    expect(onMove).not.toHaveBeenCalled();

    // After a real drag the trailing click is swallowed — details stay closed.
    onOpenEvent.mockClear();
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 260, clientY: Y(545) + 60 });
    firePointer(chip, 'pointerup', { clientX: 260, clientY: Y(545) + 60 });
    fireEvent.click(chip);
    expect(onOpenEvent).not.toHaveBeenCalled();
    fireEvent.click(chip); // the next clean click opens details again
    expect(onOpenEvent).toHaveBeenCalledWith(base);
  });

  it('EP15H-AC3: Escape mid-drag snaps the chip back and calls nothing; the snap-back class carries motion-reduce:transition-none', () => {
    const { onMove } = renderGrid([base]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 260, clientY: Y(545) + 60 });
    expect(screen.getByTestId('drag-ghost')).toBeInTheDocument();
    expect(chip.className).toContain('motion-reduce:transition-none');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('drag-ghost')).toBeNull();
    firePointer(chip, 'pointerup', { clientX: 260, clientY: Y(545) + 60 });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('EP15H-AC3: introduces no animation without its reduced-motion companion', () => {
    const { container } = renderGrid([base, studyBlock]);
    const chip = screen.getByRole('button', { name: /Work shift/ });
    firePointer(chip, 'pointerdown', { clientX: 260, clientY: Y(545) });
    firePointer(chip, 'pointermove', { clientX: 260, clientY: Y(545) + 60 });
    for (const el of Array.from(container.querySelectorAll<HTMLElement>('*'))) {
      const cls = el.className;
      if (typeof cls !== 'string') continue;
      if (/(?:^|\s)(transition|transition-\S+|animate-\S+)(?:\s|$)/.test(cls)) {
        expect(cls).toMatch(/motion-reduce:(transition-none|animate-none)/);
      }
    }
  });

  it('EP15H-AC3: with editable=false no pointer handlers or handles render (EP15E behaviour intact)', () => {
    const { onCreateRange, onMove } = renderGrid([base], { editable: false });
    const chip = screen.getByRole('button', { name: /Work shift/ });
    expect(chip.className).not.toContain('cursor-grab');
    expect(chip.querySelector('[data-resize-handle]')).toBeNull();
    const wed = col('2026-10-28');
    expect(wed.className).not.toContain('cursor-crosshair');
    firePointer(wed, 'pointerdown', { clientX: 260, clientY: Y(540) });
    firePointer(wed, 'pointermove', { clientX: 260, clientY: Y(630) });
    expect(screen.queryByTestId('drag-preview')).toBeNull();
    firePointer(wed, 'pointerup', { clientX: 260, clientY: Y(630) });
    expect(onCreateRange).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });
});
