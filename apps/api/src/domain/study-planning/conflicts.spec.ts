import { findConflicts } from './conflicts';
import type { DatedInterval } from './types';

describe('findConflicts (EP06D)', () => {
  const cls: DatedInterval[] = [{ date: '2026-10-30', startMinute: 600, endMinute: 660 }];
  const blocked: DatedInterval[] = [{ date: '2026-10-30', startMinute: 720, endMinute: 780 }];
  const busy: DatedInterval[] = [{ date: '2026-10-30', startMinute: 480, endMinute: 540 }];

  it('OVERLAPS_CLASS', () => {
    const res = findConflicts(
      [{ assignmentId: 'a', date: '2026-10-30', startTime: '10:00', endTime: '10:30' }],
      { classes: cls, blocked: [], busy: [] }
    );
    expect(res).toHaveLength(1);
    expect(res[0].reason).toBe('OVERLAPS_CLASS');
  });

  it('OVERLAPS_BLOCKED_TIME', () => {
    const res = findConflicts(
      [{ assignmentId: 'a', date: '2026-10-30', startTime: '12:00', endTime: '12:30' }],
      { classes: [], blocked, busy: [] }
    );
    expect(res).toHaveLength(1);
    expect(res[0].reason).toBe('OVERLAPS_BLOCKED_TIME');
  });

  it('OVERLAPS_CONFIRMED_SESSION', () => {
    const res = findConflicts(
      [{ assignmentId: 'a', date: '2026-10-30', startTime: '08:00', endTime: '08:30' }],
      { classes: [], blocked: [], busy }
    );
    expect(res).toHaveLength(1);
    expect(res[0].reason).toBe('OVERLAPS_CONFIRMED_SESSION');
  });

  it('OVERLAPS_PLANNED_SESSION', () => {
    const res = findConflicts(
      [
        { assignmentId: 'a', date: '2026-10-30', startTime: '09:00', endTime: '09:30' },
        { assignmentId: 'b', date: '2026-10-30', startTime: '09:15', endTime: '09:45' },
      ],
      { classes: [], blocked: [], busy: [] }
    );
    expect(res).toHaveLength(2);
    expect(res[0].reason).toBe('OVERLAPS_PLANNED_SESSION');
    expect(res[1].reason).toBe('OVERLAPS_PLANNED_SESSION');
  });

  it('higher precedence wins', () => {
    const res = findConflicts(
      [{ assignmentId: 'a', date: '2026-10-30', startTime: '10:00', endTime: '10:30' }],
      {
        classes: cls,
        blocked: [{ date: '2026-10-30', startMinute: 600, endMinute: 660 }],
        busy: [],
      }
    );
    expect(res[0].reason).toBe('OVERLAPS_CLASS');
  });

  it('touching intervals do not overlap', () => {
    const res = findConflicts(
      [
        { assignmentId: 'a', date: '2026-10-30', startTime: '09:00', endTime: '09:30' },
        { assignmentId: 'b', date: '2026-10-30', startTime: '09:30', endTime: '10:00' },
      ],
      { classes: [], blocked: [], busy: [] }
    );
    expect(res).toHaveLength(0);
  });

  it('clean set produces no conflicts', () => {
    const res = findConflicts(
      [{ assignmentId: 'a', date: '2026-10-30', startTime: '13:00', endTime: '13:30' }],
      { classes: cls, blocked, busy }
    );
    expect(res).toHaveLength(0);
  });

  it('a session is never checked against itself', () => {
    const res = findConflicts(
      [{ assignmentId: 'a', date: '2026-10-30', startTime: '13:00', endTime: '13:30' }],
      { classes: [], blocked: [], busy: [] }
    );
    expect(res).toHaveLength(0);
  });
});
