import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import type { ScheduleBlock } from '@/entities/schedule-block/model/types';
import {
  blockFormSchema,
  changedSeriesFields,
  defaultFormValues,
  fromBlock,
  hasNonDefaultMore,
  toPayload,
  toUpdatePayload,
} from './blockForm';

const base = defaultFormValues({ date: '2026-10-28', startTime: '11:00' }); // a Wednesday

const occurrence: CalendarEvent = {
  id: 'event:b1:2026-10-28',
  type: 'EVENT',
  title: 'Busy',
  subtitle: null,
  date: '2026-10-28',
  startTime: '09:00',
  endTime: '24:00',
  courseId: null,
  courseName: null,
  courseColor: null,
  assignmentId: null,
  completed: false,
  focus: false,
  link: null,
  blockId: 'b1',
  recurring: true,
  energy: null,
};

const row: ScheduleBlock = {
  id: 'b1',
  kind: 'BUSY',
  title: null,
  courseId: null,
  energy: null,
  startDate: '2026-10-14',
  endDate: '2026-12-16',
  weekdays: [1, 3],
  startTime: '09:00',
  endTime: '24:00',
  createdAt: 'x',
  updatedAt: 'x',
};

describe('blockForm (EP15G, pure)', () => {
  it('EP15G-AC1: defaults — kind Busy, date as given, start next whole hour, end +60 min, weekly off, energy NORMAL, title empty', () => {
    expect(base).toEqual({
      kind: 'BUSY',
      title: '',
      date: '2026-10-28',
      startTime: '11:00',
      endTime: '12:00',
      weekly: false,
      weekdays: [3],
      endDate: '',
      courseId: '',
      energy: 'NORMAL',
    });
    expect(defaultFormValues({ date: '2026-11-01', startTime: '23:30' }).endTime).toBe('00:00'); // capped at midnight
  });

  it('EP15G-AC1: toPayload — one-off omits weekdays/endDate; weekly sends ascending weekdays; Busy omits courseId/energy; empty title → omitted', () => {
    expect(toPayload({ ...base, title: '   ' })).toEqual({
      kind: 'BUSY',
      startDate: '2026-10-28',
      startTime: '11:00',
      endTime: '12:00',
    });
    expect(
      toPayload({
        ...base,
        kind: 'STUDY',
        title: ' Deep work ',
        weekly: true,
        weekdays: [5, 1, 3],
        endDate: '2026-12-16',
        courseId: 'c1',
        energy: 'HIGH',
      })
    ).toEqual({
      kind: 'STUDY',
      title: 'Deep work',
      startDate: '2026-10-28',
      startTime: '11:00',
      endTime: '12:00',
      weekdays: [1, 3, 5],
      endDate: '2026-12-16',
      courseId: 'c1',
      energy: 'HIGH',
    });
    // Busy never carries study fields even when the form holds them.
    expect(toPayload({ ...base, courseId: 'c1', energy: 'LOW' })).not.toHaveProperty('courseId');
  });

  it('EP15G-AC1: toPayload — end 00:00 is sent as 24:00; fromBlock pre-fills 24:00 as 00:00 (D-G6)', () => {
    expect(toPayload({ ...base, startTime: '22:00', endTime: '00:00' }).endTime).toBe('24:00');
    const values = fromBlock(occurrence, row);
    expect(values.endTime).toBe('00:00');
    expect(values).toMatchObject({
      kind: 'BUSY',
      title: '', // the server default title pre-fills as empty
      date: '2026-10-28',
      startTime: '09:00',
      weekly: true,
      weekdays: [1, 3],
      endDate: '2026-12-16',
      courseId: '',
      energy: 'NORMAL',
    });
    // Without the row yet: the occurrence's weekday stands in for the chips.
    expect(fromBlock(occurrence)).toMatchObject({ weekly: true, weekdays: [3], endDate: '' });
    expect(fromBlock({ ...occurrence, title: 'Work shift' }).title).toBe('Work shift');
  });

  it('EP15G-AC1: validation — end must be after start (except the 00:00 midnight case), at least one weekday when weekly, Ends on ≥ Date, title ≤ 60 after trim', () => {
    const issues = (v: typeof base) => {
      const r = blockFormSchema.safeParse(v);
      return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, startTime: '12:00', endTime: '12:00' })).toEqual([
      'endTime: End must be after start.',
    ]);
    expect(issues({ ...base, startTime: '22:00', endTime: '00:00' })).toEqual([]);
    expect(issues({ ...base, weekly: true, weekdays: [] })).toEqual([
      'weekdays: Pick at least one day.',
    ]);
    expect(issues({ ...base, weekly: true, endDate: '2026-10-27' })).toEqual([
      'endDate: Ends on must be on or after the start date.',
    ]);
    expect(issues({ ...base, weekly: false, weekdays: [], endDate: '2000-01-01' })).toEqual([]); // ignored when one-off
    expect(issues({ ...base, title: 'x'.repeat(61) })).toEqual([
      'title: Keep the title under 60 characters.',
    ]);
    expect(issues({ ...base, title: `${'x'.repeat(60)}   ` })).toEqual([]);
    expect(issues({ ...base, startTime: '24:00' })).toEqual([
      'startTime: Enter a start time (HH:mm).',
    ]);
    expect(issues({ ...base, date: '' })).toEqual(['date: Pick a date.']);
  });

  it('EP15G-AC2: changedSeriesFields — detects weekdays/endDate/weekly-switch changes on a weekly item (D-G10)', () => {
    const weekly = { ...base, weekly: true, weekdays: [1, 3], endDate: '' };
    expect(changedSeriesFields(weekly, weekly)).toBe(false);
    expect(changedSeriesFields(weekly, { ...weekly, startTime: '12:00', title: 'x' })).toBe(false);
    expect(changedSeriesFields(weekly, { ...weekly, weekdays: [3, 1] })).toBe(false); // order is not a change
    expect(changedSeriesFields(weekly, { ...weekly, weekdays: [1] })).toBe(true);
    expect(changedSeriesFields(weekly, { ...weekly, endDate: '2026-12-16' })).toBe(true);
    expect(changedSeriesFields(weekly, { ...weekly, weekly: false })).toBe(true);
    expect(changedSeriesFields(base, { ...base, weekly: true })).toBe(false); // a one-off never prompts
  });

  it('EP15G-AC2: toUpdatePayload — only changed fields, API names, null-clears, weekly off → weekdays/endDate null', () => {
    const weekly = {
      ...base,
      weekly: true,
      weekdays: [1, 3],
      endDate: '2026-12-16',
      title: 'Shift',
    };
    expect(toUpdatePayload(weekly, weekly)).toEqual({});
    expect(
      toUpdatePayload(weekly, {
        ...weekly,
        date: '2026-10-29',
        startTime: '10:00',
        endTime: '00:00',
      })
    ).toEqual({
      startDate: '2026-10-29',
      startTime: '10:00',
      endTime: '24:00',
    });
    expect(
      toUpdatePayload(weekly, { ...weekly, title: '  ', endDate: '', weekdays: [5, 1] })
    ).toEqual({
      title: null,
      weekdays: [1, 5],
      endDate: null,
    });
    expect(toUpdatePayload(weekly, { ...weekly, weekly: false })).toEqual({
      weekdays: null,
      endDate: null,
    });
    const study = { ...base, kind: 'STUDY' as const, courseId: 'c1', energy: 'HIGH' as const };
    expect(toUpdatePayload(study, { ...study, courseId: '', energy: 'NORMAL' })).toEqual({
      courseId: null,
      energy: 'NORMAL',
    });
    expect(hasNonDefaultMore(base)).toBe(false);
    expect(hasNonDefaultMore(study)).toBe(true);
    expect(hasNonDefaultMore({ ...base, weekly: true, endDate: '2026-12-01' })).toBe(true);
  });
});
