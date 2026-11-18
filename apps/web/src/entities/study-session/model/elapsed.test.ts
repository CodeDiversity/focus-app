import { describe, it, expect } from 'vitest';
import { anchorFor, elapsedSecondsAt, formatElapsed } from './elapsed';
import type { StudySession } from './types';

const session: StudySession = {
  id: 's-1',
  assignmentId: null,
  taskId: null,
  plannedSessionId: null,
  status: 'ACTIVE',
  startTime: '2026-11-18T10:00:00.000Z',
  endTime: null,
  elapsedSeconds: 120,
  durationMinutes: 0,
  plannedMinutes: 25,
  notes: null,
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:00:00.000Z',
};

describe('elapsed (EP16D-AC2)', () => {
  it('elapsedSecondsAt adds whole seconds since the response instant', () => {
    const anchor = anchorFor(session, 1_000_000);
    expect(elapsedSecondsAt(anchor, 1_000_000)).toBe(120);
    expect(elapsedSecondsAt(anchor, 1_000_999)).toBe(120);
    expect(elapsedSecondsAt(anchor, 1_001_000)).toBe(121);
    expect(elapsedSecondsAt(anchor, 1_042_500)).toBe(162);
  });

  it("elapsedSecondsAt never returns less than the payload's elapsedSeconds", () => {
    const anchor = anchorFor(session, 1_000_000);
    expect(elapsedSecondsAt(anchor, 999_000)).toBe(120);
    expect(elapsedSecondsAt(anchor, 0)).toBe(120);
  });

  it('formatElapsed renders mm:ss and h:mm:ss', () => {
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(42)).toBe('00:42');
    expect(formatElapsed(754)).toBe('12:34');
    expect(formatElapsed(3599)).toBe('59:59');
    expect(formatElapsed(3600)).toBe('1:00:00');
    expect(formatElapsed(3723)).toBe('1:02:03');
    expect(formatElapsed(-5)).toBe('00:00');
  });
});
