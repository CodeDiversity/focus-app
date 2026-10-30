import {
  STUDY_PREFERENCE_BOUNDS,
  STUDY_PREFERENCE_DEFAULTS,
  STUDY_PREFERENCE_KEYS,
  readStudyPreferences,
  validateStudyPreferences,
} from './preferences';
import type { StudyPreferences } from './types';

/**
 * EP06A domain unit spec (pure, no database): the `studyDefaults` shape
 * (D06-4), its bounds, its cross-field validator and the **defensive
 * reader**'s four ordered steps (D06-14).
 *
 * The reader's post-condition is the load-bearing property: for **every**
 * input — missing, partial, malformed — the four returned values are inside
 * their own bounds and satisfy both cross-field rules. The reader never
 * throws.
 */
describe('study preferences (domain, EP06A)', () => {
  const DEFAULTS = STUDY_PREFERENCE_DEFAULTS;

  /** The post-condition: in bounds, and both cross-field rules hold. */
  const expectValidCombination = (prefs: StudyPreferences) => {
    for (const key of STUDY_PREFERENCE_KEYS) {
      const { min, max } = STUDY_PREFERENCE_BOUNDS[key];
      expect(Number.isInteger(prefs[key])).toBe(true);
      expect(prefs[key]).toBeGreaterThanOrEqual(min);
      expect(prefs[key]).toBeLessThanOrEqual(max);
    }
    expect(prefs.minSessionMinutes).toBeLessThanOrEqual(prefs.sessionLengthMinutes);
    expect(prefs.sessionLengthMinutes).toBeLessThanOrEqual(prefs.maxSessionMinutes);
    expect(prefs.dailyCapMinutes).toBeGreaterThanOrEqual(prefs.minSessionMinutes);
  };

  describe('the defaults and the bounds (D06-4)', () => {
    it('exposes the documented defaults 60 / 15 / 120 / 240', () => {
      expect(DEFAULTS).toEqual({
        sessionLengthMinutes: 60,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
    });

    it('exposes the documented bounds 5..480 / 5..480 / 5..480 / 5..1440', () => {
      expect(STUDY_PREFERENCE_BOUNDS).toEqual({
        sessionLengthMinutes: { min: 5, max: 480 },
        minSessionMinutes: { min: 5, max: 480 },
        maxSessionMinutes: { min: 5, max: 480 },
        dailyCapMinutes: { min: 5, max: 1440 },
      });
    });
  });

  describe('the defensive reader — step 1: the per-field bounds fallback', () => {
    it('returns the defaults for a null bag, an absent bag and a non-object bag', () => {
      for (const bag of [null, undefined, 'studyDefaults', 42, true, ['a']]) {
        expect(readStudyPreferences(bag)).toEqual(DEFAULTS);
      }
    });

    it('returns the defaults for a bag without a studyDefaults key', () => {
      expect(readStudyPreferences({ theme: 'dark' })).toEqual(DEFAULTS);
    });

    it('returns the defaults for a studyDefaults key that is not an object', () => {
      for (const studyDefaults of [null, 'sixty', 60, true, [60, 15, 120, 240]]) {
        expect(readStudyPreferences({ studyDefaults })).toEqual(DEFAULTS);
      }
    });

    it('falls back per field when the key is missing', () => {
      expect(readStudyPreferences({ studyDefaults: { sessionLengthMinutes: 45 } })).toEqual({
        sessionLengthMinutes: 45,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
    });

    it('falls back per field for a wrong type (a string, a float, a boolean)', () => {
      const cases: unknown[] = ['60', 60.5, true, false, {}, [], null];
      for (const value of cases) {
        const prefs = readStudyPreferences({
          studyDefaults: {
            sessionLengthMinutes: value,
            minSessionMinutes: value,
            maxSessionMinutes: value,
            dailyCapMinutes: value,
          },
        });
        expect(prefs).toEqual(DEFAULTS);
      }
    });

    it('falls back per field for an out-of-range value (0, negative, above the bound)', () => {
      expect(
        readStudyPreferences({
          studyDefaults: {
            sessionLengthMinutes: 0,
            minSessionMinutes: -5,
            maxSessionMinutes: 481,
            dailyCapMinutes: 1441,
          },
        })
      ).toEqual(DEFAULTS);
    });

    it('keeps the boundary values 5 and 480 (and 1440 for the cap)', () => {
      expect(
        readStudyPreferences({
          studyDefaults: {
            sessionLengthMinutes: 5,
            minSessionMinutes: 5,
            maxSessionMinutes: 480,
            dailyCapMinutes: 1440,
          },
        })
      ).toEqual({
        sessionLengthMinutes: 5,
        minSessionMinutes: 5,
        maxSessionMinutes: 480,
        dailyCapMinutes: 1440,
      });
    });

    it('never reads the bag’s other keys', () => {
      const prefs = readStudyPreferences({
        theme: 'dark',
        studyDefaults: { sessionLengthMinutes: 90 },
        notifications: { email: false },
      });
      expect(Object.keys(prefs).sort()).toEqual([...STUDY_PREFERENCE_KEYS].sort());
    });
  });

  describe('the defensive reader — step 2: the inverted min/max pair', () => {
    it('lowers the minimum to the maximum (the maximum is kept)', () => {
      const prefs = readStudyPreferences({
        studyDefaults: {
          sessionLengthMinutes: 60,
          minSessionMinutes: 300,
          maxSessionMinutes: 200,
          dailyCapMinutes: 240,
        },
      });
      expect(prefs.minSessionMinutes).toBe(200);
      expect(prefs.maxSessionMinutes).toBe(200);
    });
  });

  describe('the defensive reader — step 3: the session length is clamped', () => {
    it('raises the session length to the minimum', () => {
      const prefs = readStudyPreferences({
        studyDefaults: {
          sessionLengthMinutes: 60,
          minSessionMinutes: 90,
          maxSessionMinutes: 120,
          dailyCapMinutes: 240,
        },
      });
      expect(prefs.sessionLengthMinutes).toBe(90);
    });

    it('lowers the session length to the maximum', () => {
      const prefs = readStudyPreferences({
        studyDefaults: {
          sessionLengthMinutes: 400,
          minSessionMinutes: 15,
          maxSessionMinutes: 120,
          dailyCapMinutes: 240,
        },
      });
      expect(prefs.sessionLengthMinutes).toBe(120);
    });
  });

  describe('the defensive reader — step 4: the daily cap is raised', () => {
    it('raises the daily cap to the minimum session length', () => {
      const prefs = readStudyPreferences({
        studyDefaults: {
          sessionLengthMinutes: 60,
          minSessionMinutes: 15,
          maxSessionMinutes: 120,
          dailyCapMinutes: 10,
        },
      });
      expect(prefs.dailyCapMinutes).toBe(15);
    });
  });

  describe('the defensive reader — the worked examples of the shared contract', () => {
    it('60 / 90 / 120 / 240 → 90 / 90 / 120 / 240 (the review’s counterexample bag)', () => {
      expect(
        readStudyPreferences({
          studyDefaults: {
            sessionLengthMinutes: 60,
            minSessionMinutes: 90,
            maxSessionMinutes: 120,
            dailyCapMinutes: 240,
          },
        })
      ).toEqual({
        sessionLengthMinutes: 90,
        minSessionMinutes: 90,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
    });

    it('60 / 300 / 200 / 240 → 200 / 200 / 200 / 240 (the inverted pair, then the clamp)', () => {
      expect(
        readStudyPreferences({
          studyDefaults: {
            sessionLengthMinutes: 60,
            minSessionMinutes: 300,
            maxSessionMinutes: 200,
            dailyCapMinutes: 240,
          },
        })
      ).toEqual({
        sessionLengthMinutes: 200,
        minSessionMinutes: 200,
        maxSessionMinutes: 200,
        dailyCapMinutes: 240,
      });
    });

    it('a stored 600 falls back to the default 60 (step 1, 600 > 480)', () => {
      expect(
        readStudyPreferences({
          studyDefaults: {
            sessionLengthMinutes: 600,
            minSessionMinutes: 15,
            maxSessionMinutes: 120,
            dailyCapMinutes: 240,
          },
        })
      ).toEqual(DEFAULTS);
    });

    it('a stored daily cap of 10 is raised to 15 (step 4)', () => {
      expect(
        readStudyPreferences({
          studyDefaults: {
            sessionLengthMinutes: 60,
            minSessionMinutes: 15,
            maxSessionMinutes: 120,
            dailyCapMinutes: 10,
          },
        })
      ).toEqual({
        sessionLengthMinutes: 60,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 15,
      });
    });
  });

  describe('the defensive reader — the post-condition and the never-throws rule', () => {
    it('returns a valid combination for a fuzz of shapes', () => {
      const shapes: unknown[] = [
        null,
        undefined,
        0,
        1,
        -1,
        60.5,
        '',
        'sessionLengthMinutes',
        true,
        false,
        [],
        [1, 2, 3],
        {},
        { studyDefaults: null },
        { studyDefaults: 'nope' },
        { studyDefaults: 60 },
        { studyDefaults: [] },
        { studyDefaults: {} },
        { studyDefaults: { sessionLengthMinutes: null } },
        { studyDefaults: { sessionLengthMinutes: '60' } },
        { studyDefaults: { sessionLengthMinutes: 60.5 } },
        { studyDefaults: { sessionLengthMinutes: -60 } },
        { studyDefaults: { sessionLengthMinutes: 0 } },
        { studyDefaults: { sessionLengthMinutes: 1e9 } },
        { studyDefaults: { sessionLengthMinutes: Number.NaN } },
        { studyDefaults: { sessionLengthMinutes: Number.POSITIVE_INFINITY } },
        { studyDefaults: { minSessionMinutes: 480, maxSessionMinutes: 5 } },
        {
          studyDefaults: { minSessionMinutes: 480, maxSessionMinutes: 5, sessionLengthMinutes: 5 },
        },
        { studyDefaults: { minSessionMinutes: 5, dailyCapMinutes: 5 } },
        { studyDefaults: { maxSessionMinutes: 5, minSessionMinutes: 480, dailyCapMinutes: 5 } },
      ];

      for (const shape of shapes) {
        let prefs: StudyPreferences | undefined;
        expect(() => {
          prefs = readStudyPreferences(shape);
        }).not.toThrow();
        expectValidCombination(prefs as StudyPreferences);
      }
    });

    it('returns exactly the four keys', () => {
      expect(Object.keys(readStudyPreferences({ theme: 'dark' })).sort()).toEqual(
        [...STUDY_PREFERENCE_KEYS].sort()
      );
    });
  });

  describe('the cross-field validator', () => {
    it('accepts a valid combination', () => {
      expect(validateStudyPreferences(DEFAULTS)).toBeNull();
      expect(
        validateStudyPreferences({
          sessionLengthMinutes: 5,
          minSessionMinutes: 5,
          maxSessionMinutes: 5,
          dailyCapMinutes: 5,
        })
      ).toBeNull();
      expect(
        validateStudyPreferences({
          sessionLengthMinutes: 480,
          minSessionMinutes: 480,
          maxSessionMinutes: 480,
          dailyCapMinutes: 1440,
        })
      ).toBeNull();
    });

    it('rejects a session length below the minimum and names the field', () => {
      const errors = validateStudyPreferences({
        sessionLengthMinutes: 10,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
      expect(errors).not.toBeNull();
      expect(errors).toHaveProperty('sessionLengthMinutes');
      expect(errors?.sessionLengthMinutes[0]).toContain('minSessionMinutes');
    });

    it('rejects a session length above the maximum and names the field', () => {
      const errors = validateStudyPreferences({
        sessionLengthMinutes: 130,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
      expect(errors).toHaveProperty('sessionLengthMinutes');
      expect(errors?.sessionLengthMinutes[0]).toContain('maxSessionMinutes');
    });

    it('rejects a daily cap below the minimum and names the field', () => {
      const errors = validateStudyPreferences({
        sessionLengthMinutes: 60,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 10,
      });
      expect(errors).toHaveProperty('dailyCapMinutes');
      expect(errors?.dailyCapMinutes[0]).toContain('minSessionMinutes');
    });

    it('rejects an out-of-range value and names the field', () => {
      const errors = validateStudyPreferences({
        sessionLengthMinutes: 4,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 1441,
      });
      expect(errors).toHaveProperty('sessionLengthMinutes');
      expect(errors).toHaveProperty('dailyCapMinutes');
      expect(errors?.sessionLengthMinutes[0]).toContain('between 5 and 480');
      expect(errors?.dailyCapMinutes[0]).toContain('between 5 and 1440');
    });

    it('rejects a non-integer value and names the field', () => {
      const errors = validateStudyPreferences({
        sessionLengthMinutes: 60.5,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
      expect(errors).toHaveProperty('sessionLengthMinutes');
      expect(errors?.sessionLengthMinutes[0]).toContain('integer');
    });

    it('does not report a cross-field rule it cannot evaluate (a partial input)', () => {
      // A missing key is not an error on its own — the service validates the
      // merged values, where every key is present.
      expect(validateStudyPreferences({ sessionLengthMinutes: 300 })).toBeNull();
      expect(validateStudyPreferences({})).toBeNull();
      expect(validateStudyPreferences(null)).toBeNull();
    });
  });
});
