import { describe, it, expect } from 'vitest';
import { weekLine } from './weekLine';

describe('weekLine (EP16C, D-C5)', () => {
  it('formats both civil dates verbatim (UTC formatting, no zone arithmetic)', () => {
    expect(weekLine('2026-10-30', '2026-11-05', 'UTC', 'UTC')).toBe('Oct 30, 2026 – Nov 5, 2026');
    expect(weekLine('2026-10-30', '2026-11-05', 'Pacific/Kiritimati', 'Pacific/Kiritimati')).toBe(
      'Oct 30, 2026 – Nov 5, 2026'
    );
  });

  it('omits the zone when profile = browser', () => {
    expect(
      weekLine('2026-10-30', '2026-11-05', 'America/New_York', 'America/New_York')
    ).not.toMatch(/Times shown/);
  });

  it('appends "Times shown in <zone>" when they differ', () => {
    expect(weekLine('2026-10-30', '2026-11-05', 'America/New_York', 'Europe/London')).toBe(
      'Oct 30, 2026 – Nov 5, 2026 · Times shown in America/New_York'
    );
  });
});
