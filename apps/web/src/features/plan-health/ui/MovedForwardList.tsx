import type { MissedSession } from '@/entities/study-plan/model/types';
import { MovedSessionRow } from './MovedSessionRow';

export interface MovedForwardListProps {
  sessions: MissedSession[];
}

/**
 * EP13E (D-E4, D-E6) — the "Moved forward" section of the plan-health view.
 *
 * The heading never carries a number: the rows are the detail, and a count in
 * the heading would turn an informational section into a backlog tally
 * (D13-9). The description states plainly that the plan did the work.
 */
export function MovedForwardList({ sessions }: MovedForwardListProps) {
  if (sessions.length === 0) return null;

  return (
    <section aria-labelledby="plan-health-moved-heading" className="mb-6">
      <h2 id="plan-health-moved-heading" className="mb-1 text-lg font-semibold text-text">
        Moved forward
      </h2>
      <p className="mb-2 text-sm text-text-muted">
        These sessions were rescheduled for you. Nothing was lost.
      </p>
      <div className="card p-4 sm:p-6">
        <ul className="divide-y divide-border">
          {sessions.map((session) => (
            <MovedSessionRow key={session.id} session={session} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export default MovedForwardList;
