import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import { listRemainingWork } from '@/entities/study-plan/api/studyPlanApi';
import type { RemainingWorkItem } from '@/entities/study-plan/model/types';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';

export interface RemainingWorkSectionProps {
  timeZone?: string;
  className?: string;
}

function flaggedLabel(flagged: RemainingWorkItem['flagged']): string | null {
  if (flagged === 'MISSING_ESTIMATE') return 'No estimate';
  if (flagged === 'MISSING_DUE_DATE') return 'No due date';
  return null;
}

export function RemainingWorkSection({ timeZone, className }: RemainingWorkSectionProps) {
  const [items, setItems] = useState<RemainingWorkItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listRemainingWork();
      setItems(data.items);
    } catch (err) {
      setError(getErrorMessage(err) || 'We could not load your remaining work. Try again.');
      setItems(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasNumericRemaining = (items ?? []).some((i) => i.remainingMinutes !== null);
  const totalRemaining = (items ?? []).reduce(
    (acc, i) => acc + (typeof i.remainingMinutes === 'number' ? i.remainingMinutes : 0),
    0
  );

  const ariaLabel = timeZone ? `Remaining work (${timeZone})` : 'Remaining work';

  return (
    <section aria-label={ariaLabel} className={className}>
      <Card className="p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text">Remaining work</h2>
          <p className="text-sm text-text-muted">How much is left on each assignment.</p>
        </div>

        {isLoading && (
          <div aria-busy="true" className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-surface-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div role="alert" className="border border-danger/30 bg-danger/10 p-4">
            <p className="text-sm text-danger">We could not load your remaining work. Try again.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 max-sm:min-h-[44px]"
              onClick={() => void load()}
            >
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !error && (items === null || items.length === 0) && (
          <EmptyState
            title="Nothing left to do."
            description="Every assignment is finished or has no remaining work."
          />
        )}

        {!isLoading && !error && items && items.length > 0 && (
          <>
            {hasNumericRemaining && (
              <p className="mb-3 text-sm text-text-muted">
                {formatMinutes(totalRemaining)} of work left
              </p>
            )}
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
          </>
        )}
      </Card>
    </section>
  );
}

export default RemainingWorkSection;
