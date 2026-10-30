import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import type { DashboardEmptyState } from './dashboardSection';

/**
 * EP05C — the four settled empty states (Decisions #8–#10).
 *
 * The content is supplied **through EP05B's `emptyState` prop** — no section
 * component is modified (D05-12). The copy and the action factories live in
 * this module so the page and the four sections share one vocabulary and the
 * copy is unit-testable without rendering the page.
 *
 * Two rules shape every entry (D05-5, D05-11 final, D05-2, D05-13):
 *
 * - **no copy names a feature the dashboard does not have** — no study plan,
 *   no focus session, no "Hours Studied"/"Tasks Completed" figure;
 * - **no copy promises that sessions can be created here** — the
 *   study-sessions empty state states an empty day and points at the
 *   calendar, so it reads as a calm, expected state rather than an error.
 *
 * No empty state is a live region: the shared `EmptyState` renders no
 * `role="status"` / `role="alert"`, and only the page's single region
 * announces. No empty-state control carries a `data-assignment-focus`
 * attribute (Decision #11) — the shared hook's post-delete fallback lands on
 * the header's "Add assignment" trigger.
 */

/** The settled copy of one empty state (Decisions #9). */
export interface DashboardEmptyStateCopy {
  title: string;
  description: string;
}

/** The four settled copy pairs (Decisions #9). */
export const DASHBOARD_EMPTY_STATE_COPY: {
  overdue: DashboardEmptyStateCopy;
  upcoming: DashboardEmptyStateCopy;
  classes: DashboardEmptyStateCopy;
  sessions: DashboardEmptyStateCopy;
} = {
  overdue: {
    title: 'Nothing overdue.',
    description:
      "You're all caught up — no assignment is past its due date. Add an assignment to put the next one on your list.",
  },
  upcoming: {
    title: 'No upcoming deadlines.',
    description: "Nothing is due ahead. Add an assignment to keep track of what's next.",
  },
  classes: {
    title: 'No classes today.',
    description: "No classes are scheduled for today. View your week to see what's ahead.",
  },
  sessions: {
    title: 'No study sessions today.',
    description:
      'Nothing is scheduled for study today. Check the calendar for your classes and deadlines.',
  },
};

/** The two calendar sections' link labels (Decision #10). */
export const CLASSES_EMPTY_ACTION_LABEL = 'View your week';
export const SESSIONS_EMPTY_ACTION_LABEL = 'Open the calendar';

/**
 * The two **assignment** sections' affordance: a `primary` "Add an
 * assignment" button that opens the same shared create form (Decision #10).
 *
 * The label is "Add an assignment" — not "Add your first assignment" —
 * because the overdue section can be empty while the student already has
 * assignments; it is also distinct from the header trigger's "Add
 * assignment", so no two controls on the page share an accessible name.
 */
function addAssignmentAction(onAddAssignment: () => void) {
  return (
    <Button
      type="button"
      variant="primary"
      className="max-sm:min-h-[44px]"
      onClick={onAddAssignment}
    >
      Add an assignment
    </Button>
  );
}

/**
 * The two **calendar** sections' affordance: an outline link-button to
 * `/calendar` — the house "a `Button` inside a `Link`" treatment
 * (`AssignmentsPage.tsx:556`, `AvailabilityPage.tsx:195`). EP05 adds no
 * route; the calendar is the existing full list.
 */
function calendarAction(label: string) {
  return (
    <Link to="/calendar">
      <Button variant="outline" className="max-sm:min-h-[44px]">
        {label}
      </Button>
    </Link>
  );
}

/** The "Overdue assignments" section's empty state. */
export function overdueAssignmentsEmptyState(onAddAssignment: () => void): DashboardEmptyState {
  return {
    ...DASHBOARD_EMPTY_STATE_COPY.overdue,
    action: addAssignmentAction(onAddAssignment),
  };
}

/** The "Upcoming deadlines" section's empty state. */
export function upcomingDeadlinesEmptyState(onAddAssignment: () => void): DashboardEmptyState {
  return {
    ...DASHBOARD_EMPTY_STATE_COPY.upcoming,
    action: addAssignmentAction(onAddAssignment),
  };
}

/** The "Today's classes" section's empty state. */
export function todayClassesEmptyState(): DashboardEmptyState {
  return {
    ...DASHBOARD_EMPTY_STATE_COPY.classes,
    action: calendarAction(CLASSES_EMPTY_ACTION_LABEL),
  };
}

/** The "Today's study sessions" section's empty state. */
export function todayStudySessionsEmptyState(): DashboardEmptyState {
  return {
    ...DASHBOARD_EMPTY_STATE_COPY.sessions,
    action: calendarAction(SESSIONS_EMPTY_ACTION_LABEL),
  };
}
