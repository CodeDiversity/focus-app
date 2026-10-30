import {
  UNFINISHED_ASSIGNMENT_STATUSES,
  classifyAssignments,
  estimateToMinutes,
  isUnfinishedStatus,
  remainingMinutesOf,
} from './remaining-work';
import type { AssignmentFacts, AssignmentStatusValue } from './types';

/**
 * EP06B domain unit spec (pure, no database, no clock, no zone): the
 * remaining-work classification — the estimate → minutes conversion, the
 * unfinished-status filter, the flagging matrix (AC-E06-09, D06-25) and the
 * remaining-work arithmetic (AC-E06-02).
 *
 * The function's inputs are the *facts* the service assembles: the civil
 * due date (`YYYY-MM-DD`, D06-24 — never an instant) and the confirmed
 * minutes as a map. Nothing here touches Prisma, a clock or a time zone.
 */
describe('remaining work (domain, EP06B)', () => {
  const createdAt = new Date('2026-10-20T12:00:00.000Z');

  /** A fact set with the given overrides. */
  const facts = (overrides: Partial<AssignmentFacts> = {}): AssignmentFacts => ({
    id: 'assignment-1',
    title: 'Problem set 3',
    courseCode: 'CS101',
    dueDate: '2026-11-01',
    estimatedHours: 3,
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt,
    ...overrides,
  });

  const noConfirmed = new Map<string, number>();

  describe('the estimate → minutes conversion', () => {
    it('converts whole hours', () => {
      expect(estimateToMinutes(1)).toBe(60);
      expect(estimateToMinutes(3)).toBe(180);
      expect(estimateToMinutes(0.5)).toBe(30);
    });

    it('converts fractional hours and rounds to the nearest minute', () => {
      expect(estimateToMinutes(2.5)).toBe(150);
      expect(estimateToMinutes(1.25)).toBe(75);
      // 1.01 h = 60.6 min → 61; 1.004 h = 60.24 min → 60.
      expect(estimateToMinutes(1.01)).toBe(61);
      expect(estimateToMinutes(1.004)).toBe(60);
    });

    it('treats a missing estimate as missing (null)', () => {
      expect(estimateToMinutes(null)).toBeNull();
      expect(estimateToMinutes(undefined)).toBeNull();
    });

    it('treats a zero or negative estimate as missing, not as "no work left" (D06-25)', () => {
      expect(estimateToMinutes(0)).toBeNull();
      expect(estimateToMinutes(-2)).toBeNull();
    });
  });

  describe('the unfinished-status filter', () => {
    it('accepts PENDING and IN_PROGRESS', () => {
      expect(isUnfinishedStatus('PENDING')).toBe(true);
      expect(isUnfinishedStatus('IN_PROGRESS')).toBe(true);
      expect([...UNFINISHED_ASSIGNMENT_STATUSES]).toEqual(['PENDING', 'IN_PROGRESS']);
    });

    it('rejects COMPLETED, SUBMITTED and GRADED', () => {
      expect(isUnfinishedStatus('COMPLETED')).toBe(false);
      expect(isUnfinishedStatus('SUBMITTED')).toBe(false);
      expect(isUnfinishedStatus('GRADED')).toBe(false);
    });

    it('returns a finished assignment in neither list', () => {
      const finished: AssignmentStatusValue[] = ['COMPLETED', 'SUBMITTED', 'GRADED'];
      for (const status of finished) {
        const { schedulable, flagged } = classifyAssignments([facts({ status })], noConfirmed);
        expect(schedulable).toEqual([]);
        expect(flagged).toEqual([]);
      }
    });

    it('returns an unfinished assignment in exactly one list', () => {
      const { schedulable, flagged } = classifyAssignments(
        [facts({ status: 'PENDING' }), facts({ status: 'IN_PROGRESS' })],
        noConfirmed
      );
      expect(schedulable).toHaveLength(2);
      expect(flagged).toEqual([]);
    });
  });

  describe('the flagging matrix (AC-E06-09, D06-25)', () => {
    it('flags an assignment with no estimate MISSING_ESTIMATE', () => {
      const { schedulable, flagged } = classifyAssignments(
        [facts({ estimatedHours: null })],
        noConfirmed
      );
      expect(schedulable).toEqual([]);
      expect(flagged).toHaveLength(1);
      expect(flagged[0].flagged).toBe('MISSING_ESTIMATE');
      expect(flagged[0].estimatedMinutes).toBeNull();
      expect(flagged[0].remainingMinutes).toBeNull();
    });

    it('flags an assignment with a non-positive estimate MISSING_ESTIMATE', () => {
      for (const estimatedHours of [0, -1, -0.5]) {
        const { schedulable, flagged } = classifyAssignments(
          [facts({ estimatedHours })],
          noConfirmed
        );
        expect(schedulable).toEqual([]);
        expect(flagged[0].flagged).toBe('MISSING_ESTIMATE');
        expect(flagged[0].estimatedMinutes).toBeNull();
      }
    });

    it('flags an assignment with no due date MISSING_DUE_DATE and keeps its estimate', () => {
      const { schedulable, flagged } = classifyAssignments([facts({ dueDate: null })], noConfirmed);
      expect(schedulable).toEqual([]);
      expect(flagged).toHaveLength(1);
      expect(flagged[0].flagged).toBe('MISSING_DUE_DATE');
      // The estimate survives: only the due date is missing.
      expect(flagged[0].estimatedMinutes).toBe(180);
      expect(flagged[0].remainingMinutes).toBe(180);
    });

    it('MISSING_ESTIMATE wins when both are missing', () => {
      const { flagged } = classifyAssignments(
        [facts({ estimatedHours: null, dueDate: null })],
        noConfirmed
      );
      expect(flagged[0].flagged).toBe('MISSING_ESTIMATE');
    });

    it('does not flag an assignment with an estimate and a due date', () => {
      const { schedulable, flagged } = classifyAssignments([facts()], noConfirmed);
      expect(flagged).toEqual([]);
      expect(schedulable).toHaveLength(1);
      expect(schedulable[0].flagged).toBeNull();
      expect(schedulable[0].dueDate).toBe('2026-11-01');
      expect(schedulable[0].estimatedMinutes).toBe(180);
      expect(schedulable[0].remainingMinutes).toBe(180);
    });
  });

  describe('the remaining-work arithmetic', () => {
    it('subtracts the confirmed minutes from the estimate', () => {
      const { schedulable } = classifyAssignments(
        [facts({ estimatedHours: 3 })],
        new Map([['assignment-1', 45]])
      );
      expect(schedulable[0].confirmedMinutes).toBe(45);
      expect(schedulable[0].remainingMinutes).toBe(135);
    });

    it('never goes negative when the confirmed time exceeds the estimate', () => {
      const { schedulable } = classifyAssignments(
        [facts({ estimatedHours: 1 })],
        new Map([['assignment-1', 600]])
      );
      expect(schedulable[0].remainingMinutes).toBe(0);
      expect(schedulable[0].confirmedMinutes).toBe(600);
    });

    it('leaves zero remaining when the confirmed time equals the estimate', () => {
      const { schedulable } = classifyAssignments(
        [facts({ estimatedHours: 2 })],
        new Map([['assignment-1', 120]])
      );
      expect(schedulable[0].remainingMinutes).toBe(0);
    });

    it('defaults the confirmed minutes to zero for an assignment with no entry', () => {
      const { schedulable } = classifyAssignments(
        [facts({ estimatedHours: 2 })],
        new Map([['another-assignment', 90]])
      );
      expect(schedulable[0].confirmedMinutes).toBe(0);
      expect(schedulable[0].remainingMinutes).toBe(120);
    });

    it('keeps the arithmetic in one place (the helper)', () => {
      expect(remainingMinutesOf(180, 0)).toBe(180);
      expect(remainingMinutesOf(180, 45)).toBe(135);
      expect(remainingMinutesOf(180, 180)).toBe(0);
      expect(remainingMinutesOf(180, 999)).toBe(0);
      expect(remainingMinutesOf(null, 45)).toBeNull();
    });
  });

  describe('the classified output', () => {
    it('carries the identity, the course code and the status of the assignment', () => {
      const { schedulable } = classifyAssignments(
        [facts({ id: 'a-1', title: 'Lab report', courseCode: 'MATH201', status: 'IN_PROGRESS' })],
        noConfirmed
      );
      expect(schedulable[0]).toMatchObject({
        id: 'a-1',
        title: 'Lab report',
        courseCode: 'MATH201',
        status: 'IN_PROGRESS',
      });
    });

    it('keeps a null course code for an assignment without a course', () => {
      const { schedulable } = classifyAssignments([facts({ courseCode: null })], noConfirmed);
      expect(schedulable[0].courseCode).toBeNull();
    });

    it('keeps the input order — the ordering is the comparator’s business (D06-22)', () => {
      const { schedulable } = classifyAssignments(
        [facts({ id: 'later' }), facts({ id: 'earlier' })],
        noConfirmed
      );
      expect(schedulable.map((item) => item.id)).toEqual(['later', 'earlier']);
    });
  });
});
