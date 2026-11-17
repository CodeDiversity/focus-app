/**
 * The shared types of the study-planning domain module (EP06).
 *
 * The module lives at `apps/api/src/domain/study-planning/` — deliberately
 * outside `modules/`, so the "no Nest, no Prisma, no clock, no randomness"
 * boundary is visible in the import graph (D06-17). The epic's Technical
 * Notes require the scheduling algorithm to be a pure TypeScript domain
 * module, independent of HTTP, React and the database; EP08 reuses the same
 * engine directly.
 *
 * `StudyPreferences` (the `studyDefaults` shape, D06-4) and EP06B's
 * remaining-work types (`AssignmentFacts`, `ClassifiedAssignment`,
 * `SchedulableAssignment`, `FlaggedAssignment`) live here. The engine's
 * remaining types (`WeeklyWindow`, `DatedInterval`, `SchedulerInput`,
 * `SchedulerOutput`, `PlannedSessionProposal`, `DeficitCategory`) belong to
 * EP06C/EP06D and are added by those children — they are not declared here
 * speculatively.
 */

/**
 * The student's study-session defaults — the `studyDefaults` object stored
 * in `User.preferences.studyDefaults` (D06-4, seam V-07-1).
 *
 * - `sessionLengthMinutes` — the default session length (integer, 5…480)
 * - `minSessionMinutes` — the shortest session the student wants (5…480)
 * - `maxSessionMinutes` — the longest session the student wants (5…480)
 * - `dailyCapMinutes` — the most planned minutes per day (5…1440)
 * - `breakMinutes` — the gap the engine leaves between two consecutive
 *   planned sessions on a day (EP13F, D13-5; 0…60, `0` = back-to-back)
 * - `densityPercent` — the share of a day's free time the engine is allowed
 *   to fill (EP13F, D13-5; 50…100, `100` = the cap-only behaviour)
 *
 * The two cross-field rules are `minSessionMinutes ≤ sessionLengthMinutes ≤
 * maxSessionMinutes` and `dailyCapMinutes ≥ minSessionMinutes`. Every value
 * of this type that leaves the domain module satisfies both rules and every
 * field is inside its own bounds. The two EP13F keys take part in no
 * cross-field rule — they are independent levers.
 */
export type StudyPreferences = {
  sessionLengthMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  dailyCapMinutes: number;
  breakMinutes: number;
  densityPercent: number;
  /** EP13K (D-K6) — minutes a study day aims for (5…480, default 60). Gates nothing. */
  dailyGoalMinutes: number;
  /** EP13K (D-K7) — study days a Monday-start week aims for (1…7, default 3). */
  weeklyGoalDays: number;
};

/**
 * The assignment statuses EP06 reads (the schema's own enum,
 * `apps/api/prisma/schema.prisma:212-218`).
 *
 * They are declared here as **string literal unions** rather than imported
 * from the generated Prisma client: the domain module imports nothing from
 * Prisma (D06-17), and the generated enum's type is the same union of
 * literals, so the service passes its rows straight through.
 */
export type AssignmentStatusValue =
  'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'GRADED';

/**
 * The two statuses that are still **unfinished** — the candidates of the
 * remaining-work read and of the scheduler (the shared contract's rule 11:
 * `COMPLETED`, `SUBMITTED` and `GRADED` assignments are not candidates).
 */
export type UnfinishedAssignmentStatus = 'PENDING' | 'IN_PROGRESS';

/** The assignment priorities (the schema's own enum, `LOW` … `URGENT`). */
export type AssignmentPriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/**
 * Why an assignment was **flagged** instead of scheduled (AC-E06-09, D06-25):
 * `MISSING_ESTIMATE` — no estimate, or a non-positive one; `MISSING_DUE_DATE`
 * — no due date. `MISSING_ESTIMATE` wins when both are missing.
 */
