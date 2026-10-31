import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Timer as TimerIcon, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FocusTimer } from '@/features/focus-session/ui/FocusTimer';
import { FocusAssignmentPanel } from '@/features/focus-session/ui/FocusAssignmentPanel';
import { useFocusSession } from '@/features/focus-session/model/useFocusSession';

export function FocusPage() {
  const {
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
  } = useFocusSession();

  const emptyActionRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    document.title = 'Focus session — StudyPilot';
  }, []);

  useEffect(() => {
    if (!isLoading && !session) {
      const t = window.setTimeout(() => {
        emptyActionRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [isLoading, session]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center" aria-busy="true">
        <Loader2 className="animate-spin text-accent mx-auto" size={24} aria-hidden />
        <p className="mt-3 text-sm text-text-muted">Loading your session…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">{loadError}</p>
          <Button className="mt-4 max-sm:min-h-[44px]" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <EmptyState
          icon={<TimerIcon size={40} />}
          title="No focus session in progress"
          description="Start a session from an assignment to begin focusing."
          action={
            <Link ref={emptyActionRef} to="/assignments">
              <Button className="max-sm:min-h-[44px]">Go to assignments</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <FocusTimer
        session={session}
        displayedElapsed={displayedElapsed}
        busyAction={busyAction}
        transitionError={transitionError}
        conflict409={conflict409}
        onPause={() => void pause()}
        onResume={() => void resume()}
        onFinish={() => void finish()}
        onReload={() => void reload()}
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12">
        <FocusAssignmentPanel assignmentId={session.assignmentId} />
      </div>
    </div>
  );
}
