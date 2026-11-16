// Study-preferences entity (EP06E). Mirrors the API contract in the EP06
// parent README's shared contract → *The study-preferences shape* (EP06A).
//
// `sessionLengthMinutes` / `minSessionMinutes` / `maxSessionMinutes` /
// `dailyCapMinutes` are integers with bounds 5..480 / 5..480 / 5..480 /
// 5..1440 and defaults 60 / 15 / 120 / 240 (D06-4, D06-16). The backend
// returns the *effective* values (defaults filled in, cross-field rules
// repaired), so the form always shows a usable value.
//
// EP13F (D13-5) added the two placement levers the engine's placement v2
// reads: `breakMinutes` (0..60, default 15 — the gap between two planned
// sessions) and `densityPercent` (50..100, default 80 — the share of a day's
// free time the plan may fill). Both are additive and take part in no
// cross-field rule.
//
// EP13K (D-K6/D-K7) added the two momentum goals: `dailyGoalMinutes` (5..480,
// default 60) and `weeklyGoalDays` (1..7, default 3). They gate nothing.

export interface StudyPreferences {
  sessionLengthMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  dailyCapMinutes: number;
  breakMinutes: number;
  densityPercent: number;
  dailyGoalMinutes: number;
  weeklyGoalDays: number;
}

export type UpdateStudyPreferencesPayload = Partial<StudyPreferences>;
