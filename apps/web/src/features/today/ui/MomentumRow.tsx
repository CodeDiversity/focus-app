import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { MomentumSummary } from '@/entities/study-session/model/types';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import { runLine, weeklyLine } from '@/features/momentum/model/momentumCopy';
import { MomentumWeekStrip } from '@/features/momentum/ui/MomentumWeekStrip';
import type { DashboardSectionStatus } from './dashboardSection';

/**
 * EP16B-AC2 (D16-8 (c), refines EP13K D-K9/D-K10) — Today's momentum row:
 * the seven day marks (compact, decorative, with their sr-only sentence),
 * the weekly sentence and the run line, and "See history". No progress bar,
 * no daily sentence (the hero's badge carries today's minutes), no card.
 * Nothing renders before the first session — the hero is the call to action.
 */
export interface MomentumRowProps {
  momentum?: MomentumSummary;
  status: DashboardSectionStatus;
  error?: unknown;
  isFetching?: boolean;
  onRetry: () => void;
}

export function MomentumRow({ momentum, status, error, isFetching, onRetry }: MomentumRowProps) {
  if (status === 'loading') {
    return (
      <div aria-busy="true" className="mb-6">
        <div className="h-9 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
      </div>
    );
  }
  if (status === 'error') {
    const raw = getErrorMessage(error).trim();
    const message =
      !raw || raw === 'An unexpected error occurred' ? "We couldn't load your momentum." : raw;
    return (
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span>{message}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isFetching}
          className="max-sm:min-h-[44px]"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!momentum || !momentum.hasHistory) return null;

  const run = runLine(momentum);
  return (
    <section aria-labelledby="momentum-heading" className="mb-6" data-testid="momentum-row">
      <h2 id="momentum-heading" className="sr-only">
        Your momentum
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="w-full sm:w-72 sm:shrink-0">
          <MomentumWeekStrip momentum={momentum} compact />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-text">
            {momentum.week.goalMet ? (
              <CheckCircle2 aria-hidden size={16} className="shrink-0 text-success" />
            ) : null}
            {weeklyLine(momentum)}
          </p>
          {run ? <p className="mt-0.5 text-sm text-text-muted">{run}</p> : null}
        </div>
        <Link
          to="/focus/history"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 sm:min-h-0"
        >
          See history
        </Link>
      </div>
    </section>
  );
}
