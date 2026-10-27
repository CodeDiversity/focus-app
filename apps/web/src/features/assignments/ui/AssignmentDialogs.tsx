import type { CourseWithSemester } from '@/entities/course/api/courseApi';
import type { useAssignmentActions } from '../model/useAssignmentActions';
import { AssignmentForm } from './AssignmentForm';
import { DeleteAssignmentDialog } from './DeleteAssignmentDialog';

type AssignmentActions = ReturnType<typeof useAssignmentActions>;

export interface AssignmentDialogsProps {
  actions: AssignmentActions;
  /** Fixed course for creation on this host (course page). Omitted on the list. */
  courseId?: string;
  /** Caller's courses; only the create-mode course select consumes them. */
  courses?: CourseWithSemester[];
  /** Pre-selected create-mode course (e.g. the list's active course filter). */
  initialCourseId?: string;
}

/**
 * The single mount point for the assignment form and delete dialog. A host
 * renders this once with its `useAssignmentActions` result; it does not
 * reproduce the dialog conditions itself.
 */
export function AssignmentDialogs({
  actions,
  courseId,
  courses,
  initialCourseId,
}: AssignmentDialogsProps) {
  return (
    <>
      {actions.formOpen && (
        <AssignmentForm
          courseId={courseId}
          courses={courses}
          initialCourseId={initialCourseId}
          onClose={actions.closeForm}
          onSuccess={actions.handleCreateSuccess}
        />
      )}
      {actions.editing && (
        <AssignmentForm
          courseId={courseId}
          assignment={actions.editing}
          onClose={actions.closeEdit}
          onSuccess={actions.handleEditSuccess}
        />
      )}
      {actions.deleting && (
        <DeleteAssignmentDialog
          assignment={actions.deleting}
          onCancel={actions.closeDelete}
          onDeleted={actions.handleDeleted}
        />
      )}
    </>
  );
}
