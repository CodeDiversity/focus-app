import { Badge } from '@/shared/ui/Badge';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';
import type { MissedSession } from '@/entities/study-plan/model/types';
import { Lock } from 'lucide-react';

export interface MissedSessionRowProps {
  session: MissedSession;
}

export function MissedSessionRow({ session }: MissedSessionRowProps) {
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

export default MissedSessionRow;
