import { describe, it, expect } from 'vitest';
import { flattenPreview, projectSessions } from './preview';
import type { PlanPreview, ProposedSession } from '@/entities/study-plan/model/types';

/**
 * EP13H (D-H10) — the anchor round-trip through the editor's two seams: the
 * preview flattens *with* the engine's partition, and the save projection
 * emits `anchor` always and `windowHint` only on flex (the server 400s a
 * hint on a fixed session, so the client must never construct one).
 */
const preview: PlanPreview = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: 'UTC',
  generatedAt: '2026-10-30T12:00:00.000Z',
  preferences: {
    sessionLengthMinutes: 60,
    minSessionMinutes: 15,
    maxSessionMinutes: 120,
    dailyCapMinutes: 240,
    breakMinutes: 15,
    densityPercent: 80,
  },
  days: [
    {
      date: '2026-10-30',
      targetMinutes: 120,
      sessions: [
        {
          assignmentId: 'a-1',
          assignmentTitle: 'Essay',
          startTime: '19:00',
          endTime: '20:00',
          durationMinutes: 60,
          anchor: 'FLEX_DAY',
          windowHint: 'EVENING',
        },
        {
          assignmentId: 'a-2',
          assignmentTitle: 'Pset',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          anchor: 'FIXED',
          windowHint: null,
        },
      ],
    },
  ],
  warnings: [],
  deferred: [],
  calibration: [],
};

describe('flattenPreview (EP13H)', () => {
  it('carries the anchor and hint into the editable list', () => {
    const flat = flattenPreview(preview);
    expect(flat[0]).toMatchObject({ anchor: 'FLEX_DAY', windowHint: 'EVENING' });
    expect(flat[1]).toMatchObject({ anchor: 'FIXED', windowHint: null });
  });
});

describe('projectSessions (EP13H, D-H10)', () => {
  it('emits anchor always, and windowHint only on flex', () => {
    const flat = flattenPreview(preview);
    const body = projectSessions(flat);

    expect(body[0]).toEqual({
      assignmentId: 'a-1',
      date: '2026-10-30',
      startTime: '19:00',
      endTime: '20:00',
      anchor: 'FLEX_DAY',
      windowHint: 'EVENING',
    });
    // The fixed session's projection has NO windowHint key at all — the
    // server rejects a hint on fixed, even a null one would be noise.
    expect(body[1]).toEqual({
      assignmentId: 'a-2',
      date: '2026-10-30',
      startTime: '09:00',
      endTime: '10:00',
      anchor: 'FIXED',
    });
    expect('windowHint' in body[1]).toBe(false);
  });

  it('omits the hint for a flex session that has none', () => {
    const noHint: ProposedSession = {
      assignmentId: 'a-3',
      assignmentTitle: 'Reading',
      date: '2026-10-31',
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      anchor: 'FLEX_DAY',
      windowHint: null,
    };
    const body = projectSessions([noHint]);
    expect('windowHint' in body[0]).toBe(false);
    expect(body[0].anchor).toBe('FLEX_DAY');
  });
});
