import { describe, it, expect } from 'vitest';
import {
  resolveDefaultSessionMinutes,
  DEFAULT_SESSION_MINUTES,
} from './resolveDefaultSessionMinutes';

describe('resolveDefaultSessionMinutes', () => {
  it('returns the preference value when present and well-formed', () => {
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionMinutes: 50 } } })
    ).toBe(50);
  });
  it('falls back when preference absent', () => {
    expect(resolveDefaultSessionMinutes({ preferences: null })).toBe(DEFAULT_SESSION_MINUTES);
    expect(resolveDefaultSessionMinutes({ preferences: {} })).toBe(DEFAULT_SESSION_MINUTES);
    expect(resolveDefaultSessionMinutes({})).toBe(DEFAULT_SESSION_MINUTES);
    expect(resolveDefaultSessionMinutes(null)).toBe(DEFAULT_SESSION_MINUTES);
    expect(resolveDefaultSessionMinutes(undefined)).toBe(DEFAULT_SESSION_MINUTES);
  });
  it('falls back when malformed', () => {
    expect(resolveDefaultSessionMinutes({ preferences: { studyDefaults: 'x' } })).toBe(
      DEFAULT_SESSION_MINUTES
    );
    expect(resolveDefaultSessionMinutes({ preferences: { studyDefaults: null } })).toBe(
      DEFAULT_SESSION_MINUTES
    );
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionMinutes: 'x' } } })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionMinutes: NaN } } })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionMinutes: Infinity } } })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionMinutes: 4 } } })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionMinutes: 481 } } })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(resolveDefaultSessionMinutes({ preferences: { studyDefaults: { other: 10 } } })).toBe(
      DEFAULT_SESSION_MINUTES
    );
    expect(resolveDefaultSessionMinutes({ preferences: { studyDefaults: [1, 2] } })).toBe(
      DEFAULT_SESSION_MINUTES
    );
  });
});
