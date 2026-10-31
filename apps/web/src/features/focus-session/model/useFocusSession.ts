import { useCallback, useEffect, useState } from 'react';
import { extractApiError, getErrorMessage } from '@/shared/lib/errors';
import {
  getCurrentStudySession,
  pauseStudySession,
  resumeStudySession,
  finishStudySession,
} from '@/entities/study-session/api/studySessionApi';
import type { StudySession } from '@/entities/study-session/model/types';

export type BusyAction = 'pause' | 'resume' | 'finish' | null;

export interface UseFocusSessionResult {
  session: StudySession | null;
  isLoading: boolean;
  loadError: string | null;
  displayedElapsed: number;
  busyAction: BusyAction;
  transitionError: string | null;
  conflict409: boolean;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<void>;
  reload: () => Promise<void>;
  clearTransitionError: () => void;
}

export function useFocusSession(): UseFocusSessionResult {
  const [session, setSession] = useState<StudySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{
    elapsedSeconds: number;
    responseInstant: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [conflict409, setConflict409] = useState(false);

  const applySession = useCallback((s: StudySession | null) => {
    setSession(s);
    if (s) {
      setAnchor({ elapsedSeconds: s.elapsedSeconds, responseInstant: Date.now() });
    } else {
      setAnchor(null);
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const s = await getCurrentStudySession();
      applySession(s);
    } catch (err) {
      setLoadError(getErrorMessage(err) || 'We could not load your session. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the display while the session is ACTIVE.
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || !anchor) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session, anchor]);

  const displayedElapsed = anchor
    ? anchor.elapsedSeconds + Math.max(0, Math.floor((now - anchor.responseInstant) / 1000))
    : 0;

  const clearTransitionError = useCallback(() => {
    setTransitionError(null);
    setConflict409(false);
  }, []);

  const runTransition = useCallback(
    async (action: 'pause' | 'resume' | 'finish', fn: () => Promise<StudySession>) => {
      if (busyAction) return;
      setBusyAction(action);
      setTransitionError(null);
      setConflict409(false);
      try {
        const updated = await fn();
        applySession(updated);
        setNow(Date.now());
      } catch (err) {
        const apiError = extractApiError(err);
        if (apiError?.statusCode === 409) {
          setConflict409(true);
          setTransitionError(
            typeof apiError.message === 'string' && apiError.message.length > 0
              ? apiError.message
              : 'Your session changed. Reload to continue.'
          );
        } else {
          setTransitionError(getErrorMessage(err) || 'Something went wrong. Try again.');
        }
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, applySession]
  );

  const pause = useCallback(() => {
    if (!session) return Promise.resolve();
    return runTransition('pause', () => pauseStudySession(session.id));
  }, [session, runTransition]);

  const resume = useCallback(() => {
    if (!session) return Promise.resolve();
    return runTransition('resume', () => resumeStudySession(session.id));
  }, [session, runTransition]);

  const finish = useCallback(() => {
    if (!session) return Promise.resolve();
    return runTransition('finish', () => finishStudySession(session.id));
  }, [session, runTransition]);

  const reload = useCallback(async () => {
    clearTransitionError();
    await load();
  }, [clearTransitionError, load]);

  return {
    session,
    isLoading,
    loadError,
    displayedElapsed,
    busyAction,
    transitionError,
    conflict409,
    pause,
    resume,
    finish,
    reload,
    clearTransitionError,
  };
}
