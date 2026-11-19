import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pause, Timer } from 'lucide-react';
import { useAuth } from '@/features/auth/model/AuthContext';
import {
  elapsedSecondsAt,
  formatElapsed,
  pausedForSeconds,
} from '@/entities/study-session/model/elapsed';
import { useCurrentSession } from '../model/useCurrentSession';

/**
 * EP16D (AC-E16-10; D-D2, D-D6) — the slim session strip at the top of the
 * header: "Running · mm:ss" (ticking client-side) or "Paused · mm:ss" with one
 * **Back to session** link. Hidden on `/focus` exactly (the timer is the page);
 * shown on `/focus/history`. The live span persists whenever signed in so a
 * screen reader hears the appearance once — its text is the state sentence,
 * never the ticking time (the visible status group is aria-hidden).
 *
 * EP16H (D-H2, D-H3) — a session paused for 15 minutes or more invites the
 * student back: "Paused a while · mm:ss" with a **Resume** link and one new
 * polite sentence. No colour change, no nagging cadence — the check is a
 * coarse 60 s render tick, never a network read (D16-11).
 *
 * EP16I (D-I2) — when the session has a target, the visible status carries it
 * ("12:34 of 25 min"; "· target reached" once met — positive, never "over",
 * mirroring EP13I's reached rule). The suffix is `sm`-gated so the 320 px
 * strip keeps EP16D's one-line layout, and it never enters the live sentence
 * (a target in a live region would re-announce on every state change).
 */
export const PAUSE_NUDGE_SECONDS = 15 * 60;

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

  // Display ticks only — never a network read (D16-11 applies to the request).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!visible || !running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [visible, running, anchor]);
  // EP16H: while paused the only thing that can change is "how long" — one
  // coarse check per minute is enough to cross the nudge threshold.
  useEffect(() => {
    if (!visible || running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [visible, running, session?.updatedAt]);

  if (!isAuthenticated) return null;

  const elapsed =
    visible && anchor ? elapsedSecondsAt(anchor, running ? now : anchor.responseInstant) : 0;
  const pausedLong =
    visible && !running && !!session && pausedForSeconds(session, now) >= PAUSE_NUDGE_SECONDS;
  const target = session?.plannedMinutes ?? null;
  const targetReached = target !== null && Math.floor(elapsed / 60) >= target;
  const liveText = visible
    ? running
      ? 'Your focus session is running.'
      : pausedLong
        ? 'Your session has been paused for a while — ready when you are.'
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
                {running ? 'Running' : pausedLong ? 'Paused a while' : 'Paused'} ·{' '}
                <span className="tabular-nums">{formatElapsed(elapsed)}</span>
                {target !== null ? (
                  <span className="hidden sm:inline">
                    {targetReached ? ' · target reached' : ` of ${target} min`}
                  </span>
                ) : null}
              </span>
            </div>
            <Link
              to="/focus"
              className="inline-flex min-h-[44px] items-center px-2 text-body-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded-md"
            >
              {pausedLong ? 'Resume' : 'Back to session'}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
