import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { listCourses, type CourseWithSemester } from '@/entities/course/api/courseApi';
import { useAuth } from '@/features/auth/model/AuthContext';
import { useAssignmentsQuery } from '@/features/assignments/api/assignmentsApi';
import { useCalendarEventsQuery } from '@/features/calendar/api/calendarApi';
import { useAssignmentActions } from '@/features/assignments/model/useAssignmentActions';
import { AssignmentDialogs } from '@/features/assignments/ui/AssignmentDialogs';
import { useMomentumQuery } from '@/features/momentum/api/momentumApi';
import { useRecoverySummaryQuery } from '@/features/today/api/recoverySummaryApi';
import { dashboardTodayRange } from '@/features/today/model/dashboardRange';
import { selectComingUp, selectTodayClasses } from '@/features/today/model/dashboardSelectors';
import { dayLine } from '@/features/today/model/dayLine';
import { ClassesToday } from '@/features/today/ui/ClassesToday';
import { ComingUp } from '@/features/today/ui/ComingUp';
import { DashboardQuickActions } from '@/features/today/ui/DashboardQuickActions';
import { MomentumRow } from '@/features/today/ui/MomentumRow';
import { PlanNote } from '@/features/today/ui/PlanNote';
import type { DashboardSectionStatus } from '@/features/today/ui/dashboardSection';
import { TodayPlanCard } from '@/features/today-plan/ui/TodayPlanCard';
import { useTodayPlanQuery } from '@/features/today-plan/api/todayPlanApi';
import { getBrowserTimeZone } from '@/shared/lib/datetime';
import { Button } from '@/shared/ui/Button';
import type { AssignmentListItem } from '@/shared/types/academic';
import type { CalendarEvent } from '@/entities/calendar/model/types';

/**
 * EP16A/EP16B — the Today page, the signed-in landing surface (D16-2).
 *
 * Regions, in order (contracts § Today region contract, D16-3): header, the
 * page's single live region, the one next action (`TodayPlanCard`, EP13D),
 * the plan note, the momentum row, Coming up, Classes today. Every secondary
 * region renders nothing when it has nothing to say (D16-12 (10)); each has
 * its own query and states, so a slow or failing read never hides the hero
 * (AC-E16-02).
 *
 * Carried over from the dashboard (EP05B/EP05C): the request window is page
 * **state** (refresh recomputes it); the page mounts the shared assignment
 * owner exactly once (D05-17); exactly one `role="status"` (D-D13).
 */
const ACTION_SENTENCES: Record<'added' | 'updated' | 'deleted', string> = {
  added: 'Assignment added.',
  updated: 'Assignment updated.',
  deleted: 'Assignment deleted.',
};

const NO_ASSIGNMENTS: AssignmentListItem[] = [];
const NO_EVENTS: CalendarEvent[] = [];

function sectionStatus(query: { isLoading: boolean; isError: boolean }): DashboardSectionStatus {
  if (query.isError) return 'error';
  if (query.isLoading) return 'loading';
  return 'ready';
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * D-B9 — the live region's sentence: the plan's sessions, then the classes
 * and the coming-up rows only when there are any (uncapped totals, never a
 * past-due count).
 */
export function todaySentence(sessions: number, classes: number, comingUp: number): string {
  const parts = [
    sessions === 0
      ? 'No sessions planned today'
      : `${count(sessions, 'session', 'sessions')} planned today`,
  ];
  if (classes > 0) parts.push(`${count(classes, 'class', 'classes')} today`);
  if (comingUp > 0) parts.push(`${count(comingUp, 'assignment', 'assignments')} coming up`);
  return parts.join(' · ');
}

export function TodayPage() {
  const { isLoading } = useAuth();
  const [range, setRange] = useState(() => dashboardTodayRange());
  const [courses, setCourses] = useState<CourseWithSemester[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const calendarQuery = useCalendarEventsQuery(range);
  const todayPlanQuery = useTodayPlanQuery();
  const assignmentsQuery = useAssignmentsQuery();
  const momentumQuery = useMomentumQuery();
  const recoveryQuery = useRecoverySummaryQuery();

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

  const assignments = assignmentsQuery.data ?? NO_ASSIGNMENTS;
  const calendar = calendarQuery.data;
  const events = calendar?.events ?? NO_EVENTS;
  const today = calendar?.today ?? '';
  const timeZone = calendar?.timeZone ?? getBrowserTimeZone();

  // The rows Coming up can show — uncapped, memoized on the payload, so the
  // shared hook's items-identity effect does not run on every render.
  const comingUp = useMemo(() => selectComingUp(assignments), [assignments]);
  const classes = selectTodayClasses(events, today);

  const actions = useAssignmentActions({
    items: comingUp,
    onChanged: (action) => {
      setAnnouncement(ACTION_SENTENCES[action]);
      void assignmentsQuery.refetch();
    },
    onSubtaskChanged: () => void assignmentsQuery.refetch(),
    onSubtaskRefresh: () => void assignmentsQuery.refetch(),
    onFormOpen: () => setAnnouncement(''),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent motion-reduce:animate-none"></div>
      </div>
    );
  }

  const line = calendar ? dayLine(calendar.today, calendar.timeZone, getBrowserTimeZone()) : null;
  const plan = todayPlanQuery.data;
  const countSummary = todayPlanQuery.isLoading
    ? 'Loading your day…'
    : todaySentence(plan?.sessions.length ?? 0, classes.length, comingUp.length);
  const statusMessage = announcement ? `${announcement} · ${countSummary}` : countSummary;

  const handleRefresh = () => {
    const next = dashboardTodayRange();
    if (next.from !== range.from || next.to !== range.to) setRange(next);
    else void calendarQuery.refetch();
    void todayPlanQuery.refetch();
    void assignmentsQuery.refetch();
    void momentumQuery.refetch();
    void recoveryQuery.refetch();
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

      {/* 1. The one next action — the first meaningful content (AC-E16-02). */}
      <TodayPlanCard
        plan={plan}
        status={sectionStatus(todayPlanQuery)}
        error={todayPlanQuery.error}
        isFetching={todayPlanQuery.isFetching}
        onRetry={() => void todayPlanQuery.refetch()}
      />

      {/* 2. The plan note (EP16B-AC1). */}
      <PlanNote summary={recoveryQuery.data} status={sectionStatus(recoveryQuery)} />

      {/* 3. The momentum row (EP16B-AC2). */}
      <MomentumRow
        momentum={momentumQuery.data}
        status={sectionStatus(momentumQuery)}
        error={momentumQuery.error}
        isFetching={momentumQuery.isFetching}
        onRetry={() => void momentumQuery.refetch()}
      />

      {/* 4. Coming up (EP16B-AC3). */}
      <ComingUp
        rows={assignments}
        timeZone={timeZone}
        status={sectionStatus(assignmentsQuery)}
        error={assignmentsQuery.error}
        isFetching={assignmentsQuery.isFetching}
        onRetry={() => void assignmentsQuery.refetch()}
        onOpenDetails={(row) => actions.openEdit(row)}
      />

      {/* 5. Classes today (EP16B-AC4). */}
      <ClassesToday
        events={events}
        today={today}
        status={sectionStatus(calendarQuery)}
        isFetching={calendarQuery.isFetching}
        onRetry={() => void calendarQuery.refetch()}
      />

      <AssignmentDialogs actions={actions} courses={courses} />
    </section>
  );
}

export default TodayPage;
