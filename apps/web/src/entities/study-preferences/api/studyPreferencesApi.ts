import api from '@/shared/api/httpClient';
import type {
  StudyPreferences,
  UpdateStudyPreferencesPayload,
} from '@/entities/study-preferences/model/types';

export { type StudyPreferences } from '@/entities/study-preferences/model/types';

/**
 * Study-preferences client (EP06E; EP06A owns the endpoints). Top-level routes,
 * not nested under `/users` (the `/availability-slots` precedent). Plain axios
 * over the shared transport (D404-10 — no RTK Query).
 *
 * `GET /study-preferences` → the effective four values (defaults filled in).
 * `PUT /study-preferences` → partial body; the server merges onto the current
 * effective values and validates the merged result; 400 carries a field-level
 * `errors` map.
 */

/**
 * Reads the authenticated student's effective study defaults.
 *
 * 200 → `{ sessionLengthMinutes, minSessionMinutes, maxSessionMinutes,
 * dailyCapMinutes }`.
 * 401 → unauthenticated (global guard).
 */
export async function getStudyPreferences(): Promise<StudyPreferences> {
  const response = await api.get<StudyPreferences>('/study-preferences');
  return response.data;
}

/**
 * Writes a partial subset of the study defaults. The server merges onto the
 * current effective values, validates the merged result and returns the
 * effective set.
 *
 * 200 → the effective values.
 * 400 → field-level `errors` map (bounds + cross-field rules); nothing
 * written.
 * 401 → unauthenticated.
 */
export async function putStudyPreferences(
  payload: UpdateStudyPreferencesPayload
): Promise<StudyPreferences> {
  const response = await api.put<StudyPreferences>('/study-preferences', payload);
  return response.data;
}
