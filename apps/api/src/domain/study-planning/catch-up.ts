import { classifyAssignments } from './remaining-work';
import { schedule } from './scheduler';
import type {
  AssignmentFacts,
  AssignmentScheduleResult,
  ClassifiedAssignment,
  DatedInterval,
  FlaggedAssignment,
  PlannedSessionProposal,
  PreferredInterval,
  SchedulableAssignment,
  StudyPreferences,
  WeeklyWindow,
} from './types';

export type MissedSession = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  locked: boolean;
};

/**
 * A busy interval that may carry preservation tags.
 *
 * `locked` marks a manually locked `PlannedSession` (never moved); `completed`
 * marks a completed `PlannedSession`. Untagged intervals (e.g. confirmed
 * `StudySession`s) count towards neither preserved total. The type is
 * structurally compatible with `DatedInterval`, so a list of these can be
 * passed straight to EP06's `schedule(...)` as its `busy` input.
 */
export type ReplanBusyInterval = DatedInterval & {
  locked?: boolean;
  completed?: boolean;
};

/**
 * The input to `replan(...)`. "Today" is `days[0]`; the window is `days`.
 * Everything is supplied by the caller — the function reads no clock and no
 * database (D06-17, D08-3, D08-8).
 */
export type ReplanInput = {
  days: string[];
  /**
   * Assignment facts (EP06B's `AssignmentFacts`) **or** already-classified
   * assignments (EP06B's `ClassifiedAssignment` / `SchedulableAssignment` /
   * `FlaggedAssignment`). When facts are supplied, `replan` calls
   * `classifyAssignments` itself so completed assignments are excluded and the
   * engine only ever sees schedulable work. When classified assignments are
   * supplied they are used as-is.
   */
  assignments:
    AssignmentFacts[] | ClassifiedAssignment[] | SchedulableAssignment[] | FlaggedAssignment[];
  /** Confirmed minutes keyed by assignment id; used only when `assignments`
   *  are raw facts. Defaults to an empty map. */
  confirmedByAssignment?: ReadonlyMap<string, number>;
  /** EP15C: the engine's base and dated inputs, passed through unchanged. */
  dayBounds: DatedInterval[];
  blocked: DatedInterval[];
  classes: WeeklyWindow[];
  busy: ReplanBusyInterval[] | DatedInterval[];
  preferred: PreferredInterval[];
  missedSessions: MissedSession[];
  preferences: StudyPreferences;
};

/**
 * The output of `replan(...)`: the proposed sessions + per-assignment results
 * produced by EP06's `schedule(...)` (unchanged), plus the missed-session list
 * passed in and the counts of preserved locked/completed sessions.
 */
export type ReplanOutput = {
  sessions: PlannedSessionProposal[];
  results: AssignmentScheduleResult[];
  missedSessions: MissedSession[];
  lockedPreserved: number;
  completedPreserved: number;
};

function isClassified(
  value: unknown
): value is ClassifiedAssignment | SchedulableAssignment | FlaggedAssignment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'remainingMinutes' in (value as Record<string, unknown>) &&
    'flagged' in (value as Record<string, unknown>)
  );
}

function normalizeAssignments(
  assignments: ReplanInput['assignments'],
  confirmedByAssignment: ReadonlyMap<string, number> | undefined
): SchedulableAssignment[] {
  const list = assignments as unknown[];
  if (list.length === 0) return [];
  if (isClassified(list[0])) {
    return (list as (ClassifiedAssignment | SchedulableAssignment | FlaggedAssignment)[]).filter(
      (a) => a.flagged === null
    ) as SchedulableAssignment[];
  }
  const { schedulable } = classifyAssignments(
    list as AssignmentFacts[],
    confirmedByAssignment ?? new Map<string, number>()
  );
  return schedulable;
}

/**
 * Deterministic workload rescheduling (EP08B).
 *
 * Reuses EP06's `schedule(...)` engine directly — there is no second
 * implementation of placement, free-interval subtraction, ordering or deficit
 * classification. The function is pure: no I/O, no clock read, no randomness;
 * "today" is `input.days[0]` and the window is `input.days`, both supplied by
 * the caller.
 */
export function replan(input: ReplanInput): ReplanOutput {
  const schedulable = normalizeAssignments(input.assignments, input.confirmedByAssignment);

  const busy = input.busy as ReplanBusyInterval[];
  let lockedPreserved = 0;
  let completedPreserved = 0;
  for (const interval of busy) {
    if (interval.locked) lockedPreserved += 1;
    if (interval.completed) completedPreserved += 1;
  }

  const output = schedule({
    days: input.days,
    assignments: schedulable,
    dayBounds: input.dayBounds,
    blocked: input.blocked,
    classes: input.classes,
    busy: busy as unknown as DatedInterval[],
    preferred: input.preferred,
    preferences: input.preferences,
  });

  return {
    sessions: output.sessions,
    results: output.results,
    missedSessions: input.missedSessions,
    lockedPreserved,
    completedPreserved,
  };
}
