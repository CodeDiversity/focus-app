import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { limitRows, selectOverdueAssignments } from '../model/dashboardSelectors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import { DashboardAssignmentRow } from './DashboardAssignmentRow';
import {
  EMPTY_STATE_FALLBACK_TITLE,
  OVERDUE_ASSIGNMENTS_LIMIT,
  type DashboardAssignmentSectionProps,
} from './dashboardSection';

/**
 * EP05B — the dashboard's "Overdue assignments" section (AC-E05-03).
 *
 * The section lists the **unfinished assignments whose due date has passed**
 * — EP05A's `selectOverdueAssignments`, which uses the shared predicates
 * (`isUnfinishedAssignment` ∧ `isOverdueAssignment`) and never re-sorts, so
 * the endpoint's order is kept (D05-9). A finished assignment is never
 * overdue, whatever its due date says.
 *
 * Each row is the dashboard-local compact row; the overdue marking is the
 * shared **text** badge ("Overdue"), so it survives greyscale and
 * colour-vision deficiency (DoD 6 / TR-E05-03).
 *
 * The cap is 5 (D05-10) and the "See all" link points at `/assignments`.
 */
export type OverdueAssignmentsSectionProps = DashboardAssignmentSectionProps;

export function OverdueAssignmentsSection({
  rows,
  timeZone,
  status,
  error,
  isFetching = false,
  onRetry,
  onOpenDetails,
  emptyState,
}: OverdueAssignmentsSectionProps) {
  const { rows: visible, remaining } = limitRows(
    selectOverdueAssignments(rows),
    OVERDUE_ASSIGNMENTS_LIMIT
  );
  const empty = emptyState ?? { title: EMPTY_STATE_FALLBACK_TITLE };
  const message =
    getErrorMessage(error).trim() || 'We could not load your overdue assignments. Try again.';

  return (
    <section
      aria-labelledby="dashboard-overdue-heading"
      aria-busy={status === 'loading' ? true : undefined}
      className="card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="dashboard-overdue-heading"
          className="flex items-center gap-2 text-lg font-semibold text-text"
        >
          <AlertTriangle aria-hidden size={18} className="shrink-0 text-text-muted" />
          Overdue assignments
        </h2>
        <Link
          to="/assignments"
          aria-label="See all overdue assignments on the assignments page"
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
          icon={<AlertTriangle aria-hidden size={32} />}
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
