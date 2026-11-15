import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { startSessionFromPlanned } from '@/entities/study-session/api/studySessionApi';

/**
 * EP13D — start a focus session straight from today's plan (D-D10).
 *
 * Mirrors `features/focus-session/model/useStartFocusSession`: one in-flight
 * start at a time, then navigate to `/focus`. The failure handling is the
 * story's decision table:
 *
 * - **409 with an open session** → the conflict state, so the card can offer
 *   "Go to your session" instead of a dead end;
 * - **409 not-today / not-startable, or 404** → the plan the student is
 *   looking at is stale: show the stale message and ask the host to refetch;
 * - anything else → the server's message, else a neutral fallback.
 */
export interface UseStartPlannedSessionResult {
  startingId: string | null;
  error: string | null;
  conflict: boolean;
  start: (plannedSessionId: string, plannedMinutes?: number) => Promise<void>;
  viewCurrentSession: () => void;
  clearError: () => void;
}

/** The copy for a plan that moved on while the student was looking at it. */
export const STALE_SESSION_MESSAGE = "That session isn't on today's plan any more.";

export function useStartPlannedSession(onStalePlan?: () => void): UseStartPlannedSessionResult {
  const navigate = useNavigate();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const clearError = () => {
    setError(null);
    setConflict(false);
  };

  const start = async (plannedSessionId: string, plannedMinutes?: number) => {
    // One start at a time: a double tap must not open two sessions.
    if (startingId) return;
    setStartingId(plannedSessionId);
    setError(null);
    setConflict(false);
    try {
      // EP13I (D-I2): the micro-start passes an explicit 10-minute target;
      // the planned row's lifecycle is identical either way. The full start
      // keeps its exact one-argument call (no body on the wire).
      if (plannedMinutes === undefined) {
        await startSessionFromPlanned(plannedSessionId);
      } else {
        await startSessionFromPlanned(plannedSessionId, { plannedMinutes });
      }
      navigate('/focus');
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      const message =
        apiError && typeof apiError.message === 'string'
          ? apiError.message
          : apiError && Array.isArray(apiError.message)
            ? apiError.message.join(' ')
            : '';

      if (apiError?.statusCode === 409 && /already in progress/i.test(message)) {
        setConflict(true);
        setError(message || 'A focus session is already in progress.');
      } else if (apiError?.statusCode === 409 || apiError?.statusCode === 404) {
        setError(STALE_SESSION_MESSAGE);
        onStalePlan?.();
      } else {
        setError(message || getErrorMessage(err) || "We couldn't start that session. Try again.");
      }
    } finally {
      setStartingId(null);
    }
  };

  const viewCurrentSession = () => {
    navigate('/focus');
  };

  return { startingId, error, conflict, start, viewCurrentSession, clearError };
}
