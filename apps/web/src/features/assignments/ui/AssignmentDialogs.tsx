import type { useAssignmentActions } from '../model/useAssignmentActions';
import { AssignmentForm } from './AssignmentForm';
import { DeleteAssignmentDialog } from './DeleteAssignmentDialog';

type AssignmentActions = ReturnType<typeof useAssignmentActions>;

export interface AssignmentDialogsProps {
  actions: AssignmentActions;
  /** Fixed course for create/edit on this host. */
  courseId: string;
}

/**
 * The single mount point for the assignment form and delete dialog. A host
 * renders this once with its `useAssignmentActions` result; it does not
 * reproduce the dialog conditions itself.
 */
export function AssignmentDialogs({ actions, courseId }: AssignmentDialogsProps) {
  return (
    <>
      {actions.formOpen && (
        <AssignmentForm
          courseId={courseId}
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