export type RemainingWorkFlag = 'MISSING_ESTIMATE' | 'MISSING_DUE_DATE';

/**
 * The assignment facts the remaining-work classification needs (EP06B's
 * `classifyAssignments` input).
 *
 * - `dueDate` is the **profile zone's civil date** (`YYYY-MM-DD`), never an
 *   instant (D06-24): the service converts the stored `DateTime` once, with
 *   `toCivilDate` / `zoneParts` (`common/lib/civil-date.ts`), before calling
 *   the domain — so the domain stays zone-free and an assignment due
 *   `2026-11-01T00:30:00Z` is 31 October for a student in `America/New_York`.
 * - `estimatedHours` is the stored estimate (`null` when the student entered
 *   none); the conversion to minutes is the domain's business.
 * - `confirmedMinutes` is **not** part of the facts: the confirmed time
 *   arrives as the classification's second input (a map keyed by assignment
 *   id), so the function never reads a database.
 */
export type AssignmentFacts = {
  id: string;
  title: string;
  courseCode: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  status: AssignmentStatusValue;
  priority: AssignmentPriorityValue;
  createdAt: Date;
  /**
   * EP13L — the closed `Assignment.type` identifier (`null`/omitted when
   * untyped). Only the calibration lookup reads it (`calibration.ts`).
   */
  assignmentType?: string | null;
  /**
   * EP14E (D-E1) — the student's own "hard" flag (`Assignment.hard`):
   * `true`/`false` override the demanding rule, `null`/omitted = Auto.
   */
  hard?: boolean | null;
  /**
   * EP15C — the owning course, carried only when supplied (like
   * `assignmentType`) so a course-tied study block can serve its course
   * first (contracts.md engine rule 4, D-C3).
   */
  courseId?: string | null;
};

/**
 * EP13L — the explanation that travels with every calibrated value
 * (AC-E13-13): which history produced the multiplier. `assignmentType` is
 * `null` when the figure is the overall fallback (D-L3). The shared API
 * contract's `calibration` annotation.
 */
export type CalibrationAnnotation = {
  assignmentType: string | null;
  multiplier: number;
  samples: number;
};

/**
 * One classified assignment — an **unfinished** assignment with its estimate
 * converted to minutes, its confirmed minutes and what is left of it.
 *
 * - `estimatedMinutes` / `remainingMinutes` are `null` **exactly** when the
 *   assignment is flagged `MISSING_ESTIMATE` (a missing or non-positive
 *   estimate).
 * - `flagged` is `null` for a schedulable assignment and the reason
 *   otherwise.
 * - `estimatedMinutes` is always the **raw** estimate (EP13L-AC2);
 *   `remainingMinutes` is `max(0, round(estimate × multiplier) − confirmed)`
 *   and `calibration` explains the multiplier, or is `null` when none
 *   applied (the uncalibrated student sees exactly the EP13A figures).
 */
export type ClassifiedAssignment = {
  id: string;
  title: string;
  courseCode: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  confirmedMinutes: number;
  remainingMinutes: number | null;
  status: UnfinishedAssignmentStatus;
  priority: AssignmentPriorityValue;
  createdAt: Date;
  flagged: RemainingWorkFlag | null;
  calibration: CalibrationAnnotation | null;
  /**
   * EP13J (D-J1) — the `Assignment.type` passed through for the engine's
   * "demanding work" rule. Present only when the caller supplied it.
   */
  assignmentType?: string | null;
  /**
   * EP14E (D-E1) — the student's "hard" flag, carried for `isDemanding`.
   * Present only when the caller supplied it; `null` = Auto.
   */
  hard?: boolean | null;
  /**
   * EP15C — the owning course, carried only when supplied (like
   * `assignmentType`) so a course-tied study block can serve its course
   * first (contracts.md engine rule 4, D-C3).
   */
  courseId?: string | null;
};

