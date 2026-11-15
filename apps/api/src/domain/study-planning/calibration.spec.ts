import {
  CALIBRATION_MAX_MULTIPLIER,
  CALIBRATION_MIN_MULTIPLIER,
  CALIBRATION_MIN_SAMPLES,
  calibratedEstimateMinutes,
  calibrationSamplesOf,
  computeCalibration,
  median,
  multiplierFor,
} from './calibration';
import type { CalibrationSample, FinishedAssignmentFacts } from './calibration';
import { classifyAssignments } from './remaining-work';
import { schedule } from './scheduler';
import type { AssignmentFacts, SchedulerInput, StudyPreferences } from './types';

/**
 * EP13L domain unit spec (pure, no database, no clock, no zone): the
 * deterministic estimate calibration (TR-E13-12, D13-7).
 *
 * - the median / ≥3-sample gate / clamp [0.5, 3.0] / per-type with overall
 *   fallback matrix (EP13L-AC1, D-L3);
 * - the sample rule (finished assignments with an estimate > 0 and confirmed
 *   minutes > 0 — D-L2);
 * - the application order `est × m − confirmed`, clamped ≥ 0 (EP13L-AC2,
 *   D-L1), raw estimates untouched, identity when uncalibrated (EP13L-AC3);
 * - the EP13G interaction (EP13L-AC5): the same fixture with and without
 *   calibration — the anchor shift and `placed + deficit = calibrated
 *   remaining`.
 */
