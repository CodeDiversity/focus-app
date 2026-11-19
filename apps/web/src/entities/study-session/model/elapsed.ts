import type { StudySession } from './types';

/**
 * EP16D — shared elapsed-time arithmetic for a study session, extracted from
 * `useFocusSession`/`FocusTimer` so the header session indicator derives the
 * same display. The server's `elapsedSeconds` is authoritative at the response
 * instant; the client only adds whole seconds since then (never subtracts, so
 * a skewed clock can't run the timer backwards).
 */
export interface ElapsedAnchor {
  elapsedSeconds: number;
  responseInstant: number;
}

export function anchorFor(session: StudySession, responseInstant: number): ElapsedAnchor {
  return { elapsedSeconds: session.elapsedSeconds, responseInstant };
}

export function elapsedSecondsAt(anchor: ElapsedAnchor, nowMs: number): number {
  return anchor.elapsedSeconds + Math.max(0, Math.floor((nowMs - anchor.responseInstant) / 1000));
}

/** mm:ss, or h:mm:ss past one hour. */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/**
 * EP16H — seconds since the session's last transition. The server sets
 * `updatedAt` on every transition, so for a PAUSED row it is the pause
 * instant. Never negative (a skewed clock can't nag early).
 */
export function pausedForSeconds(session: StudySession, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(session.updatedAt)) / 1000));
}
