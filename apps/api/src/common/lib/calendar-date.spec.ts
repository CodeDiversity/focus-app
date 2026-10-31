import { addDays, dayOfWeekOf } from './calendar-date';

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
});
