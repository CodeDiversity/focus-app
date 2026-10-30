import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { listCourses, type CourseWithSemester } from '@/entities/course/api/courseApi';
import { useAuth } from '@/features/auth/model/AuthContext';
import { useAssignmentsQuery } from '@/features/assignments/api/assignmentsApi';
import { useCalendarEventsQuery } from '@/features/calendar/api/calendarApi';
import { useAssignmentActions } from '@/features/assignments/model/useAssignmentActions';
import { AssignmentDialogs } from '@/features/assignments/ui/AssignmentDialogs';
import { dashboardTodayRange } from '@/features/dashboard/model/dashboardRange';
import {
  selectOverdueAssignments,
  selectTodayClasses,
  selectTodayStudySessions,
  selectUpcomingAssignments,
} from '@/features/dashboard/model/dashboardSelectors';
import { DashboardQuickActions } from '@/features/dashboard/ui/DashboardQuickActions';
import { OverdueAssignmentsSection } from '@/features/dashboard/ui/OverdueAssignmentsSection';
import { TodayClassesSection } from '@/features/dashboard/ui/TodayClassesSection';
import { TodayStudySessionsSection } from '@/features/dashboard/ui/TodayStudySessionsSection';
import { UpcomingDeadlinesSection } from '@/features/dashboard/ui/UpcomingDeadlinesSection';
import {
  overdueAssignmentsEmptyState,
  todayClassesEmptyState,
  todayStudySessionsEmptyState,
  upcomingDeadlinesEmptyState,
} from '@/features/dashboard/ui/dashboardEmptyStates';
import type { DashboardSectionStatus } from '@/features/dashboard/ui/dashboardSection';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';
import { Button } from '@/shared/ui/Button';
import type { AssignmentListItem } from '@/shared/types/academic';
import type { CalendarEvent } from '@/entities/calendar/model/types';

/**
 * EP05B — the rebuilt dashboard page.
 *
 * The placeholder is **replaced**, not extended (D05-11, final): the static
 * "Quick Actions" card, the "Recent Assignments" card, the "Study Stats" card
 * and the static "Upcoming Deadlines" card are gone, and **no** study-stats
 * surface is rebuilt in any form — "Hours Studied" has no endpoint until
 * EP07's confirmed-time seam and "Tasks Completed" is not an EP05 scope item.
 *
 * The page owns:
 *
 * - the **request window** — page **state**, never a `useMemo` over
 *   `new Date()` (a recomputed window on every render would change the
 *   calendar query's argument identity and refetch endlessly; a window frozen
 *   at mount would go stale across midnight). The refresh control replaces
 *   it;
 * - the **day line** — the payload's `today` is a **civil date**, not an
 *   instant, so it is rendered **verbatim**: it is formatted in `UTC` and
 *   the profile zone is printed **beside** it as the payload's raw IANA id
 *   (context only, never applied to the date). The client performs **no**
 *   profile-zone arithmetic (D05-6): it only displays what the server
 *   echoed. The line is absent while the calendar query has no payload;
 * - the **single page-level live region** (`role="status"`) with the count
 *   summary of the four derived sets (the **uncapped** totals, so a capped
 *   section never under-reports). The sections have no live regions;
 * - the **section order** — urgency order: overdue assignments, upcoming
 *   deadlines, today's classes, today's study sessions. The DOM order, the
 *   visual order and the tab order are the same at every width;
 * - the **quick action** — EP05C's "Add assignment", in the header's action
 *   group.
 *
 * The root `<section>` is where EP05C attaches `actions.sectionRef`, so the
 * shared hook's focus lookups can reach the "Add assignment" control.
 */
export interface DashboardPageProps {
  /**
   * D05-17 — the row → host callback. An assignment row's title calls this
   * with the row it rendered; the **page host** owns the shared assignment
   * owner and forwards it to `actions.openEdit(row)`.
   *
   * The default is the shared owner's `openEdit` — the page mounts the owner
   * exactly once (EP05C), so a row's "open relevant details" affordance is
   * live. A host may still pass its own callback (the page test does) to
   * observe the call instead.
   */
  onOpenDetails?: (row: AssignmentListItem) => void;
}

/**
 * The action sentences the shared owner's success announces (Decision #14) —
 * the assignments page's copy (`AssignmentsPage.tsx:59-63`). The sentence is
 * prepended to the page's **single** live region; no second region and no
 * success toast is added. ("Assignment deleted." exists only to satisfy the
 * hook's action type — the dashboard exposes no delete control.)
 */
const ACTION_SENTENCES: Record<'added' | 'updated' | 'deleted', string> = {
  added: 'Assignment added.',
  updated: 'Assignment updated.',
  deleted: 'Assignment deleted.',
};

/** A stable empty payload — the derived sets must not change identity per render. */
const NO_ASSIGNMENTS: AssignmentListItem[] = [];
const NO_EVENTS: CalendarEvent[] = [];

