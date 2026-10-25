import { useLayoutEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Button } from '@/shared/ui/Button';
import { AssignmentForm } from './AssignmentForm';
import { DeleteAssignmentDialog } from './DeleteAssignmentDialog';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';
import type {
  AssignmentPriority,
  AssignmentStatus,
  CourseAssignment,
} from '@/shared/types/academic';

export interface AssignmentsSectionProps {
  courseId: string;
  onAssignmentChanged: (action: 'added' | 'updated' | 'deleted') => void;
  onAssignmentFormOpen?: () => void;
  /**
   * The course's assignments in the API order (`dueDate` asc nulls-last, then
   * title — from the `getCourse` projection, D112B-13). Rendered as-is — no
   * client re-sort.
   */
  assignments: CourseAssignment[];
}

/**
 * The status pill palette (D112B-4): each status pairs **text with color**
 * (DoD 6 — the label is always present; color reinforces, never encodes
 * alone).  The 500-level hue on a 100-level background keeps the pill
 * legible (WCAG 2.2 AA).
 */
const STATUS_STYLES: Record<AssignmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-green-100 text-green-700',
  GRADED: 'bg-teal-100 text-teal-700',
};

/** The priority pill palette (D112B-4) — the same text-plus-color pairing. */
const PRIORITY_STYLES: Record<AssignmentPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

/** The status labels (title-cased — the raw enum values are API wire format). */
const STATUS_LABELS: Record<AssignmentStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  GRADED: 'Graded',
};

/** The priority labels (title-cased). */
const PRIORITY_LABELS: Record<AssignmentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

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

/** API-ordered assignment rows plus course-context quick creation and edit/delete controls (SP-114E). */
export function AssignmentsSection({
  assignments,
  courseId,
  onAssignmentChanged,
  onAssignmentFormOpen,
}: AssignmentsSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseAssignment | null>(null);
  const [deleting, setDeleting] = useState<CourseAssignment | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // Set when delete succeeds, cleared once the deleted row is actually gone.
  const [focusAfterDelete, setFocusAfterDelete] = useState<{
    deletedId: string;
    neighborId: string | null;
  } | null>(null);

  const focusControl = (selector: string) => {
    sectionRef.current?.querySelector<HTMLButtonElement>(selector)?.focus();
  };

  const handleDeleted = () => {
    if (!deleting) return;
    const index = assignments.findIndex((item) => item.id === deleting.id);
    const neighbor = assignments[index + 1] ?? assignments[index - 1] ?? null;
    setFocusAfterDelete({ deletedId: deleting.id, neighborId: neighbor?.id ?? null });
    setDeleting(null);
    onAssignmentChanged('deleted');
    // Leave the dialog before it unmounts. A neighboring Edit control is
    // already mounted; the last-row case uses the stable Add control until
    // the empty-state button exists.
    if (neighbor) focusControl(`[data-assignment-focus="edit:${CSS.escape(neighbor.id)}"]`);
    else focusControl('[data-assignment-focus="add"]');
  };

  useLayoutEffect(() => {
    if (!focusAfterDelete) return;
    if (assignments.some((item) => item.id === focusAfterDelete.deletedId)) return;
    if (assignments.length === 0) {
      const empty = sectionRef.current?.querySelector<HTMLButtonElement>(
        '[data-assignment-focus="empty-add"]'
      );
      (
        empty ??
        sectionRef.current?.querySelector<HTMLButtonElement>('[data-assignment-focus="add"]')
      )?.focus();
    } else if (
      focusAfterDelete.neighborId &&
      assignments.some((item) => item.id === focusAfterDelete.neighborId)
    ) {
      focusControl(`[data-assignment-focus="edit:${CSS.escape(focusAfterDelete.neighborId)}"]`);
    } else if (assignments[0]) {
      focusControl(`[data-assignment-focus="edit:${CSS.escape(assignments[0].id)}"]`);
    }
    setFocusAfterDelete(null);
  }, [assignments, focusAfterDelete]);

  // The student's browser time zone (D112B-16) — resolved once per render.
  const timeZone = getBrowserTimeZone();
  const openForm = () => {
    onAssignmentFormOpen?.();
    setFormOpen(true);
  };
  const openEdit = (assignment: CourseAssignment) => {
    onAssignmentFormOpen?.();
    setEditing(assignment);
  };
  const openDelete = (assignment: CourseAssignment) => {
    // Same re-arm as Add/Edit: opening Delete clears the live region so a
    // later identical "Assignment deleted." is a new announcement (IR-114-02).
    onAssignmentFormOpen?.();
    setDeleting(assignment);
  };

  return (
    <section ref={sectionRef} className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-secondary-900">Assignments</h2>
        <Button size="sm" variant="primary" data-assignment-focus="add" onClick={openForm}>
          Add assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-secondary-700">No assignments yet.</p>
          <Button className="mt-4" data-assignment-focus="empty-add" onClick={openForm}>
            Add your first assignment
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-secondary-100">
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-secondary-900">{assignment.title}</p>
                <p
                  className={clsx(
                    'mt-1 text-sm',
                    assignment.dueDate === null ? 'text-secondary-500' : 'text-secondary-600'
                  )}
                >
                  {assignment.dueDate === null
                    ? 'No due date'
                    : `Due ${formatDate(new Date(assignment.dueDate), timeZone)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_STYLES[assignment.status]}>
                  {STATUS_LABELS[assignment.status]}
                </Badge>
                <Badge className={PRIORITY_STYLES[assignment.priority]}>
                  {PRIORITY_LABELS[assignment.priority]}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  data-assignment-focus={`edit:${assignment.id}`}
                  aria-label={`Edit ${assignment.title}`}
                  onClick={() => openEdit(assignment)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${assignment.title}`}
                  onClick={() => openDelete(assignment)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && (
        <AssignmentForm
          courseId={courseId}
          onClose={() => setFormOpen(false)}
          onSuccess={() => {
            setFormOpen(false);
            onAssignmentChanged('added');
          }}
        />
      )}
      {editing && (
        <AssignmentForm
          courseId={courseId}
          assignment={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            onAssignmentChanged('updated');
          }}
        />
      )}
      {deleting && (
        <DeleteAssignmentDialog
          assignment={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}
