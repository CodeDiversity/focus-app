import type { MissedSession } from '@/entities/study-plan/model/types';
import { MissedSessionRow } from '@/features/recovery/ui/MissedSessionRow';

export interface MissedSessionsListProps {
  sessions: MissedSession[];
}

export function MissedSessionsList({ sessions }: MissedSessionsListProps) {
  if (sessions.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-text">Missed sessions</h2>
      <div className="card p-4 sm:p-6">
        <ul className="divide-y divide-border">
          {sessions.map((session) => (
            <MissedSessionRow key={session.id} session={session} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export default MissedSessionsList;
