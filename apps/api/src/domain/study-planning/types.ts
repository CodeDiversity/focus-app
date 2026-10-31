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
 *
 * The two cross-field rules are `minSessionMinutes ≤ sessionLengthMinutes ≤
 * maxSessionMinutes` and `dailyCapMinutes ≥ minSessionMinutes`. Every value
 * of this type that leaves the domain module satisfies both rules and every
 * field is inside its own bounds.
 */
export type StudyPreferences = {
  sessionLengthMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  dailyCapMinutes: number;
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
};

/**
 * A half-open `[startMinute, endMinute)` interval on one civil date
 * (`YYYY-MM-DD`). The engine's and the helper's working unit.
 */
export type DatedInterval = {
  date: string;
  startMinute: number;
  endMinute: number;
};

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
  availability: WeeklyWindow[];
  blocked: WeeklyWindow[];
  classes: WeeklyWindow[];
  busy: DatedInterval[];
  preferences: StudyPreferences;
};

/**
 * The engine's output: the proposed sessions and the per-assignment results.
 */
export type SchedulerOutput = {
  sessions: PlannedSessionProposal[];
  results: AssignmentScheduleResult[];
};
