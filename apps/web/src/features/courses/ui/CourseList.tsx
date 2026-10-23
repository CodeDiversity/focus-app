import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import type { CourseWithSemester } from '@/entities/course/api/courseApi';

export interface CourseListProps {
  /**
   * The student's courses in the API order (`name` asc, then `code` asc) —
   * including archived rows (the page fetches with `includeArchived: true`,
   * D111B-1). Rendered as-is — no client re-sort.
   */
  courses: CourseWithSemester[];
  /** The list request is in flight (renders the loading state). */
  isLoading: boolean;
  /** An actionable list-fetch failure message (renders with a retry). */
  error: string | null;
  /** Re-reads the list (the error state's "Try again"). */
  onRetry: () => void;
  /** Opens the create form (the empty state's call-to-action). */
  onCreate: () => void;
  /** Opens the pre-filled edit form for the row. */
  onEdit: (course: CourseWithSemester) => void;
  /** Opens the archive/restore confirmation dialog for the row. */
  onArchiveRestore: (course: CourseWithSemester) => void;
}

/**
 * The student's courses (SP-111B): one row per course with the color chip,
 * the `code` (monospace), the `name`, the semester name (or a muted
 * "No semester" when unaffiliated — orphaned by semester deletion, D110-2),
 * the credits (when present), and the row actions (edit, archive/restore).
 *
 * Row navigation (SP-112B, D112B-6): the course **name** is a `Link` to
 * `/courses/:id` (accessible name = the course name), the non-interactive
 * row area navigates on mouse click, and the action buttons
 * `stopPropagation` so they never navigate. The row itself is not
 * focusable and carries no role — keyboard/AT users use the name link.
 *
 * Archive (D111-3/D111B-1): active courses show by default; the
 * "Show archived" switch (a real `role="switch"` button with an accessible
 * name — DoD 6) includes the `isActive = false` rows, which carry an
 * **Archived** text badge (text, not color-only — DoD 6). The switch filters
 * the already-fetched list client-side (the page fetched with
 * `includeArchived: true`), so toggling is instant.
 *
 * Every action button carries a per-course `aria-label` so the controls stay
 * unambiguous (and keyboard/AT-operable) across many rows.
 */
export function CourseList({
  courses,
  isLoading,
  error,
  onRetry,
  onCreate,
  onEdit,
  onArchiveRestore,
}: CourseListProps) {
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <svg
          className="animate-spin h-8 w-8 text-primary-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-secondary-600">Loading your courses…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center" role="alert">
        <p className="text-sm text-secondary-700">{error}</p>
        <Button className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  const archivedCount = courses.filter((course) => !course.isActive).length;
  const visible = showArchived ? courses : courses.filter((course) => course.isActive);

  return (
    <div>
      {courses.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            role="switch"
            aria-checked={showArchived}
            onClick={() => setShowArchived((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <span
              aria-hidden="true"
              className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
                showArchived ? 'bg-primary-600' : 'bg-secondary-300'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  showArchived ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
            <span className="text-sm font-medium text-secondary-700">
              Show archived{archivedCount > 0 ? ` (${archivedCount})` : ''}
            </span>
          </button>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-secondary-700">No courses yet</p>
          <Button className="mt-4" onClick={onCreate}>
            Add your first course
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-secondary-700">No active courses</p>
          <p className="mt-1 text-sm text-secondary-500">
            {archivedCount === 1
              ? 'You have 1 archived course — use "Show archived" to see it.'
              : `You have ${archivedCount} archived courses — use "Show archived" to see them.`}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-secondary-100">
          {visible.map((course) => (
            // D112B-6: the non-interactive row area navigates on mouse click —
            // a convenience that duplicates the accessible name link below
            // (WCAG 2.1.1: a feature already operable via a keyboard-accessible
            // element need not itself be keyboard-operable). The row is not
            // focusable and carries no role, so the two jsx-a11y heuristics that
            // flag a non-interactive element with a click handler do not model
            // that exception and are disabled for this element only.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
            <li
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between cursor-pointer"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: course.color }}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-secondary-700">{course.code}</span>
                    {/* D112B-6: the name links to the course detail page;
                        `stopPropagation` keeps the click from also firing
                        the row's own navigation (one history entry). */}
                    <Link
                      to={`/courses/${course.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium text-secondary-900 hover:underline"
                    >
                      {course.name}
                    </Link>
                    {!course.isActive && (
                      <span className="inline-flex items-center rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-600">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-secondary-600">
                    {course.semester ? (
                      course.semester.name
                    ) : (
                      <span className="text-secondary-400">No semester</span>
                    )}
                    {course.credits !== null && (
                      <>
                        {' · '}
                        {course.credits} credits
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* D112B-6: the action buttons never navigate the row. */}
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Edit ${course.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(course);
                  }}
                >
                  Edit
                </Button>
                {course.isActive ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Archive ${course.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onArchiveRestore(course);
                    }}
                  >
                    Archive
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Restore ${course.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onArchiveRestore(course);
                    }}
                  >
                    Restore
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
