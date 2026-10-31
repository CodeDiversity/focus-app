import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Select } from '@/shared/ui/Select';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import { listStudySessions, getConfirmedTime } from '@/entities/study-session/api/studySessionApi';
import type { StudySession } from '@/entities/study-session/model/types';
import { listAssignments } from '@/entities/assignment/api/assignmentApi';
import type { AssignmentListItem } from '@/shared/types/academic';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';

const PAGE_SIZE = 20;

function formatRange(start: string, end: string | null): string {
  const startDate = new Date(start);
  const date = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const startTime = startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const endTime = end
    ? new Date(end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '';
  return `${date} · ${startTime}${endTime ? `–${endTime}` : ''}`;
}

export function StudyHistoryPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [confirmedMap, setConfirmedMap] = useState<Record<string, number>>({});
  const [filterAssignmentId, setFilterAssignmentId] = useState('');

  const cancelledRef = useRef(false);

  useEffect(() => {
    document.title = 'Study history — StudyPilot';
  }, []);

  const loadList = useCallback(
    async (assignmentId: string, nextOffset: number, replace: boolean) => {
      if (replace) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);
      try {
        const res = await listStudySessions({
          limit: PAGE_SIZE,
          offset: nextOffset,
          assignmentId: assignmentId || undefined,
        });
        if (replace) {
          setSessions(res.items);
        } else {
          setSessions((prev) => [...prev, ...res.items]);
        }
        setTotal(res.total);
        setOffset(nextOffset + res.items.length);
      } catch (err) {
        setError(getErrorMessage(err) || 'We could not load your study history. Try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  // Initial load: secondary data + first page.
  useEffect(() => {
    cancelledRef.current = false;
    void (async () => {
      const [aRes, cRes] = await Promise.allSettled([listAssignments(), getConfirmedTime()]);
      if (cancelledRef.current) return;
      if (aRes.status === 'fulfilled') setAssignments(aRes.value);
      if (cRes.status === 'fulfilled') {
        const data = cRes.value;
        const map: Record<string, number> = {};
        if (
          'assignments' in data &&
          Array.isArray((data as { assignments?: unknown }).assignments)
        ) {
          for (const a of (
            data as { assignments: { assignmentId: string; confirmedMinutes: number }[] }
          ).assignments) {
            map[a.assignmentId] = a.confirmedMinutes;
          }
        } else if ('assignmentId' in data) {
          const single = data as unknown as { assignmentId: string; confirmedMinutes: number };
          map[single.assignmentId] = single.confirmedMinutes;
        }
        setConfirmedMap(map);
      }
    })();
    void loadList('', 0, true);
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (value: string) => {
    setFilterAssignmentId(value);
    setSessions([]);
    setOffset(0);
    void loadList(value, 0, true);
  };

  const handleLoadMore = () => {
    void loadList(filterAssignmentId, offset, false);
  };

  const handleRetry = () => {
    setSessions([]);
    setOffset(0);
    void loadList(filterAssignmentId, 0, true);
  };

  const assignmentById = (id: string | null) =>
    id ? (assignments.find((a) => a.id === id) ?? null) : null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-text mb-2">Study history</h1>
      <p className="text-text-muted mb-6">Your completed focus sessions.</p>

      <div className="mb-5">
        <Select
          label="Assignment"
          value={filterAssignmentId}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          <option value="">All assignments</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && (
        <Card variant="outlined" padding="md" aria-busy="true">
          <ul className="divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <li key={i} className="py-4">
                <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
                <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!isLoading && error && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">We could not load your study history. Try again.</p>
          <Button className="mt-4 max-sm:min-h-[44px]" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !error && sessions.length === 0 && (
        <EmptyState
          title="No study sessions yet"
          description="Finish a focus session to see your study history here."
          action={
            <Link to="/assignments">
              <Button className="max-sm:min-h-[44px]">Go to assignments</Button>
            </Link>
          }
        />
      )}

      {!isLoading && !error && sessions.length > 0 && (
        <Card variant="outlined" padding="md">
          <ul className="divide-y divide-border">
            {sessions.map((s) => {
              const assignment = assignmentById(s.assignmentId);
              const title = assignment?.title ?? 'Assignment';
              const course = assignment?.course ?? null;
              const estimateMinutes =
                assignment?.estimatedHours != null ? assignment.estimatedHours * 60 : null;
              const totalConfirmed = s.assignmentId ? (confirmedMap[s.assignmentId] ?? 0) : 0;
              const pct =
                estimateMinutes && estimateMinutes > 0
                  ? Math.round((totalConfirmed / estimateMinutes) * 100)
                  : null;
              const linkTo = course ? `/courses/${course.id}` : '/assignments';
              return (
                <li key={s.id} className="py-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={linkTo} className="truncate font-medium text-text hover:underline">
                      {title}
                    </Link>
                    <span className="text-sm font-medium text-text">
                      {formatMinutes(s.durationMinutes)}
                    </span>
                  </div>
                  {course && (
                    <p className="mt-1 text-xs text-text-muted">
                      {course.code} · {course.name}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    {formatRange(s.startTime, s.endTime)}
                  </p>
                  <div className="mt-2 rounded-md bg-surface-muted p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                      <span>Confirmed for this assignment: {formatMinutes(totalConfirmed)}</span>
                      <span>
                        Estimate: {estimateMinutes ? formatMinutes(estimateMinutes) : 'not set'}
                      </span>
                    </div>
                    {estimateMinutes ? (
                      <>
                        <div
                          role="progressbar"
                          aria-valuenow={pct ?? 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${pct}% of estimate confirmed`}
                          className="mt-2 h-1.5 rounded-full bg-border overflow-hidden"
                        >
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-text-muted">{pct}% of estimate</p>
                      </>
                    ) : (
                      <div className="mt-2">
                        <Badge variant="neutral" size="sm">
                          No estimate
                        </Badge>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {sessions.length < total && (
            <div className="mt-4 text-center">
              <p className="mb-2 text-xs text-text-muted">
                Showing {sessions.length} of {total} sessions
              </p>
              <Button
                variant="secondary"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                disabled={isLoadingMore}
                className="max-sm:min-h-[44px]"
              >
                Load more
              </Button>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
