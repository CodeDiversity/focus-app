import { Link } from 'react-router-dom';
import type { AssignmentListItem } from '@/shared/types/academic';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import { limitRows, selectComingUp } from '../model/dashboardSelectors';
import { COMING_UP_LIMIT, type DashboardSectionStatus } from './dashboardSection';
import { DashboardAssignmentRow } from './DashboardAssignmentRow';

/**
 * EP16B-AC3 (D16-3, D-B2, D-B3, D-B6) — Coming up: the unfinished
 * assignments, past-due first with a text badge, at most five, one card with
 * a divided list, "All assignments" under it. The heading carries no count.
 * Nothing renders when there is nothing to show (D16-12 (10)).
 */
export interface ComingUpProps {
  rows: AssignmentListItem[];
  timeZone: string;
  status: DashboardSectionStatus;
  error?: unknown;
  isFetching?: boolean;
  onRetry: () => void;
  onOpenDetails: (row: AssignmentListItem) => void;
}

export function ComingUp({
  rows,
  timeZone,
  status,
  error,
  isFetching,
  onRetry,
  onOpenDetails,
}: ComingUpProps) {
  const comingUp = selectComingUp(rows);
  if (status === 'ready' && comingUp.length === 0) return null;
  const { rows: shown } = limitRows(comingUp, COMING_UP_LIMIT);

  return (
    <section aria-labelledby="coming-up-heading" className="mb-6" data-testid="coming-up">
      <h2 id="coming-up-heading" className="mb-3 text-lg font-semibold text-text">
        Coming up
      </h2>
      {status === 'loading' ? (
        <div className="card p-4 sm:p-6" aria-busy="true">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <span>{errorCopy(error)}</span>
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
      ) : (
        <>
          <div className="card p-4 sm:p-6">
            <ul className="divide-y divide-border">
              {shown.map((row) => (
                <DashboardAssignmentRow
                  key={row.id}
                  assignment={row}
                  timeZone={timeZone}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </ul>
          </div>
          <Link
            to="/assignments"
            className="mt-2 inline-flex items-center text-sm font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 max-sm:min-h-[44px]"
          >
            All assignments
          </Link>
        </>
      )}
    </section>
  );
}

function errorCopy(error: unknown): string {
  const raw = getErrorMessage(error).trim();
  return !raw || raw === 'An unexpected error occurred'
    ? "We couldn't load your assignments."
    : raw;
}
