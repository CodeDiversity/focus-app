import { describe, expect, it } from 'vitest';
import {
  isUnfinishedAssignment,
  isFinishedAssignment,
  isOverdueAssignment,
  ASSIGNMENT_STATUSES,
} from './status';

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

describe('isOverdueAssignment (SP-123A)', () => {
  const now = new Date('2026-10-26T12:00:00.000Z');
  it('returns true for unfinished + past due', () => {
    expect(
      isOverdueAssignment({ status: 'PENDING', dueDate: '2026-10-12T12:00:00.000Z' }, now)
    ).toBe(true);
    expect(
      isOverdueAssignment({ status: 'IN_PROGRESS', dueDate: '2026-10-12T12:00:00.000Z' }, now)
    ).toBe(true);
  });
  it('returns false for unfinished + future due', () => {
    expect(
      isOverdueAssignment({ status: 'PENDING', dueDate: '2026-11-12T12:00:00.000Z' }, now)
    ).toBe(false);
  });
  it('returns false for finished + past due', () => {
    for (const s of ['COMPLETED', 'SUBMITTED', 'GRADED'] as const) {
      expect(isOverdueAssignment({ status: s, dueDate: '2026-10-12T12:00:00.000Z' }, now)).toBe(
        false
      );
    }
  });
  it('returns false for null due date', () => {
    expect(isOverdueAssignment({ status: 'PENDING', dueDate: null }, now)).toBe(false);
  });
  it('supports now override (epoch millis)', () => {
    expect(
      isOverdueAssignment({ status: 'PENDING', dueDate: '2026-10-12T12:00:00.000Z' }, now.getTime())
    ).toBe(true);
  });
});
