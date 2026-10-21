import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import { listCourses, type CourseWithSemester } from '@/entities/course/api/courseApi';
import { listSemesters, type SemesterWithCount } from '@/entities/semester/api/semesterApi';
import { CourseList } from '@/features/courses/ui/CourseList';
import { CourseForm } from '@/features/courses/ui/CourseForm';
import { ArchiveCourseDialog } from '@/features/courses/ui/ArchiveCourseDialog';

type FormMode = 'closed' | 'create' | 'edit';

/**
 * `/courses` (SP-111B, D111-5): the student's course management surface —
 * list (color chip, code, name, semester, credits) with create/edit (dialog
 * form incl. the `instructor` field, D111-1), archive/restore with
 * confirmation, and a show-archived toggle.
 *
 * State is page-local (the SemestersPage precedent; no new RTK slice — the
 * entity API is the data home).  The list is the single source of truth and
 * is re-read after every successful mutation, so rows and badges always
 * re-derive from the API response.  **D111B-1:** the initial fetch uses
 * `includeArchived: true` and the "Show archived" switch (inside
 * `CourseList`) filters client-side — the toggle is instant, and archived
 * rows keep their data (AC-E02-05).
 *
 * The semester picker's options are the student's own semesters (a
 * principal-scoped `listSemesters` side fetch — non-fatal: on failure the
 * picker simply has no options).
 *
 * Feedback: successes announce through the always-present `role="status"`
 * live region; list failures render the actionable error state; form and
 * archive/restore failures toast the sanitized message inside their
 * respective dialog components (app convention).
 */
export function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithSemester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<SemesterWithCount[]>([]);
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingCourse, setEditingCourse] = useState<CourseWithSemester | null>(null);
  const [archivingCourse, setArchivingCourse] = useState<CourseWithSemester | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      // D111B-1: fetch once with the archived rows included; the switch
      // filters client-side.
      setCourses(await listCourses({ includeArchived: true }));
    } catch (err: unknown) {
      setListError(getErrorMessage(err) || 'We could not load your courses. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // The semester picker's options (the student's own semesters).  Non-fatal:
    // on failure the picker simply offers no options — the course list is
    // independent of it.
    void listSemesters()
      .then(setSemesters)
      .catch(() => undefined);
  }, [load]);

  const openCreate = () => {
    setEditingCourse(null);
    setFormMode('create');
  };

  const openEdit = (course: CourseWithSemester) => {
    setEditingCourse(course);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode('closed');
    setEditingCourse(null);
  };

  const handleCreateSuccess = (name: string) => {
    closeForm();
    setStatusMessage(`${name} created.`);
    void load();
  };

  const handleEditSuccess = (name: string) => {
    closeForm();
    setStatusMessage(`${name} updated.`);
    void load();
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
    void load();
  };

  const showList = !isLoading && !listError && formMode === 'closed';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Courses</h1>
        {showList && courses.length > 0 && <Button onClick={openCreate}>New course</Button>}
      </div>

      {/* Always present so status changes are announced (DoD 6). */}
      <div role="status" className="mb-4 min-h-5 text-sm text-secondary-600">
        {statusMessage}
      </div>

      <div className="card p-6">
        <CourseList
          courses={courses}
          isLoading={isLoading}
          error={listError}
          onRetry={() => void load()}
          onCreate={openCreate}
          onEdit={openEdit}
          onArchiveRestore={setArchivingCourse}
        />
      </div>

      {formMode === 'create' && (
        <CourseForm
          mode="create"
          semesters={semesters}
          onSuccess={handleCreateSuccess}
          onClose={closeForm}
        />
      )}
      {formMode === 'edit' && editingCourse && (
        <CourseForm
          mode="edit"
          course={editingCourse}
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
    </div>
  );
}
