/**
 * Provisional duration-default seam (V-07-1 / D07-4). Reads the student's
 * `User.preferences.studyDefaults` and returns a number only when the value is
 * a finite number inside the server's accepted range (5–480); otherwise falls
 * back to EP07's own default of 25 minutes.
 *
 * Accepted shape today (provisional): `preferences.studyDefaults` must be a
 * plain object whose `sessionMinutes` key is a finite number in 5–480. Any
 * other shape falls back. If EP06 later chooses a different key, only this
 * helper changes.
 */
export const DEFAULT_SESSION_MINUTES = 25;

export function resolveDefaultSessionMinutes(
  user: { preferences?: Record<string, unknown> | null } | null | undefined
): number {
  const prefs = user?.preferences;
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) return DEFAULT_SESSION_MINUTES;
  const studyDefaults = (prefs as Record<string, unknown>).studyDefaults;
  if (!studyDefaults || typeof studyDefaults !== 'object' || Array.isArray(studyDefaults)) {
    return DEFAULT_SESSION_MINUTES;
  }
  const sessionMinutes = (studyDefaults as Record<string, unknown>).sessionMinutes;
  if (typeof sessionMinutes !== 'number' || !Number.isFinite(sessionMinutes)) {
    return DEFAULT_SESSION_MINUTES;
  }
  if (sessionMinutes < 5 || sessionMinutes > 480) return DEFAULT_SESSION_MINUTES;
  return sessionMinutes;
}
