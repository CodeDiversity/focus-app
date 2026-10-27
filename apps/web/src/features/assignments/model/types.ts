import type {
  AssignmentPriority,
  AssignmentStatus,
  AssignmentType,
  Subtask,
} from '@/shared/types/academic';

/**
 * Page live-region actions. Sentences live on the page, not here. Defined in
 * `model/` so the interaction owner does not import a UI component for a type.
 */
export type SubtaskChangeAction = 'added' | 'completed' | 'reopened' | 'moved' | 'deleted';

/**
 * The editable assignment shape shared by the course host (`CourseAssignment`)
 * and the cross-course list (`AssignmentListItem`). It deliberately excludes
 * `course` and the audit timestamps: the interaction owner never needs them.
 */
export interface AssignmentInteractionItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  type: AssignmentType | null;
  subtasks: Subtask[];
}
