import {
  freeIntervals,
  mergeIntervals,
  minutesBetween,
  overlaps,
  preferredPieces,
  subtractIntervals,
} from './intervals';
import type { DatedInterval } from './types';

/**
 * EP06C domain unit spec (pure, no clock, no zone): the interval algebra
 * and the shared `freeIntervals(...)` helper (TR-E06-03).
 */
describe('interval algebra (domain, EP06C)', () => {
  const d = (date: string, start: number, end: number): DatedInterval => ({
    date,
    startMinute: start,
    endMinute: end,
  });

  describe('mergeIntervals', () => {
    it('merges overlapping intervals', () => {
      const out = mergeIntervals([d('2026-11-01', 540, 600), d('2026-11-01', 570, 630)]);
      expect(out).toEqual([d('2026-11-01', 540, 630)]);
    });

    it('merges touching intervals', () => {
      const out = mergeIntervals([d('2026-11-01', 540, 600), d('2026-11-01', 600, 660)]);
      expect(out).toEqual([d('2026-11-01', 540, 660)]);
    });

    it('merges unsorted input', () => {
      const out = mergeIntervals([
        d('2026-11-01', 660, 720),
        d('2026-11-01', 540, 600),
        d('2026-11-01', 600, 660),
      ]);
      expect(out).toEqual([d('2026-11-01', 540, 720)]);
    });

    it('does not merge intervals on different dates', () => {
      const out = mergeIntervals([d('2026-11-01', 540, 600), d('2026-11-02', 540, 600)]);
      expect(out).toHaveLength(2);
    });

    it('returns an empty array for empty input', () => {
      expect(mergeIntervals([])).toEqual([]);
    });
  });

  describe('subtractIntervals', () => {
    it('subtracts an interval that is inside', () => {
      const out = subtractIntervals([d('2026-11-01', 540, 720)], [d('2026-11-01', 600, 660)]);
      expect(out).toEqual([d('2026-11-01', 540, 600), d('2026-11-01', 660, 720)]);
    });

    it('subtracts an interval that overlaps one end', () => {
      const out = subtractIntervals([d('2026-11-01', 540, 720)], [d('2026-11-01', 690, 750)]);
      expect(out).toEqual([d('2026-11-01', 540, 690)]);
    });

    it('subtracts an interval that spans the whole set', () => {
      const out = subtractIntervals([d('2026-11-01', 540, 720)], [d('2026-11-01', 500, 800)]);
      expect(out).toEqual([]);
    });

    it('leaves the base untouched when the subtractor misses entirely', () => {
      const out = subtractIntervals([d('2026-11-01', 540, 720)], [d('2026-11-01', 720, 780)]);
      expect(out).toEqual([d('2026-11-01', 540, 720)]);
    });

    it('ignores subtractors on a different date', () => {
      const out = subtractIntervals([d('2026-11-01', 540, 720)], [d('2026-11-02', 600, 660)]);
      expect(out).toEqual([d('2026-11-01', 540, 720)]);
    });
  });

  describe('overlaps', () => {
    it('returns true for overlapping half-open intervals', () => {
      expect(overlaps(d('2026-11-01', 540, 600), d('2026-11-01', 570, 630))).toBe(true);
    });

    it('returns false for touching intervals', () => {
      expect(overlaps(d('2026-11-01', 540, 600), d('2026-11-01', 600, 660))).toBe(false);
    });

    it('returns false for intervals on different dates', () => {
      expect(overlaps(d('2026-11-01', 540, 600), d('2026-11-02', 540, 600))).toBe(false);
    });

    it('returns false for disjoint intervals', () => {
      expect(overlaps(d('2026-11-01', 540, 600), d('2026-11-01', 660, 720))).toBe(false);
    });
  });

  describe('minutesBetween', () => {
    it('computes the minutes of a same-day range from two offsets', () => {
      expect(minutesBetween(540, 600)).toBe(60);
    });

    it('computes the minutes of a single interval', () => {
      expect(minutesBetween(d('2026-11-01', 540, 600))).toBe(60);
    });
  });

  describe('freeIntervals helper', () => {
    it('declared base returns the merged declared windows', () => {
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'declared', windows: [d('2026-11-01', 540, 600), d('2026-11-01', 600, 660)] },
        blocked: [],
        classes: [],
        busy: [],
        placed: [],
      });
      expect(out).toEqual([d('2026-11-01', 540, 660)]);
    });

    it('declared base with empty windows returns an empty free set', () => {
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'declared', windows: [] },
        blocked: [],
        classes: [],
        busy: [],
        placed: [],
      });
      expect(out).toEqual([]);
    });

    it('whole-day base returns [0, 1440) before subtractions', () => {
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'whole-day' },
        blocked: [],
        classes: [],
        busy: [],
        placed: [],
      });
      expect(out).toEqual([d('2026-11-01', 0, 1440)]);
    });

    it('subtracts blocked, then classes, then busy, then placed', () => {
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'whole-day' },
        blocked: [d('2026-11-01', 0, 60)],
        classes: [d('2026-11-01', 60, 120)],
        busy: [d('2026-11-01', 120, 180)],
        placed: [d('2026-11-01', 180, 240)],
      });
      expect(out).toEqual([d('2026-11-01', 240, 1440)]);
    });

    it('placed sessions on the date are subtracted (no second overlap)', () => {
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'whole-day' },
        blocked: [],
        classes: [],
        busy: [],
        placed: [d('2026-11-01', 540, 600)],
      });
      expect(out).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ startMinute: 540, endMinute: 600 })])
      );
      // The 540-600 gap is gone.
      const merged = out.find((i) => i.startMinute <= 540 && i.endMinute >= 600);
      expect(merged).toBeUndefined();
    });

    it('filters every input by date (another date never leaks)', () => {
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'declared', windows: [d('2026-11-01', 540, 600), d('2026-11-02', 0, 1440)] },
        blocked: [d('2026-11-02', 0, 60)],
        classes: [d('2026-11-02', 60, 120)],
        busy: [d('2026-11-02', 120, 180)],
        placed: [d('2026-11-02', 180, 240)],
      });
      expect(out).toEqual([d('2026-11-01', 540, 600)]);
    });

    it('merges touching free intervals in the result', () => {
      // Two declared windows that touch after subtraction merge.
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'declared', windows: [d('2026-11-01', 540, 600), d('2026-11-01', 600, 660)] },
        blocked: [],
        classes: [],
        busy: [],
        placed: [],
      });
      expect(out).toEqual([d('2026-11-01', 540, 660)]);
    });

    it('returns a sorted, disjoint list', () => {
      const out = freeIntervals({
        date: '2026-11-01',
        base: { kind: 'whole-day' },
        blocked: [d('2026-11-01', 300, 360)],
        classes: [],
        busy: [],
        placed: [],
      });
      // disjoint & sorted
      for (let i = 1; i < out.length; i++) {
        expect(out[i].startMinute).toBeGreaterThanOrEqual(out[i - 1].endMinute);
      }
    });
  });

  describe('EP15C — preferred keys in the algebra (D-C1)', () => {
    const MON = '2026-11-02';

    it('touching pieces with different preferred keys stay apart; equal (energy, key) merge', () => {
      expect(
        mergeIntervals([
          { date: MON, startMinute: 540, endMinute: 600, preferredKey: 'a' },
          { date: MON, startMinute: 600, endMinute: 660, preferredKey: 'b' },
          { date: MON, startMinute: 660, endMinute: 720, preferredKey: 'b' },
          { date: MON, startMinute: 720, endMinute: 780 },
        ])
      ).toEqual([
        { date: MON, startMinute: 540, endMinute: 600, preferredKey: 'a' },
        { date: MON, startMinute: 600, endMinute: 720, preferredKey: 'b' },
        { date: MON, startMinute: 720, endMinute: 780 },
      ]);
    });

    it('subtraction keeps each remainder’s key and course', () => {
      expect(
        subtractIntervals(
          [{ date: MON, startMinute: 540, endMinute: 720, preferredKey: 'a', courseId: 'c1' }],
          [{ date: MON, startMinute: 600, endMinute: 630 }]
        )
      ).toEqual([
        { date: MON, startMinute: 540, endMinute: 600, preferredKey: 'a', courseId: 'c1' },
        { date: MON, startMinute: 630, endMinute: 720, preferredKey: 'a', courseId: 'c1' },
      ]);
    });

    it('preferredPieces splits free gaps at block edges; outside pieces keep the input shape', () => {
      const free = [
        { date: MON, startMinute: 480, endMinute: 700 },
        { date: MON, startMinute: 800, endMinute: 900 },
      ];
      const pieces = preferredPieces(
        free,
        [
          {
            date: MON,
            startMinute: 600,
            endMinute: 660,
            preferredKey: 'b1',
            energy: 'HIGH',
            courseId: 'c1',
          },
          { date: MON, startMinute: 850, endMinute: 1000, preferredKey: 'b2' },
          { date: '2026-11-03', startMinute: 480, endMinute: 700, preferredKey: 'other-day' },
        ],
        MON
      );
      expect(pieces).toEqual([
        { date: MON, startMinute: 480, endMinute: 600 },
        {
          date: MON,
          startMinute: 600,
          endMinute: 660,
          energy: 'HIGH',
          preferredKey: 'b1',
          courseId: 'c1',
        },
        { date: MON, startMinute: 660, endMinute: 700 },
        { date: MON, startMinute: 800, endMinute: 850 },
        { date: MON, startMinute: 850, endMinute: 900, energy: 'NORMAL', preferredKey: 'b2' },
      ]);
      expect(preferredPieces(free, [], MON)).toBe(free);
    });
  });
});
