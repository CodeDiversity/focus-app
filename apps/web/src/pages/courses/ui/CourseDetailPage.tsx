import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage, extractApiError } from '@/shared/lib/errors';
import { getCourse, type CourseDetail } from '@/entities/course/api/courseApi';
import { listSemesters, type SemesterWithCount } from '@/entities/semester/api/semesterApi';
import { MeetingsSection } from '@/features/courses/ui/MeetingsSection';
import type { AssignmentStatus } from '@/shared/types/academic';
import {
  AssignmentsSection,
  type SubtaskChangeAction,
} from '@/features/assignments/ui/AssignmentsSection';
import { CourseForm } from '@/features/courses/ui/CourseForm';
import { ArchiveCourseDialog } from '@/features/courses/ui/ArchiveCourseDialog';
import { StartFocusSessionDialog } from '@/features/focus-session/ui/StartFocusSessionDialog';
import type { StartFocusSessionAssignment } from '@/features/focus-session/ui/StartFocusSessionDialog';

/** A detail-fetch failure. `isNotFound` is the uniform 404 (AC 1). */
interface DetailError {
  message: string;
  isNotFound: boolean;
}

/**
 * The fixed not-found copy (AC 1). Used for both the uniform 404 (a missing
 * or another student's course) and the unreachable absent-`id` case, so the
 * string lives in one place.
 */
const NOT_FOUND_MESSAGE = "We couldn't find this course. It may no longer exist.";

/**
 * `/courses/:id` (SP-112B, D112-5): the course detail screen — the course's
 * information (header card, D112B-11), its **recurring weekly meetings**
 * (`MeetingsSection` — add/edit/delete, AC-E02-04) and its **related
 * assignments** (`AssignmentsSection` — quick creation in SP-113B).
 *
 * **One fetch drives everything** (D112B-13): the single `getCourse` call
 * returns the 14-key detail (header + meetings + assignments), so there is no
 * per-section loading — the page shows one loading state, then both sections.
 * After any mutation (course edit, archive/restore, meeting add/edit/delete)
 * the page re-fetches `getCourse` in the background (D112B-10) and announces
 * through the always-present `role="status"` live region (DoD 6).
 *
 * States (AC 1/5, DoD 5): a 404 (missing or another student's course — the
 * API's uniform `Resource not found`) renders the fixed error card with a
 * **Back to courses** action and no retry (a 404 does not self-heal); any
 * other fetch failure renders an alert with **Try again**; a failed
 * background re-fetch toasts the sanitized message and keeps the last known
 * detail (no full-page error).
 *
 * Responsive (AC 6, D112B-1): the two section cards sit side-by-side on `lg`
 * (`grid grid-cols-1 lg:grid-cols-2`) and stack below; the header row stacks
 * on mobile.
 */
