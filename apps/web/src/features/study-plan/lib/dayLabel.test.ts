import { describe, it, expect } from 'vitest';
import { dayLabel } from './dayLabel';

describe('dayLabel (EP17E, AC-E17-10, D-E5)', () => {
  it('formats a mid-month date as weekday + month + day', () => {
    // The story's "Wed, Nov 19" illustrates the format; 2026-11-19 is a
    // Thursday — the label tells the truth about the civil date.
    expect(dayLabel('2026-11-19')).toBe('Thu, Nov 19');
    expect(dayLabel('2026-11-18')).toBe('Wed, Nov 18');
  });

  it('formats the 1st of a month', () => {
    expect(dayLabel('2026-11-01')).toBe('Sun, Nov 1');
  });

  it('formats a December date', () => {
    expect(dayLabel('2026-12-25')).toBe('Fri, Dec 25');
  });

  it('is stable across the runner local zone — UTC on the civil date, no browser clock', () => {
    // A civil date formatted in any non-UTC runner zone would shift at the
    // midnight boundary; pinning both edges of a day proves UTC is used.
    expect(dayLabel('2026-01-01')).toBe('Thu, Jan 1');
    expect(dayLabel('2026-12-31')).toBe('Thu, Dec 31');
  });

  it('never contains a raw ISO date', () => {
    expect(dayLabel('2026-11-19')).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
