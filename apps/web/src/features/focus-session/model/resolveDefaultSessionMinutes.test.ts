import { describe, it, expect } from 'vitest';
import {
  resolveDefaultSessionMinutes,
  DEFAULT_SESSION_MINUTES,
} from './resolveDefaultSessionMinutes';

describe('resolveDefaultSessionMinutes', () => {
  it('returns the saved sessionLengthMinutes preference (EP13D — V-07-1 closed)', () => {
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionLengthMinutes: 50 } } })
    ).toBe(50);
  });

  it('ignores the legacy `sessionMinutes` key nothing ever wrote', () => {
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionMinutes: 50 } } })
    ).toBe(DEFAULT_SESSION_MINUTES);
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
      resolveDefaultSessionMinutes({
        preferences: { studyDefaults: { sessionLengthMinutes: 'x' } },
      })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({
        preferences: { studyDefaults: { sessionLengthMinutes: NaN } },
      })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({
        preferences: { studyDefaults: { sessionLengthMinutes: Infinity } },
      })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({ preferences: { studyDefaults: { sessionLengthMinutes: 4 } } })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(
      resolveDefaultSessionMinutes({
        preferences: { studyDefaults: { sessionLengthMinutes: 481 } },
      })
    ).toBe(DEFAULT_SESSION_MINUTES);
    expect(resolveDefaultSessionMinutes({ preferences: { studyDefaults: { other: 10 } } })).toBe(
      DEFAULT_SESSION_MINUTES
    );
    expect(resolveDefaultSessionMinutes({ preferences: { studyDefaults: [1, 2] } })).toBe(
      DEFAULT_SESSION_MINUTES
    );
  });
});
