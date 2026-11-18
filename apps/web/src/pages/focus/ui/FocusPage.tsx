import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Timer as TimerIcon, History, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FocusTimer } from '@/features/focus-session/ui/FocusTimer';
import { AbsorbNextOffer } from '@/features/focus-session/ui/AbsorbNextOffer';
import { FocusAssignmentPanel } from '@/features/focus-session/ui/FocusAssignmentPanel';
import { FinishSessionDialog } from '@/features/focus-session/ui/FinishSessionDialog';
import { useFocusSession } from '@/features/focus-session/model/useFocusSession';
import { useLazyMomentumQuery } from '@/features/momentum/api/momentumApi';

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
    reload,
    applySession,
  } = useFocusSession();

  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  /**
   * EP13K (D-K8) — momentum is read only after a finish, so the celebration
   * never shows the pre-finish numbers; a failed or pending read leaves the
   * celebration with its headline alone.
   */
  const [fetchMomentum, momentumResult] = useLazyMomentumQuery();
  const momentum =
    momentumResult.isSuccess && !momentumResult.isFetching ? momentumResult.data : undefined;

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
    // EP16D (D-D7): the heading row with Study history lives on the empty
    // state only — the running timer stays distraction-free (D16-12) and the
    // celebration keeps its own history link.
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-6 flex items-center justify-between gap-2">
          <h1 className="text-3xl font-bold text-text">Focus session</h1>
          <Link
            to="/focus/history"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-body-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 max-sm:min-h-[44px]"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Study history
          </Link>
        </div>
        <EmptyState
          icon={<TimerIcon size={40} />}
          title="No focus session in progress"
          description="Your next session is on Today."
          action={
            <Link ref={emptyActionRef} to="/today">
              <Button className="max-sm:min-h-[44px]">Go to Today</Button>
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
        onFinish={() => setFinishDialogOpen(true)}
        onReload={() => void reload()}
        momentum={momentum}
      />
      {/* EP13I (D-I6): the absorption offer — the same target-reached rule
          the timer renders, computed here so the two can never disagree. */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <AbsorbNextOffer
          session={session}
          targetReached={
            session.plannedMinutes != null &&
            Math.floor(displayedElapsed / 60) >= session.plannedMinutes
          }
          onApply={applySession}
        />
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12">
        <FocusAssignmentPanel assignmentId={session.assignmentId} />
      </div>
      <FinishSessionDialog
        session={session}
        open={finishDialogOpen}
        onClose={() => setFinishDialogOpen(false)}
        onFinished={(completed) => {
          applySession(completed);
          setFinishDialogOpen(false);
          if (completed.durationMinutes >= 1) {
            void fetchMomentum(undefined, false);
          }
        }}
        onReload={() => void reload()}
      />
    </div>
  );
}
