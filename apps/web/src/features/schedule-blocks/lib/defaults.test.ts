import { describe, expect, it } from 'vitest';
import { defaultStart } from './defaults';

describe('defaults (EP15G)', () => {
  it('EP15G-AC1: defaultStart — today → next whole hour by the clock, clamped to [wake, sleep − 1 h]; another day → the day’s wake time rounded up to the hour', () => {
    expect(defaultStart(true, '08:00', '23:00', 10 * 60 + 30)).toBe('11:00');
    expect(defaultStart(true, '08:00', '23:00', 10 * 60)).toBe('11:00');
    expect(defaultStart(true, '08:00', '23:00', 5 * 60)).toBe('08:00'); // before wake → wake
    expect(defaultStart(true, '08:00', '23:00', 22 * 60 + 40)).toBe('22:00'); // past sleep − 1 h
    expect(defaultStart(true, '08:30', '23:00', 8 * 60)).toBe('09:00');
    expect(defaultStart(true, '08:00', '24:00', 23 * 60 + 10)).toBe('23:00');
    expect(defaultStart(false, '08:00', '23:00', 10 * 60 + 30)).toBe('08:00');
    expect(defaultStart(false, '07:30', '23:00', 0)).toBe('08:00');
    expect(defaultStart(true, '08:00', '23:00', null)).toBe('08:00'); // clock unknown → wake
  });
});
