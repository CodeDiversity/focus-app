import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { isFinishedAssignment, isUnfinishedAssignment } from '@/entities/assignment/model/status';
import type { AssignmentStatus, CourseAssignment } from '@/shared/types/academic';
import { useAssignmentActions } from '../model/useAssignmentActions';
import type { SubtaskChangeAction } from '../model/types';
import { AssignmentDialogs } from './AssignmentDialogs';
import { AssignmentRow } from './AssignmentRow';

export type { SubtaskChangeAction };

export interface AssignmentsSectionProps {
  courseId: string;
  onAssignmentChanged: (action: 'added' | 'updated' | 'deleted') => void;
  onAssignmentStatusChanged?: (status: AssignmentStatus) => void;
  onAssignmentFormOpen?: () => void;
  /** Subtask success. The page announces and background-refetches. Not assignment copy. */
  onSubtaskChanged: (action: SubtaskChangeAction) => void;
  /** Partial reorder: refetch only, no success sentence. */
  onSubtaskRefresh: () => void;
  /** Clears the page live region before a subtask request so a repeat sentence announces. */
  onSubtaskPending?: () => void;
  /**
   * The course's assignments in the API order (`dueDate` asc nulls-last, then
   * title — from the `getCourse` projection, D112B-13). Rendered as-is — no
   * client re-sort. Each row's `subtasks` are likewise rendered as given.
   */
  assignments: CourseAssignment[];
}

/**
 * The course-page host for assignment interactions (SP-124A). It owns only the
 * course-specific framing: the section header, quick creation, the unfinished/
 * completed grouping, and the show-completed disclosure. Every row's status,
 * edit/delete dialogs, subtasks, and focus behavior come from the shared
 * `useAssignmentActions` + `AssignmentRow`.
 */
export function AssignmentsSection({
  assignments,
  courseId,
  onAssignmentChanged,
  onAssignmentStatusChanged,
  onAssignmentFormOpen,
  onSubtaskChanged,
  onSubtaskRefresh,
  onSubtaskPending,
}: AssignmentsSectionProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  // Reset the revealed state whenever the assignments prop changes identity
  // (D123-5 / D123B-6).
  useEffect(() => {
    setShowCompleted(false);
  }, [assignments]);

  const actions = useAssignmentActions({
    items: assignments,
    onChanged: onAssignmentChanged,
    onStatusChanged: onAssignmentStatusChanged,
    onSubtaskChanged,
    onSubtaskRefresh,
    onPending: onSubtaskPending,
    onFormOpen: onAssignmentFormOpen,
  });

  const unfinished = assignments.filter(isUnfinishedAssignment);
  const finished = assignments.filter(isFinishedAssignment);

  const renderRow = (assignment: CourseAssignment) => (
    <AssignmentRow
      key={assignment.id}
      assignment={assignment}
      statusValue={actions.pendingStatus[assignment.id] ?? assignment.status}
      statusDisabled={actions.statusBusyIds.has(assignment.id)}
      expanded={actions.expandedIds.has(assignment.id)}
      busy={actions.busyIds.has(assignment.id)}
      onStatusChange={(status) => void actions.handleStatusChange(assignment, status)}
      onToggleExpanded={() => actions.toggleExpanded(assignment.id)}
      onOpenEdit={() => actions.openEdit(assignment)}
      onOpenDelete={() => actions.openDelete(assignment)}
      onTitleActivate={() => actions.openEdit(assignment)}
      onSubtaskChanged={actions.onSubtaskChanged}
      onSubtaskRefresh={actions.onSubtaskRefresh}
      onSubtaskPending={actions.onPending}
      onSubtaskBusyChange={(busy) => actions.setAssignmentBusy(assignment.id, busy)}
    />
  );

  return (
    <section ref={actions.sectionRef} className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">Assignments</h2>
        <Button size="sm" variant="primary" data-assignment-focus="add" onClick={actions.openForm}>
          Add assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-text">No assignments yet.</p>
          <Button className="mt-4" data-assignment-focus="empty-add" onClick={actions.openForm}>
            Add your first assignment
          </Button>
        </div>
      ) : (
        <>
          {unfinished.length > 0 && (
            <ul className="divide-y divide-border max-sm:[&_button]:min-h-[44px] max-sm:[&_select]:min-h-[44px]">
              {unfinished.map(renderRow)}
            </ul>
          )}
          {unfinished.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-text-muted">All assignments are complete.</p>
            </div>
          )}
          {finished.length > 0 && (
            <div className={clsx('mt-4', unfinished.length > 0 && 'border-t border-border pt-3')}>
              <Button
                id="completed-assignments-toggle"
                variant="ghost"
                size="sm"
                aria-expanded={showCompleted}
                aria-controls="completed-assignments"
                leftIcon={
                  <ChevronDown
                    aria-hidden
                    size={16}
                    className={clsx('transition-transform', showCompleted && 'rotate-180')}
                  />
                }
                onClick={() => setShowCompleted((value) => !value)}
              >
                {showCompleted
                  ? `Hide completed (${finished.length})`
                  : `Show completed (${finished.length})`}
              </Button>
              {showCompleted && (
                <div
                  id="completed-assignments"
                  role="region"
                  aria-labelledby="completed-assignments-toggle"
                  className="mt-3"
                >
                  <ul className="divide-y divide-border max-sm:[&_button]:min-h-[44px] max-sm:[&_select]:min-h-[44px]">
                    {finished.map(renderRow)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AssignmentDialogs actions={actions} courseId={courseId} />
    </section>
  );
}
