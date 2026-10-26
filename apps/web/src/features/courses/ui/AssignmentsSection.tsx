import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { AssignmentForm } from './AssignmentForm';
import { DeleteAssignmentDialog } from './DeleteAssignmentDialog';
import { SubtaskChecklist, type SubtaskChangeAction } from './SubtaskChecklist';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';
import { updateAssignment } from '@/entities/assignment/api/assignmentApi';
import { isUnfinishedAssignment, isOverdueAssignment } from '@/entities/assignment/model/status';
import type {
  AssignmentPriority,
  AssignmentStatus,
  AssignmentType,
  CourseAssignment,
  Subtask,
} from '@/shared/types/academic';

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

/** Collapsed disclosure copy (SP-120J). `done` counts `COMPLETED` only. */
export function subtaskSummary(subtasks: Subtask[]): string {
  const count = subtasks.length;
  if (count === 0) return 'No subtasks';
  const noun = count === 1 ? '1 subtask' : `${count} subtasks`;
  const done = subtasks.filter((item) => item.status === 'COMPLETED').length;
  if (done === 0) return noun;
  return `${noun}, ${done} complete`;
}

/**
 * The status pill palette (D112B-4): each status pairs **text with color**
 * (DoD 6 — the label is always present; color reinforces, never encodes
 * alone).  The 500-level hue on a 100-level background keeps the pill
 * legible (WCAG 2.2 AA).
 */
export const STATUS_STYLES: Record<AssignmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-green-100 text-green-700',
  GRADED: 'bg-teal-100 text-teal-700',
};

/** The priority pill palette (D112B-4) — the same text-plus-color pairing. */
export const PRIORITY_STYLES: Record<AssignmentPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

/** The status labels (title-cased — the raw enum values are API wire format). */
export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  GRADED: 'Graded',
};

/** The priority labels (title-cased). */
export const PRIORITY_LABELS: Record<AssignmentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/**
 * The type label palette (title-cased labels below). The five values carry no
 * severity semantics, so every type shares one neutral pill palette that the
 * section already uses (`PENDING`/`LOW`): text plus color — the label is
 * always rendered (D112B-4). A null type renders no badge: absence of a
 * category is not a category (SP-115, refined 2026-10-25).
 */
export const TYPE_STYLE = 'bg-slate-100 text-slate-700';

/** Overdue pill palette (SP-123A, D123A-3): red text-plus-color pill. */
export const OVERDUE_STYLE = 'bg-red-100 text-red-700';
export const OVERDUE_LABEL = 'Overdue';

