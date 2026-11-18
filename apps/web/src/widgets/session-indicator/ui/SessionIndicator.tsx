import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pause, Timer } from 'lucide-react';
import { useAuth } from '@/features/auth/model/AuthContext';
import { elapsedSecondsAt, formatElapsed } from '@/entities/study-session/model/elapsed';
import { useCurrentSession } from '../model/useCurrentSession';

/**
 * EP16D (AC-E16-10; D-D2, D-D6) — the slim session strip at the top of the
 * header: "Running · mm:ss" (ticking client-side) or "Paused · mm:ss" with one
 * **Back to session** link. Hidden on `/focus` exactly (the timer is the page);
 * shown on `/focus/history`. The live span persists whenever signed in so a
 * screen reader hears the appearance once — its text is the state sentence,
 * never the ticking time (the visible status group is aria-hidden).
 */
export function SessionIndicator() {
  const { isAuthenticated, user } = useAuth();
  const { session, anchor, ownerId } = useCurrentSession();
  const { pathname } = useLocation();

  const status = session?.status;
  const running = status === 'ACTIVE';
  const visible =
    isAuthenticated &&
    pathname !== '/focus' &&
    ownerId !== null &&
    ownerId === user?.id &&
    (status === 'ACTIVE' || status === 'PAUSED') &&
    anchor !== null;

  // Display tick only — never a network read (D16-11 applies to the request).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!visible || !running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [visible, running, anchor]);

  if (!isAuthenticated) return null;

  const elapsed =
    visible && anchor ? elapsedSecondsAt(anchor, running ? now : anchor.responseInstant) : 0;
  const liveText = visible
    ? running
      ? 'Your focus session is running.'
      : 'Your focus session is paused.'
    : '';

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveText}
      </span>
      {visible && (
        <div className="border-b border-border bg-surface-muted">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex min-h-[44px] items-center justify-between gap-3">
            <div aria-hidden="true" className="flex items-center gap-2 text-body-sm text-text">
              {running ? <Timer className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              <span>
                {running ? 'Running' : 'Paused'} ·{' '}
                <span className="tabular-nums">{formatElapsed(elapsed)}</span>
              </span>
            </div>
            <Link
              to="/focus"
              className="inline-flex min-h-[44px] items-center px-2 text-body-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded-md"
            >
              Back to session
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
