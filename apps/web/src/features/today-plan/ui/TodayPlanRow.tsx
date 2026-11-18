import type { TodaySession } from '@/entities/study-plan/model/types';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { eventTimeRange } from '@/features/today/ui/dashboardSection';
import { sessionTimeLabel } from '@/entities/study-plan/model/sessionTimeLabel';

/**
 * EP13D — one row of today's plan (D-D6, D-D7, D-D12).
 *
 * The status is a **text** badge, never colour alone (WCAG 2.2 AA), and every
 * startable row carries its own quiet Start control: the card suggests one
 * session, it never forces it.
 */
export interface TodayPlanRowProps {
  session: TodaySession;
  /** Starts this session; omitted for rows that cannot be started. */
  onStart?: (id: string) => void;
  /** This row's start is in flight. */
  isStarting?: boolean;
  /** Another row's start is in flight — all starts are disabled meanwhile. */
  isBusy?: boolean;
}

/** The status words (D-D7). `SCHEDULED` is the plain, unlabelled state. */
const STATUS_LABEL: Record<TodaySession['status'], string> = {
  SCHEDULED: 'Planned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Done',
  RESCHEDULED: 'Moved forward',
  SKIPPED: 'Set aside',
};

const STATUS_VARIANT: Record<TodaySession['status'], 'neutral' | 'accent' | 'success'> = {
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'accent',
  COMPLETED: 'success',
  RESCHEDULED: 'neutral',
  SKIPPED: 'neutral',
};

/** A session the student can start right now. */
export function isStartable(session: TodaySession): boolean {
  return session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS';
}

export function TodayPlanRow({ session, onStart, isStarting, isBusy }: TodayPlanRowProps) {
  const startable = Boolean(onStart) && isStartable(session);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs text-text-muted">
          {/* EP13H (D-H1/D-H8): a flex session never shows a missable clock
              slot — "Anytime today" takes the time's place. */}
          {sessionTimeLabel({
            anchor: session.anchor,
            windowHint: session.windowHint,
            timeRange: eventTimeRange(session.startTime, session.endTime),
            durationMinutes: session.durationMinutes,
            anytimeWord: 'Anytime today',
          })}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-medium text-text">
          <span className="truncate">{session.assignmentTitle}</span>
          <Badge variant={STATUS_VARIANT[session.status]}>{STATUS_LABEL[session.status]}</Badge>
        </p>
      </div>
      {startable ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto max-sm:min-h-[44px]"
          isLoading={isStarting}
          disabled={isBusy && !isStarting}
          onClick={() => onStart?.(session.id)}
        >
          {session.status === 'IN_PROGRESS' ? 'Resume' : 'Start'}
        </Button>
      ) : null}
    </li>
  );
}
