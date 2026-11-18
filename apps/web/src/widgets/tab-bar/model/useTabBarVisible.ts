import { useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/AuthContext';
import { MD_UP_QUERY, useMediaQuery } from '@/shared/lib/useMediaQuery';
import { useCurrentSession } from '@/widgets/session-indicator/model/useCurrentSession';

/**
 * EP16E — one rule for the bar and for `Layout`'s bottom padding:
 * signed in, below `md`, and not on `/focus` while a session is running or
 * paused (D16-12 distraction-free; D-E3 (a)). On `/focus` the bar also stays
 * hidden until the current-session read settles, so it never flashes in and
 * back out while the session resolves. A failed read counts as no session
 * (D-D4).
 */
export function useTabBarVisible(): boolean {
  const { isAuthenticated } = useAuth();
  const isMdUp = useMediaQuery(MD_UP_QUERY, true);
  const { pathname } = useLocation();
  const { session, settled } = useCurrentSession();

  if (!isAuthenticated || isMdUp) return false;
  if (pathname === '/focus') {
    if (!settled) return false;
    const status = session?.status;
    if (status === 'ACTIVE' || status === 'PAUSED') return false;
  }
  return true;
}
