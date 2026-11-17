import { describe, expect, it } from 'vitest';
import { nowMinutesIn } from './now';

describe('nowMinutesIn (EP15E D-E9)', () => {
  const instant = new Date('2026-11-17T15:05:00.000Z');
  it('reads the minute of the day in the profile zone, not the browser zone', () => {
    expect(nowMinutesIn('UTC', instant)).toBe(15 * 60 + 5);
    expect(nowMinutesIn('America/New_York', instant)).toBe(10 * 60 + 5); // EST, UTC−5
    expect(nowMinutesIn('Pacific/Kiritimati', instant)).toBe(5 * 60 + 5); // UTC+14 → next day 05:05
  });
  it('returns null for an unknown zone and normalises hour 24 to 0', () => {
    expect(nowMinutesIn('Not/AZone', instant)).toBeNull();
    expect(nowMinutesIn('UTC', new Date('2026-11-17T00:00:00.000Z'))).toBe(0);
  });
});