export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<DetailError | null>(null);
  const [formMode, setFormMode] = useState<'closed' | 'edit'>('closed');
  const [archivingCourse, setArchivingCourse] = useState<CourseDetail | null>(null);
  const [semesters, setSemesters] = useState<SemesterWithCount[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [startingAssignment, setStartingAssignment] = useState<StartFocusSessionAssignment | null>(
    null
  );

  const load = useCallback(
    async (options: { background?: boolean } = {}) => {
      // A background re-fetch (after a mutation) never re-enters the loading
      // state — the last known detail stays on screen.
      if (!options.background) {
        setIsLoading(true);
        setError(null);
      }
      // The route is /courses/:id, so `id` is always present; guard anyway so
      // we never request /courses/undefined (type-safety). An absent id renders
      // the same uniform not-found as a missing course (foreground) or keeps the
      // last known detail (background) — both unreachable via the route.
      if (!id) {
        if (!options.background) {
          setCourse(null);
          setError({ message: NOT_FOUND_MESSAGE, isNotFound: true });
          setIsLoading(false);
        }
        return;
      }
      try {
        setCourse(await getCourse(id));
      } catch (err: unknown) {
        const apiError = extractApiError(err);
        if (apiError && apiError.statusCode === 404) {
          // Uniform 404: the course is missing OR owned by another student —
          // the API never says which (no existence oracle). The copy is fixed
          // (AC 1) and the recovery is leaving the page (no retry: a 404 does
          // not self-heal).
          setCourse(null);
          setError({ message: NOT_FOUND_MESSAGE, isNotFound: true });
        } else if (options.background) {
          // A failed re-fetch after a mutation toasts and keeps the last
          // known detail (AC 5 — no full-page error).
          toast.error(getErrorMessage(err) || 'We could not refresh the course. Try again.');
        } else {
          setCourse(null);
          setError({
            message: getErrorMessage(err) || 'We could not load this course. Try again.',
            isNotFound: false,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    void load();
    // The edit form's semester picker options (the student's own semesters) —
    // non-fatal: on failure the picker simply has no options (the CoursesPage
    // precedent).
    void listSemesters()
      .then(setSemesters)
      .catch(() => undefined);
  }, [load]);

  const openEdit = () => {
    if (course) {
      setFormMode('edit');
    }
  };

  const closeForm = () => {
    setFormMode('closed');
  };

  const handleEditSuccess = (name: string) => {
    closeForm();
    setStatusMessage(`${name} updated.`);
    void load({ background: true });
  };

  const handleArchiveRestoreDone = () => {
    const name = archivingCourse?.name;
    const wasActive = archivingCourse?.isActive;
    setArchivingCourse(null);
    if (name) {
      setStatusMessage(
        wasActive ? `${name} archived. You can restore it at any time.` : `${name} restored.`
      );
    }
    void load({ background: true });
  };

  const handleMeetingChanged = (action: 'added' | 'updated' | 'deleted') => {
    setStatusMessage(
      action === 'added'
        ? 'Meeting added.'
        : action === 'updated'
          ? 'Meeting updated.'
          : 'Meeting deleted.'
    );
    void load({ background: true });
  };

  const handleAssignmentChanged = (action: 'added' | 'updated' | 'deleted') => {
    setStatusMessage(
      action === 'added'
        ? 'Assignment added.'
        : action === 'updated'
          ? 'Assignment updated.'
          : 'Assignment deleted.'
    );
    void load({ background: true });
  };

  const handleAssignmentStatusChanged = (status: AssignmentStatus) => {
    setStatusMessage(
      status === 'PENDING'
        ? 'Assignment set to pending.'
        : status === 'IN_PROGRESS'
          ? 'Assignment marked as in progress.'
          : status === 'COMPLETED'
            ? 'Assignment marked as completed.'
            : status === 'SUBMITTED'
              ? 'Assignment marked as submitted.'
              : 'Assignment marked as graded.'
    );
    void load({ background: true });
  };

  const handleSubtaskChanged = (action: SubtaskChangeAction) => {
    setStatusMessage(
      action === 'added'
        ? 'Subtask added.'
        : action === 'completed'
          ? 'Subtask completed.'
          : action === 'reopened'
            ? 'Subtask marked incomplete.'
            : action === 'moved'
              ? 'Subtask moved.'
              : 'Subtask deleted.'
    );
    void load({ background: true });
  };

  // Description collapse (D112B-2): clamped to 3 lines; the Show more/less
  // toggle appears only when the text actually overflows the clamp (measured
  // `scrollHeight > clientHeight` — short descriptions never show a toggle).
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useLayoutEffect(() => {
    const el = descriptionRef.current;
    setDescriptionOverflows(el ? el.scrollHeight > el.clientHeight : false);
    setDescriptionExpanded(false);
  }, [course?.description]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Always present so status changes are announced (DoD 6). */}
      <div role="status" className="mb-4 min-h-5 text-sm text-text-muted">
        {statusMessage}
      </div>

      {isLoading ? (
        // One stable `h1` (AC 6): the generic "Course" while loading; it
        // becomes the course name on success (D112B-11).
        <div className="flex flex-col items-center gap-3 py-12">
          <h1 className="text-3xl font-bold text-text">Course</h1>
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
          <p className="text-sm text-text-muted">Loading your course…</p>
        </div>
      ) : error ? (
        <>
          <h1 className="mb-4 text-3xl font-bold text-text">Course</h1>
          <div className="card p-6" role="alert">
            <p className="text-sm text-text">{error.message}</p>
            {error.isNotFound ? (
              <Link
                to="/courses"
                className="mt-4 inline-block font-medium text-accent hover:underline"
              >
                Back to courses
              </Link>
            ) : (
              <Button className="mt-4" onClick={() => void load()}>
                Try again
              </Button>
            )}
          </div>
        </>
      ) : id && course ? (
        <>
          {/* Archived banner (D112B-5): a full-width strip above the header
              card (text-only — no duplicate badge inside the header). */}
          {!course.isActive && (
            <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              This course is archived — it is hidden from your course list. You can restore it at
              any time.
            </div>
          )}

          {/* Header card (D112B-11): color chip + h1 + code, the meta line,
              the description, and the course actions. */}
          <div className="card p-6">
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <h1 className="text-3xl font-bold text-text">{course.name}</h1>
                  <code className="font-mono text-sm text-text-muted">{course.code}</code>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  <span className={course.instructor ? undefined : 'text-text-muted'}>
                    {course.instructor ?? '—'}
                  </span>
                  {' · '}
                  {course.semester ? (
                    course.semester.name
                  ) : (
                    <span className="text-text-muted">No semester</span>
                  )}
                  {course.credits !== null && (
                    <>
                      {' · '}
                      {course.credits} credits
                    </>
                  )}
                </p>
                {course.description && (
                  <p
                    ref={descriptionRef}
                    className={clsx(
                      'mt-3 text-sm text-text-muted',
                      !descriptionExpanded && 'line-clamp-3'
                    )}
                  >
                    {course.description}
                  </p>
                )}
                {course.description && descriptionOverflows && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                    className="mt-1 text-sm font-medium text-accent hover:underline"
                  >
                    {descriptionExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" aria-label={`Edit ${course.name}`} onClick={openEdit}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  aria-label={course.isActive ? `Archive ${course.name}` : `Restore ${course.name}`}
                  onClick={() => setArchivingCourse(course)}
                >
                  {course.isActive ? 'Archive' : 'Restore'}
                </Button>
              </div>
            </div>
          </div>

          {/* The two sections (D112B-1): side-by-side on `lg`, stacked below. */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MeetingsSection
              courseId={id}
              meetings={course.meetings}
              onMeetingChanged={handleMeetingChanged}
            />
            <AssignmentsSection
              courseId={id}
              assignments={course.assignments}
              onAssignmentChanged={handleAssignmentChanged}
              onAssignmentStatusChanged={handleAssignmentStatusChanged}
              onStartFocus={(a) =>
                setStartingAssignment({
                  id: a.id,
                  title: a.title,
                  dueDate: a.dueDate,
                  estimatedHours: a.estimatedHours,
                })
              }
              onSubtaskChanged={handleSubtaskChanged}
              onSubtaskRefresh={() => void load({ background: true })}
              // Clear before the request so a repeated subtask sentence announces.
              onSubtaskPending={() => setStatusMessage('')}
              // Clear on Add, Edit, or Delete open — a separate interaction from
              // submit — so repeated successes update the live region even with
              // identical copy (including consecutive "Assignment deleted.").
              onAssignmentFormOpen={() => setStatusMessage('')}
            />
          </div>
        </>
      ) : null}

      {formMode === 'edit' && course && (
        <CourseForm
          mode="edit"
          course={course}
          semesters={semesters}
          onSuccess={handleEditSuccess}
          onClose={closeForm}
        />
      )}

      {archivingCourse && (
        <ArchiveCourseDialog
          course={archivingCourse}
          onDone={handleArchiveRestoreDone}
          onCancel={() => setArchivingCourse(null)}
        />
      )}

      <StartFocusSessionDialog
        assignment={startingAssignment}
        open={!!startingAssignment}
        onClose={() => setStartingAssignment(null)}
      />
    </div>
  );
}
