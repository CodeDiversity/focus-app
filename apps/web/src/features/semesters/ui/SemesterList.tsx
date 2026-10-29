import { Button } from '@/shared/ui/Button';
import type { SemesterWithCount } from '@/entities/semester/api/semesterApi';

export interface SemesterListProps {
  /** Rendered in the API order (startDate desc, then name asc) — no client re-sort. */
  semesters: SemesterWithCount[];
  /** The id of the semester whose activation PATCH is in flight (per-row pending state). */
  activatingId: string | null;
  onEdit: (semester: SemesterWithCount) => void;
  onDelete: (semester: SemesterWithCount) => void;
  /** `isActive: true` = "Set as active" (D110-1); `false` = "Deactivate". */
  onActivate: (semester: SemesterWithCount, isActive: boolean) => void;
}

/**
 * Formats a `yyyy-MM-dd` calendar date as a readable date in the browser's
 * time zone. The date is built from its components (local midnight) and
 * formatted in the browser zone, so the calendar date never shifts across
 * time zones (D107-7: dates are calendar dates, not instants — no instant
 * round-trip). Malformed input falls back to the raw string.
 */
export function formatCalendarDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

/**
 * The student's semesters (SP-110B): one row per semester with the name, a
 * readable date range, the "Active" badge iff `isActive` (D110-1 — at most
 * one badge), the course count (D110-3), and the row actions (edit, delete,
 * activate/deactivate).
 *
 * Every action button carries a per-semester `aria-label` so the controls
 * stay unambiguous (and keyboard/AT-operable) across many rows.
 */
export function SemesterList({
  semesters,
  activatingId,
  onEdit,
  onDelete,
  onActivate,
}: SemesterListProps) {
  return (
    <ul className="divide-y divide-border">
      {semesters.map((semester) => {
        const pending = activatingId === semester.id;
        const courseCountLabel =
          semester.courseCount === 1 ? '1 course' : `${semester.courseCount} courses`;
        return (
          <li
            key={semester.id}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text">{semester.name}</span>
                {semester.isActive && (
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-hover">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {formatCalendarDate(semester.startDate)} – {formatCalendarDate(semester.endDate)}
                {' · '}
                {courseCountLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {semester.isActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Deactivate ${semester.name}`}
                  isLoading={pending}
                  onClick={() => onActivate(semester, false)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Set ${semester.name} as active`}
                  isLoading={pending}
                  onClick={() => onActivate(semester, true)}
                >
                  Set as active
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                aria-label={`Edit ${semester.name}`}
                disabled={pending}
                onClick={() => onEdit(semester)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${semester.name}`}
                disabled={pending}
                onClick={() => onDelete(semester)}
              >
                Delete
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
