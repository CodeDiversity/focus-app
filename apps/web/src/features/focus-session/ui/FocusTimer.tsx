import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import type { StudySession } from '@/entities/study-session/model/types';
import type { BusyAction } from '../model/useFocusSession';

export interface FocusTimerProps {
  session: StudySession;
  displayedElapsed: number;
  busyAction: BusyAction;
  transitionError: string | null;
  conflict409: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onReload: () => void;
}

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function FocusTimer({
  session,
  displayedElapsed,
  busyAction,
  transitionError,
  conflict409,
  onPause,
  onResume,
  onFinish,
  onReload,
}: FocusTimerProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const anyBusy = busyAction !== null;

  useEffect(() => {
    // Initial focus on the primary control once the session resolves.
    const t = window.setTimeout(() => {
      primaryRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [session.id, session.status]);

  const formatted = formatElapsed(displayedElapsed);
  const statusText =
    session.status === 'ACTIVE'
      ? 'Focus session running'
      : session.status === 'PAUSED'
        ? 'Focus session paused'
        : 'Focus session complete';

  const elapsedMinutes = Math.floor(displayedElapsed / 60);
  const planned = session.plannedMinutes;
  const exceeded = planned != null && elapsedMinutes >= planned;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex justify-center mb-4">
        <Badge variant="neutral" size="sm">
          Focus
        </Badge>
      </div>
      <h1 className="text-h2 text-text text-center mb-6">Focus session</h1>

      {/* Live region — status changes only. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusText}
      </div>

      <div className="text-center">
        <p
          className="text-display text-6xl sm:text-7xl font-semibold tabular-nums text-text"
          aria-label={`Elapsed time ${formatted}`}
        >
          {formatted}
        </p>
        <p
          className={
            exceeded ? 'mt-2 text-body-sm text-warning' : 'mt-2 text-body-sm text-text-muted'
          }
        >
          {planned == null
            ? 'No target set'
            : exceeded
              ? `Target reached — ${elapsedMinutes} min`
              : `${elapsedMinutes} of ${planned} min`}
        </p>
        {planned != null && (
          <div className="mt-3 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className={
                exceeded
                  ? 'h-full bg-warning transition-all duration-base motion-reduce:transition-none'
                  : 'h-full bg-accent transition-all duration-base motion-reduce:transition-none'
              }
              style={{ width: `${Math.min(displayedElapsed / (planned * 60), 1) * 100}%` }}
            />
          </div>
        )}
      </div>

      {session.status !== 'COMPLETED' && (
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            ref={primaryRef}
            variant="primary"
            size="lg"
            className="min-w-[160px]"
            isLoading={busyAction === 'pause' || busyAction === 'resume'}
            disabled={anyBusy}
            leftIcon={session.status === 'ACTIVE' ? <Pause /> : <Play />}
            onClick={session.status === 'ACTIVE' ? onPause : onResume}
            aria-label={session.status === 'ACTIVE' ? 'Pause' : 'Resume'}
          >
            {session.status === 'ACTIVE' ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-w-[160px] border-danger text-danger hover:bg-danger/10"
            isLoading={busyAction === 'finish'}
            disabled={anyBusy}
            leftIcon={<Square />}
            onClick={onFinish}
          >
            Finish session
          </Button>
        </div>
      )}

      {transitionError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger max-w-2xl mx-auto"
        >
          <p>{transitionError}</p>
          {conflict409 && (
            <>
              <p className="mt-1">Your session changed. Reload to continue.</p>
              <div className="mt-2">
                <Button size="sm" variant="secondary" onClick={onReload}>
                  Reload session
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {session.status === 'COMPLETED' && (
        <div className="mt-8 rounded-lg border border-border bg-surface p-6 text-center">
          <p className="font-semibold text-text">Session complete</p>
          <p className="mt-1 text-text-muted">{session.durationMinutes} minutes recorded</p>
          <p className="mt-2 text-sm text-text-muted">
            You can review and adjust this session in your study history.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/focus/history">
              <Button variant="primary">View study history</Button>
            </Link>
            <Link to="/assignments">
              <Button variant="secondary">Back to assignments</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