/**
 * A **schedulable** assignment (AC-E06-09: a flagged assignment is never a
 * scheduling candidate): it has both an estimate and a due date, so every
 * remaining-work figure is a number.
 */
export type SchedulableAssignment = ClassifiedAssignment & {
  flagged: null;
  dueDate: string;
  estimatedMinutes: number;
  remainingMinutes: number;
};

/**
 * A **flagged** assignment: it is reported with the reason it cannot be
 * scheduled, and the engine never places it.
 */
export type FlaggedAssignment = ClassifiedAssignment & {
  flagged: RemainingWorkFlag;
};

// ---------------------------------------------------------------------------
// EP06C — the scheduling engine's types (the pure domain module).
// ---------------------------------------------------------------------------

/**
 * A weekly window: a recurring interval on one weekday. `dayOfWeek` is
 * `0`–`6` with **Sunday = 0** (the schema's own convention,
 * `schema.prisma:292-305` and `:167-181`; the availability API's validation
 * message, `availability.service.ts:99`). `startMinute` / `endMinute` are
 * wall-clock minutes from midnight, half-open `[start, end)`.
 */
export type WeeklyWindow = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  /** EP13J (D-J5) — availability windows only; omitted = `NORMAL`. */
  energy?: EnergyLevelValue;
};

/**
 * EP13J (D-J5) — the energy tag of an availability window (the schema's
 * `EnergyLevel` enum as a literal union, D06-17).
 */
export type EnergyLevelValue = 'HIGH' | 'NORMAL' | 'LOW';

/**
 * A half-open `[startMinute, endMinute)` interval on one civil date
 * (`YYYY-MM-DD`). The engine's and the helper's working unit.
 */
export type DatedInterval = {
  date: string;
  startMinute: number;
  endMinute: number;
  /**
   * EP13J (D-J2) — the energy of the availability window this free time came
   * from. Omitted means `NORMAL`; the algebra never merges two different
   * levels, so a free interval's energy is always unambiguous.
   */
  energy?: EnergyLevelValue;
  /**
   * EP15C (D-C1) — the study block this piece lies inside, when any. The
   * algebra merges only pieces with equal (energy, preferredKey), so a
   * block's span survives subtraction exactly like energy does. Omitted =
   * not preferred.
   */
  preferredKey?: string;
  /** EP15C — the course the preferred block is tied to (rule 4). Omitted = none. */
  courseId?: string | null;
};

/**
 * EP15C — a study block after recurrence expansion: a dated interval with
 * the block's energy, its id as `preferredKey` and an optional course tie.
 * Rule 2 intersects the day's free time with these; rule 3 scans the
 * resulting preferred pieces first.
 */
export type PreferredInterval = DatedInterval & { preferredKey: string };

/**
 * The base the day's free intervals are computed from (see the shared
 * contract → *The shared free-interval helper `freeIntervals(...)`*).
 *
 * - `{ kind: 'declared', windows }` — the student's declared available
 *   windows for that weekday (an empty array means the student declared no
 *   availability, so the day has no free time);
 * - `{ kind: 'whole-day' }` — the whole civil day `[00:00, 1440)`, the
 *   availability-omitted mode used by EP06D's save-time re-check (D06-12).
 */
export type FreeIntervalBase =
  { kind: 'declared'; windows: DatedInterval[] } | { kind: 'whole-day' };

/**
 * The deficit categories the engine reports (D06-11). `null` in the
 * result means "no deficit".
 */
export type DeficitCategory = 'NO_AVAILABLE_TIME' | 'INSUFFICIENT_TIME_BEFORE_DEADLINE' | 'OVERDUE';

/**
 * EP13G (D13-4 option b) — how a planned session relates to the clock.
 *
 * `FIXED` is the EP06/EP08 behaviour: the slot is a commitment and takes
 * part in clock-overlap conflicts. `FLEX_DAY` is a day-anchored intention:
 * the slot is a *suggestion*, the session cannot be missed at a clock time,
 * and it is excluded from clock-overlap conflicts while still consuming the
 * day's density/cap budget.
 *
 * Declared as a string-literal union rather than imported from the generated
 * Prisma client — the domain module imports nothing from Prisma (D06-17) and
 * the generated enum is the same union of literals.
 */
