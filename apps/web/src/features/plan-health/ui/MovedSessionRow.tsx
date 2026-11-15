import { Lock } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';
import type { MissedSession } from '@/entities/study-plan/model/types';

export interface MovedSessionRowProps {
  session: MissedSession;
}

/**
 * EP13E (D-E6) — one session that the plan moved forward. The row shape is
 * EP08D's (date · time range · duration · optional Locked badge, then the
 * assignment title); only the framing around it changed: these sessions were
 * rescheduled, not missed.
 *
 * The locked state is icon **and** text, never colour alone.
 */
export function MovedSessionRow({ session }: MovedSessionRowProps) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <time dateTime={session.date} className="text-sm text-text">
          {session.date}
        </time>
        <span className="text-sm text-text-muted">·</span>
        <span className="text-sm text-text">
          {session.startTime} – {session.endTime}
        </span>
        <span className="text-sm text-text-muted">·</span>
        <span className="text-sm text-text-muted">{formatMinutes(session.durationMinutes)}</span>
        {session.locked ? (
          <Badge variant="neutral" size="sm">
            <Lock className="mr-1 h-3 w-3" />
            Locked
          </Badge>
        ) : null}
      </div>
      <div className="mt-1">
        <span className="truncate text-sm font-medium text-text" title={session.assignmentTitle}>
          {session.assignmentTitle}
        </span>
      </div>
    </li>
  );
}

export default MovedSessionRow;
