import { Badge } from '@/shared/ui/Badge';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';
import type { RemainingWorkItem } from '@/entities/study-plan/model/types';

export interface UnfinishedWorkListProps {
  items: RemainingWorkItem[];
  confirmedMinutes: number;
}

function flaggedLabel(flagged: RemainingWorkItem['flagged']): string | null {
  if (flagged === 'MISSING_ESTIMATE') return 'No estimate';
  if (flagged === 'MISSING_DUE_DATE') return 'No due date';
  return null;
}

export function UnfinishedWorkList({ items, confirmedMinutes }: UnfinishedWorkListProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-text">Unfinished work</h2>
      <div className="card p-4 sm:p-6">
        {confirmedMinutes > 0 ? (
          <p className="mb-3 text-sm text-text-muted">{confirmedMinutes} minutes studied so far</p>
        ) : null}
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const badge = flaggedLabel(item.flagged);
            return (
              <li key={item.assignmentId} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-text" title={item.title}>
                    {item.title}
                  </span>
                  {item.courseCode ? (
                    <span className="text-xs text-text-muted">· {item.courseCode}</span>
                  ) : null}
                  {badge ? (
                    <Badge variant="warning" size="sm">
                      {badge}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>{item.dueDate ? `Due ${item.dueDate}` : 'No due date'}</span>
                  <span>
                    Estimate{' '}
                    <span>
                      {item.flagged === 'MISSING_ESTIMATE' || item.estimatedMinutes === null
                        ? 'not set'
                        : formatMinutes(item.estimatedMinutes)}
                    </span>
                  </span>
                  <span>
                    Confirmed <span>{formatMinutes(item.confirmedMinutes)}</span>
                  </span>
                  <span>
                    Left{' '}
                    <span>
                      {item.flagged === 'MISSING_ESTIMATE' || item.remainingMinutes === null
                        ? 'not set'
                        : formatMinutes(item.remainingMinutes)}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default UnfinishedWorkList;
