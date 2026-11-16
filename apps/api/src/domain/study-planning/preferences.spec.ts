import {
  PREFERENCES_BAG_MAX_BYTES,
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
    it('exposes the documented defaults 60 / 15 / 120 / 240, plus EP13F’s 15 / 80 and EP13K’s 60 / 3', () => {
      expect(DEFAULTS).toEqual({
        sessionLengthMinutes: 60,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
        breakMinutes: 15,
        densityPercent: 80,
        dailyGoalMinutes: 60,
        weeklyGoalDays: 3,
      });
    });

    it('exposes the documented bounds 5..480 / 5..480 / 5..480 / 5..1440 / 0..60 / 50..100 / 5..480 / 1..7', () => {
      expect(STUDY_PREFERENCE_BOUNDS).toEqual({
        sessionLengthMinutes: { min: 5, max: 480 },
        minSessionMinutes: { min: 5, max: 480 },
        maxSessionMinutes: { min: 5, max: 480 },
        dailyCapMinutes: { min: 5, max: 1440 },
        // EP13F (D13-5): a zero break is a legitimate choice, and the
        // density floor keeps the cap from starving a plan.
        breakMinutes: { min: 0, max: 60 },
        densityPercent: { min: 50, max: 100 },
        dailyGoalMinutes: { min: 5, max: 480 },
        weeklyGoalDays: { min: 1, max: 7 },
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
        ...DEFAULTS,
        sessionLengthMinutes: 45,
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
        ...DEFAULTS,
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
        ...DEFAULTS,
        sessionLengthMinutes: 90,
        minSessionMinutes: 90,
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
        ...DEFAULTS,
        sessionLengthMinutes: 200,
        minSessionMinutes: 200,
        maxSessionMinutes: 200,
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
        ...DEFAULTS,
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

    it('returns exactly the eight keys', () => {
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

  // =========================================================================
  // EP13F — the two placement levers (D13-5): `breakMinutes`, `densityPercent`.
  // =========================================================================

  describe('the EP13F placement keys (D13-5)', () => {
    it('a bag written before EP13F still reads back valid — both keys default', () => {
      // The exact four-key object EP06 used to write.
      const legacyBag = {
        studyDefaults: {
          sessionLengthMinutes: 45,
          minSessionMinutes: 20,
          maxSessionMinutes: 90,
          dailyCapMinutes: 300,
        },
      };
      expect(readStudyPreferences(legacyBag)).toEqual({
        sessionLengthMinutes: 45,
        minSessionMinutes: 20,
        maxSessionMinutes: 90,
        dailyCapMinutes: 300,
        breakMinutes: 15,
        densityPercent: 80,
        dailyGoalMinutes: 60,
        weeklyGoalDays: 3,
      });
    });

    it('keeps stored values inside the bounds', () => {
      const prefs = readStudyPreferences({
        studyDefaults: { breakMinutes: 5, densityPercent: 65 },
      });
      expect(prefs.breakMinutes).toBe(5);
      expect(prefs.densityPercent).toBe(65);
    });

    it('keeps the boundary values 0 / 60 and 50 / 100', () => {
      expect(
        readStudyPreferences({ studyDefaults: { breakMinutes: 0, densityPercent: 50 } })
      ).toEqual({ ...DEFAULTS, breakMinutes: 0, densityPercent: 50 });
      expect(
        readStudyPreferences({ studyDefaults: { breakMinutes: 60, densityPercent: 100 } })
      ).toEqual({ ...DEFAULTS, breakMinutes: 60, densityPercent: 100 });
    });

    it('falls back for out-of-range, non-integer and wrong-typed values', () => {
      const cases: unknown[] = [-1, 61, 10.5, '15', true, null, {}, []];
      for (const value of cases) {
        const prefs = readStudyPreferences({ studyDefaults: { breakMinutes: value } });
        expect(prefs.breakMinutes).toBe(15);
      }
      for (const value of [49, 101, 80.5, '80', false, null]) {
        const prefs = readStudyPreferences({ studyDefaults: { densityPercent: value } });
        expect(prefs.densityPercent).toBe(80);
      }
    });

    it('takes part in no cross-field repair (the four D06-4 steps ignore them)', () => {
      // An inverted min/max pair is repaired; the two levers pass through.
      const prefs = readStudyPreferences({
        studyDefaults: {
          sessionLengthMinutes: 60,
          minSessionMinutes: 300,
          maxSessionMinutes: 200,
          breakMinutes: 0,
          densityPercent: 50,
        },
      });
      expect(prefs.minSessionMinutes).toBe(200);
      expect(prefs.breakMinutes).toBe(0);
      expect(prefs.densityPercent).toBe(50);
    });

    it('the validator checks their own bounds and names the field', () => {
      expect(validateStudyPreferences({ breakMinutes: 61 })).toEqual({
        breakMinutes: ['breakMinutes must be between 0 and 60'],
      });
      expect(validateStudyPreferences({ densityPercent: 49 })).toEqual({
        densityPercent: ['densityPercent must be between 50 and 100'],
      });
      expect(validateStudyPreferences({ breakMinutes: 10.5 })).toEqual({
        breakMinutes: ['breakMinutes must be an integer'],
      });
      expect(validateStudyPreferences({ breakMinutes: 0, densityPercent: 100 })).toBeNull();
    });

    it('the cross-field rules still run when only the four D06-4 keys are present', () => {
      // EP13F must not make a rule un-evaluable by adding keys to the bag.
      expect(
        validateStudyPreferences({
          sessionLengthMinutes: 10,
          minSessionMinutes: 30,
          maxSessionMinutes: 120,
          dailyCapMinutes: 240,
        })
      ).toEqual({
        sessionLengthMinutes: [
          'sessionLengthMinutes must be greater than or equal to minSessionMinutes',
        ],
      });
    });

    it('the complete object still fits the 4096-byte bag cap with room to spare', () => {
      const serialized = JSON.stringify({ studyDefaults: DEFAULTS });
      expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThan(PREFERENCES_BAG_MAX_BYTES);
    });
  });

  describe('the EP13K momentum goals (D-K6/D-K7)', () => {
    it('a bag with the EP13F keys but no goals reads back the goal defaults (additive)', () => {
      const prefs = readStudyPreferences({
        studyDefaults: { breakMinutes: 10, densityPercent: 60 },
      });
      expect(prefs.dailyGoalMinutes).toBe(60);
      expect(prefs.weeklyGoalDays).toBe(3);
    });

    it('keeps stored goals and the boundary values', () => {
      expect(
        readStudyPreferences({ studyDefaults: { dailyGoalMinutes: 5, weeklyGoalDays: 1 } })
      ).toEqual({ ...DEFAULTS, dailyGoalMinutes: 5, weeklyGoalDays: 1 });
      expect(
        readStudyPreferences({ studyDefaults: { dailyGoalMinutes: 480, weeklyGoalDays: 7 } })
      ).toEqual({ ...DEFAULTS, dailyGoalMinutes: 480, weeklyGoalDays: 7 });
    });

    it('falls back per field for an out-of-range goal (0, 481; 0, 8)', () => {
      for (const value of [0, 481, 45.5, '45', null]) {
        expect(
          readStudyPreferences({ studyDefaults: { dailyGoalMinutes: value } }).dailyGoalMinutes
        ).toBe(60);
      }
      for (const value of [0, 8, 2.5, '3', null]) {
        expect(
          readStudyPreferences({ studyDefaults: { weeklyGoalDays: value } }).weeklyGoalDays
        ).toBe(3);
      }
    });

    it('the validator names the goal field and its bounds', () => {
      expect(validateStudyPreferences({ weeklyGoalDays: 8 })).toEqual({
        weeklyGoalDays: ['weeklyGoalDays must be between 1 and 7'],
      });
      expect(validateStudyPreferences({ dailyGoalMinutes: 4 })).toEqual({
        dailyGoalMinutes: ['dailyGoalMinutes must be between 5 and 480'],
      });
    });
  });
});
