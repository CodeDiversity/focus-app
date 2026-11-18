import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/AuthContext';
import { getCurrentStudySession } from '@/entities/study-session/api/studySessionApi';
import { anchorFor, type ElapsedAnchor } from '@/entities/study-session/model/elapsed';
import type { StudySession } from '@/entities/study-session/model/types';
import { CurrentSessionContext, type CurrentSessionValue } from './useCurrentSession';

interface CurrentSessionState {
  session: StudySession | null;
  anchor: ElapsedAnchor | null;
  ownerId: string | null;
  settled: boolean;
}

const EMPTY: CurrentSessionState = { session: null, anchor: null, ownerId: null, settled: false };

/**
 * EP16D (D-D1, D-D8; D16-11) — reads `GET /study-sessions/current` on mount,
 * on every pathname change, on `visibilitychange` → visible and on `refresh()`;
 * never on an interval. The last known state is kept while a re-read is in
 * flight so the strip doesn't flicker on navigation; a failed read becomes
 * `null` silently (D-D4). A generation counter drops any response that
 * resolves after a newer read or after the signed-in student changed
 * (EP16D-AC3).
 */
export function CurrentSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const userId = user?.id ?? null;

  const [state, setState] = useState<CurrentSessionState>(EMPTY);
  const generationRef = useRef(0);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const read = useCallback((ownerId: string) => {
    const generation = ++generationRef.current;
    const isCurrent = () =>
      mountedRef.current && generation === generationRef.current && userIdRef.current === ownerId;
    getCurrentStudySession()
      .then((session) => {
        if (!isCurrent()) return;
        setState({
          session,
          anchor: session ? anchorFor(session, Date.now()) : null,
          ownerId,
          settled: true,
        });
      })
      .catch(() => {
        if (!isCurrent()) return;
        setState({ session: null, anchor: null, ownerId, settled: true });
      });
  }, []);

  // One effect for mount, user change and pathname change: a user change
  // resets synchronously (and invalidates in-flight reads) before any read, so
  // the previous student's session can never render (EP16D-AC3).
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const userChanged = prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;
    if (userChanged) {
      generationRef.current += 1;
      setState(EMPTY);
    }
    if (userId) read(userId);
  }, [userId, pathname, read]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userIdRef.current) {
        read(userIdRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [read]);

  const refresh = useCallback(() => {
    if (userIdRef.current) read(userIdRef.current);
  }, [read]);

  const value = useMemo<CurrentSessionValue>(() => ({ ...state, refresh }), [state, refresh]);

  return <CurrentSessionContext.Provider value={value}>{children}</CurrentSessionContext.Provider>;
}
