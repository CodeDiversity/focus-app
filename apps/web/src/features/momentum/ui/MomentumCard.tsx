import { CheckCircle2, TrendingUp } from 'lucide-react';
import type { MomentumSummary } from '@/entities/study-session/model/types';
import type { DashboardSectionStatus } from '@/features/today/ui/dashboardSection';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import { dailyLine, runLine, weeklyLine } from '../model/momentumCopy';
import { MomentumWeekStrip } from './MomentumWeekStrip';

/**
 * EP13K — the dashboard's "Your momentum" card (D-K9, D-K10).
 *
 * Sits directly after `TodayPlanCard`: feedback *about* showing up comes after
 * the thing it rewards. Quieter than the today card (no accent border). Text
 * carries every meaning — the bar and the week strip are `aria-hidden`. The
 * card adds no live region (D-D13) and no start control: the today card owns
 * initiation (D-I3's control budget). Minutes and days only — never a `%`.
 */
export interface MomentumCardProps {
  momentum?: MomentumSummary;
  status: DashboardSectionStatus;
  error?: unknown;
  isFetching?: boolean;
  onRetry: () => void;
}

export function MomentumCard({ momentum, status, error, isFetching, onRetry }: MomentumCardProps) {
  const rawMessage = getErrorMessage(error).trim();
  const loadMessage =
    !rawMessage || rawMessage === 'An unexpected error occurred'
      ? "We couldn't load your momentum."
      : rawMessage;

  return (
    <section
      aria-labelledby="momentum-heading"
      aria-busy={status === 'loading' ? true : undefined}
      className="card mb-6 p-4 sm:p-6"
    >
      <h2
        id="momentum-heading"
        className="mb-4 flex items-center gap-2 text-lg font-semibold text-text"
      >
        <TrendingUp aria-hidden size={18} className="shrink-0 text-text-muted" />
        Your momentum
      </h2>

      {status === 'loading' ? (
        <div className="space-y-3">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="h-6 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : status === 'error' || !momentum ? (
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
      ) : !momentum.hasHistory ? (
        <EmptyState
          icon={<TrendingUp aria-hidden size={32} />}
          title="No sessions yet"
          description="Your first focus session starts your momentum. Today's plan above is the place to begin."
        />
      ) : (
        <MomentumBody momentum={momentum} />
      )}
    </section>
  );
}

function MomentumBody({ momentum }: { momentum: MomentumSummary }) {
  const { today, week } = momentum;
  const fill = today.goalMinutes > 0 ? Math.min(1, today.confirmedMinutes / today.goalMinutes) : 0;
  const run = runLine(momentum);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="min-w-0 sm:flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-text">
          {today.goalMet ? (
            <CheckCircle2 aria-hidden size={16} className="shrink-0 text-success" />
          ) : null}
          {dailyLine(momentum)}
        </p>
        {/* Graphic only — the line above carries the meaning (D13-9: no % rendered). */}
        <div
          aria-hidden
          data-testid="momentum-daily-bar"
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className={`h-full rounded-full ${today.goalMet ? 'bg-success' : 'bg-accent'}`}
            style={{ width: `${fill * 100}%` }}
          />
        </div>
      </div>

      <div className="min-w-0 sm:flex-1">
        <MomentumWeekStrip momentum={momentum} />
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-text">
          {week.goalMet ? (
            <Badge variant="success">{weeklyLine(momentum)}</Badge>
          ) : (
            weeklyLine(momentum)
          )}
        </p>
        {run ? <p className="mt-1 text-sm text-text-muted">{run}</p> : null}
      </div>
    </div>
  );
}