export type PlannedSessionAnchorValue = 'FIXED' | 'FLEX_DAY';

/** EP13G — the optional, flex-only part-of-day hint. */
export type PartOfDayValue = 'MORNING' | 'AFTERNOON' | 'EVENING';

/**
 * One proposed session the engine places (the preview's session shape,
 * without the response-only `assignmentTitle`/`durationMinutes` extras —
 * `durationMinutes` is derived as `endMinute - startMinute`).
 */
export type PlannedSessionProposal = {
  assignmentId: string;
  assignmentTitle: string;
  date: string;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  /**
   * EP13G — `FLEX_DAY` (the default for generated work) or `FIXED` when the
   * deadline leaves no slack. See `schedule(...)`'s rule 6.
   */
  anchor: PlannedSessionAnchorValue;
  /**
   * EP13G — an honest suggestion derived from the suggested slot, set only
   * on a flex session (`null` on a fixed one).
   */
  windowHint: PartOfDayValue | null;
};

/**
 * The per-assignment outcome of a run.
 */
export type AssignmentScheduleResult = {
  assignmentId: string;
  placedMinutes: number;
  deferredMinutes: number;
  deficitMinutes: number;
  deficitCategory: DeficitCategory | null;
};

/**
 * The engine's input. Everything the engine needs is supplied by the caller
 * — "today" is `days[0]`, and every time window is already converted to
 * wall-clock minutes on a civil date (D06-17, D06-24).
 */
export type SchedulerInput = {
  days: string[];
  assignments: SchedulableAssignment[];
  /**
   * EP15C (D15-1): the day's base — one `[wake, sleep)` interval per day in
   * `days` (a day with none, or a zero-minute one, has no free time).
   * Replaces the pre-EP15 `availability: WeeklyWindow[]`.
   */
  dayBounds: DatedInterval[];
  /** EP15C: events after recurrence expansion — dated, a one-off blocks only its date. */
  blocked: DatedInterval[];
  classes: WeeklyWindow[];
  busy: DatedInterval[];
  /** EP15C (D15-6): study blocks after expansion — a ranking preference, never a constraint. */
  preferred: PreferredInterval[];
  preferences: StudyPreferences;
};

/**
 * The engine's output: the proposed sessions and the per-assignment results.
 */
export type SchedulerOutput = {
  sessions: PlannedSessionProposal[];
  results: AssignmentScheduleResult[];
};

/**
 * The `GET /study-sessions/momentum` payload (EP13K, D-K5). Minutes and days
 * only — no percentage field exists by construction (D13-9).
 */
export type MomentumSummary = {
  /** Today's civil date in the profile zone. */
  date: string;
  timeZone: string;
  today: { confirmedMinutes: number; goalMinutes: number; goalMet: boolean };
  week: {
    /** The Monday that starts this week (D-K2). */
    startDate: string;
    /** EP14B (D-B4) — the week's seven civil dates, Monday first (D05-6: the server owns date math). */
    days: string[];
    /** This week's study days, ascending civil dates (D-K1). */
    studyDays: string[];
    studyDayCount: number;
    goalDays: number;
    goalMet: boolean;
  };
  run: {
    /** Consecutive goal-met weeks; the current week counts once met (D-K3). */
    currentWeeks: number;
    /** The longest run inside the horizon — never erased by a quiet week. */
    bestWeeks: number;
    currentWeekCounted: boolean;
    /** Present (and `true`) only when a run reached the 52-week horizon (D-K4). */
    capped?: true;
  };
  /** False when the horizon holds no study day at all (the card's empty state). */
  hasHistory: boolean;
};
