import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { limitRows, selectTodayClasses } from '../model/dashboardSelectors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  CLASSES_LIMIT,
  EMPTY_STATE_FALLBACK_TITLE,
  eventTimeRange,
  type DashboardSectionBaseProps,
} from './dashboardSection';

/**
 * EP05B — the dashboard's "Today's classes" section (AC-E05-01).
 *
 * The section owns its heading, its rows, its limit (5 — D05-10), its "See
 * all" link to `/calendar` and its three states. It applies its own EP05A
 * selector (`selectTodayClasses`) and limit to the data it is given, so the
 * "today" it selects on is always the **server-echoed** profile-zone date
 * (D05-6) — the client never derives a civil date.
 *
 * The rows keep the payload's order (no client-side re-sort — D05-9).
 */
export interface TodayClassesSectionProps extends DashboardSectionBaseProps {
  /** The calendar payload's events. */
  events: CalendarEvent[];
  /** The server-echoed profile-zone date (`result.today`). */
  today: string;
}

/** The class row's own affordance: a native link to the course. */
function ClassRow({ event }: { event: CalendarEvent }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-text-muted">{eventTimeRange(event.startTime, event.endTime)}</p>
      <p className="mt-0.5 text-sm font-medium text-text">
        {event.link ? (
          <Link
            to={event.link}
            className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {event.title}
          </Link>
        ) : (
          event.title
        )}
      </p>
      {event.courseName ? (
        <p className="mt-0.5 text-xs text-text-muted">{event.courseName}</p>
      ) : null}
    </li>
  );
}

export function TodayClassesSection({
  events,
  today,
  status,
  error,
  isFetching = false,
  onRetry,
  emptyState,
}: TodayClassesSectionProps) {
  const { rows, remaining } = limitRows(selectTodayClasses(events, today), CLASSES_LIMIT);
  const empty = emptyState ?? { title: EMPTY_STATE_FALLBACK_TITLE };
  const message = getErrorMessage(error).trim() || 'We could not load your classes. Try again.';

  return (
    <section
      aria-labelledby="dashboard-classes-heading"
      aria-busy={status === 'loading' ? true : undefined}
      className="card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="dashboard-classes-heading"
          className="flex items-center gap-2 text-lg font-semibold text-text"
        >
          <GraduationCap aria-hidden size={18} className="shrink-0 text-text-muted" />
          Today&apos;s classes
        </h2>
        <Link
          to="/calendar"
          aria-label="See all today's classes on the calendar"
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
          icon={<GraduationCap aria-hidden size={32} />}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      ) : (
        <>
          <ul className="space-y-3 max-sm:[&_button]:min-h-[44px] max-sm:[&_a]:min-h-[44px]">
            {rows.map((event) => (
              <ClassRow key={event.id} event={event} />
            ))}
          </ul>
          {remaining > 0 ? <p className="mt-3 text-xs text-text-muted">+{remaining} more</p> : null}
        </>
      )}
    </section>
  );
}
