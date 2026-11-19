import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import { getBrowserTimeZone } from '@/shared/lib/datetime';
import { listStudyPlan } from '@/entities/study-plan/api/studyPlanApi';
import type { SavedPlan } from '@/entities/study-plan/model/types';
import { PlanWeek } from '@/features/study-plan/ui/PlanWeek';
import { RemainingWorkSection } from '@/features/study-plan/ui/RemainingWorkSection';
import { weekLine } from '@/features/study-plan/lib/weekLine';

/**
 * EP16C — `/plan` (D16-5, D-C7): the saved week, Remaining work and one
 * primary action — **Plan my week**, or **Replan my week** once a saved
 * session exists — which opens the one proposal surface at `/plan/proposal`.
 * The preview mode, "Generate plan" / "Save plan", the today hero (now
 * Today's) and the plan note (now Today's) are gone.
 *
 * While the saved read loads, a button-sized placeholder holds the action's
 * place so the label never flips under a screen reader; on a failed read the
 * action still offers Plan my week (the proposal does not depend on it).
 */
export const EMPTY_WEEK_COPY = 'No plan yet — Plan my week to see proposed sessions';

function hasSessions(plan: SavedPlan | null): boolean {
  return !!plan && plan.days.some((d) => d.sessions.length > 0);
}

/** The week skeleton, shown only for the plan region (EP13E D-E10). */
function WeekSkeleton() {
  return (
    <div className="card p-4 sm:p-6" aria-busy="true">
      <div className="grid grid-cols-7 gap-2 overflow-x-auto">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="min-w-[140px] space-y-2 rounded-lg border border-border p-2">
            {Array.from({ length: 3 }).map((__, j) => (
              <div
                key={j}
                className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanPage() {
  const navigate = useNavigate();
  const [savedPlan, setSavedPlan] = useState<SavedPlan | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Plan — StudyPilot';
  }, []);

  const loadSaved = useCallback(async () => {
    setIsLoadingSaved(true);
    setLoadError(null);
    try {
      setSavedPlan(await listStudyPlan());
    } catch (err) {
      setLoadError(getErrorMessage(err) || 'We could not load your saved plan. Try again.');
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const timeZone = savedPlan?.timeZone;
  const actionLabel = hasSessions(savedPlan) ? 'Replan my week' : 'Plan my week';

  return (
    <section
      aria-labelledby="plan-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 id="plan-heading" className="text-3xl font-bold text-text">
            Plan
          </h1>
          <p className="text-sm text-text-muted">
            {savedPlan
              ? weekLine(savedPlan.from, savedPlan.to, savedPlan.timeZone, getBrowserTimeZone())
              : 'Your study plan for the week.'}
          </p>
        </div>
        {isLoadingSaved ? (
          <div
            aria-hidden="true"
            data-testid="plan-action-placeholder"
            className="h-11 w-full animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none sm:h-10 sm:w-40"
          />
        ) : (
          <Button
            onClick={() => navigate('/plan/proposal')}
            className="w-full sm:w-auto max-sm:min-h-[44px]"
          >
            {actionLabel}
          </Button>
        )}
      </div>

      {isLoadingSaved ? (
        <WeekSkeleton />
      ) : loadError ? (
        <div role="alert" className="card border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger-strong">{loadError}</p>
          <Button
            variant="outline"
            className="mt-4 max-sm:min-h-[44px]"
            onClick={() => void loadSaved()}
          >
            Try again
          </Button>
        </div>
      ) : savedPlan ? (
        <PlanWeek
          days={savedPlan.days.map((d) => ({
            date: d.date,
            sessions: d.sessions.map((s) => ({
              assignmentTitle: s.assignmentTitle,
              startTime: s.startTime,
              endTime: s.endTime,
              durationMinutes: s.durationMinutes,
              anchor: s.anchor,
              windowHint: s.windowHint,
            })),
          }))}
          timeZone={savedPlan.timeZone}
          emptyMessage={EMPTY_WEEK_COPY}
        />
      ) : null}

      <RemainingWorkSection timeZone={timeZone} className="mt-6" />
    </section>
  );
}

export default PlanPage;
