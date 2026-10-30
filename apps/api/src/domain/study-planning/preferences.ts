import type { StudyPreferences } from './types';

/**
 * The `studyDefaults` contract (D06-4, seam V-07-1).
 *
 * This file is the **single** definition of the study-preferences shape:
 * the defaults, the per-field bounds, the cross-field validator and the
 * defensive reader. It is a pure domain module (D06-17): it imports nothing
 * from `@nestjs/*`, nothing from Prisma, and reads no clock — EP06C/EP06D
 * and (later) EP08 import it directly.
 */

/** The four keys of the `studyDefaults` object, in the contract's order. */
export const STUDY_PREFERENCE_KEYS = [
  'sessionLengthMinutes',
  'minSessionMinutes',
  'maxSessionMinutes',
  'dailyCapMinutes',
] as const;

/** One of the four `studyDefaults` keys. */
export type StudyPreferenceKey = (typeof STUDY_PREFERENCE_KEYS)[number];

/**
 * The defaults used when the bag is missing, when a key is missing, or when
 * a key's stored value is invalid (D06-4): `60 / 15 / 120 / 240`.
 */
export const STUDY_PREFERENCE_DEFAULTS: StudyPreferences = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
};

/**
 * The inclusive bounds of each key (D06-4): the three session-length keys
 * accept `5…480` minutes, the daily cap accepts `5…1440` minutes.
 */
export const STUDY_PREFERENCE_BOUNDS: Record<StudyPreferenceKey, { min: number; max: number }> = {
  sessionLengthMinutes: { min: 5, max: 480 },
  minSessionMinutes: { min: 5, max: 480 },
  maxSessionMinutes: { min: 5, max: 480 },
  dailyCapMinutes: { min: 5, max: 1440 },
};

/** The serialized-size cap of the `preferences` JSON column (SP-106, D106-5). */
export const PREFERENCES_BAG_MAX_BYTES = 4096;

/** A JSON object (not an array, not `null`). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A stored value is accepted only if it is an **integer inside that key's
 * bounds**. A missing key, a wrong type (a string, a float, a boolean) and
 * an out-of-range value are all rejected — the caller falls back to the
 * key's own default.
 */
function isValueInBounds(key: StudyPreferenceKey, value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return false;
  }
  const { min, max } = STUDY_PREFERENCE_BOUNDS[key];
  return value >= min && value <= max;
}

/**
 * The cross-field + bounds validator (D06-4).
 *
 * Returns the field-level `errors` map (`{ <field>: string[] }`) when the
 * values break a rule, or `null` when they are valid. The rules are:
 *
 * - every present key must be an integer inside its own bounds;
 * - `minSessionMinutes ≤ sessionLengthMinutes ≤ maxSessionMinutes`;
 * - `dailyCapMinutes ≥ minSessionMinutes`.
 *
 * A **missing** key is not an error by itself: the service validates the
 * **merged** values, where every key is present, so a partial input is
 * accepted and only its own values are checked. For the same reason the
 * cross-field rules are evaluated only when all four keys are present and
 * individually valid — a rule that cannot be evaluated is never reported.
 *
 * The error names the field the student can change and the rule it broke.
 */
