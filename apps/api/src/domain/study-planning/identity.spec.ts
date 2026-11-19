import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { schedule } from './scheduler';
import { boundsFromWeeklyWindows } from './legacy-windows';
import { IDENTITY_FIXTURES, placementOf } from './identity-fixtures';

/**
 * EP15C-AC4 — byte-identity with the EP14E engine. `identity.snapshot.json`
 * is the output of the pre-EP15C engine (`b2fed52`) over every fixture in
 * `identity-fixtures.ts`; this spec replays the same fixtures through the
 * weekly→bounds adapter (hull + gaps, `preferred: []`) and the EP15C engine.
 * A difference here means the base swap changed placement — it must not.
 */
describe('EP15C-AC4 identity with the EP14E engine', () => {
  const snapshot = JSON.parse(
    readFileSync(join(__dirname, 'identity.snapshot.json'), 'utf8')
  ) as Record<string, unknown>;

  it('the snapshot covers every fixture', () => {
    expect(Object.keys(snapshot).sort()).toEqual(IDENTITY_FIXTURES.map((f) => f.name).sort());
  });

  it.each(IDENTITY_FIXTURES.map((f) => [f.name, f] as const))(
    'byte-identical: %s',
    (name, fixture) => {
      const run = () =>
        schedule({
          days: fixture.days,
          assignments: fixture.assignments,
          ...boundsFromWeeklyWindows(fixture.days, fixture.availability, fixture.blocked),
          classes: fixture.classes,
          busy: fixture.busy,
          preferred: [],
          preferences: fixture.preferences,
        });
      // EP17D: compare the **placement** only — `studyDays` is an additive
      // reporting key on `SchedulerOutput`, not part of what this gate pins.
      const first = JSON.stringify(placementOf(run()));
      expect(first).toBe(JSON.stringify(snapshot[name]));
      expect(JSON.stringify(placementOf(run()))).toBe(first); // determinism (V-15-3)
    }
  );

  it('the adapter reproduces the old free intervals: hull plus inter-window gaps', () => {
    const out = boundsFromWeeklyWindows(
      ['2026-11-02'], // Monday
      [
        { dayOfWeek: 1, startMinute: 1020, endMinute: 1200 },
        { dayOfWeek: 1, startMinute: 480, endMinute: 600 },
        { dayOfWeek: 1, startMinute: 600, endMinute: 660 }, // touching the first
        { dayOfWeek: 2, startMinute: 480, endMinute: 600 }, // another weekday
      ],
      [{ dayOfWeek: 1, startMinute: 500, endMinute: 520 }]
    );
    expect(out.dayBounds).toEqual([{ date: '2026-11-02', startMinute: 480, endMinute: 1200 }]);
    expect(out.blocked).toEqual([
      { date: '2026-11-02', startMinute: 660, endMinute: 1020 },
      { date: '2026-11-02', startMinute: 500, endMinute: 520 },
    ]);
  });
});
