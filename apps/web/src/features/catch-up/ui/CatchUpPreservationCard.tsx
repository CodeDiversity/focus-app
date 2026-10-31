import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Lock } from 'lucide-react';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';
import type { MissedSession } from '@/entities/study-plan/model/types';
import { CatchUpLockToggle } from './CatchUpLockToggle';

export interface CatchUpPreservationCardProps {
  lockedPreserved: number;
  completedPreserved: number;
  /** The preview's locked missed sessions — the only per-session lock data the client has. */
  lockedSessions: MissedSession[];
  onLockedChange: (sessionId: string, nextLocked: boolean) => void;
  className?: string;
}

/**
 * "What stays as it is" (EP08E decisions 5/6): the preservation indicators
 * for replanning — neutral, factual count lines (D08-8) plus a read-only
 * card per locked session shown in the preview. Locked sessions are never
 * rendered as editable rows in `PlanSessionEditor`; the card carries the
 * explicit lock toggle (decision 7).
 */
export function CatchUpPreservationCard({
  lockedPreserved,
  completedPreserved,
  lockedSessions,
  onLockedChange,
  className,
}: CatchUpPreservationCardProps) {
  if (lockedPreserved === 0 && completedPreserved === 0 && lockedSessions.length === 0) {
    return null;
  }

  return (
    <Card className={className} padding="md" data-testid="catch-up-preservation">
      <h2 className="text-lg font-semibold text-text">What stays as it is</h2>
      <ul className="mt-2 space-y-1 text-sm text-text-muted">
        {lockedPreserved > 0 ? (
          <li>
            {lockedPreserved} locked{' '}
            {lockedPreserved === 1
              ? 'session stays exactly where it is.'
              : 'sessions stay exactly where they are.'}
          </li>
        ) : null}
        {completedPreserved > 0 ? (
          <li>
            {completedPreserved} completed{' '}
            {completedPreserved === 1
              ? 'session is kept unchanged.'
              : 'sessions are kept unchanged.'}
          </li>
        ) : null}
      </ul>

      {lockedSessions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs text-text-muted">Locked sessions are never moved or replaced.</p>
          <ul className="mt-2 space-y-2">
            {lockedSessions.map((s) => (
              <li key={s.id}>
                <article
                  aria-label={`Locked session: ${s.assignmentTitle}, ${s.date}, ${s.startTime} to ${s.endTime}`}
                  className="rounded-md border border-border bg-surface p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="truncate text-sm font-medium text-text"
                      title={s.assignmentTitle}
                    >
                      {s.assignmentTitle}
                    </span>
                    <Badge variant="neutral" size="sm">
                      <Lock className="mr-1 h-3 w-3" />
                      Locked
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    <time dateTime={s.date}>{s.date}</time> · {s.startTime} – {s.endTime} ·{' '}
                    {formatMinutes(s.durationMinutes)}
                  </p>
                  <div className="mt-2">
                    <CatchUpLockToggle
                      sessionId={s.id}
                      assignmentTitle={s.assignmentTitle}
                      locked={s.locked}
                      onLockedChange={onLockedChange}
                    />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export default CatchUpPreservationCard;
