import { describe, expect, it } from 'vitest';
import {
  axisHours,
  chipTier,
  dayHeaderLabel,
  hourRange,
  isLabelledFree,
  layoutLanes,
  minutesOf,
  rowSpan,
  boundsSummary,
} from './gridModel';
import type { CalendarDay, CalendarEvent } from '@/entities/calendar/model/types';

const day = (date: string, wakeTime = '08:00', sleepTime = '23:00'): CalendarDay => ({
  date,
  wakeTime,
  sleepTime,
  free: [],
});
const ev = (o: Partial<CalendarEvent> & { id: string }): CalendarEvent =>
  ({
    type: 'CLASS',
    title: 'x',
    subtitle: null,
    date: '2026-10-26',
    startTime: '09:00',
    endTime: '10:00',
    courseId: null,
    courseName: null,
    courseColor: null,
    assignmentId: null,
    completed: false,
    focus: false,
    link: null,
    ...o,
  }) as CalendarEvent;

describe('gridModel (EP15E, pure)', () => {
  it('EP15E-AC1: hourRange — defaults 08:00–23:00 give 07:00–24:00 (one hour of padding each side, whole hours)', () => {
    expect(hourRange([day('2026-10-26')], [])).toEqual({ start: 420, end: 1440 });
  });

  it('EP15E-AC1: hourRange — never narrower than 08:00–22:00 (bounds 10:00–20:00 → 08:00–22:00)', () => {
    expect(hourRange([day('2026-10-26', '10:00', '20:00')], [])).toEqual({ start: 480, end: 1320 });
  });

  it('EP15E-AC1: hourRange — widens to include a timed item outside bounds (class at 06:30 → starts 05:00) and clamps to 00:00/24:00', () => {
    const cls = ev({ id: 'c', startTime: '06:30', endTime: '07:30' });
    expect(hourRange([day('2026-10-26')], [cls]).start).toBe(300);
    const late = ev({ id: 'l', startTime: '23:30', endTime: '24:00' });
    expect(hourRange([day('2026-10-26')], [late]).end).toBe(1440);
    const early = ev({ id: 'e', startTime: '00:15', endTime: '01:00' });
    expect(hourRange([day('2026-10-26')], [early]).start).toBe(0);
    // All-day items never widen the range.
    const deadline = ev({
      id: 'd',
      type: 'ASSIGNMENT_DEADLINE',
      startTime: '02:00',
      endTime: null,
    });
    expect(hourRange([day('2026-10-26')], [deadline])).toEqual({ start: 420, end: 1440 });
  });

  it('EP15E-AC1: hourRange — mixed weekdays use the week’s min wake and max sleep', () => {
    const days = [day('2026-10-26', '09:30', '21:00'), day('2026-10-27', '06:15', '22:30')];
    expect(hourRange(days, [])).toEqual({ start: 300, end: 1440 }); // 06:15→06:00−1h=05:00; 22:30→23:00+1h=24:00
  });

  it('EP15E-AC1: rowSpan — 15-minute rows from HH:mm, 24:00 → 1440, items are clipped to the visible range', () => {
    const range = { start: 420, end: 1440 };
    expect(minutesOf('24:00')).toBe(1440);
    expect(rowSpan(minutesOf('09:00'), minutesOf('10:30'), range)).toEqual({
      rowStart: 9,
      rowEnd: 15,
      rows: 6,
    });
    expect(rowSpan(minutesOf('23:00'), minutesOf('24:00'), range)).toEqual({
      rowStart: 65,
      rowEnd: 69,
      rows: 4,
    });
    expect(rowSpan(300, 480, range)).toEqual({ rowStart: 1, rowEnd: 5, rows: 4 }); // clipped at 07:00
    expect(rowSpan(0, 400, range)).toBeNull();
    expect(axisHours(range)[0]).toBe(420);
    expect(axisHours(range).at(-1)).toBe(1380);
  });

  it('EP15E-AC1: layoutLanes — two overlapping timed chips share the column in two lanes; three → three; a fourth stacks with an offset (D-E6)', () => {
    const a = ev({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const b = ev({ id: 'b', startTime: '09:30', endTime: '10:30' });
    const c = ev({ id: 'c', startTime: '09:45', endTime: '10:15' });
    const d = ev({ id: 'd', startTime: '09:50', endTime: '10:05' });
    const solo = ev({ id: 's', startTime: '12:00', endTime: '13:00' });
    const two = layoutLanes([b, a]);
    expect(two.map((l) => [l.event.id, l.lane, l.laneCount])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
    ]);
    const three = layoutLanes([c, a, b, solo]);
    expect(three.map((l) => [l.event.id, l.lane, l.laneCount])).toEqual([
      ['a', 0, 3],
      ['b', 1, 3],
      ['c', 2, 3],
      ['s', 0, 1],
    ]);
    const four = layoutLanes([d, c, b, a]);
    expect(four.find((l) => l.event.id === 'd')).toMatchObject({ lane: 3, laneCount: 3 });
    // A later item reuses a freed lane.
    const after = ev({ id: 'e', startTime: '10:00', endTime: '11:00' });
    expect(layoutLanes([a, b, after]).find((l) => l.event.id === 'e')).toMatchObject({ lane: 0 });
  });

  it('EP15E-AC1: layoutLanes — STUDY_BLOCK never takes a lane (it is a zone under the chips, D-E6)', () => {
    const zone = ev({ id: 'z', type: 'STUDY_BLOCK', startTime: '09:00', endTime: '12:00' });
    const a = ev({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const out = layoutLanes([zone, a]);
    expect(out.map((l) => l.event.id)).toEqual(['a']);
    expect(out[0].laneCount).toBe(1);
  });

  it('EP15E-AC2: isLabelledFree — 30 minutes is labelled, 29 is not (D-E7)', () => {
    expect(isLabelledFree(600, 630)).toBe(true);
    expect(isLabelledFree(600, 629)).toBe(false);
  });

  it('EP15E-AC1: chipTier — ≥ 60 full, 30–59 compact, < 30 mini (D-E8)', () => {
    expect(chipTier(60)).toBe('full');
    expect(chipTier(59)).toBe('compact');
    expect(chipTier(30)).toBe('compact');
    expect(chipTier(29)).toBe('mini');
  });

  it("EP15E-AC3: dayHeaderLabel('2026-10-26') is 'Mon 26' via Date.UTC/getUTCDay only", () => {
    expect(dayHeaderLabel('2026-10-26')).toBe('Mon 26');
    expect(dayHeaderLabel('2026-11-01')).toBe('Sun 1');
    expect(dayHeaderLabel('2024-02-29')).toBe('Thu 29');
  });

  it('EP15E: boundsSummary reads the shared bounds or says they vary', () => {
    expect(boundsSummary([day('a'), day('b')])).toBe('Your day 08:00–23:00');
    expect(boundsSummary([day('a'), day('b', '09:00', '23:00')])).toBe(
      'Day bounds vary by weekday'
    );
    expect(boundsSummary([])).toBe('');
  });
});
