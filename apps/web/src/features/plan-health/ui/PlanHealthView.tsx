import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useRecoverySummaryQuery } from '@/features/today/api/recoverySummaryApi';
import { MovedForwardList } from './MovedForwardList';
import { UnfinishedWorkList } from './UnfinishedWorkList';

/**
 * EP13E — the **Plan health** view at `/plan/health` (ui-refiner decisions
 * D-E1, D-E4…D-E9), replacing EP08D's recovery summary.
 *
 * It is informational and never a gate: it reports what the plan did
 * (unstarted past work rolled forward at read time, EP13C) and what is still
 * unfinished, and offers regeneration as a *secondary* action the student
 * may ignore forever without degrading the current plan.
 *
 * Copy rules (D13-9, D-E5, D-E6): the plan is the subject of every sentence,
 * never the student; no heading carries a count; there is no compliance
 * percentage and no "missed"/"behind"/"failed" anywhere.
 */
export function PlanHealthView() {
  const navigate = useNavigate();
  const query = useRecoverySummaryQuery();

  const data = query.data;
  const rolledForward = data?.rolledForward ?? [];
  const unfinishedWork = data?.unfinishedWork ?? [];
  const confirmedMinutes = data?.confirmedMinutes ?? 0;
  const isEmpty =
    !query.isLoading && !query.isError && rolledForward.length === 0 && unfinishedWork.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="plan-health-heading" className="text-3xl font-bold text-text">
            Plan health
          </h1>
          <p className="text-sm text-text-muted">How your plan is keeping up with your work.</p>
        </div>
        {/* Secondary, never disabled (D-E7): a voluntary reset is always allowed. */}
        <Button
          variant="outline"
          onClick={() => navigate('/plan/health/catch-up')}
          className="w-full max-sm:min-h-[44px] sm:w-auto"
        >
          Regenerate my week
        </Button>
      </div>

      {query.isLoading ? (
        <div aria-busy="true">
          {[0, 1].map((block) => (
            <section key={block} className="mb-6">
              <div className="mb-2 h-6 w-40 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
              <Card className="p-4 sm:p-6">
                <div className="space-y-3">
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
                    />
                  ))}
                </div>
              </Card>
            </section>
          ))}
        </div>
      ) : null}

      {!query.isLoading && query.isError ? (
        <Card role="alert" className="border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">We couldn&apos;t load your plan health.</p>
          <Button
            variant="outline"
            className="mt-4 max-sm:min-h-[44px]"
            isLoading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </Card>
      ) : null}

      {!query.isLoading && !query.isError && data ? (
        <>
          {/* The lead line states the plan's state in words (D-E5). */}
          <Card className="mb-6 bg-surface-muted p-4">
            <p className="text-sm text-text">
              {rolledForward.length > 0
                ? "Your plan moved unfinished work forward so today's list is current."
                : 'Your plan is current — nothing needed moving.'}
            </p>
          </Card>

          {isEmpty ? (
            <EmptyState
              title="Your plan is up to date"
              description="Nothing moved forward and no unfinished work is waiting."
              action={
                <Button className="max-sm:min-h-[44px]" onClick={() => navigate('/plan')}>
                  See this week&apos;s plan
                </Button>
              }
            />
          ) : (
            <>
              <MovedForwardList sessions={rolledForward} />
              <UnfinishedWorkList items={unfinishedWork} confirmedMinutes={confirmedMinutes} />
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

export default PlanHealthView;
