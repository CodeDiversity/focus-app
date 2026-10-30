import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { limitRows, selectTodayStudySessions } from '../model/dashboardSelectors';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  EMPTY_STATE_FALLBACK_TITLE,
  STUDY_SESSIONS_LIMIT,
  eventTimeRange,
  type DashboardSectionBaseProps,
} from './dashboardSection';

/**
 * EP05B — the dashboard's "Today's study sessions" section (AC-E05-04's
 * display half).
 *
 * The section renders exactly the `STUDY_SESSION` events the calendar
 * returns for the server-echoed `today`; EP05 creates nothing, so the empty
 * state is the expected state until EP06/EP07 create sessions (D05-2,
 * D05-13). A session has **no** deep link (`events[].link` is `null` for
 * sessions), so a session row is non-interactive text — it never renders a
 * link that goes nowhere (Decision #5).
 *
 * The cap is 3 (D05-10) and the "See all" link points at `/calendar`.
 */
export interface TodayStudySessionsSectionProps extends DashboardSectionBaseProps {
  /** The calendar payload's events. */
  events: CalendarEvent[];
  /** The server-echoed profile-zone date (`result.today`). */
  today: string;
}

/** A session row: the time range, the title and — for a focus session only — the label. */
function StudySessionRow({ event }: { event: CalendarEvent }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-text-muted">{eventTimeRange(event.startTime, event.endTime)}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-medium text-text">
        {event.title}
        {event.focus ? <Badge variant="accent">Focus session</Badge> : null}
      </p>
    </li>
  );
}

export function TodayStudySessionsSection({
  events,
  today,
  status,
  error,
  isFetching = false,
  onRetry,
  emptyState,
}: TodayStudySessionsSectionProps) {
  const { rows, remaining } = limitRows(
    selectTodayStudySessions(events, today),
    STUDY_SESSIONS_LIMIT
  );
  const empty = emptyState ?? { title: EMPTY_STATE_FALLBACK_TITLE };
  const message =
    getErrorMessage(error).trim() || 'We could not load your study sessions. Try again.';

  return (
    <section
      aria-labelledby="dashboard-sessions-heading"
      aria-busy={status === 'loading' ? true : undefined}
      className="card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="dashboard-sessions-heading"
          className="flex items-center gap-2 text-lg font-semibold text-text"
        >
          <Brain aria-hidden size={18} className="shrink-0 text-text-muted" />
          Today&apos;s study sessions
        </h2>
        <Link
          to="/calendar"
          aria-label="See all today's study sessions on the calendar"
          className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          See all
        </Link>
      </div>

      {status === 'loading' ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">{message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 max-sm:min-h-[44px]"
            isLoading={isFetching}
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Brain aria-hidden size={32} />}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      ) : (
        <>
          <ul className="space-y-3 max-sm:[&_button]:min-h-[44px] max-sm:[&_a]:min-h-[44px]">
            {rows.map((event) => (
              <StudySessionRow key={event.id} event={event} />
            ))}
          </ul>
          {remaining > 0 ? <p className="mt-3 text-xs text-text-muted">+{remaining} more</p> : null}
        </>
      )}
    </section>
  );
}
