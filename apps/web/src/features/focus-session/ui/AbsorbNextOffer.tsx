import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import { absorbNextSession } from '@/entities/study-session/api/studySessionApi';
import type { StudySession } from '@/entities/study-session/model/types';
import { useTodayPlanQuery } from '@/features/today-plan/api/todayPlanApi';

/**
 * EP13I — the hyperfocus-absorption offer (D-I6/D-I9, AC-E13-11).
 *
 * An inline card under the timer — never a toast (toasts vanish; executive
 * function needs persistence) — shown only while every gate holds: the
 * target is reached, the session is ACTIVE, and a qualifying candidate
 * exists in today's plan (same assignment, `SCHEDULED`; the server stays
 * authoritative on accept). Declining is component state keyed by candidate
 * id: no API call, and that candidate is never re-offered this session.
 *
 * A lost race on accept (409 — the candidate was replanned or the session
 * stopped elsewhere) quietly dismisses the offer and refetches today's plan:
 * running long is never met with an error wall (D13-9).
 */
export interface AbsorbNextOfferProps {
  session: StudySession;
  /** The timer's target-reached signal (owned by the page, like the timer's). */
  targetReached: boolean;
  /** Applies the grown session in place — the timer never remounts. */
  onApply: (session: StudySession) => void;
}

export function AbsorbNextOffer({ session, targetReached, onApply }: AbsorbNextOfferProps) {
  const [declinedIds, setDeclinedIds] = useState<ReadonlySet<string>>(new Set());
  const [isAbsorbing, setIsAbsorbing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = targetReached && session.status === 'ACTIVE' && Boolean(session.assignmentId);

  // The candidate check rides the existing today read — no new endpoint. The
  // query stays unmounted until the offer could matter (D-I6).
  const todayQuery = useTodayPlanQuery(undefined, { skip: !eligible });

  if (!eligible) return null;

  const candidate = (todayQuery.data?.sessions ?? []).find(
    (planned) =>
      planned.assignmentId === session.assignmentId &&
      planned.status === 'SCHEDULED' &&
      planned.id !== session.plannedSessionId
  );
  if (!candidate || declinedIds.has(candidate.id)) return null;

  const dismiss = () => {
    setDeclinedIds((previous) => new Set(previous).add(candidate.id));
    setError(null);
  };

  const accept = async () => {
    if (isAbsorbing) return;
    setIsAbsorbing(true);
    setError(null);
    try {
      const updated = await absorbNextSession(session.id);
      onApply(updated);
      void todayQuery.refetch();
    } catch (err: unknown) {
      // The plan moved on under us: dismiss quietly and resync — never an
      // error wall for someone who is working (D13-9). Anything unexpected
      // stays visible and retryable.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409 || status === 404) {
        dismiss();
        void todayQuery.refetch();
      } else {
        setError(getErrorMessage(err) || "We couldn't extend the session. Try again.");
      }
    } finally {
      setIsAbsorbing(false);
    }
  };

  return (
    <div
      role="status"
      data-testid="absorb-next-offer"
      className="mx-auto mt-6 max-w-2xl rounded-xl border border-success/30 bg-success/10 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <p className="text-sm text-text">
        Still going — fold in the next {candidate.assignmentTitle} session?
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row">
        <Button
          type="button"
          size="sm"
          className="max-sm:min-h-[44px]"
          isLoading={isAbsorbing}
          onClick={() => void accept()}
        >
          Keep going (+{candidate.durationMinutes} min)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-sm:min-h-[44px]"
          disabled={isAbsorbing}
          onClick={dismiss}
        >
          No thanks
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger sm:basis-full">
          {error}
        </p>
      ) : null}
    </div>
  );
}
