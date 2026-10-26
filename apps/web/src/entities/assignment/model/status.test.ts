import { describe, expect, it } from 'vitest';
import { isUnfinishedAssignment, isFinishedAssignment, ASSIGNMENT_STATUSES } from './status';

describe('isUnfinishedAssignment (D121-4)', () => {
  it('treats PENDING and IN_PROGRESS as unfinished', () => {
    expect(isUnfinishedAssignment('PENDING')).toBe(true);
    expect(isUnfinishedAssignment('IN_PROGRESS')).toBe(true);
    expect(isUnfinishedAssignment({ status: 'PENDING' })).toBe(true);
    expect(isUnfinishedAssignment({ status: 'IN_PROGRESS' })).toBe(true);
  });

  it('treats COMPLETED, SUBMITTED and GRADED as finished', () => {
    for (const s of ['COMPLETED', 'SUBMITTED', 'GRADED'] as const) {
      expect(isUnfinishedAssignment(s)).toBe(false);
      expect(isUnfinishedAssignment({ status: s })).toBe(false);
      expect(isFinishedAssignment(s)).toBe(true);
    }
  });
});

describe('ASSIGNMENT_STATUSES (D121-2)', () => {
  it('lists the five lifecycle values in order', () => {
    expect(ASSIGNMENT_STATUSES).toEqual([
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'SUBMITTED',
      'GRADED',
    ]);
  });
});
