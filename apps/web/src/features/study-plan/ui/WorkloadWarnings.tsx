import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';
import type { PlanWarning, PlanDeferred } from '@/entities/study-plan/model/types';

export interface WorkloadWarningsProps {
  warnings?: PlanWarning[];
  deferred?: PlanDeferred[];
  errorMessage?: string;
  hasPreview?: boolean;
  className?: string;
}

function warningSentence(w: PlanWarning): string {
  const mins = formatMinutes(w.minutes);
  switch (w.category) {
    case 'NO_AVAILABLE_TIME':
      return `No free study time this week for "${w.assignmentTitle}" — ${mins} of work remain.`;
    case 'INSUFFICIENT_TIME_BEFORE_DEADLINE':
      return `${mins} of "${w.assignmentTitle}" do not fit before its ${w.dueDate} deadline.`;
    case 'OVERDUE':
      return `"${w.assignmentTitle}" was due on ${w.dueDate} and ${mins} remain.`;
    default:
      return `${mins} of "${w.assignmentTitle}" remain.`;
  }
}

export function WorkloadWarnings({
  warnings,
  deferred,
  errorMessage,
  hasPreview,
  className,
}: WorkloadWarningsProps) {
  const wList = warnings ?? [];
  const dList = deferred ?? [];
  const previewKnown =
    hasPreview !== undefined ? hasPreview : warnings !== undefined || deferred !== undefined;

  return (
    <section aria-label="Workload warnings" className={className}>
      <Card className="p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text">Workload warnings</h2>
          <p className="text-sm text-text-muted">Work that does not fit before a deadline.</p>
        </div>

        {errorMessage ? (
          <div role="alert" className="border border-danger/30 bg-danger/10 p-4">
            <p className="text-sm text-danger">{errorMessage}</p>
          </div>
        ) : wList.length === 0 && dList.length === 0 ? (
          <EmptyState
            title="Nothing to report."
            description={
              previewKnown
                ? 'Everything fits in this week.'
                : "Generate a plan to see what doesn't fit before a deadline."
            }
          />
        ) : (
          <>
            {wList.length > 0 && (
              <ul className="space-y-2">
                {wList.map((w, i) => (
                  <li
                    key={`${w.assignmentId}-${i}`}
                    className="border-l-4 border-warning/60 bg-warning/5 p-3"
                  >
                    <p className="text-sm font-medium text-text">{w.assignmentTitle}</p>
                    <p className="text-sm text-text">{warningSentence(w)}</p>
                    <p className="text-xs text-text-muted">
                      {w.minutes} min
                      {w.dueDate ? ` · due ${w.dueDate}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {dList.length > 0 && (
              <div className={wList.length > 0 ? 'mt-4' : ''}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Continues in a later plan
                </h3>
                <ul className="mt-2 space-y-1">
                  {dList.map((d, i) => {
                    const title = d.assignmentTitle ?? d.title ?? d.assignmentId;
                    return (
                      <li key={`${d.assignmentId}-${i}`} className="text-sm text-text-muted">
                        {title} — {formatMinutes(d.minutes)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>
    </section>
  );
}

export default WorkloadWarnings;