describe('estimate calibration (domain, EP13L)', () => {
  const sample = (
    assignmentType: string | null,
    estimatedHours: number,
    confirmedMinutes: number
  ): CalibrationSample => ({ assignmentType, estimatedHours, confirmedMinutes });

  /** `n` samples of one type, each with the same confirmed/estimated ratio. */
  const samplesOf = (assignmentType: string | null, ratio: number, n: number) =>
    Array.from({ length: n }, () => sample(assignmentType, 1, Math.round(60 * ratio)));

  describe('median', () => {
    it('is the middle value of an odd list and the mean of the two middle values of an even one', () => {
      expect(median([3, 1, 2])).toBe(2);
      expect(median([4, 1, 3, 2])).toBe(2.5);
      expect(median([7])).toBe(7);
    });

    it('does not depend on input order', () => {
      expect(median([1, 10, 100])).toBe(median([100, 1, 10]));
    });
  });

  describe('the sample rule (D-L2)', () => {
    const finished = (
      overrides: Partial<FinishedAssignmentFacts> = {}
    ): FinishedAssignmentFacts => ({
      id: 'f-1',
      assignmentType: 'PAPER',
      estimatedHours: 2,
      status: 'COMPLETED',
      ...overrides,
    });

    it('keeps COMPLETED, SUBMITTED and GRADED assignments with an estimate > 0 and confirmed minutes > 0', () => {
      const confirmed = new Map([
        ['f-1', 150],
        ['f-2', 90],
        ['f-3', 60],
      ]);
      const rows = [
        finished({ id: 'f-1', status: 'COMPLETED' }),
        finished({ id: 'f-2', status: 'SUBMITTED' }),
        finished({ id: 'f-3', status: 'GRADED' }),
      ];
      expect(calibrationSamplesOf(rows, confirmed)).toEqual([
        sample('PAPER', 2, 150),
        sample('PAPER', 2, 90),
        sample('PAPER', 2, 60),
      ]);
    });

    it('drops unfinished rows, missing/non-positive estimates and assignments without confirmed time', () => {
      const confirmed = new Map([
        ['pending', 100],
        ['no-estimate', 100],
        ['zero-estimate', 100],
      ]);
      const rows = [
        finished({ id: 'pending', status: 'PENDING' }),
        finished({ id: 'in-progress', status: 'IN_PROGRESS' }),
        finished({ id: 'no-estimate', estimatedHours: null }),
        finished({ id: 'zero-estimate', estimatedHours: 0 }),
        finished({ id: 'unconfirmed' }),
      ];
      expect(calibrationSamplesOf(rows, confirmed)).toEqual([]);
    });
  });

  describe('the multiplier matrix (EP13L-AC1)', () => {
    it('yields no multiplier for 0, 1 or 2 samples (the ≥3-sample gate)', () => {
      expect(CALIBRATION_MIN_SAMPLES).toBe(3);
      for (const n of [0, 1, 2]) {
        const table = computeCalibration(samplesOf('PAPER', 2, n));
        expect(multiplierFor(table, 'PAPER')).toBeNull();
        expect(multiplierFor(table, null)).toBeNull();
      }
    });

    it('yields the per-type median once a type has 3 samples', () => {
      const table = computeCalibration([
        sample('PAPER', 1, 90), // 1.5
        sample('PAPER', 2, 192), // 1.6
        sample('PAPER', 1, 120), // 2.0
      ]);
      expect(multiplierFor(table, 'PAPER')).toEqual({
        assignmentType: 'PAPER',
        multiplier: 1.6,
        samples: 3,
      });
    });

    it('an outlier ratio cannot drag the median and the clamp bounds the result', () => {
      // Three ordinary papers and one wildly long one: the median stays 1.5.
      const table = computeCalibration([
        ...samplesOf('PAPER', 1.5, 3),
        sample('PAPER', 1, 60 * 10),
      ]);
      expect(multiplierFor(table, 'PAPER')?.multiplier).toBe(1.5);

      expect(CALIBRATION_MIN_MULTIPLIER).toBe(0.5);
      expect(CALIBRATION_MAX_MULTIPLIER).toBe(3);
      expect(multiplierFor(computeCalibration(samplesOf('QUIZ', 10, 3)), 'QUIZ')?.multiplier).toBe(
        3
      );
      expect(multiplierFor(computeCalibration(samplesOf('QUIZ', 0.1, 3)), 'QUIZ')?.multiplier).toBe(
        0.5
      );
    });

    it('a type with fewer than 3 samples falls back to the overall median when there are ≥3 samples overall (D-L3)', () => {
      const table = computeCalibration([
        ...samplesOf('PAPER', 2, 3),
        sample('HOMEWORK', 1, 60), // 1.0 — one sample, no per-type figure
      ]);
      // Overall: [2, 2, 2, 1] → median 2.
      expect(multiplierFor(table, 'HOMEWORK')).toEqual({
        assignmentType: null,
        multiplier: 2,
        samples: 4,
      });
      // A type never seen uses the same overall figure.
      expect(multiplierFor(table, 'EXAM')).toEqual({
        assignmentType: null,
        multiplier: 2,
        samples: 4,
      });
      // The type with its own 3 samples keeps its own figure.
      expect(multiplierFor(table, 'PAPER')).toEqual({
        assignmentType: 'PAPER',
        multiplier: 2,
        samples: 3,
      });
    });

    it('an assignment without a type never has a per-type figure; it uses the overall fallback', () => {
      const table = computeCalibration(samplesOf(null, 1.5, 3));
      expect(multiplierFor(table, null)).toEqual({
        assignmentType: null,
        multiplier: 1.5,
        samples: 3,
      });
    });

    it('the overall fallback is itself gated at 3 samples: mixed types with 2 samples in total give nothing', () => {
      const table = computeCalibration([sample('PAPER', 1, 120), sample('QUIZ', 1, 120)]);
      expect(multiplierFor(table, 'PAPER')).toBeNull();
      expect(multiplierFor(table, 'HOMEWORK')).toBeNull();
    });

    it('is deterministic: the same history yields identical tables regardless of sample order', () => {
      const history = [
        ...samplesOf('PAPER', 1.8, 3),
        ...samplesOf('HOMEWORK', 0.9, 4),
        sample('QUIZ', 1, 30),
      ];
      const a = computeCalibration(history);
      const b = computeCalibration([...history].reverse());
      for (const type of ['PAPER', 'HOMEWORK', 'QUIZ', 'EXAM', null]) {
        expect(multiplierFor(a, type)).toEqual(multiplierFor(b, type));
      }
    });

    it('rounds the multiplier to two decimals so the annotation is stable', () => {
      // ratios 1.333…, 1.333…, 1.333…
      const table = computeCalibration(samplesOf('PAPER', 4 / 3, 3));
      expect(multiplierFor(table, 'PAPER')?.multiplier).toBe(1.33);
    });
  });

  describe('application (EP13L-AC2, D-L1)', () => {
    const createdAt = new Date('2026-10-20T12:00:00.000Z');
    const facts = (overrides: Partial<AssignmentFacts> = {}): AssignmentFacts => ({
      id: 'a-1',
      title: 'Essay',
      courseCode: null,
      dueDate: '2026-11-05',
      estimatedHours: 2,
      status: 'PENDING',
      priority: 'MEDIUM',
      createdAt,
      assignmentType: 'PAPER',
      ...overrides,
    });
    const papersTakeLonger = computeCalibration(samplesOf('PAPER', 1.6, 3));

    it('scales the estimate and rounds to whole minutes', () => {
      expect(calibratedEstimateMinutes(120, 1.6)).toBe(192);
      expect(calibratedEstimateMinutes(50, 1.33)).toBe(67);
      expect(calibratedEstimateMinutes(120, null)).toBe(120);
    });

    it('multiplies the estimate BEFORE confirmed minutes are subtracted (est × m − confirmed)', () => {
      const confirmed = new Map([['a-1', 30]]);
      const { schedulable } = classifyAssignments([facts()], confirmed, papersTakeLonger);
      // 120 × 1.6 = 192; 192 − 30 = 162 — not (120 − 30) × 1.6 = 144.
      expect(schedulable[0].remainingMinutes).toBe(162);
      expect(schedulable[0].confirmedMinutes).toBe(30);
    });

    it('keeps the raw estimate visible and carries the explanation', () => {
      const { schedulable } = classifyAssignments([facts()], new Map(), papersTakeLonger);
      expect(schedulable[0].estimatedMinutes).toBe(120);
      expect(schedulable[0].calibration).toEqual({
        assignmentType: 'PAPER',
        multiplier: 1.6,
        samples: 3,
      });
    });

    it('never goes negative', () => {
      const confirmed = new Map([['a-1', 500]]);
      const { schedulable } = classifyAssignments([facts()], confirmed, papersTakeLonger);
      expect(schedulable[0].remainingMinutes).toBe(0);
    });

    it('is the identity for an uncalibrated student: same figures as today, no annotation (EP13L-AC3)', () => {
      const confirmed = new Map([['a-1', 30]]);
      const plain = classifyAssignments([facts()], confirmed);
      const empty = classifyAssignments([facts()], confirmed, computeCalibration([]));
      const twoSamples = classifyAssignments(
        [facts()],
        confirmed,
        computeCalibration(samplesOf('PAPER', 1.6, 2))
      );
      expect(plain.schedulable[0].remainingMinutes).toBe(90);
      expect(plain.schedulable[0].calibration).toBeNull();
      expect(empty.schedulable).toEqual(plain.schedulable);
      expect(twoSamples.schedulable).toEqual(plain.schedulable);
    });

    it('does not mutate the input facts (assignments are never written)', () => {
      const input = facts();
      const snapshot = { ...input };
      classifyAssignments([input], new Map(), papersTakeLonger);
      expect(input).toEqual(snapshot);
    });

    it('flagged assignments keep their flag and carry the annotation only when an estimate exists', () => {
      const noDue = facts({ dueDate: null });
      const noEstimate = facts({ id: 'a-2', estimatedHours: null });
      const { flagged } = classifyAssignments([noDue, noEstimate], new Map(), papersTakeLonger);
      expect(flagged[0].flagged).toBe('MISSING_DUE_DATE');
      expect(flagged[0].remainingMinutes).toBe(192);
      expect(flagged[0].calibration?.multiplier).toBe(1.6);
      expect(flagged[1].flagged).toBe('MISSING_ESTIMATE');
      expect(flagged[1].calibration).toBeNull();
    });
  });

  describe('the EP13G anchor partition under calibration (EP13L-AC5)', () => {
    const PREFS: StudyPreferences = {
      sessionLengthMinutes: 60,
      minSessionMinutes: 15,
      maxSessionMinutes: 120,
      dailyCapMinutes: 240,
      breakMinutes: 15,
      densityPercent: 80,
    };
    /** A week of open evenings: 17:00–22:00 (300 free minutes, 240 at 80%). */
    const openEvenings = () =>
      [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startMinute: 17 * 60,
        endMinute: 22 * 60,
      }));
    const days = [
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ];
    // Five hours of a paper due tomorrow: today + tomorrow hold 480 minutes,
    // so 300 leaves slack (FLEX_DAY). Papers historically take 2× → 600
    // minutes: more than the horizon holds, so the work pins and the excess
    // becomes a deadline deficit — visible, never silently lost.
    const paper: AssignmentFacts = {
      id: 'paper',
      title: 'Term paper',
      courseCode: null,
      dueDate: '2026-10-31',
      estimatedHours: 5,
      status: 'PENDING',
      priority: 'MEDIUM',
      createdAt: new Date('2026-10-20T12:00:00.000Z'),
      assignmentType: 'PAPER',
    };
    const papersTakeTwice = computeCalibration(samplesOf('PAPER', 2, 3));

    const run = (calibrated: boolean) => {
      const { schedulable } = classifyAssignments(
        [paper],
        new Map(),
        calibrated ? papersTakeTwice : undefined
      );
      const input: SchedulerInput = {
        days,
        assignments: schedulable,
        availability: openEvenings(),
        blocked: [],
        classes: [],
        busy: [],
        preferences: PREFS,
      };
      return { remaining: schedulable[0].remainingMinutes, out: schedule(input) };
    };

    it('the same fixture shifts from FLEX_DAY to FIXED when calibration removes the slack', () => {
      const plain = run(false);
      const calibrated = run(true);

      expect(plain.remaining).toBe(300);
      expect(plain.out.sessions.length).toBeGreaterThan(0);
      expect(plain.out.sessions.every((s) => s.anchor === 'FLEX_DAY')).toBe(true);
      expect(plain.out.results[0].deficitCategory).toBeNull();

      expect(calibrated.remaining).toBe(600);
      expect(calibrated.out.sessions.length).toBeGreaterThan(0);
      expect(calibrated.out.sessions.every((s) => s.anchor === 'FIXED')).toBe(true);
      expect(calibrated.out.results[0].deficitCategory).toBe('INSUFFICIENT_TIME_BEFORE_DEADLINE');
    });

    it('no silent loss: placed + deficit = calibrated remaining', () => {
      for (const calibrated of [false, true]) {
        const { remaining, out } = run(calibrated);
        const placed = out.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
        expect(out.results[0].placedMinutes).toBe(placed);
        expect(placed + out.results[0].deficitMinutes + out.results[0].deferredMinutes).toBe(
          remaining
        );
      }
    });

    it('is deterministic: the same history yields the same anchors', () => {
      const a = run(true).out;
      const b = run(true).out;
      expect(b).toEqual(a);
    });
  });
});
