import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, SquarePen } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
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
  STATUS_SELECT_STYLES,
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

/**
 * The row's status control (SP-125 / D125-8). A real native `<select>` —
 * unchanged keyboard behavior and focus hook — wearing the text-plus-color
 * status palette so the current status reads at a glance, matching the
 * priority/type pills. Keep the wrapper span for the chevron overlay and the
 * `relative` anchor; the select itself carries the value classes.
 */
function StatusPillSelect({
  assignment,
  statusValue,
  statusDisabled,
  onStatusChange,
}: Pick<AssignmentRowProps, 'assignment' | 'statusValue' | 'statusDisabled' | 'onStatusChange'>) {
  const chevronClass = clsx(
    'pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60',
    // The select's own value styles win over the chevron on hover states.
    statusDisabled && 'opacity-0'
  );

  return (
    <span className="relative inline-flex">
      <select
        aria-label={`Status for ${assignment.title}`}
        data-assignment-focus={`status:${assignment.id}`}
        disabled={statusDisabled}
        value={statusValue}
        onChange={(event) => onStatusChange(event.target.value as AssignmentStatus)}
        className={clsx(
          'cursor-pointer appearance-none rounded-full border py-1.5 pl-3 pr-7 text-xs font-semibold',
          'transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
          STATUS_SELECT_STYLES[statusValue]
        )}
      >
        {STATUS_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden size={14} className={chevronClass} />
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
          <StatusPillSelect
            assignment={assignment}
            statusValue={statusValue}
            statusDisabled={statusDisabled}
            onStatusChange={onStatusChange}
          />
          <Badge className={PRIORITY_STYLES[assignment.priority]}>
            {PRIORITY_LABELS[assignment.priority]}
          </Badge>
          {assignment.type && <Badge className={TYPE_STYLE}>{TYPE_LABELS[assignment.type]}</Badge>}
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-red-50 hover:text-red-700"
            aria-label={`Delete ${assignment.title}`}
            onClick={onOpenDelete}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="px-2 max-sm:min-w-[44px]"
            data-assignment-focus={`edit:${assignment.id}`}
            aria-label={`Edit ${assignment.title}`}
            onClick={onOpenEdit}
          >
            <SquarePen size={16} aria-hidden />
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
