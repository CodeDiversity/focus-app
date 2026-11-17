import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addDays, mondayOf, utcTodayGuess, weekdayOf } from './week';

describe('pages/calendar/lib/week (EP15E, AC-E15-09)', () => {
  it('EP15E-AC3: addDays / mondayOf are pure civil-date functions (month/year rollover, leap day, Sunday → previous Monday)', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-10-26', 6)).toBe('2026-11-01');
    expect(addDays('2026-10-26', -7)).toBe('2026-10-19');
    expect(weekdayOf('2026-10-26')).toBe(1); // Monday
    expect(weekdayOf('2026-11-01')).toBe(0); // Sunday
    expect(mondayOf('2026-10-26')).toBe('2026-10-26');
    expect(mondayOf('2026-10-28')).toBe('2026-10-26');
    expect(mondayOf('2026-11-01')).toBe('2026-10-26'); // Sunday belongs to the previous Monday
    expect(mondayOf('2026-01-01')).toBe('2025-12-29'); // year rollover
  });

  it('EP15E-AC3: utcTodayGuess is the UTC civil date of now', () => {
    expect(utcTodayGuess()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(utcTodayGuess()).toBe(new Date().toISOString().slice(0, 10));
  });

  it('EP15E-AC3: the module uses no browser-local Date getters (R-EP15-13)', () => {
    const source = readFileSync(join(__dirname, 'week.ts'), 'utf8');
    expect(source).not.toMatch(
      /\b(getDay|getDate|getMonth|getFullYear|getHours|setDate|setHours)\(/
    );
    const constructions = source.match(/new Date\(/g) ?? [];
    expect(constructions).toHaveLength(1);
    const fn = source.slice(source.indexOf('export function utcTodayGuess'));
    expect(fn).toMatch(/new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
  });
});
