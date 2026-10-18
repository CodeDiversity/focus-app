import { describe, it, expect, vi } from 'vitest';
import {
  FALLBACK_TIME_ZONES,
  formatDate,
  formatDateTime,
  formatTime,
  getBrowserTimeZone,
  getTimeZones,
  isValidTimeZone,
} from './datetime';

describe('datetime helpers', () => {
  const utcDate = new Date('2026-10-11T12:00:00Z');

  it('formats dates in the given IANA time zone', () => {
    expect(formatDate(utcDate, 'UTC')).toBe('Oct 11, 2026');
  });

  it('formats times in the given IANA time zone', () => {
    expect(formatTime(utcDate, 'UTC')).toBe('12:00 PM');
  });

  it('formats date and time together', () => {
    expect(formatDateTime(utcDate, 'UTC')).toBe('Oct 11, 2026, 12:00 PM');
  });

  it('adjusts for non-UTC zones', () => {
    // UTC+14 — the same instant is the next calendar day
    expect(formatDate(utcDate, 'Pacific/Kiritimati')).toBe('Oct 12, 2026');
  });

  it('accepts valid IANA identifiers', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
  });

  it('rejects invalid IANA identifiers', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('returns a usable browser time zone', () => {
    expect(getBrowserTimeZone().length).toBeGreaterThan(0);
  });
});

// SP-106E / review pass 2 (IR-106-11, IR-106-15a): these cases can fail —
// they pin the runtime API usage (full zone list, not the curated fallback)
// and the GMT±HH:MM offset sort against concrete expected orderings.
describe('getTimeZones', () => {
  // Structural access: the web app compiles against lib ES2020, so the
  // ES2022 static is read through a narrow type.
  const intl = Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] };
  const hasSupportedValuesOf = typeof intl.supportedValuesOf === 'function';

  it('returns every zone the runtime supports, beyond the curated fallback (AC-106E-1)', () => {
    const zones = getTimeZones();

    expect(zones.length).toBeGreaterThan(0);
    if (hasSupportedValuesOf) {
      // The fallback list is ~112 entries; the real runtime list is ~418.
      // This fails on the pre-fix helper, whose dead API probe always
      // rendered the fallback list.
      expect(zones.length).toBeGreaterThan(FALLBACK_TIME_ZONES.length);
      expect(zones).toContain('Europe/Vatican'); // runtime list; not in the fallback
    } else {
      expect(zones.length).toBeLessThanOrEqual(FALLBACK_TIME_ZONES.length);
    }
    // No duplicates; every entry is a real zone.
    expect(new Set(zones).size).toBe(zones.length);
    expect(zones.every((zone) => isValidTimeZone(zone))).toBe(true);
  });

  it('sorts by UTC offset ascending, then alphabetically within an offset (AC-106E-2)', () => {
    const zones = getTimeZones();
    const at = (zone: string) => zones.indexOf(zone);

    // Offset extremes at the fixed June reference date: UTC-11 group first
    // (alphabetically 'Pacific/Midway' leads the tie), UTC+14 Kiritimati
    // last. The pre-fix alphabetical order put 'Africa/Abidjan' first and
    // 'Pacific/Wallis' last.
    expect(zones[0]).toBe('Pacific/Midway');
    expect(zones[zones.length - 1]).toBe('Pacific/Kiritimati');

    // Offset ordering, not alphabetical: London (UTC+1 in June) precedes
    // Tokyo (UTC+9) — alphabetical order would flip them ('Asia' < 'Europe').
    expect(at('Europe/London')).toBeLessThan(at('Asia/Tokyo'));

    // Clustering within nearby offsets: Majuro (UTC+12) before Kiritimati
    // (UTC+14) — alphabetical order would flip these too.
    expect(at('Pacific/Majuro')).toBeLessThan(at('Pacific/Kiritimati'));
  });

  it('exports a deduplicated fallback list whose entries all pass isValidTimeZone (IR-106-15a)', () => {
    expect(FALLBACK_TIME_ZONES.length).toBeGreaterThan(0);
    expect(new Set(FALLBACK_TIME_ZONES).size).toBe(FALLBACK_TIME_ZONES.length);
    expect(FALLBACK_TIME_ZONES.every((zone) => isValidTimeZone(zone))).toBe(true);
  });

  it('falls back to the curated list when the runtime lacks supportedValuesOf', async () => {
    // Simulate an older runtime by removing the ES2022 static, then import a
    // fresh module instance (the real one memoizes its result at module scope).
    const intlWithApi = Intl as unknown as { supportedValuesOf?: unknown };
    const original = intlWithApi.supportedValuesOf;
    try {
      delete intlWithApi.supportedValuesOf;
      vi.resetModules();
      const fresh = await import('./datetime');
      const zones = fresh.getTimeZones();

      expect(zones.length).toBeGreaterThan(0);
      expect(zones.length).toBeLessThanOrEqual(FALLBACK_TIME_ZONES.length);
      expect(zones.every((zone) => FALLBACK_TIME_ZONES.includes(zone))).toBe(true);
      // The offset sort holds on the fallback path too: Honolulu (UTC-10)
      // first, Tongatapu (UTC+13) last, London before Tokyo.
      expect(zones[0]).toBe('Pacific/Honolulu');
      expect(zones[zones.length - 1]).toBe('Pacific/Tongatapu');
      expect(zones.indexOf('Europe/London')).toBeLessThan(zones.indexOf('Asia/Tokyo'));
    } finally {
      if (original !== undefined) {
        intlWithApi.supportedValuesOf = original;
      }
    }
  });
});
