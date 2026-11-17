import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_SLEEP_TIME,
  DEFAULT_WAKE_TIME,
  MINUTES_PER_DAY,
  dayBoundsFor,
  expandBlocks,
  hasWeekday,
  maskToWeekdays,
  minutesToTime,
  readDayBounds,
  timeToMinutes,
  weekdaysToMask,
} from './recurrence';
import type { DayBoundsRow, ScheduleBlockInput } from './types';

/**
 * EP15A domain unit spec (pure, no clock, no zone): recurrence expansion,
 * the day-bounds reader and the weekday/time helpers (TR-E15-01;
 * EP15A-AC3, EP15A-AC4).
 */
describe('schedule recurrence domain (EP15A)', () => {
  const block = (overrides: Partial<ScheduleBlockInput> = {}): ScheduleBlockInput => ({
    id: 'b1',
    kind: 'BUSY',
    title: null,
    courseId: null,
    energy: 'NORMAL',
    startDate: '2026-11-16', // a Monday
    endDate: null,
    weekdays: null,
    startTime: '09:00',
    endTime: '10:30',
    exceptionDates: [],
    ...overrides,
  });

  const MON_WED_FRI = weekdaysToMask([1, 3, 5]);

  describe('time helpers', () => {
    it('reads HH:mm as minutes and "24:00" as 1440 (D-A4)', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('09:30')).toBe(570);
      expect(timeToMinutes('23:59')).toBe(1439);
      expect(timeToMinutes('24:00')).toBe(MINUTES_PER_DAY);
    });

    it('rejects malformed or out-of-range times with null', () => {
      for (const bad of ['24:01', '25:00', '9:00', '09:60', '', 'noon', '09:00:00']) {
        expect(timeToMinutes(bad)).toBeNull();
      }
      expect(timeToMinutes(undefined as unknown as string)).toBeNull();
    });

    it('formats minutes back to HH:mm, 1440 as "24:00"', () => {
      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(570)).toBe('09:30');
      expect(minutesToTime(MINUTES_PER_DAY)).toBe('24:00');
    });
  });

  describe('weekday bitmask helpers (D-A1)', () => {
    it('round-trips weekday arrays through the mask, ascending and de-duplicated', () => {
      expect(weekdaysToMask([5, 1, 3, 1])).toBe(0b101010);
      expect(maskToWeekdays(0b101010)).toEqual([1, 3, 5]);
      expect(maskToWeekdays(weekdaysToMask([0, 6]))).toEqual([0, 6]);
      expect(maskToWeekdays(0)).toEqual([]);
      expect(maskToWeekdays(0b1111111)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('ignores weekday numbers outside 0…6', () => {
      expect(weekdaysToMask([-1, 7, 2.5, 2])).toBe(1 << 2);
    });

    it('answers membership per bit', () => {
      expect(hasWeekday(1 << 0, 0)).toBe(true);
      expect(hasWeekday(1 << 0, 1)).toBe(false);
      expect(hasWeekday(MON_WED_FRI, 3)).toBe(true);
      expect(hasWeekday(MON_WED_FRI, 4)).toBe(false);
    });
  });

  describe('expandBlocks — one-off blocks (EP15A-AC3)', () => {
    it('yields exactly one occurrence, on its date, when the date is in range', () => {
      const out = expandBlocks([block()], '2026-11-16', '2026-11-22');
      expect(out).toEqual([
        {
          blockId: 'b1',
          kind: 'BUSY',
          title: null,
          courseId: null,
          energy: 'NORMAL',
          date: '2026-11-16',
          startMinute: 540,
          endMinute: 630,
          recurring: false,
        },
      ]);
    });

    it('includes the range bounds (from and to are inclusive)', () => {
      expect(expandBlocks([block()], '2026-11-16', '2026-11-16')).toHaveLength(1);
      expect(
        expandBlocks([block({ startDate: '2026-11-22' })], '2026-11-16', '2026-11-22')
      ).toHaveLength(1);
    });

    it('yields nothing when its date is outside the range', () => {
      expect(expandBlocks([block()], '2026-11-17', '2026-11-30')).toEqual([]);
      expect(expandBlocks([block()], '2026-11-01', '2026-11-15')).toEqual([]);
    });

    it('carries the block fields through verbatim', () => {
      const out = expandBlocks(
        [block({ kind: 'STUDY', title: 'Deep work', courseId: 'c1', energy: 'HIGH' })],
        '2026-11-16',
        '2026-11-16'
      );
      expect(out[0]).toMatchObject({
        kind: 'STUDY',
        title: 'Deep work',
        courseId: 'c1',
        energy: 'HIGH',
        recurring: false,
      });
    });
  });

  describe('expandBlocks — weekly blocks (EP15A-AC3)', () => {
    it('yields one occurrence per set weekday from startDate through the range', () => {
      const out = expandBlocks(
        [block({ weekdays: MON_WED_FRI })],
        '2026-11-16', // Mon
        '2026-11-29' // Sun
      );
      expect(out.map((o) => o.date)).toEqual([
        '2026-11-16',
        '2026-11-18',
        '2026-11-20',
        '2026-11-23',
        '2026-11-25',
        '2026-11-27',
      ]);
      expect(out.every((o) => o.recurring)).toBe(true);
    });

    it('never yields before startDate even when the range starts earlier', () => {
      const out = expandBlocks(
        [block({ weekdays: MON_WED_FRI, startDate: '2026-11-18' })],
        '2026-11-16',
        '2026-11-22'
      );
      expect(out.map((o) => o.date)).toEqual(['2026-11-18', '2026-11-20']);
    });

    it('treats endDate as inclusive and stops after it', () => {
      const out = expandBlocks(
        [block({ weekdays: MON_WED_FRI, endDate: '2026-11-20' })],
        '2026-11-16',
        '2026-11-29'
      );
      expect(out.map((o) => o.date)).toEqual(['2026-11-16', '2026-11-18', '2026-11-20']);
    });

    it('runs open-ended when endDate is null', () => {
      const out = expandBlocks(
        [block({ weekdays: weekdaysToMask([0]), startDate: '2026-01-04' })],
        '2027-06-06', // a Sunday far in the future
        '2027-06-12'
      );
      expect(out.map((o) => o.date)).toEqual(['2027-06-06']);
    });

    it('skips exception dates and only those', () => {
      const out = expandBlocks(
        [block({ weekdays: MON_WED_FRI, exceptionDates: ['2026-11-18', '2026-11-27'] })],
        '2026-11-16',
        '2026-11-29'
      );
      expect(out.map((o) => o.date)).toEqual([
        '2026-11-16',
        '2026-11-20',
        '2026-11-23',
        '2026-11-25',
      ]);
    });

    it('expands Sunday (bit 0) and Saturday (bit 6) like any other weekday', () => {
      const out = expandBlocks(
        [block({ weekdays: weekdaysToMask([0, 6]) })],
        '2026-11-16',
        '2026-11-22'
      );
      expect(out.map((o) => o.date)).toEqual(['2026-11-21', '2026-11-22']);
    });

    it('reads "24:00" as an endMinute of 1440 (D-A4)', () => {
      const out = expandBlocks(
        [block({ weekdays: MON_WED_FRI, startTime: '22:00', endTime: '24:00' })],
        '2026-11-16',
        '2026-11-16'
      );
      expect(out).toHaveLength(1);
      expect(out[0].startMinute).toBe(1320);
      expect(out[0].endMinute).toBe(MINUTES_PER_DAY);
    });

    it('yields the same minutes on a DST transition date as on any other date', () => {
      // 2026-03-08 is the US spring-forward Sunday (America/New_York);
      // 2026-11-01 is the fall-back Sunday. Wall-clock minutes do not move.
      const sundays = block({ weekdays: weekdaysToMask([0]), startDate: '2026-01-04' });
      const spring = expandBlocks([sundays], '2026-03-08', '2026-03-08');
      const fall = expandBlocks([sundays], '2026-11-01', '2026-11-01');
      const plain = expandBlocks([sundays], '2026-11-22', '2026-11-22');
      for (const out of [spring, fall, plain]) {
        expect(out).toHaveLength(1);
        expect([out[0].startMinute, out[0].endMinute]).toEqual([540, 630]);
      }
      expect(spring[0].date).toBe('2026-03-08');
      expect(fall[0].date).toBe('2026-11-01');
    });
  });

  describe('expandBlocks — ordering and edge cases', () => {
    it('sorts by date, then startMinute, then blockId', () => {
      const out = expandBlocks(
        [
          block({ id: 'z', startDate: '2026-11-17', startTime: '08:00', endTime: '09:00' }),
          block({ id: 'b', startDate: '2026-11-16', startTime: '12:00', endTime: '13:00' }),
          block({ id: 'a', startDate: '2026-11-16', startTime: '12:00', endTime: '14:00' }),
          block({ id: 'c', startDate: '2026-11-16', startTime: '07:00', endTime: '08:00' }),
        ],
        '2026-11-16',
        '2026-11-17'
      );
      expect(out.map((o) => `${o.date} ${o.startMinute} ${o.blockId}`)).toEqual([
        '2026-11-16 420 c',
        '2026-11-16 720 a',
        '2026-11-16 720 b',
        '2026-11-17 480 z',
      ]);
    });

    it('interleaves one-off and weekly occurrences in the same order', () => {
      const out = expandBlocks(
        [
          block({ id: 'weekly', weekdays: MON_WED_FRI, startTime: '09:00', endTime: '10:00' }),
          block({ id: 'once', startDate: '2026-11-18', startTime: '08:00', endTime: '09:00' }),
        ],
        '2026-11-16',
        '2026-11-18'
      );
      expect(out.map((o) => `${o.date} ${o.blockId}`)).toEqual([
        '2026-11-16 weekly',
        '2026-11-18 once',
        '2026-11-18 weekly',
      ]);
    });

    it('returns [] for an inverted range or no blocks', () => {
      expect(expandBlocks([block({ weekdays: MON_WED_FRI })], '2026-11-22', '2026-11-16')).toEqual(
        []
      );
      expect(expandBlocks([], '2026-11-16', '2026-11-22')).toEqual([]);
    });

    it('is deterministic and does not mutate its input', () => {
      const blocks = [
        block({ id: 'b', weekdays: MON_WED_FRI, exceptionDates: ['2026-11-18'] }),
        block({ id: 'a', startDate: '2026-11-17' }),
      ];
      const snapshot = JSON.stringify(blocks);
      const first = expandBlocks(blocks, '2026-11-16', '2026-11-29');
      const second = expandBlocks(blocks, '2026-11-16', '2026-11-29');
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
      expect(JSON.stringify(blocks)).toBe(snapshot);
    });
  });

  describe('readDayBounds (EP15A-AC4, D15-13)', () => {
    const row = (dayOfWeek: number, wakeTime = '07:00', sleepTime = '22:00'): DayBoundsRow => ({
      dayOfWeek,
      wakeTime,
      sleepTime,
    });
    const allSeven = [0, 1, 2, 3, 4, 5, 6].map((d) => row(d));

    it('returns seven defaults and configured: false for no rows', () => {
      const out = readDayBounds([]);
      expect(out.configured).toBe(false);
      expect(out.days).toHaveLength(7);
      expect(out.days.map((d) => d.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      for (const day of out.days) {
        expect(day.wakeTime).toBe(DEFAULT_WAKE_TIME);
        expect(day.sleepTime).toBe(DEFAULT_SLEEP_TIME);
      }
      expect(DEFAULT_WAKE_TIME).toBe('08:00');
      expect(DEFAULT_SLEEP_TIME).toBe('23:00');
    });

    it('defaults only the missing weekday and reports configured: false for six rows', () => {
      const out = readDayBounds(allSeven.filter((r) => r.dayOfWeek !== 3));
      expect(out.configured).toBe(false);
      expect(out.days[3]).toEqual({ dayOfWeek: 3, wakeTime: '08:00', sleepTime: '23:00' });
      expect(out.days[2]).toEqual({ dayOfWeek: 2, wakeTime: '07:00', sleepTime: '22:00' });
      expect(out.days[4]).toEqual({ dayOfWeek: 4, wakeTime: '07:00', sleepTime: '22:00' });
    });

    it('reports configured: true with all seven valid rows, in any input order', () => {
      const out = readDayBounds([...allSeven].reverse());
      expect(out.configured).toBe(true);
      expect(out.days.map((d) => d.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(out.days.every((d) => d.wakeTime === '07:00' && d.sleepTime === '22:00')).toBe(true);
    });

    it('reads an invalid pair (sleep ≤ wake) as the default for that day only', () => {
      const out = readDayBounds([
        ...allSeven.filter((r) => r.dayOfWeek !== 5),
        row(5, '22:00', '22:00'),
      ]);
      expect(out.days[5]).toEqual({ dayOfWeek: 5, wakeTime: '08:00', sleepTime: '23:00' });
      expect(out.days[4]).toEqual({ dayOfWeek: 4, wakeTime: '07:00', sleepTime: '22:00' });
      expect(out.configured).toBe(false);

      const inverted = readDayBounds([row(0, '23:00', '08:00')]);
      expect(inverted.days[0]).toEqual({ dayOfWeek: 0, wakeTime: '08:00', sleepTime: '23:00' });
    });

    it('reads malformed times and out-of-range weekdays as defaults', () => {
      const out = readDayBounds([
        row(0, '8:00', '22:00'),
        row(1, '07:00', '24:01'),
        row(2, '24:00', '24:00'),
        row(7, '07:00', '22:00'),
        row(-1, '07:00', '22:00'),
        row(2.5, '07:00', '22:00'),
      ]);
      expect(out.configured).toBe(false);
      for (const day of out.days) {
        expect(day).toEqual({ dayOfWeek: day.dayOfWeek, wakeTime: '08:00', sleepTime: '23:00' });
      }
    });

    it('accepts "24:00" as a sleep time and 00:00 as a wake time (D15-4 / D-A4)', () => {
      const out = readDayBounds([row(6, '00:00', '24:00')]);
      expect(out.days[6]).toEqual({ dayOfWeek: 6, wakeTime: '00:00', sleepTime: '24:00' });
    });
  });

  describe('dayBoundsFor (EP15A-AC4)', () => {
    it('returns the half-open [wake, sleep) interval of that civil date', () => {
      const { days } = readDayBounds([{ dayOfWeek: 1, wakeTime: '06:30', sleepTime: '22:15' }]);
      expect(dayBoundsFor(days, '2026-11-16')).toEqual({
        date: '2026-11-16',
        startMinute: 390,
        endMinute: 1335,
      });
      // Tuesday has no row → the default.
      expect(dayBoundsFor(days, '2026-11-17')).toEqual({
        date: '2026-11-17',
        startMinute: 480,
        endMinute: 1380,
      });
    });

    it('reads a "24:00" sleep time as an endMinute of 1440', () => {
      const { days } = readDayBounds([{ dayOfWeek: 0, wakeTime: '10:00', sleepTime: '24:00' }]);
      expect(dayBoundsFor(days, '2026-11-22')).toEqual({
        date: '2026-11-22',
        startMinute: 600,
        endMinute: MINUTES_PER_DAY,
      });
    });

    it('falls back to the default when the days array lacks that weekday', () => {
      expect(dayBoundsFor([], '2026-03-08')).toEqual({
        date: '2026-03-08',
        startMinute: 480,
        endMinute: 1380,
      });
    });
  });

  describe('purity (the domain boundary, D06-17)', () => {
    it('imports nothing from Nest or Prisma and reads no clock', () => {
      for (const file of ['recurrence.ts', 'types.ts']) {
        const source = readFileSync(join(__dirname, file), 'utf8');
        expect(source).not.toMatch(/from\s+['"]@nestjs\//);
        expect(source).not.toMatch(/from\s+['"]@prisma\//);
        expect(source).not.toMatch(/generated\/prisma/);
        expect(source).not.toMatch(/require\(\s*['"]@(nestjs|prisma)\//);
        expect(source).not.toMatch(/PrismaService/);
        expect(source).not.toMatch(/new Date\(\)/); // no clock
        expect(source).not.toMatch(/Date\.now\(\)/); // no clock
        expect(source).not.toMatch(/Math\.random/); // no randomness
      }
    });
  });
});
