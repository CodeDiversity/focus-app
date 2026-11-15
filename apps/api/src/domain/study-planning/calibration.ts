import type { AssignmentStatusValue, CalibrationAnnotation } from './types';

/**
 * Deterministic estimate calibration (EP13L — AC-E13-13, D13-7).
 *
 * ADHD estimates run systematically optimistic, so the planner corrects
 * them from the student's **own** finished work — plain arithmetic, no
 * model, no clock, no I/O (a pure domain module, D06-17):
 *
 * 1. **Samples** (D-L2): every finished assignment (`COMPLETED`,
 *    `SUBMITTED`, `GRADED`) with an estimate > 0 and confirmed session
 *    minutes > 0 (EP13A's attribution — never the self-reported
 *    `actualHours`) yields one ratio `confirmed ÷ estimated`.
 * 2. **Medians**: per `Assignment.type`, and once overall across every
 *    sample. A median ignores a single wild ratio, where a mean would not.
 * 3. **Gate**: a figure needs ≥ 3 samples (`CALIBRATION_MIN_SAMPLES`); a
 *    type with fewer falls back to the **overall** median, itself gated at
 *    ≥ 3 (D-L3). With no figure at all the multiplier is `null` — the
 *    caller treats that as 1.0 and emits no annotation (EP13L-AC3).
 * 4. **Clamp**: the multiplier is held to `[0.5, 3.0]` and rounded to two
 *    decimals, so one strange term cannot halve or triple a plan and the
 *    annotation reads stably.
 *
 * The result is applied **before** EP13A subtracts confirmed minutes
 * (`est × m − confirmed`, clamped ≥ 0 — D-L1): confirmed minutes are real
 * and must never be inflated. `remaining-work.ts` owns that step; this file
 * only produces the table and the per-assignment multiplier.
 */

/** A type needs this many samples for its own figure (and so does the overall fallback). */
export const CALIBRATION_MIN_SAMPLES = 3;
/** The clamp — a multiplier never leaves this range. */
export const CALIBRATION_MIN_MULTIPLIER = 0.5;
export const CALIBRATION_MAX_MULTIPLIER = 3.0;

/** The statuses that count as finished for calibration purposes. */
const FINISHED_STATUSES: ReadonlySet<AssignmentStatusValue> = new Set([
  'COMPLETED',
  'SUBMITTED',
  'GRADED',
]);

/** One finished assignment as the service reads it (no title, no dates needed). */
export type FinishedAssignmentFacts = {
  id: string;
  assignmentType: string | null;
  estimatedHours: number | null;
  status: AssignmentStatusValue;
};

/** One calibration sample: a finished assignment's estimate and its confirmed time. */
export type CalibrationSample = {
  assignmentType: string | null;
  estimatedHours: number;
  confirmedMinutes: number;
};

/**
 * The computed table: per-type figures (only types with ≥ 3 samples) plus
 * the overall fallback (or `null` under 3 samples overall).
 */
export type CalibrationTable = {
  byType: ReadonlyMap<string, CalibrationAnnotation>;
  overall: CalibrationAnnotation | null;
};

/** An empty table — the uncalibrated student. */
export const NO_CALIBRATION: CalibrationTable = { byType: new Map(), overall: null };

/** The median of a non-empty list (the mean of the two middle values when even). */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The sample rule (D-L2), in one place: finished status, estimate > 0,
 * confirmed minutes > 0. The service's query pre-filters for efficiency;
 * the rule itself lives here so it is tested and cannot drift.
 */
export function calibrationSamplesOf(
  finished: readonly FinishedAssignmentFacts[],
  confirmedByAssignment: ReadonlyMap<string, number>
): CalibrationSample[] {
  const samples: CalibrationSample[] = [];
  for (const row of finished) {
    if (!FINISHED_STATUSES.has(row.status)) continue;
    const estimatedHours = row.estimatedHours;
    if (typeof estimatedHours !== 'number' || !Number.isFinite(estimatedHours)) continue;
    if (estimatedHours <= 0) continue;
    const confirmedMinutes = confirmedByAssignment.get(row.id) ?? 0;
    if (confirmedMinutes <= 0) continue;
    samples.push({ assignmentType: row.assignmentType ?? null, estimatedHours, confirmedMinutes });
  }
  return samples;
}

function clampAndRound(multiplier: number): number {
  const clamped = Math.min(
    CALIBRATION_MAX_MULTIPLIER,
    Math.max(CALIBRATION_MIN_MULTIPLIER, multiplier)
  );
  return Math.round(clamped * 100) / 100;
}

function figureOf(
  assignmentType: string | null,
  ratios: readonly number[]
): CalibrationAnnotation | null {
  if (ratios.length < CALIBRATION_MIN_SAMPLES) return null;
  return { assignmentType, multiplier: clampAndRound(median(ratios)), samples: ratios.length };
}

/**
 * Ratios → medians → gated, clamped multipliers. Deterministic: the output
 * depends only on the multiset of samples, never on their order.
 */
export function computeCalibration(samples: readonly CalibrationSample[]): CalibrationTable {
  const ratiosByType = new Map<string, number[]>();
  const all: number[] = [];
  for (const s of samples) {
    const ratio = s.confirmedMinutes / (s.estimatedHours * 60);
    all.push(ratio);
    // An untyped assignment contributes to the overall figure only — there
    // is no "type" for it to have a figure of its own.
    if (s.assignmentType === null) continue;
    const list = ratiosByType.get(s.assignmentType);
    if (list) list.push(ratio);
    else ratiosByType.set(s.assignmentType, [ratio]);
  }

  const byType = new Map<string, CalibrationAnnotation>();
  for (const [type, ratios] of ratiosByType) {
    const figure = figureOf(type, ratios);
    if (figure) byType.set(type, figure);
  }
  return { byType, overall: figureOf(null, all) };
}

/**
 * The multiplier for one assignment: its type's own figure when the type
 * has ≥ 3 samples, else the overall fallback, else `null` (= 1.0, no
 * annotation). The returned annotation says which it was
 * (`assignmentType: null` marks the overall fallback).
 */
export function multiplierFor(
  table: CalibrationTable,
  assignmentType: string | null | undefined
): CalibrationAnnotation | null {
  if (assignmentType != null) {
    const own = table.byType.get(assignmentType);
    if (own) return own;
  }
  return table.overall;
}

/** `round(estimatedMinutes × multiplier)`; the identity when there is no multiplier. */
export function calibratedEstimateMinutes(
  estimatedMinutes: number,
  multiplier: number | null
): number {
  if (multiplier === null) return estimatedMinutes;
  return Math.round(estimatedMinutes * multiplier);
}