export function validateStudyPreferences(input: unknown): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  const source = isPlainObject(input) ? input : {};
  const values: Partial<Record<StudyPreferenceKey, number>> = {};

  for (const key of STUDY_PREFERENCE_KEYS) {
    const raw = source[key];
    if (raw === undefined || raw === null) {
      continue; // Absent — the merge fills it; not an error on its own.
    }
    const { min, max } = STUDY_PREFERENCE_BOUNDS[key];
    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      errors[key] = [`${key} must be an integer`];
      continue;
    }
    if (raw < min || raw > max) {
      errors[key] = [`${key} must be between ${min} and ${max}`];
      continue;
    }
    values[key] = raw;
  }

  const complete = STUDY_PREFERENCE_KEYS.every((key) => values[key] !== undefined);
  if (complete) {
    const sessionLengthMinutes = values.sessionLengthMinutes as number;
    const minSessionMinutes = values.minSessionMinutes as number;
    const maxSessionMinutes = values.maxSessionMinutes as number;
    const dailyCapMinutes = values.dailyCapMinutes as number;

    if (sessionLengthMinutes < minSessionMinutes) {
      errors.sessionLengthMinutes = [
        'sessionLengthMinutes must be greater than or equal to minSessionMinutes',
      ];
    } else if (sessionLengthMinutes > maxSessionMinutes) {
      errors.sessionLengthMinutes = [
        'sessionLengthMinutes must be less than or equal to maxSessionMinutes',
      ];
    }
    if (dailyCapMinutes < minSessionMinutes) {
      errors.dailyCapMinutes = [
        'dailyCapMinutes must be greater than or equal to minSessionMinutes',
      ];
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * The **defensive reader** (D06-14): the whole `preferences` value (which
 * may be `null`) in, the four effective study defaults out.
 *
 * It never throws and never returns an invalid combination: every value it
 * returns is inside its own bounds and both cross-field rules hold. The
 * algorithm runs **these four steps in this order** — the order is part of
 * the contract, because it is what makes the effective
 * `sessionLengthMinutes` (and therefore EP07's V-07-1 re-check) mechanical:
 *
 * 1. **Per-field bounds fallback.** Each key is accepted only if it is an
 *    integer inside that key's bounds; otherwise that key falls back to its
 *    own default. The fields are independent at this step.
 * 2. **Repair the inverted min/max pair.** If `minSessionMinutes >
 *    maxSessionMinutes` then `minSessionMinutes := maxSessionMinutes` (the
 *    maximum is kept, the minimum is lowered to it). This runs **before**
 *    the clamp, so step 3 always has `min ≤ max`.
 * 3. **Clamp the session length.** If `sessionLengthMinutes <
 *    minSessionMinutes` then `sessionLengthMinutes := minSessionMinutes`; if
 *    `sessionLengthMinutes > maxSessionMinutes` then `sessionLengthMinutes
 *    := maxSessionMinutes`. At most one of the two applies.
 * 4. **Repair the daily cap.** If `dailyCapMinutes < minSessionMinutes` then
 *    `dailyCapMinutes := minSessionMinutes`.
 *
 * The bag's **other** keys are never read and never written here.
 */
export function readStudyPreferences(bag: unknown): StudyPreferences {
  const preferences = isPlainObject(bag) ? bag : undefined;
  const stored =
    preferences && isPlainObject(preferences.studyDefaults) ? preferences.studyDefaults : undefined;

  // Step 1 — per-field bounds fallback (the fields are independent here).
  const values: StudyPreferences = {
    sessionLengthMinutes: isValueInBounds('sessionLengthMinutes', stored?.sessionLengthMinutes)
      ? (stored?.sessionLengthMinutes as number)
      : STUDY_PREFERENCE_DEFAULTS.sessionLengthMinutes,
    minSessionMinutes: isValueInBounds('minSessionMinutes', stored?.minSessionMinutes)
      ? (stored?.minSessionMinutes as number)
      : STUDY_PREFERENCE_DEFAULTS.minSessionMinutes,
    maxSessionMinutes: isValueInBounds('maxSessionMinutes', stored?.maxSessionMinutes)
      ? (stored?.maxSessionMinutes as number)
      : STUDY_PREFERENCE_DEFAULTS.maxSessionMinutes,
    dailyCapMinutes: isValueInBounds('dailyCapMinutes', stored?.dailyCapMinutes)
      ? (stored?.dailyCapMinutes as number)
      : STUDY_PREFERENCE_DEFAULTS.dailyCapMinutes,
  };

  // Step 2 — repair the inverted min/max pair (the maximum is kept).
  if (values.minSessionMinutes > values.maxSessionMinutes) {
    values.minSessionMinutes = values.maxSessionMinutes;
  }

  // Step 3 — clamp the session length into [min, max].
  if (values.sessionLengthMinutes < values.minSessionMinutes) {
    values.sessionLengthMinutes = values.minSessionMinutes;
  } else if (values.sessionLengthMinutes > values.maxSessionMinutes) {
    values.sessionLengthMinutes = values.maxSessionMinutes;
  }

  // Step 4 — repair the daily cap.
  if (values.dailyCapMinutes < values.minSessionMinutes) {
    values.dailyCapMinutes = values.minSessionMinutes;
  }

  return values;
}
