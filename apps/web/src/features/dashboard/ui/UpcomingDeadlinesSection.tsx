import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { limitRows, selectUpcomingAssignments } from '../model/dashboardSelectors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import { DashboardAssignmentRow } from './DashboardAssignmentRow';
import {
  EMPTY_STATE_FALLBACK_TITLE,
  UPCOMING_DEADLINES_LIMIT,
  type DashboardAssignmentSectionProps,
} from './dashboardSection';

/**
 * EP05B — the dashboard's "Upcoming deadlines" section (AC-E05-02).
 *
 * The section lists the **unfinished, not overdue** assignments — the split
 * comes from EP05A's `selectUpcomingAssignments`, which uses the shared
 * predicates and never re-sorts, so the endpoint's documented order is kept
 * (D05-9). An assignment with a null `dueDate` is unfinished work without a
 * deadline: it stays in this list (last, in the endpoint's nulls-last order)
 * and its row says so — "No due date" — rather than showing a blank date.
 *
 * The cap is 5 (D05-10) and the "See all" link points at `/assignments`.
 * Each row is the dashboard-local compact row; the row's title calls the
 * host-supplied `onOpenDetails(row)` (D05-17) — this section mounts no
 * assignment owner and opens no dialog.
 */
export type UpcomingDeadlinesSectionProps = DashboardAssignmentSectionProps;

export function UpcomingDeadlinesSection({
  rows,
  timeZone,
  status,
  error,
  isFetching = false,
  onRetry,
  onOpenDetails,
  emptyState,
}: UpcomingDeadlinesSectionProps) {
  const { rows: visible, remaining } = limitRows(
    selectUpcomingAssignments(rows),
    UPCOMING_DEADLINES_LIMIT
  );
  const empty = emptyState ?? { title: EMPTY_STATE_FALLBACK_TITLE };
  const message = getErrorMessage(error).trim() || 'We could not load your deadlines. Try again.';

  return (
    <section
      aria-labelledby="dashboard-upcoming-heading"
      aria-busy={status === 'loading' ? true : undefined}
      className="card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="dashboard-upcoming-heading"
          className="flex items-center gap-2 text-lg font-semibold text-text"
        >
          <ClipboardList aria-hidden size={18} className="shrink-0 text-text-muted" />
          Upcoming deadlines
        </h2>
        <Link
          to="/assignments"
          aria-label="See all upcoming deadlines on the assignments page"
          className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          See all
        </Link>
      </div>

      {status === 'loading' ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">{message}</p>
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
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden size={32} />}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      ) : (
        <>
          <ul className="space-y-3 max-sm:[&_button]:min-h-[44px] max-sm:[&_a]:min-h-[44px]">
            {visible.map((assignment) => (
              <DashboardAssignmentRow
                key={assignment.id}
                assignment={assignment}
                timeZone={timeZone}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </ul>
          {remaining > 0 ? <p className="mt-3 text-xs text-text-muted">+{remaining} more</p> : null}
        </>
      )}
    </section>
  );
}
