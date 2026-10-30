// Study-preferences entity (EP06E). Mirrors the API contract in the EP06
// parent README's shared contract → *The study-preferences shape* (EP06A).
//
// `sessionLengthMinutes` / `minSessionMinutes` / `maxSessionMinutes` /
// `dailyCapMinutes` are integers with bounds 5..480 / 5..480 / 5..480 /
// 5..1440 and defaults 60 / 15 / 120 / 240 (D06-4, D06-16). The backend
// returns the *effective* values (defaults filled in, cross-field rules
// repaired), so the form always shows a usable value.

export interface StudyPreferences {
  sessionLengthMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  dailyCapMinutes: number;
}

export type UpdateStudyPreferencesPayload = Partial<StudyPreferences>;
