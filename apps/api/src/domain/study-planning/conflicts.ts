import { freeIntervals, overlaps } from './intervals';
import type { DatedInterval, PlannedSessionAnchorValue } from './types';

/**
 * The save-time conflict re-check (EP06D, D06-5, D06-12).
 *
 * A pure function: it takes the submitted sessions and the current hard-conflict
 * sources (classes, blocked windows, confirmed sessions) and returns one entry
 * per offending session, with the highest-precedence reason. It calls EP06C's
 * shared `freeIntervals(...)` helper with `base: { kind: 'whole-day' }` (the
 * availability-omitted mode — a manual edit is not bounded by the student's
 * declared availability) and `placed` = the *other* submitted sessions on that
 * date, so the placement and the re-check share one implementation of the
 * interval subtraction.
 *
 * The four reason codes are the shared contract; no other value is ever
 * emitted.
 */

export type ConflictReason =
  | 'OVERLAPS_CLASS'
  | 'OVERLAPS_BLOCKED_TIME'
  | 'OVERLAPS_CONFIRMED_SESSION'
  | 'OVERLAPS_PLANNED_SESSION';

export type SubmittedSession = {
  assignmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  /**
   * EP13G (D13-4 option b). A `FLEX_DAY` session is a day-anchored
   * intention, so its stored times are a *suggestion*: it neither suffers a
   * clock-overlap conflict nor causes one for another session. Omitted
   * means `FIXED` — the EP06 behaviour every existing caller gets.
   *
   * Flex minutes are **not** exempt from the day's budget; that accounting
   * lives in the engine (`scheduler.ts` rule 2), not in this re-check.
   */
  anchor?: PlannedSessionAnchorValue;
};

export type ConflictContext = {
  classes: DatedInterval[];
  blocked: DatedInterval[];
  busy: DatedInterval[];
};

export type ConflictEntry = {
  sessionIndex: number;
  date: string;
  startTime: string;
  reason: ConflictReason;
};

function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function toInterval(session: SubmittedSession): DatedInterval {
  return {
    date: session.date,
    startMinute: hhmmToMinutes(session.startTime),
    endMinute: hhmmToMinutes(session.endTime),
  };
}

export function findConflicts(
  submitted: SubmittedSession[],
  context: ConflictContext
): ConflictEntry[] {
  const intervals = submitted.map(toInterval);
  const result: ConflictEntry[] = [];

  for (let i = 0; i < submitted.length; i++) {
    const session = submitted[i];
    const iv = intervals[i];

    // EP13G: a flex session has no clock slot to defend — it is never
    // reported as conflicting.
    if (session.anchor === 'FLEX_DAY') continue;

    // placed = the OTHER submitted **fixed** sessions on the same date. A
    // flex session's suggested slot is not a commitment, so it never makes
    // a fixed session illegal either (EP13G AC-2).
    const placed: DatedInterval[] = [];
    for (let j = 0; j < submitted.length; j++) {
      if (j === i) continue;
      if (submitted[j].date !== session.date) continue;
      if (submitted[j].anchor === 'FLEX_DAY') continue;
      placed.push(intervals[j]);
    }

    const free = freeIntervals({
      date: session.date,
      base: { kind: 'whole-day' },
      blocked: context.blocked,
      classes: context.classes,
      busy: context.busy,
      placed,
    });

    // Legal only if the session lies wholly inside one free interval.
    const legal = free.some((f) => f.startMinute <= iv.startMinute && iv.endMinute <= f.endMinute);
    if (legal) continue;

    // Attribute the reason with the shared `overlaps` primitive, in the
    // stated precedence order. We re-import overlaps inline to avoid a
    // second source of truth.
    let reason: ConflictReason | null = null;
    const classHit = context.classes.some((c) => overlaps(c, iv));
    const blockedHit = context.blocked.some((b) => overlaps(b, iv));
    const busyHit = context.busy.some((b) => overlaps(b, iv));
    const plannedHit = placed.some((p) => overlaps(p, iv));

    if (classHit) reason = 'OVERLAPS_CLASS';
    else if (blockedHit) reason = 'OVERLAPS_BLOCKED_TIME';
    else if (busyHit) reason = 'OVERLAPS_CONFIRMED_SESSION';
    else if (plannedHit) reason = 'OVERLAPS_PLANNED_SESSION';
    else reason = 'OVERLAPS_PLANNED_SESSION';

    result.push({
      sessionIndex: i,
      date: session.date,
      startTime: session.startTime,
      reason: reason as ConflictReason,
    });
  }

  return result;
}
