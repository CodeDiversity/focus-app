import { isOverdueAssignment } from '@/entities/assignment/model/status';
import { OVERDUE_LABEL, subtaskProgress } from '@/features/assignments/ui/assignmentPresentation';
import type { AssignmentListItem } from '@/shared/types/academic';
import { Badge } from '@/shared/ui/Badge';
import { dueDateLabel } from './dashboardSection';

/**
 * EP05B — the dashboard's **compact** assignment row (D05-18).
 *
 * The shared EP03 `AssignmentRow` is a full editing card: a status select, an
 * overflow menu, a status badge, a priority/type meta line and a subtask
 * checklist. Every one of its props is required and it has no summary
 * variant, so reusing it on the dashboard would force an unscoped edit to a
 * component the assignments page and the course page also consume. The
 * dashboard therefore renders **its own** compact row and modifies nothing
 * under `features/assignments/ui/`.
 *
 * The row shows three lines (Decision #4):
 *
 * 1. the **title** — a `<button>` that calls the host-supplied
 *    `onOpenDetails(row)` exactly once, with the row it rendered, and that
 *    carries `data-assignment-focus="edit:<id>"` so the shared hook's
 *    neighbour-focus lookup finds a real target;
 * 2. the **course** — `code · name`, or "No course" (D05-15);
 * 3. the **due date** — `Due Oct 30, 2026` or "No due date" — with the
 *    **subtask progress** when the assignment has subtasks.
 *
 * There is **no** status select, no overflow menu, no status badge, no
 * priority or type label, no "Due soon" badge and no subtask checklist. The
 * row mounts **no** dialog and **no** assignment owner (D05-17): the
 * "overdue" marking is the shared **text** badge, so it survives greyscale
 * and colour-vision deficiency.
 */
export interface DashboardAssignmentRowProps {
  /** The assignment the row renders. */
  assignment: AssignmentListItem;
  /** The profile zone the due date is displayed in (the payload's zone). */
  timeZone: string;
  /** D05-17: the row → host callback. The row never opens a dialog itself. */
  onOpenDetails: (row: AssignmentListItem) => void;
}

export function DashboardAssignmentRow({
  assignment,
  timeZone,
  onOpenDetails,
}: DashboardAssignmentRowProps) {
  const isOverdue = isOverdueAssignment(assignment);
  const hasSubtasks = assignment.subtasks.length > 0;
  const course = assignment.course;

  return (
    <li className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenDetails(assignment)}
          data-assignment-focus={`edit:${assignment.id}`}
          className="min-w-0 rounded text-left font-semibold text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {assignment.title}
        </button>
        {isOverdue ? <Badge variant="danger">{OVERDUE_LABEL}</Badge> : null}
      </div>

      <p className="mt-0.5 text-xs text-text-muted">
        {course ? `${course.code} · ${course.name}` : 'No course'}
      </p>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
        <span>{dueDateLabel(assignment.dueDate, timeZone)}</span>
        {hasSubtasks ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{subtaskProgress(assignment.subtasks)}</span>
          </>
        ) : null}
      </p>
    </li>
  );
}
