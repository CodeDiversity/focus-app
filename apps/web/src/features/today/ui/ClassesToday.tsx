import { Link } from 'react-router-dom';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { Button } from '@/shared/ui/Button';
import { selectTodayClasses } from '../model/dashboardSelectors';
import type { DashboardSectionStatus } from './dashboardSection';

/**
 * EP16B-AC4 (D16-3, D-B7, D-B10) — one line: "Classes today · 10:00 BIO 101
 * · 14:00 MATH 201". Each class links to its course; the accessible name
 * starts with the visible text and adds the course name (WCAG 2.5.3).
 * Nothing renders with no classes, and nothing while loading.
 */
export interface ClassesTodayProps {
  events: CalendarEvent[];
  today: string;
  status: DashboardSectionStatus;
  isFetching?: boolean;
  onRetry: () => void;
}

export function ClassesToday({ events, today, status, isFetching, onRetry }: ClassesTodayProps) {
  if (status === 'loading') return null;
  if (status === 'error') {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span>We couldn&apos;t load today&apos;s classes.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isFetching}
          className="max-sm:min-h-[44px]"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    );
  }
  const classes = selectTodayClasses(events, today);
  if (classes.length === 0) return null;

  const linkClass =
    'inline-flex items-center text-sm text-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 max-sm:min-h-[44px]';

  return (
    <section aria-labelledby="classes-today-heading" className="mb-6" data-testid="classes-today">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="classes-today-heading" className="text-sm font-semibold text-text">
          Classes today
        </h2>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {classes.map((event) => {
            const label = `${event.startTime} ${event.subtitle ?? event.title}`;
            const name = event.subtitle ? `${label}, ${event.title}` : label;
            return (
              <li key={event.id} className="flex items-center gap-x-3">
                <span aria-hidden="true">·</span>
                {event.link ? (
                  <Link to={event.link} className={linkClass} aria-label={name}>
                    {label}
                  </Link>
                ) : (
                  <span className="text-sm text-text">{label}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
