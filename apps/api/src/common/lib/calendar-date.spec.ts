import { addDays, dayOfWeekOf, parseCalendarDate, startOfMondayWeek } from './calendar-date';

/**
 * Unit spec for `YYYY-MM-DD` string arithmetic. These helpers assume a
 * valid calendar date; they are not time-zone conversions.
 */
describe('calendar-date helpers', () => {
  describe('addDays', () => {
    it('crosses a month boundary', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    });

    it('crosses a year boundary', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('zero-length day count is a no-op', () => {
      expect(addDays('2026-06-15', 0)).toBe('2026-06-15');
    });
  });

  describe('dayOfWeekOf', () => {
    it('Thursday=`4` for `2026-01-01`', () => {
      expect(dayOfWeekOf('2026-01-01')).toBe(4);
    });

    it('Sunday=`0` for `2026-02-01`', () => {
      expect(dayOfWeekOf('2026-02-01')).toBe(0);
    });
  });

  describe('parseCalendarDate', () => {
    it('returns the UTC-midnight Date for a valid YYYY-MM-DD', () => {
      expect(parseCalendarDate('2026-11-17')?.toISOString()).toBe('2026-11-17T00:00:00.000Z');
    });

    it('returns null for an impossible day (the round-trip check)', () => {
      expect(parseCalendarDate('2026-02-30')).toBeNull();
    });

    it('returns null, not a throw, for an unparseable month or day (EP15B, F-EP15B-01)', () => {
      expect(() => parseCalendarDate('2026-13-01')).not.toThrow();
      expect(parseCalendarDate('2026-13-01')).toBeNull();
      expect(parseCalendarDate('2026-00-10')).toBeNull();
      expect(parseCalendarDate('2026-01-00')).toBeNull();
      expect(parseCalendarDate('2026-01-32')).toBeNull();
    });

    it('returns null for the wrong shape or a non-string', () => {
      expect(parseCalendarDate('2026/11/17')).toBeNull();
      expect(parseCalendarDate('17-11-2026')).toBeNull();
      expect(parseCalendarDate(20261117 as unknown as string)).toBeNull();
    });
  });

  describe('startOfMondayWeek (EP13K, D-K2)', () => {
    it('returns the Monday for every weekday, including Sunday', () => {
      // 2026-11-16 is a Monday.
      for (let d = 0; d < 7; d += 1) {
        expect(startOfMondayWeek(addDays('2026-11-16', d))).toBe('2026-11-16');
      }
      expect(startOfMondayWeek('2026-11-23')).toBe('2026-11-23');
    });

    it('crosses a month and a year boundary', () => {
      expect(startOfMondayWeek('2026-10-01')).toBe('2026-09-28');
      expect(startOfMondayWeek('2027-01-03')).toBe('2026-12-28');
    });
  });
});