/** The section's three states, read from its own query. */
function sectionStatus(query: { isLoading: boolean; isError: boolean }): DashboardSectionStatus {
  if (query.isError) return 'error';
  if (query.isLoading) return 'loading';
  return 'ready';
}

/** `1 class` / `3 classes` — the count summary's singular/plural handling. */
function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function DashboardPage({ onOpenDetails }: DashboardPageProps = {}) {
  const { user, isLoading } = useAuth();

  /**
   * The request window (EP05A's `dashboardTodayRange`). It is **state**, so
   * it is stable across renders and only changes when the student refreshes.
   */
  const [range, setRange] = useState(() => dashboardTodayRange());

  /**
   * The student's courses — the create dialog's course select (Decision #7).
   * The shared form always renders the select in create mode when the host
   * fixes no course, so a course-less-only dialog would show a dead
   * one-option control. This is the existing plain-axios read (the
   * assignments page's pattern, A3); a failed load is **non-fatal** — the
   * select then offers only "No course" and a course-less assignment is
   * still creatable (D05-15).
   */
  const [courses, setCourses] = useState<CourseWithSemester[]>([]);

  /**
   * The action sentence the page's **single** live region announces
   * (Decision #14). It is cleared when a form opens, so a repeated action
   * announces again.
   */
  const [announcement, setAnnouncement] = useState('');

  const assignmentsQuery = useAssignmentsQuery();
  const calendarQuery = useCalendarEventsQuery(range);

  const assignments = assignmentsQuery.data ?? NO_ASSIGNMENTS;
  const calendar = calendarQuery.data;
  const events = calendar?.events ?? NO_EVENTS;
  const today = calendar?.today ?? '';
  /**
   * The profile zone the due dates are displayed in. While the calendar query
   * has no payload the zone is unknown, so the browser's zone is the
   * degraded fallback (assumption A7) — a display-only degradation in an
   * already-degraded state.
   */
  const timeZone = calendar?.timeZone ?? getBrowserTimeZone();

  // The four derived sets — the same pure EP05A selectors the sections use.
  // The counts are the **uncapped** totals.
  const classes = selectTodayClasses(events, today);
  const sessions = selectTodayStudySessions(events, today);
  const overdue = selectOverdueAssignments(assignments);
  const upcoming = selectUpcomingAssignments(assignments);

  /**
   * The rows the dashboard currently shows — the shared hook's `items` (A4).
   * The union is memoized on the payload, so the hook's items-identity effect
   * does not run on every render; its membership is payload-determined (a row
   * moves between the two lists, it never leaves their union), so the
   * memoization cannot make the hook's view differ from the sections'.
   */
  const visibleRows = useMemo(
    () => [...selectOverdueAssignments(assignments), ...selectUpcomingAssignments(assignments)],
    [assignments]
  );

  // The student's courses for the create dialog's course select.
  useEffect(() => {
    void listCourses()
      .then(setCourses)
      .catch(() => undefined);
  }, []);

  /**
   * The **one** shared assignment owner (D05-17). The page mounts it exactly
   * once — no section mounts its own — and the sections receive only the
   * `onOpenDetails(row)` callback. The cache hand-off is the assignments
   * query's own `refetch()` (the slice defines no tags, so there is no tag
   * invalidation to use); the new row therefore appears only after the
   * server confirms it (no optimistic insert).
   */
  const actions = useAssignmentActions({
    items: visibleRows,
    onChanged: (action) => {
      setAnnouncement(ACTION_SENTENCES[action]);
      void assignmentsQuery.refetch();
    },
    onSubtaskChanged: () => {
      void assignmentsQuery.refetch();
    },
    onSubtaskRefresh: () => {
      void assignmentsQuery.refetch();
    },
    // Re-arm the live region when a form opens, so a repeated action
    // announces again (the assignments page's `onFormOpen` re-arm).
    onFormOpen: () => setAnnouncement(''),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent motion-reduce:animate-none"></div>
      </div>
    );
  }

  const name = user?.name || user?.email.split('@')[0];

  /**
   * The day line (Decisions #2 — corrected by PC-EP05-13, finding
   * F-EP05B-01). The payload's `today` is a **civil date**, not an instant,
   * so it is rendered **verbatim**: the civil date is formatted in `UTC` and
   * the profile zone is printed **beside** it as the payload's raw IANA id —
   * context only, never applied to the date. The civil date is deliberately
   * **not** re-anchored to an instant and re-rendered in the profile zone:
   * no single UTC-anchored instant is correct in every zone (a noon-UTC
   * instant shifts the displayed date for every profile zone at UTC+12 or
   * later, a midnight-UTC instant at UTC−12 and earlier), and re-anchoring
   * would break the invariant "Today is the student's profile-zone day" for a
   * legal zone such as `Pacific/Kiritimati` (UTC+14).
   */
  const dayLine = calendar
    ? `Today, ${formatDate(new Date(`${calendar.today}T00:00:00Z`), 'UTC')} · ${calendar.timeZone}`
    : null;

  const isInitialLoading = assignmentsQuery.isLoading || calendarQuery.isLoading;
  const countSummary = isInitialLoading
    ? 'Loading your dashboard…'
    : [
        `${countLabel(classes.length, 'class', 'classes')} today`,
        countLabel(overdue.length, 'overdue assignment', 'overdue assignments'),
        countLabel(upcoming.length, 'upcoming deadline', 'upcoming deadlines'),
        countLabel(sessions.length, 'study session', 'study sessions'),
      ].join(' · ');

  /**
   * The page's single live region's content (Decision #14): the action
   * sentence — when there is one — is **prepended** to the count summary and
   * separated by " · ". The count summary is never lost, and no second live
   * region and no success toast is added for the success.
   */
  const statusMessage = announcement ? `${announcement} · ${countSummary}` : countSummary;

  /**
   * The refresh control: it recomputes the request window (so a tab left
   * open across midnight re-reads the server's "today") and refetches **both**
   * queries. When the recomputed window differs, the calendar query
   * refetches through its argument change — the handler must not issue a
   * second, stale-window request.
   */
  const handleRefresh = () => {
    const next = dashboardTodayRange();
    if (next.from !== range.from || next.to !== range.to) {
      setRange(next);
    } else {
      void calendarQuery.refetch();
    }
    void assignmentsQuery.refetch();
  };

  /**
   * The row → host callback (D05-17). The page owns the shared assignment
   * owner, so the default forwards to `actions.openEdit(row)` — a row's
   * "open relevant details" affordance is live (EP05C closes EP05B's
   * F-EP05B-02). A host may still pass its own callback.
   */
  const openDetails = onOpenDetails ?? ((row: AssignmentListItem) => actions.openEdit(row));

  return (
    <section
      ref={actions.sectionRef}
      aria-labelledby="dashboard-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 id="dashboard-heading" className="text-3xl font-bold text-text">
            Dashboard
          </h1>
          <p className="mt-1 text-text-muted">Welcome back, {name}!</p>
          {/* The day line is absent while the calendar query has no payload. */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {dayLine ? <p className="text-sm text-text-muted">{dayLine}</p> : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Refresh dashboard"
              className="max-sm:min-h-[44px]"
              onClick={handleRefresh}
              leftIcon={<RefreshCw aria-hidden size={16} />}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/*
            The one quick action (EP05C — Decisions #1–#5, #11). It **replaces**
            EP05B's reserved slot element: the page carries exactly **one**
            `data-assignment-focus="add"` control (the shared hook's stable
            post-create focus target) and **no** `data-assignment-focus="empty-add"`
            control at all — the shared hook falls back to this control when it
            is absent. The trigger is a pure trigger: it is never disabled and
            shows no busy state (the shared form's submit button carries it).
          */}
          <DashboardQuickActions onAddAssignment={actions.openForm} />
          <Link to="/profile">
            <Button variant="outline" className="max-sm:min-h-[44px]">
              View Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* The page's single live region (Decisions #11) — the count summary. */}
      <div
        role="status"
        className="mb-6 text-xs font-medium uppercase tracking-wider text-text-muted"
      >
        {statusMessage}
      </div>

      {/* Urgency order: overdue first, then the deadlines, then the day. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <OverdueAssignmentsSection
          rows={assignments}
          timeZone={timeZone}
          status={sectionStatus(assignmentsQuery)}
          error={assignmentsQuery.error}
          isFetching={assignmentsQuery.isFetching}
          onRetry={() => void assignmentsQuery.refetch()}
          onOpenDetails={openDetails}
          emptyState={overdueAssignmentsEmptyState(actions.openForm)}
        />
        <UpcomingDeadlinesSection
          rows={assignments}
          timeZone={timeZone}
          status={sectionStatus(assignmentsQuery)}
          error={assignmentsQuery.error}
          isFetching={assignmentsQuery.isFetching}
          onRetry={() => void assignmentsQuery.refetch()}
          onOpenDetails={openDetails}
          emptyState={upcomingDeadlinesEmptyState(actions.openForm)}
        />
        <TodayClassesSection
          events={events}
          today={today}
          status={sectionStatus(calendarQuery)}
          error={calendarQuery.error}
          isFetching={calendarQuery.isFetching}
          onRetry={() => void calendarQuery.refetch()}
          emptyState={todayClassesEmptyState()}
        />
        <TodayStudySessionsSection
          events={events}
          today={today}
          status={sectionStatus(calendarQuery)}
          error={calendarQuery.error}
          isFetching={calendarQuery.isFetching}
          onRetry={() => void calendarQuery.refetch()}
          emptyState={todayStudySessionsEmptyState()}
        />
      </div>

      {/*
        The one mount of the shared assignment dialogs (D05-17). The create
        dialog offers the course select fed by the student's own courses
        (Decision #7); the edit dialog opens from a row's title through the
        page-level `onOpenDetails` callback. The shared form owns the dialog's
        focus trap, its Escape handling, its focus restoration and its failure
        UI — the dashboard adds no dialog chrome and no error surface.
      */}
      <AssignmentDialogs actions={actions} courses={courses} />
    </section>
  );
}
