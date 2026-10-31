import {
  isValidTimeZone,
  resolveTimeZone,
  toCivilDate,
  wallClockToInstant,
  zoneParts,
} from './civil-date';

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

  describe('zoneParts', () => {
    it('returns the civil date and wall time for a New York instant (`2026-10-28T23:30:00Z` → `2026-10-28`, `19:30`)', () => {
      // 23:30 UTC on 28 October is 19:30 the same civil day in New York.
      // Offset verified by Intl longOffset; recorded in the EP12A implementation record.
      expect(zoneParts(new Date('2026-10-28T23:30:00Z'), 'America/New_York')).toEqual({
        date: '2026-10-28',
        time: '19:30',
      });
    });

    it('returns the civil date and wall time for a Tokyo instant (`2026-01-15T23:30:00Z` → `2026-01-16`, `08:30`)', () => {
      // 23:30 UTC on 15 January is 08:30 the next civil day in Tokyo.
      expect(zoneParts(new Date('2026-01-15T23:30:00Z'), 'Asia/Tokyo')).toEqual({
        date: '2026-01-16',
        time: '08:30',
      });
    });

    it('handles the hour-24 quirk: a midnight instant renders as `00:00`, never `24:00`', () => {
      // 11:00 UTC on 31 October is midnight on 1 November in Auckland.
      // Offset verified by Intl longOffset; recorded in the EP12A implementation record.
      expect(zoneParts(new Date('2026-10-31T11:00:00.000Z'), 'Pacific/Auckland')).toEqual({
        date: '2026-11-01',
        time: '00:00',
      });
    });

    it('never throws for an unreadable zone (falls back to UTC via resolveTimeZone)', () => {
      expect(zoneParts(new Date('2026-11-01T00:30:00.000Z'), 'Mars/Olympus')).toEqual({
        date: '2026-11-01',
        time: '00:30',
      });
    });

    it('agrees with toCivilDate on the civil date for the same instant', () => {
      const cases: Array<[string, string]> = [
        ['2026-10-28T23:30:00Z', 'America/New_York'],
        ['2026-01-15T23:30:00Z', 'Asia/Tokyo'],
        ['2026-10-31T11:00:00.000Z', 'Pacific/Auckland'],
      ];
      for (const [iso, timeZone] of cases) {
        const instant = new Date(iso);
        expect(zoneParts(instant, timeZone).date).toBe(toCivilDate(instant, timeZone));
      }
    });
  });

  describe('wallClockToInstant', () => {
    it('round-trips through zoneParts for a DST-free zone', () => {
      // Tokyo, 15 January 2026 at 08:30 local. The instant was hand-derived
      // and verified by Intl longOffset; recorded in the EP12A implementation record.
      const instant = wallClockToInstant('2026-01-15', '08:30', 'Asia/Tokyo');
      expect(instant.toISOString()).toBe('2026-01-14T23:30:00.000Z');
      expect(zoneParts(instant, 'Asia/Tokyo')).toEqual({ date: '2026-01-15', time: '08:30' });
    });
  });
});
