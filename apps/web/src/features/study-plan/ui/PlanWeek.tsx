import { useMemo } from 'react';

export interface PlanWeekSession {
  assignmentTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface PlanWeekDay {
  date: string;
  sessions: PlanWeekSession[];
}

export interface PlanWeekProps {
  days: PlanWeekDay[];
  timeZone?: string;
  emptyMessage?: string;
}

function formatDateLabel(date: string): string {
  // Render the civil date as-is (YYYY-MM-DD) plus a weekday derived from the
  // UTC midnight of that civil date — matches the server's dayOfWeekOf mapping
  // (Sunday = 0). No browser clock is involved.
  const d = new Date(`${date}T00:00:00.000Z`);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${weekday} ${date}`;
}

export function PlanWeek({ days, timeZone, emptyMessage }: PlanWeekProps) {
  const hasAny = useMemo(() => days.some((d) => d.sessions.length > 0), [days]);

  if (!hasAny) {
    return (
      <div role="status" className="py-8 text-center" data-testid="plan-week-empty">
        <p className="text-sm text-text">
          {emptyMessage ?? 'No sessions proposed — Generate a plan'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="plan-week-live"
      />
      <div
        className="grid grid-cols-7 gap-2 overflow-x-auto"
        data-testid="plan-week"
        aria-label={timeZone ? `Plan week (${timeZone})` : 'Plan week'}
      >
        {days.map((day) => (
          <section
            key={day.date}
            aria-label={formatDateLabel(day.date)}
            className="min-w-[140px] space-y-2 rounded-lg border border-border p-2"
          >
            <h3 className="text-xs font-semibold text-text-muted">{formatDateLabel(day.date)}</h3>
            {day.sessions.length === 0 ? (
              <p className="text-xs text-text-muted">No sessions</p>
            ) : (
              day.sessions.map((s, i) => (
                <article
                  key={`${day.date}-${i}-${s.startTime}`}
                  aria-label={`${s.assignmentTitle}, ${s.startTime} to ${s.endTime}, ${s.durationMinutes} minutes`}
                  className="rounded-md border border-border bg-surface p-2 text-xs"
                >
                  <p className="font-medium text-text">{s.assignmentTitle}</p>
                  <p className="text-text-muted">
                    {s.startTime} – {s.endTime} ({s.durationMinutes} min)
                  </p>
                </article>
              ))
            )}
          </section>
        ))}
      </div>
    </>
  );
}

export default PlanWeek;