export const TYPE_LABELS: Record<AssignmentType, string> = {
  HOMEWORK: 'Homework',
  PAPER: 'Paper',
  PROJECT: 'Project',
  QUIZ: 'Quiz',
  EXAM: 'Exam',
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
  onAssignmentStatusChanged,
  onAssignmentFormOpen,
  onSubtaskChanged,
  onSubtaskRefresh,
  onSubtaskPending,
}: AssignmentsSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseAssignment | null>(null);
  const [deleting, setDeleting] = useState<CourseAssignment | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [statusBusyIds, setStatusBusyIds] = useState<Set<string>>(() => new Set());
  const [pendingStatus, setPendingStatus] = useState<Record<string, AssignmentStatus>>({});
  const sectionRef = useRef<HTMLElement>(null);
  // Set when delete succeeds, cleared once the deleted row is actually gone.
  const [focusAfterDelete, setFocusAfterDelete] = useState<{
    deletedId: string;
    neighborId: string | null;
  } | null>(null);
  // Set when a status change finishes an assignment; cleared once the row
  // leaves the unfinished view (D121-4/D121-7).
  const [focusAfterStatus, setFocusAfterStatus] = useState<{
    finishedId: string;
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

  const handleStatusChange = async (assignment: CourseAssignment, newStatus: AssignmentStatus) => {
    if (statusBusyIds.has(assignment.id)) return;
    if (newStatus === assignment.status && pendingStatus[assignment.id] === undefined) {
      // no-op when choosing the already-stored value
      return;
    }
    // Block a duplicate submit while a request is in flight.
    setStatusBusyIds((current) => {
      const next = new Set(current);
      next.add(assignment.id);
      return next;
    });
    setPendingStatus((current) => ({ ...current, [assignment.id]: newStatus }));
    onAssignmentFormOpen?.();

    // Compute the focus neighbor for the case where this row finishes and
    // leaves the unfinished view (D121-4/D121-7).
    const idx = assignments.findIndex((item) => item.id === assignment.id);
    let neighbor: CourseAssignment | null = null;
    for (let i = idx + 1; i < assignments.length; i++) {
      const candidate = assignments[i];
      if (candidate && candidate.id !== assignment.id && isUnfinishedAssignment(candidate)) {
        neighbor = candidate;
        break;
      }
    }
    if (!neighbor) {
      for (let i = idx - 1; i >= 0; i--) {
        const candidate = assignments[i];
        if (candidate && candidate.id !== assignment.id && isUnfinishedAssignment(candidate)) {
          neighbor = candidate;
          break;
        }
      }
    }

    const finishes = !isUnfinishedAssignment(newStatus);
    try {
      await updateAssignment(assignment.id, { status: newStatus });
      if (finishes) {
        setFocusAfterStatus({ finishedId: assignment.id, neighborId: neighbor?.id ?? null });
      }
      onAssignmentStatusChanged?.(newStatus);
    } catch {
      toast.error('We could not update the status. Try again.');
    } finally {
      setStatusBusyIds((current) => {
        const next = new Set(current);
        next.delete(assignment.id);
        return next;
      });
      setPendingStatus((current) => {
        const next = { ...current };
        delete next[assignment.id];
        return next;
      });
    }
  };

  useEffect(() => {
    setExpandedIds((current) => {
      let dropped = false;
      const next = new Set<string>();
      for (const id of current) {
        if (assignments.some((item) => item.id === id)) next.add(id);
        else dropped = true;
      }
      return dropped ? next : current;
    });
  }, [assignments]);

  const toggleExpanded = (assignmentId: string) => {
    if (busyIds.has(assignmentId)) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(assignmentId)) next.delete(assignmentId);
      else next.add(assignmentId);
      return next;
    });
  };

  const setAssignmentBusy = (assignmentId: string, busy: boolean) => {
    setBusyIds((current) => {
      if (busy === current.has(assignmentId)) return current;
      const next = new Set(current);
      if (busy) next.add(assignmentId);
      else next.delete(assignmentId);
      return next;
    });
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

  useLayoutEffect(() => {
    if (!focusAfterStatus) return;
    const stillUnfinished = assignments.some(
      (item) => item.id === focusAfterStatus.finishedId && isUnfinishedAssignment(item)
    );
    if (stillUnfinished) return;
    if (focusAfterStatus.neighborId) {
      const sel = sectionRef.current?.querySelector<HTMLSelectElement>(
        `[data-assignment-focus="status:${CSS.escape(focusAfterStatus.neighborId)}"]`
      );
      sel?.focus();
    } else {
      focusControl('[data-assignment-focus="add"]');
    }
    setFocusAfterStatus(null);
  }, [assignments, focusAfterStatus]);

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
      ) : assignments.filter(isUnfinishedAssignment).length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-secondary-500">All assignments are complete.</p>
        </div>
      ) : (
        <ul className="divide-y divide-secondary-100">
          {assignments.filter(isUnfinishedAssignment).map((assignment) => (
            <li key={assignment.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-secondary-900">{assignment.title}</p>
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    id={`subtasks-toggle-${assignment.id}`}
                    aria-expanded={expandedIds.has(assignment.id)}
                    aria-controls={`subtasks-${assignment.id}`}
                    aria-label={`Subtasks for ${assignment.title}: ${subtaskSummary(assignment.subtasks)}`}
                    disabled={busyIds.has(assignment.id)}
                    leftIcon={
                      <ChevronDown
                        aria-hidden
                        size={16}
                        className={clsx(
                          'transition-transform',
                          expandedIds.has(assignment.id) && 'rotate-180'
                        )}
                      />
                    }
                    onClick={() => toggleExpanded(assignment.id)}
                  >
                    {subtaskSummary(assignment.subtasks)}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    aria-label={`Status for ${assignment.title}`}
                    data-assignment-focus={`status:${assignment.id}`}
                    disabled={statusBusyIds.has(assignment.id)}
                    value={pendingStatus[assignment.id] ?? assignment.status}
                    onChange={(event) =>
                      handleStatusChange(assignment, event.target.value as AssignmentStatus)
                    }
                    className="w-auto"
                  >
                    {(
                      [
                        'PENDING',
                        'IN_PROGRESS',
                        'COMPLETED',
                        'SUBMITTED',
                        'GRADED',
                      ] as AssignmentStatus[]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {STATUS_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                  <Badge className={PRIORITY_STYLES[assignment.priority]}>
                    {PRIORITY_LABELS[assignment.priority]}
                  </Badge>
                  {assignment.type && (
                    <Badge className={TYPE_STYLE}>{TYPE_LABELS[assignment.type]}</Badge>
                  )}
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
              </div>
              {expandedIds.has(assignment.id) && (
                <SubtaskChecklist
                  assignmentId={assignment.id}
                  assignmentTitle={assignment.title}
                  subtasks={assignment.subtasks}
                  onChanged={onSubtaskChanged}
                  onRefresh={onSubtaskRefresh}
                  onBusyChange={(busy) => setAssignmentBusy(assignment.id, busy)}
                  onPendingAnnouncement={onSubtaskPending}
                />
              )}
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
