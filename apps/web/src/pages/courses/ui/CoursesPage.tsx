import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Input } from '@/shared/ui/Input';
import { Search, X } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errors';
import { listCourses, type CourseWithSemester } from '@/entities/course/api/courseApi';
import { listSemesters, type SemesterWithCount } from '@/entities/semester/api/semesterApi';
import { CourseList } from '@/features/courses/ui/CourseList';
import { CourseForm } from '@/features/courses/ui/CourseForm';
import { ArchiveCourseDialog } from '@/features/courses/ui/ArchiveCourseDialog';

type FormMode = 'closed' | 'create' | 'edit';

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithSemester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<SemesterWithCount[]>([]);
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingCourse, setEditingCourse] = useState<CourseWithSemester | null>(null);
  const [archivingCourse, setArchivingCourse] = useState<CourseWithSemester | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      setCourses(await listCourses({ includeArchived: true }));
    } catch (err: unknown) {
      setListError(getErrorMessage(err) || 'We could not load your courses. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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

  const clearFilters = () => {
    setSearchInput('');
    setSemesterFilter('');
  };

  const filtersActive = Boolean(searchInput.trim()) || Boolean(semesterFilter);

  return (
    <section
      aria-labelledby="courses-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="courses-heading" className="text-3xl font-bold text-secondary-900">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Manage your courses, semesters, and class meetings.
          </p>
        </div>
        <Button className="max-sm:min-h-[44px]" onClick={openCreate}>
          Add Course
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:min-w-[280px] sm:flex-1">
          <Input
            aria-label="Search courses"
            placeholder="Search courses..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearchInput(searchInput.trim());
            }}
            leftIcon={<Search size={16} aria-hidden />}
            className="h-[42px] pr-10 max-sm:min-h-[44px]"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 focus:outline-none"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>

        <div className="w-full sm:w-[180px] sm:shrink-0">
          <Select
            aria-label="Semester"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="h-[42px] w-full pr-8 max-sm:min-h-[44px]"
          >
            <option value="">All semesters</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Always present so status changes are announced. */}
      <div role="status" className="mb-4 min-h-5 text-sm text-secondary-600">
        {statusMessage}
      </div>

      <div className="card p-4 sm:p-6">
        <CourseList
          courses={courses}
          isLoading={isLoading}
          error={listError}
          onRetry={() => void load()}
          onCreate={openCreate}
          onEdit={openEdit}
          onArchiveRestore={setArchivingCourse}
          searchQuery={searchInput}
          semesterFilter={semesterFilter}
          filtersActive={filtersActive}
          onClearFilters={clearFilters}
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
    </section>
  );
}
