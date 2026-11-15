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

  // =========================================================================
  // EP13G — the flex conflict matrix (TR-E13-07, AC-2).
  //
  // A FLEX_DAY session's stored times are a *suggestion*, so it neither
  // suffers a clock-overlap conflict nor causes one. Everything FIXED keeps
  // exactly the EP06 behaviour.
  // =========================================================================

  describe('EP13G — day-anchored (FLEX_DAY) sessions', () => {
    it('a flex session overlapping a class is not a conflict', () => {
      const res = findConflicts(
        [
          {
            assignmentId: 'a',
            date: '2026-10-30',
            startTime: '10:00',
            endTime: '10:30',
            anchor: 'FLEX_DAY',
          },
        ],
        { classes: cls, blocked: [], busy: [] }
      );
      expect(res).toHaveLength(0);
    });

    it('a flex session overlapping blocked time or a confirmed session is not a conflict', () => {
      const res = findConflicts(
        [
          {
            assignmentId: 'a',
            date: '2026-10-30',
            startTime: '12:00',
            endTime: '12:30',
            anchor: 'FLEX_DAY',
          },
          {
            assignmentId: 'b',
            date: '2026-10-30',
            startTime: '08:00',
            endTime: '08:30',
            anchor: 'FLEX_DAY',
          },
        ],
        { classes: [], blocked, busy }
      );
      expect(res).toHaveLength(0);
    });

    it('two flex sessions on the same slot do not conflict with each other', () => {
      const res = findConflicts(
        [
          {
            assignmentId: 'a',
            date: '2026-10-30',
            startTime: '09:00',
            endTime: '09:30',
            anchor: 'FLEX_DAY',
          },
          {
            assignmentId: 'b',
            date: '2026-10-30',
            startTime: '09:00',
            endTime: '09:30',
            anchor: 'FLEX_DAY',
          },
        ],
        { classes: [], blocked: [], busy: [] }
      );
      expect(res).toHaveLength(0);
    });

    it('a flex session never makes a fixed one illegal', () => {
      const res = findConflicts(
        [
          {
            assignmentId: 'fixed',
            date: '2026-10-30',
            startTime: '09:00',
            endTime: '09:30',
            anchor: 'FIXED',
          },
          {
            assignmentId: 'flex',
            date: '2026-10-30',
            startTime: '09:15',
            endTime: '09:45',
            anchor: 'FLEX_DAY',
          },
        ],
        { classes: [], blocked: [], busy: [] }
      );
      expect(res).toHaveLength(0);
    });

    it('two fixed sessions still conflict with each other (EP06 unchanged)', () => {
      const res = findConflicts(
        [
          {
            assignmentId: 'a',
            date: '2026-10-30',
            startTime: '09:00',
            endTime: '09:30',
            anchor: 'FIXED',
          },
          {
            assignmentId: 'b',
            date: '2026-10-30',
            startTime: '09:15',
            endTime: '09:45',
            anchor: 'FIXED',
          },
        ],
        { classes: [], blocked: [], busy: [] }
      );
      expect(res).toHaveLength(2);
      expect(res.every((entry) => entry.reason === 'OVERLAPS_PLANNED_SESSION')).toBe(true);
    });

    it('a fixed session still conflicts with a class even next to flex work', () => {
      const res = findConflicts(
        [
          {
            assignmentId: 'flex',
            date: '2026-10-30',
            startTime: '10:00',
            endTime: '10:30',
            anchor: 'FLEX_DAY',
          },
          {
            assignmentId: 'fixed',
            date: '2026-10-30',
            startTime: '10:15',
            endTime: '10:45',
            anchor: 'FIXED',
          },
        ],
        { classes: cls, blocked: [], busy: [] }
      );
      expect(res).toHaveLength(1);
      expect(res[0].sessionIndex).toBe(1);
      expect(res[0].reason).toBe('OVERLAPS_CLASS');
    });

    it('an omitted anchor is treated as FIXED (a pre-EP13G caller is unchanged)', () => {
      const res = findConflicts(
        [{ assignmentId: 'a', date: '2026-10-30', startTime: '10:00', endTime: '10:30' }],
        { classes: cls, blocked: [], busy: [] }
      );
      expect(res).toHaveLength(1);
      expect(res[0].reason).toBe('OVERLAPS_CLASS');
    });
  });
});
