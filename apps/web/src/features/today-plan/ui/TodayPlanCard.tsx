import { Link } from 'react-router-dom';
import { CalendarClock, Sparkles } from 'lucide-react';
import type { TodayPlan } from '@/entities/study-plan/model/types';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  eventTimeRange,
  type DashboardSectionStatus,
} from '@/features/dashboard/ui/dashboardSection';
import { sessionTimeLabel } from '@/entities/study-plan/model/sessionTimeLabel';
import { useStartPlannedSession } from '../model/useStartPlannedSession';
import { TodayPlanRow, isStartable } from './TodayPlanRow';

/**
 * EP13D — the dashboard's "Today's plan" card (ui-refiner decisions
 * D-D1…D-D13).
 *
 * One card, full width, directly under the page header: the single next
 * action is the first thing the student sees (ADHD initiation), the rest of
 * today follows as compact rows, and the minutes already studied ride in the
 * header. The page keeps its one `role="status"` live region (D-D13); this
 * card adds none and uses `role="alert"` only for start failures.
 *
 * Every state is the story's copy: no plan → "Generate a plan"; nothing left
 * → the done block; error → "Try again". No compliance percentage and no
 * blaming copy anywhere (D13-9).
 */
export interface TodayPlanCardProps {
  plan?: TodayPlan;
  status: DashboardSectionStatus;
  error?: unknown;
  isFetching?: boolean;
  onRetry: () => void;
}

export function TodayPlanCard({ plan, status, error, isFetching, onRetry }: TodayPlanCardProps) {
  const start = useStartPlannedSession(onRetry);

  const sessions = plan?.sessions ?? [];
  const next = plan?.nextSession ?? null;
  const rest = next ? sessions.filter((session) => session.id !== next.id) : sessions;
  const minutes = plan?.confirmedMinutesToday ?? 0;
  /**
   * The server's message when it carries one (DoD 4), else this card's own
   * copy (D-D9). `getErrorMessage` never returns an empty string — it falls
   * back to a generic sentence — so that generic value is treated as "no
   * useful message" rather than shown: "We couldn't load today's plan" tells
   * the student which surface failed, "An unexpected error occurred" does not.
   */
  const rawMessage = getErrorMessage(error).trim();
  const loadMessage =
    !rawMessage || rawMessage === 'An unexpected error occurred'
      ? "We couldn't load today's plan."
      : rawMessage;

  return (
    <section
      aria-labelledby="today-plan-heading"
      aria-busy={status === 'loading' ? true : undefined}
      className="card mb-6 p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="today-plan-heading"
          className="flex items-center gap-2 text-lg font-semibold text-text"
        >
          <CalendarClock aria-hidden size={18} className="shrink-0 text-text-muted" />
          Today&apos;s plan
        </h2>
        {/* Minutes done — never a percentage of the plan (D-D11, D13-9). */}
        {minutes > 0 ? <Badge variant="success">{minutes} min studied today</Badge> : null}
      </div>

      {status === 'loading' ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">{loadMessage}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 max-sm:min-h-[44px]"
            isLoading={isFetching}
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarClock aria-hidden size={32} />}
          title="No plan for today yet"
          description="Generate a plan to get a next step for today."
          action={
            <Link to="/plan">
              <Button className="max-sm:min-h-[44px]">Generate a plan</Button>
            </Link>
          }
        />
      ) : (
        <>
          {next ? (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Next up
                </p>
                <p className="mt-1 truncate text-lg font-semibold text-text">
                  {next.assignmentTitle}
                </p>
                <p className="mt-0.5 text-sm text-text-muted">
                  {/* EP13H (D-H8): the hero's meta follows the anchor. */}
                  {sessionTimeLabel({
                    anchor: next.anchor,
                    windowHint: next.windowHint,
                    timeRange: eventTimeRange(next.startTime, next.endTime),
                    durationMinutes: next.durationMinutes,
                    anytimeWord: 'Anytime today',
                  })}
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="lg"
                  className="w-full sm:w-auto max-sm:min-h-[44px]"
                  isLoading={start.startingId === next.id}
                  disabled={Boolean(start.startingId) && start.startingId !== next.id}
                  onClick={() => void start.start(next.id)}
                >
                  {next.status === 'IN_PROGRESS' ? 'Resume focus' : 'Start focus'}
                </Button>
                {/* EP13I (D-I1/D-I2): the micro-start — the barrier is the
                    first minute, so the smallest honest commitment sits one
                    tap away, right where initiation happens. Not shown when
                    re-entering a session already in progress. */}
                {next.status !== 'IN_PROGRESS' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto max-sm:min-h-[44px]"
                    disabled={Boolean(start.startingId)}
                    onClick={() => void start.start(next.id, 10)}
                    aria-label={`Start ${next.assignmentTitle} for just 10 minutes`}
                  >
                    Just 10 min
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-success/30 bg-success/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-text">
                <Sparkles aria-hidden size={16} className="shrink-0 text-success" />
                Today&apos;s plan is done
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {minutes > 0
                  ? `${minutes} minutes studied today. Anything else is a bonus.`
                  : 'Anything else today is a bonus.'}
              </p>
            </div>
          )}

          {/* A start that failed is an error, not a status (D-D13). */}
          {start.error ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
            >
              <p className="text-sm text-danger">{start.error}</p>
              {start.conflict ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full sm:mt-0 sm:w-auto max-sm:min-h-[44px]"
                  onClick={start.viewCurrentSession}
                >
                  Go to your session
                </Button>
              ) : null}
            </div>
          ) : null}

          {rest.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {rest.map((session) => (
                <TodayPlanRow
                  key={session.id}
                  session={session}
                  onStart={isStartable(session) ? (id) => void start.start(id) : undefined}
                  isStarting={start.startingId === session.id}
                  isBusy={Boolean(start.startingId)}
                />
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
