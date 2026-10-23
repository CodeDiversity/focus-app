import { clsx } from 'clsx';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';
import type {
  AssignmentPriority,
  AssignmentStatus,
  CourseAssignment,
} from '@/shared/types/academic';

export interface AssignmentsSectionProps {
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

/**
 * The course's related assignments (SP-112B, AC 4, D112-6): a **read-only**
 * list — title, a "Due Oct 12, 2026" line (medium date in the student's
 * browser time zone via the shared `datetime` helpers, D112B-16), a status
 * badge and a priority badge.  **No management controls** — EP03 owns
 * assignment management (D112-6); it will populate the same projection with
 * no EP02 rework (D112-3).  Empty state: "No assignments yet." (no CTA —
 * nothing in EP02 creates assignments, DoD 5).
 */
export function AssignmentsSection({ assignments }: AssignmentsSectionProps) {
  // The student's browser time zone (D112B-16) — resolved once per render.
  const timeZone = getBrowserTimeZone();

  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-secondary-900">Assignments</h2>

      {assignments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-secondary-700">No assignments yet.</p>
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
                <p className="mt-1 text-sm text-secondary-600">
                  Due {formatDate(new Date(assignment.dueDate), timeZone)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_STYLES[assignment.status]}>
                  {STATUS_LABELS[assignment.status]}
                </Badge>
                <Badge className={PRIORITY_STYLES[assignment.priority]}>
                  {PRIORITY_LABELS[assignment.priority]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
