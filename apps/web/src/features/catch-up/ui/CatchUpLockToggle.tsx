import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { setPlannedSessionLock } from '@/entities/study-plan/api/studyPlanApi';

export interface CatchUpLockToggleProps {
  /** The `PlannedSession.id` (the client-visible `MissedSession.id`). */
  sessionId: string;
  assignmentTitle: string;
  /** The session's current lock state. */
  locked: boolean;
  /** Reports a persisted change so the surface can sync the card list and count. */
  onLockedChange: (sessionId: string, nextLocked: boolean) => void;
}

const FAILURE_MESSAGE = "We couldn't update that session's lock. Try again.";

/**
 * The explicit student lock toggle (D08-4 / V-08-1, EP08E decision 7) — a
 * native toggle button (`aria-pressed`, state never by color alone) wired to
 * `PATCH /study-plans/sessions/:sessionId/lock`. Clicking optimistically
 * flips the pressed state while pending; success persists server-side (no
 * preview regeneration needed — the count re-syncs on the next generation),
 * failure reverts the toggle and shows an inline actionable error (clicking
 * again retries).
 */
export function CatchUpLockToggle({
  sessionId,
  assignmentTitle,
  locked,
  onLockedChange,
}: CatchUpLockToggleProps) {
  const [current, setCurrent] = useState(locked);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setCurrent(locked);
  }, [locked]);

  const pressed = optimistic ?? current;

  const toggle = async () => {
    const next = !pressed;
    setOptimistic(next);
    setIsPending(true);
    setError(null);
    try {
      await setPlannedSessionLock(sessionId, next);
      setCurrent(next);
      onLockedChange(sessionId, next);
      setAnnouncement('Lock saved');
    } catch {
      setError(FAILURE_MESSAGE);
      setAnnouncement(FAILURE_MESSAGE);
    } finally {
      setOptimistic(null);
      setIsPending(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-pressed={pressed}
        aria-label={`Keep "${assignmentTitle}" locked`}
        isLoading={isPending}
        onClick={() => void toggle()}
      >
        Keep &ldquo;{assignmentTitle}&rdquo; locked
      </Button>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default CatchUpLockToggle;
