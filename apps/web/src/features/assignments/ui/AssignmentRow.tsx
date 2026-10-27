import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';
import { isOverdueAssignment } from '@/entities/assignment/model/status';
import type { AssignmentStatus } from '@/shared/types/academic';
import type { AssignmentInteractionItem, SubtaskChangeAction } from '../model/types';
import { SubtaskChecklist } from './SubtaskChecklist';
import {
  OVERDUE_LABEL,
  OVERDUE_STYLE,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  TYPE_LABELS,
  TYPE_STYLE,
  subtaskSummary,
} from './assignmentPresentation';

const STATUS_OPTIONS: AssignmentStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SUBMITTED',
  'GRADED',
];

function Badge({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      {children}
    </span>
  );
}

export interface AssignmentRowProps {
  assignment: AssignmentInteractionItem;
  /** Pending value while a status PATCH is in flight, otherwise the stored status. */
  statusValue: AssignmentStatus;
  statusDisabled: boolean;
  expanded: boolean;
  busy: boolean;
  onStatusChange: (status: AssignmentStatus) => void;
  onToggleExpanded: () => void;
  onOpenEdit: () => void;
  onOpenDelete: () => void;
  onSubtaskChanged: (action: SubtaskChangeAction) => void;
  onSubtaskRefresh: () => void;
  onSubtaskPending?: () => void;
  onSubtaskBusyChange: (busy: boolean) => void;
  /** When set, the title becomes a button that opens this action (SP-124B). */
  onTitleActivate?: () => void;
  /** Surface-specific metadata (e.g. the list's course chip) under the due line. */
  meta?: ReactNode;
}

/**
 * One assignment row: title, due line, overdue pill, subtask disclosure,
 * status control, badges, and edit/delete controls. Both the course host and
 * the cross-course list render this component; neither reimplements it.
 *
 * The visual markup and DOM order match the pre-extraction course row so the
 * existing keyboard-order and badge-cluster tests keep their meaning.
 */
export function AssignmentRow({
  assignment,
  statusValue,
  statusDisabled,
  expanded,
  busy,
  onStatusChange,
  onToggleExpanded,
  onOpenEdit,
  onOpenDelete,
  onSubtaskChanged,
  onSubtaskRefresh,
  onSubtaskPending,
  onSubtaskBusyChange,
  onTitleActivate,
  meta,
}: AssignmentRowProps) {
  const timeZone = getBrowserTimeZone();

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {onTitleActivate ? (
            <button
              type="button"
              onClick={onTitleActivate}
              className="rounded text-left font-medium text-secondary-900 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {assignment.title}
            </button>
          ) : (
            <p className="font-medium text-secondary-900">{assignment.title}</p>
          )}
          <p
            className={clsx(
              'mt-1 text-sm',
              assignment.dueDate === null ? 'text-secondary-500' : 'text-secondary-600'
            )}
          >
            {assignment.dueDate === null ? (
              'No due date'
            ) : (
              <>
                {`Due ${formatDate(new Date(assignment.dueDate), timeZone)}`}
                {isOverdueAssignment(assignment) && (
                  <span
                    className={clsx(
                      'ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      OVERDUE_STYLE
                    )}
                  >
                    {OVERDUE_LABEL}
                  </span>
                )}
              </>
            )}
          </p>
          {meta}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2"
            id={`subtasks-toggle-${assignment.id}`}
            aria-expanded={expanded}
            aria-controls={`subtasks-${assignment.id}`}
            aria-label={`Subtasks for ${assignment.title}: ${subtaskSummary(assignment.subtasks)}`}
            disabled={busy}
            leftIcon={
              <ChevronDown
                aria-hidden
                size={16}
                className={clsx('transition-transform', expanded && 'rotate-180')}
              />
            }
            onClick={onToggleExpanded}
          >
            {subtaskSummary(assignment.subtasks)}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label={`Status for ${assignment.title}`}
            data-assignment-focus={`status:${assignment.id}`}
            disabled={statusDisabled}
            value={statusValue}
            onChange={(event) => onStatusChange(event.target.value as AssignmentStatus)}
            className="w-auto"
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
          <Badge className={PRIORITY_STYLES[assignment.priority]}>
            {PRIORITY_LABELS[assignment.priority]}
          </Badge>
          {assignment.type && <Badge className={TYPE_STYLE}>{TYPE_LABELS[assignment.type]}</Badge>}
          <Button
            size="sm"
            variant="outline"
            data-assignment-focus={`edit:${assignment.id}`}
            aria-label={`Edit ${assignment.title}`}
            onClick={onOpenEdit}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${assignment.title}`}
            onClick={onOpenDelete}
          >
            Delete
          </Button>
        </div>
      </div>
      {expanded && (
        <SubtaskChecklist
          assignmentId={assignment.id}
          assignmentTitle={assignment.title}
          subtasks={assignment.subtasks}
          onChanged={onSubtaskChanged}
          onRefresh={onSubtaskRefresh}
          onBusyChange={onSubtaskBusyChange}
          onPendingAnnouncement={onSubtaskPending}
        />
      )}
    </li>
  );
}
