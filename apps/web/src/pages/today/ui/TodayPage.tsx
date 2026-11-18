import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { listCourses, type CourseWithSemester } from '@/entities/course/api/courseApi';
import { useAuth } from '@/features/auth/model/AuthContext';
import { useCalendarEventsQuery } from '@/features/calendar/api/calendarApi';
import { useAssignmentActions } from '@/features/assignments/model/useAssignmentActions';
import { AssignmentDialogs } from '@/features/assignments/ui/AssignmentDialogs';
import { dashboardTodayRange } from '@/features/today/model/dashboardRange';
import { dayLine } from '@/features/today/model/dayLine';
import { DashboardQuickActions } from '@/features/today/ui/DashboardQuickActions';
import type { DashboardSectionStatus } from '@/features/today/ui/dashboardSection';
import { TodayPlanCard } from '@/features/today-plan/ui/TodayPlanCard';
import { useTodayPlanQuery } from '@/features/today-plan/api/todayPlanApi';
import { getBrowserTimeZone } from '@/shared/lib/datetime';
import { Button } from '@/shared/ui/Button';
import type { AssignmentListItem } from '@/shared/types/academic';

/**
 * EP16A — the Today page, the signed-in landing surface (D16-2). It replaces
 * the dashboard: one heading, the day line, a refresh control, the one
 * "Add assignment" quick action, the page's single live region, and the
 * next action (`TodayPlanCard`, EP13D) directly under the header. EP16B adds
 * the plan note, the momentum row, Coming up and Classes today below it.
 *
 * Carried over from the dashboard (EP05B/EP05C): the request window is page
 * **state** (refresh recomputes it, so a tab left open across midnight
 * re-reads the server's "today"); the page mounts the shared assignment
 * owner exactly once (D05-17); the page has exactly one `role="status"`
 * region (D-D13).
 */
const ACTION_SENTENCES: Record<'added' | 'updated' | 'deleted', string> = {
  added: 'Assignment added.',
  updated: 'Assignment updated.',
  deleted: 'Assignment deleted.',
};

/** No rows are shown on Today until EP16B; a stable empty list for the shared owner. */
const NO_ROWS: AssignmentListItem[] = [];

function sectionStatus(query: { isLoading: boolean; isError: boolean }): DashboardSectionStatus {
  if (query.isError) return 'error';
  if (query.isLoading) return 'loading';
  return 'ready';
}

/** D-A2 — the live region describes what the page shows: today's sessions. */
function sessionsSentence(count: number): string {
  if (count === 0) return 'No sessions planned today';
  return `${count} ${count === 1 ? 'session' : 'sessions'} planned today`;
}

export function TodayPage() {
  const { isLoading } = useAuth();
  const [range, setRange] = useState(() => dashboardTodayRange());
  const [courses, setCourses] = useState<CourseWithSemester[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const calendarQuery = useCalendarEventsQuery(range);
  const todayPlanQuery = useTodayPlanQuery();

  useEffect(() => {
    document.title = 'Today — StudyPilot';
  }, []);

  // The student's courses for the create dialog's course select (EP05C);
  // a failed load is non-fatal (the select offers "No course").
  useEffect(() => {
    void listCourses()
      .then(setCourses)
      .catch(() => undefined);
  }, []);

  const actions = useAssignmentActions({
    items: NO_ROWS,
    onChanged: (action) => setAnnouncement(ACTION_SENTENCES[action]),
    // No assignment rows on Today until EP16B's Coming up — nothing to refresh.
    onSubtaskChanged: () => undefined,
    onSubtaskRefresh: () => undefined,
    onFormOpen: () => setAnnouncement(''),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent motion-reduce:animate-none"></div>
      </div>
    );
  }

  const calendar = calendarQuery.data;
  const line = calendar ? dayLine(calendar.today, calendar.timeZone, getBrowserTimeZone()) : null;

  const plan = todayPlanQuery.data;
  const countSummary = todayPlanQuery.isLoading
    ? 'Loading your day…'
    : sessionsSentence(plan?.sessions.length ?? 0);
  const statusMessage = announcement ? `${announcement} · ${countSummary}` : countSummary;

  const handleRefresh = () => {
    const next = dashboardTodayRange();
    if (next.from !== range.from || next.to !== range.to) setRange(next);
    else void calendarQuery.refetch();
    void todayPlanQuery.refetch();
  };

  return (
    <section
      ref={actions.sectionRef}
      aria-labelledby="today-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
    >
      <div className="mb-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 id="today-heading" className="text-3xl font-bold text-text">
            Today
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {line ? <p className="text-sm text-text-muted">{line}</p> : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Refresh today"
              className="max-sm:min-h-[44px]"
              onClick={handleRefresh}
              leftIcon={<RefreshCw aria-hidden size={16} />}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <DashboardQuickActions onAddAssignment={actions.openForm} />
        </div>
      </div>

      {/* The page's single live region (D-D13). */}
      <div
        role="status"
        className="mb-4 text-xs font-medium uppercase tracking-wider text-text-muted"
      >
        {statusMessage}
      </div>

      {/* The one next action — the first meaningful content (AC-E16-02). */}
      <TodayPlanCard
        plan={plan}
        status={sectionStatus(todayPlanQuery)}
        error={todayPlanQuery.error}
        isFetching={todayPlanQuery.isFetching}
        onRetry={() => void todayPlanQuery.refetch()}
      />

      <AssignmentDialogs actions={actions} courses={courses} />
    </section>
  );
}

export default TodayPage;
