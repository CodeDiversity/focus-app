import { isValidTimeZone, resolveTimeZone, toCivilDate } from './civil-date';

/**
 * Unit spec for the civil-date helper (no database, no clock): the
 * instant → civil-date conversion EP06 performs once, in the profile zone
 * (D06-24).
 *
 * The load-bearing case is the midnight rollover: an assignment due
 * `2026-11-01T00:30:00Z` is **31 October** for a student in
 * `America/New_York` — the same day the calendar shows for it.
 */
describe('civil-date helpers', () => {
  describe('isValidTimeZone', () => {
    it('accepts the IANA zones', () => {
      expect(isValidTimeZone('UTC')).toBe(true);
      expect(isValidTimeZone('America/New_York')).toBe(true);
      expect(isValidTimeZone('Asia/Tokyo')).toBe(true);
    });

    it('rejects a non-zone', () => {
      expect(isValidTimeZone('Mars/Olympus')).toBe(false);
      expect(isValidTimeZone('UTC+5')).toBe(false);
      expect(isValidTimeZone('')).toBe(false);
    });
  });

  describe('resolveTimeZone', () => {
    it('keeps a valid zone', () => {
      expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
    });

    it('falls back to UTC for a missing or unreadable zone', () => {
      expect(resolveTimeZone(null)).toBe('UTC');
      expect(resolveTimeZone(undefined)).toBe('UTC');
      expect(resolveTimeZone('Mars/Olympus')).toBe('UTC');
    });
  });

  describe('toCivilDate', () => {
    it('returns the UTC date for the UTC zone', () => {
      expect(toCivilDate(new Date('2026-11-01T12:00:00.000Z'), 'UTC')).toBe('2026-11-01');
    });

    it('rolls the date back for a western zone', () => {
      // 00:30 UTC on 1 November is 20:30 on 31 October in New York.
      expect(toCivilDate(new Date('2026-11-01T00:30:00.000Z'), 'America/New_York')).toBe(
        '2026-10-31'
      );
    });

    it('rolls the date forward for an eastern zone', () => {
      // 23:00 UTC on 31 October is 08:00 on 1 November in Tokyo.
      expect(toCivilDate(new Date('2026-10-31T23:00:00.000Z'), 'Asia/Tokyo')).toBe('2026-11-01');
    });

    it('never throws for an unreadable zone (it falls back to UTC)', () => {
      expect(toCivilDate(new Date('2026-11-01T00:30:00.000Z'), 'Mars/Olympus')).toBe('2026-11-01');
    });

    it('formats the date as YYYY-MM-DD', () => {
      expect(toCivilDate(new Date('2026-01-05T23:59:59.999Z'), 'UTC')).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );
    });
  });
});
