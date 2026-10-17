import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  getBrowserTimeZone,
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
