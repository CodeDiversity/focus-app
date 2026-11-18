import { describe, it, expect } from 'vitest';
import { dayLine } from './dayLine';

describe('dayLine (EP16A, D16-10)', () => {
  it('prints the civil date only when the profile zone is the browser zone', () => {
    expect(dayLine('2026-10-30', 'America/New_York', 'America/New_York')).toBe(
      'Today, Oct 30, 2026'
    );
  });

  it('adds "Times shown in <zone>" when the zones differ', () => {
    expect(dayLine('2026-10-30', 'America/New_York', 'Europe/London')).toBe(
      'Today, Oct 30, 2026 · Times shown in America/New_York'
    );
  });

  it('never shifts the civil date, even for a far-east zone (D05-6)', () => {
    expect(dayLine('2026-10-30', 'Pacific/Kiritimati', 'Pacific/Kiritimati')).toBe(
      'Today, Oct 30, 2026'
    );
  });
});
