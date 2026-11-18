import { createContext, useContext } from 'react';
import type { StudySession } from '@/entities/study-session/model/types';
import type { ElapsedAnchor } from '@/entities/study-session/model/elapsed';

/**
 * EP16D (D-D1, D-D8) — one shared `GET /study-sessions/current` read for the
 * whole shell: the header strip now, EP16E's tab bar and Focus-page refresh
 * later. `ownerId` is the signed-in student the `session` was read for, so a
 * consumer never renders another student's session (EP16D-AC3).
 */
export interface CurrentSessionValue {
  session: StudySession | null;
  anchor: ElapsedAnchor | null;
  ownerId: string | null;
  /** True once a read has settled (success or failure) for the current student. */
  settled: boolean;
  refresh: () => void;
}

const noop = () => {};

/**
 * Default for trees without a provider (unit tests, isolated widgets): no
 * session, no read.
 */
export const defaultCurrentSessionValue: CurrentSessionValue = {
  session: null,
  anchor: null,
  ownerId: null,
  settled: false,
  refresh: noop,
};

export const CurrentSessionContext = createContext<CurrentSessionValue>(defaultCurrentSessionValue);

export function useCurrentSession(): CurrentSessionValue {
  return useContext(CurrentSessionContext);
}
