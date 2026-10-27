import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';
import { isOverdueAssignment, isDueSoonAssignment } from '@/entities/assignment/model/status';
import type { AssignmentStatus } from '@/shared/types/academic';
import type { AssignmentInteractionItem, SubtaskChangeAction } from '../model/types';
import { RowActionsMenu } from './RowActionsMenu';
import { SubtaskChecklist } from './SubtaskChecklist';
import {
  DUE_SOON_LABEL,
  DUE_SOON_STYLE,
  OVERDUE_LABEL,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_SELECT_STYLES,
  DEFAULT_TYPE_ICON,
  TYPE_ICONS,
  TYPE_LABELS,
  subtaskProgress,
  subtaskSummary,
} from './assignmentPresentation';

const STATUS_OPTIONS: AssignmentStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SUBMITTED',
  'GRADED',
];

/**
 * The row's status control (SP-125 / D125-8). A real native `<select>` —
 * unchanged keyboard behavior and focus hook — wearing the text-plus-color
 * status palette so the current status reads at a glance.
 */
function StatusPillSelect({
  assignment,
  statusValue,
  statusDisabled,
  onStatusChange,
}: Pick<AssignmentRowProps, 'assignment' | 'statusValue' | 'statusDisabled' | 'onStatusChange'>) {
  return (
    <span className="relative inline-flex shrink-0">
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
      <ChevronDown
        aria-hidden
        size={14}
        className={clsx(
          'pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60',
          statusDisabled && 'opacity-0'
        )}
      />
    </span>
  );
}

/**
 * The course chip lives inside the card's left section (SP-124B slot,
 * restyled R-125-007): a course-colored dot plus the code and name, linking to
 * the course when one exists. `null` renders the static "No course" — no
 * link, because there is nowhere to go. `undefined` (course host) renders
 * no course line at all.
 */
function CourseChip({ course }: { course: AssignmentRowProps['course'] }) {
  if (course === undefined) return null;
  if (course === null) {
    return (
      <div className="mt-0.5">
        <span className="text-xs text-secondary-500">No course</span>
      </div>
    );
  }
  return (
    <div className="mt-0.5 min-w-0">
      <Link
        to={`/courses/${course.id}`}
        aria-label={`View course: ${course.name}`}
        className="relative z-10 inline-flex max-w-full items-center gap-1.5 rounded text-xs text-secondary-600 hover:text-secondary-900 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: course.color }}
          aria-hidden="true"
        />
        <span className="font-mono text-xs font-medium">{course.code}</span>
        <span className="min-w-0 truncate">{course.name}</span>
      </Link>
    </div>
  );
}

export interface AssignmentRowProps {
  assignment: AssignmentInteractionItem;
  /** Pending value while a status PATCH is in flight, otherwise the stored status. */
  statusValue: AssignmentStatus;
  statusDisabled: boolean;
  expanded: boolean;
  busy: boolean;
  /**
   * Course context for the chip line: the list host passes the nested course
   * (`null` renders "No course"); the course host omits it.
   */
  course?: { id: string; name: string; code: string; color: string } | null;
  onStatusChange: (status: AssignmentStatus) => void;
  onToggleExpanded: () => void;
  onOpenEdit: () => void;
  onOpenDelete: () => void;
  /** Row-content activation (title / card body) opens the edit dialog. */
  onTitleActivate: () => void;
  onSubtaskChanged: (action: SubtaskChangeAction) => void;
  onSubtaskRefresh: () => void;
  onSubtaskPending?: () => void;
  onSubtaskBusyChange: (busy: boolean) => void;
}

/**
 * One assignment card (SP-125 / R-125-007): type icon, strong title with an
 * overdue/due-soon urgency badge, course chip, compact meta line, and a
 * subtask progress disclosure on the left; the status select and an overflow
 * menu (Edit, Delete) on the right. Clicking the title — or most of the left
 * section through its stretched activation area — opens the edit dialog.
 *
 * The edit focus hook lives on the title because the title is the row's
 * stable control; the shared hook re-focuses the *neighbor's* title after a
 * delete, so it must exist whether or not any menu is open. The subtask
 * disclosure is always rendered (RV-125-001): a zero-subtask row must still
 * open the checklist, which owns the only add-subtask field.
 */
export function AssignmentRow({
  assignment,
  statusValue,
  statusDisabled,
  expanded,
  busy,
  course,
  onStatusChange,
  onToggleExpanded,
  onOpenEdit,
  onOpenDelete,
  onTitleActivate,
  onSubtaskChanged,
  onSubtaskRefresh,
  onSubtaskPending,
  onSubtaskBusyChange,
}: AssignmentRowProps) {
  const timeZone = getBrowserTimeZone();
  const TypeIcon = assignment.type ? TYPE_ICONS[assignment.type] : DEFAULT_TYPE_ICON;
  const isOverdue = isOverdueAssignment(assignment);
  const isDueSoon = isDueSoonAssignment(assignment);
  const hasSubtasks = assignment.subtasks.length > 0;

  const metaParts = [
    assignment.dueDate === null
      ? 'No due date'
      : `Due ${formatDate(new Date(assignment.dueDate), timeZone)}`,
    PRIORITY_LABELS[assignment.priority],
    assignment.type ? TYPE_LABELS[assignment.type] : null,
  ].filter(Boolean);

  return (
    <li className="relative rounded-xl border border-secondary-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:border-secondary-300 hover:shadow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Left: identity + metadata. The title's stretched pseudo-element
            makes the section clickable; interactive children stay above it
            with relative z-10. */}
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-600"
            >
              <TypeIcon size={16} />
            </span>
            <button
              type="button"
              onClick={onTitleActivate}
              data-assignment-focus={`edit:${assignment.id}`}
              className={clsx(
                'relative z-10 min-w-0 rounded text-left font-semibold text-secondary-900',
                'hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500',
                "after:absolute after:inset-0 after:content-['']"
              )}
            >
              {assignment.title}
            </button>
            {isOverdue && (
              <span
                className={clsx(
                  'relative z-10 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  'bg-red-100 text-red-700'
                )}
              >
                {OVERDUE_LABEL}
              </span>
            )}
            {!isOverdue && isDueSoon && (
              <span
                className={clsx(
                  'relative z-10 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  DUE_SOON_STYLE
                )}
              >
                {DUE_SOON_LABEL}
              </span>
            )}
          </div>

          <CourseChip course={course} />

          <p
            className={clsx(
              'mt-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs',
              assignment.dueDate === null ? 'text-secondary-500' : 'text-secondary-600'
            )}
          >
            <span className="min-w-0">{metaParts[0]}</span>
            <span aria-hidden="true" className="text-secondary-300">
              ·
            </span>
            <span>{metaParts[1]}</span>
            {metaParts[2] && (
              <>
                <span aria-hidden="true" className="text-secondary-300">
                  ·
                </span>
                <span>{metaParts[2]}</span>
              </>
            )}
          </p>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="relative z-10 mt-1 -ml-1"
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
            {hasSubtasks
              ? subtaskProgress(assignment.subtasks)
              : subtaskSummary(assignment.subtasks)}
          </Button>
        </div>

        {/* Right: govern the row — compact status select + overflow menu. */}
        <div className="flex items-center gap-2">
          <StatusPillSelect
            assignment={assignment}
            statusValue={statusValue}
            statusDisabled={statusDisabled}
            onStatusChange={onStatusChange}
          />
          <RowActionsMenu
            assignmentId={assignment.id}
            assignmentTitle={assignment.title}
            disabled={busy}
            onEdit={onOpenEdit}
            onDelete={onOpenDelete}
          />
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
