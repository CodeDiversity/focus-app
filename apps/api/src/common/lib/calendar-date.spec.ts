import { addDays, dayOfWeekOf, startOfMondayWeek } from './calendar-date';

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
