import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import { getRecoverySummary } from '@/entities/study-plan/api/studyPlanApi';
import type { RecoverySummary as RecoverySummaryData } from '@/entities/study-plan/model/types';
import { MissedSessionsList } from '@/features/recovery/ui/MissedSessionsList';
import { UnfinishedWorkList } from '@/features/recovery/ui/UnfinishedWorkList';

export function RecoverySummary() {
  const navigate = useNavigate();
  const [data, setData] = useState<RecoverySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await getRecoverySummary();
      setData(summary);
    } catch (err) {
      setError(getErrorMessage(err) || 'We could not load your recovery summary. Try again.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const missedSessions = data?.missedSessions ?? [];
  const unfinishedWork = data?.unfinishedWork ?? [];
  const confirmedMinutes = data?.confirmedMinutes ?? 0;
  const message = data?.message ?? '';
  const isEmpty =
    !isLoading && !error && missedSessions.length === 0 && unfinishedWork.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="catch-up-heading" className="text-3xl font-bold text-text">
            Catch up
          </h1>
          <p className="text-sm text-text-muted">
            See what&apos;s behind and create a plan to get back on track.
          </p>
        </div>
        <Button
          onClick={() => navigate('/catch-up/preview')}
          disabled={isEmpty}
          aria-disabled={isEmpty}
          className="w-full sm:w-auto"
        >
          Create catch-up plan
        </Button>
      </div>

      {isLoading ? (
        <div aria-busy="true">
          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold text-text">Missed sessions</h2>
            <Card className="p-4 sm:p-6">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
                  />
                ))}
              </div>
            </Card>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Unfinished work</h2>
            <Card className="p-4 sm:p-6">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
                  />
                ))}
              </div>
            </Card>
          </section>
        </div>
      ) : null}

      {!isLoading && error ? (
        <Card role="alert" className="border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">We could not load your recovery summary. Try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>
            Try again
          </Button>
        </Card>
      ) : null}

      {!isLoading && !error && data ? (
        <>
          {!isEmpty && message ? (
            <Card className="mb-6 bg-surface-muted p-4">
              <p className="text-sm text-text">{message}</p>
            </Card>
          ) : null}

          {isEmpty ? (
            <EmptyState
              title="You’re all caught up."
              description="No missed sessions or unfinished work."
            />
          ) : (
            <>
              <MissedSessionsList sessions={missedSessions} />
              <UnfinishedWorkList items={unfinishedWork} confirmedMinutes={confirmedMinutes} />
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

export default RecoverySummary;
