import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { BookOpen, Search } from 'lucide-react';
import type { CourseWithSemester } from '@/entities/course/api/courseApi';
import { CourseCard } from './CourseCard';

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
  /** Client-side search query (name or code). */
  searchQuery?: string;
  /** Client-side semester filter (semester id). */
  semesterFilter?: string;
  /** Whether any page-level filter is currently active. */
  filtersActive?: boolean;
  /** Resets all page-level filters. */
  onClearFilters?: () => void;
}

export function CourseList({
  courses,
  isLoading,
  error,
  onRetry,
  onCreate,
  onEdit,
  onArchiveRestore,
  searchQuery = '',
  semesterFilter = '',
  filtersActive = false,
  onClearFilters,
}: CourseListProps) {
  const [showArchived, setShowArchived] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <svg
          className="animate-spin h-8 w-8 text-accent"
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
        <p className="text-sm text-text-muted">Loading your courses…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center" role="alert">
        <p className="text-sm text-text">{error}</p>
        <Button className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredByFilters = courses.filter((course) => {
    if (semesterFilter && course.semesterId !== semesterFilter) return false;
    if (q && !course.name.toLowerCase().includes(q) && !course.code.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  const archivedCount = courses.filter((course) => !course.isActive).length;
  const visible = showArchived
    ? filteredByFilters
    : filteredByFilters.filter((course) => course.isActive);

  const anyFilterActive = filtersActive || Boolean(q) || Boolean(semesterFilter);

  if (courses.length === 0) {
    return (
      <div className="py-8 text-center">
        <BookOpen size={40} aria-hidden className="mx-auto mb-3 text-text-muted" />
        <p className="text-sm text-text">No courses yet.</p>
        <p className="mt-1 text-sm text-text-muted">
          Add your first course to start organizing your semester.
        </p>
        <Button className="mt-4" onClick={onCreate}>
          Add your first course
        </Button>
      </div>
    );
  }

  if (visible.length === 0 && anyFilterActive) {
    return (
      <div className="py-8 text-center">
        <Search size={36} aria-hidden className="mx-auto mb-3 text-text-muted" />
        <p className="text-sm text-text">No courses match these filters.</p>
        <p className="mt-1 text-sm text-text-muted">
          Try adjusting your search or semester filter.
        </p>
        <Button className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text">No active courses</p>
        <p className="mt-1 text-sm text-text-muted">
          {archivedCount === 1
            ? 'You have 1 archived course — use "Show archived" to see it.'
            : `You have ${archivedCount} archived courses — use "Show archived" to see them.`}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          role="switch"
          aria-checked={showArchived}
          onClick={() => setShowArchived((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
              showArchived ? 'bg-accent' : 'bg-surface-muted'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform ${
                showArchived ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </span>
          <span className="text-sm font-medium text-text">
            Show archived{archivedCount > 0 ? ` (${archivedCount})` : ''}
          </span>
        </button>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {visible.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} onEdit={onEdit} onArchiveRestore={onArchiveRestore} />
          </li>
        ))}
      </ul>

      {anyFilterActive && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-text-muted">Change the search above, or reset every filter.</p>
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
