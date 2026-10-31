import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { startStudySession } from '@/entities/study-session/api/studySessionApi';

export interface UseStartFocusSessionResult {
  isStarting: boolean;
  error: string | null;
  conflict: boolean;
  start: (plannedMinutes: number) => Promise<void>;
  viewCurrentSession: () => void;
  clearError: () => void;
}

export function useStartFocusSession(
  assignmentId: string | null,
  onClose: () => void
): UseStartFocusSessionResult {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const clearError = () => {
    setError(null);
    setConflict(false);
  };

  const start = async (plannedMinutes: number) => {
    if (isStarting || !assignmentId) return;
    setIsStarting(true);
    setError(null);
    setConflict(false);
    try {
      await startStudySession({ assignmentId, plannedMinutes });
      onClose();
      navigate('/focus');
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      if (apiError?.statusCode === 409) {
        setConflict(true);
        setError(
          typeof apiError.message === 'string' && apiError.message.length > 0
            ? apiError.message
            : 'A focus session is already in progress.'
        );
      } else {
        setError(
          apiError
            ? Array.isArray(apiError.message)
              ? apiError.message.join(' ')
              : apiError.message
            : getErrorMessage(err) || 'We could not start the focus session. Try again.'
        );
      }
    } finally {
      setIsStarting(false);
    }
  };

  const viewCurrentSession = () => {
    onClose();
    navigate('/focus');
  };

  return { isStarting, error, conflict, start, viewCurrentSession, clearError };
}
