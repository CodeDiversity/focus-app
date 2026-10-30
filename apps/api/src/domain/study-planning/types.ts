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
 * Only the types EP06A owns live here so far: `StudyPreferences` (the
 * `studyDefaults` shape, D06-4). The engine's own types
 * (`SchedulableAssignment`, `WeeklyWindow`, `DatedInterval`,
 * `SchedulerInput`, `SchedulerOutput`, `PlannedSessionProposal`,
 * `DeficitCategory`) belong to EP06B/EP06C/EP06D and are added by those
 * children — they are not declared here speculatively.
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
