import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { Loader2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Input } from '@/shared/ui/Input';
import { getErrorMessage, extractApiError } from '@/shared/lib/errors';
import {
  listAssignments,
  type ListAssignmentsParams,
} from '@/entities/assignment/api/assignmentApi';
import { listCourses, type CourseWithSemester } from '@/entities/course/api/courseApi';
import type {
  AssignmentListItem,
  AssignmentStatus,
  AssignmentPriority,
  AssignmentType,
} from '@/shared/types/academic';
import {
  STATUS_STYLES,
  STATUS_LABELS,
  PRIORITY_STYLES,
  PRIORITY_LABELS,
  TYPE_STYLE,
  TYPE_LABELS,
  OVERDUE_STYLE,
  OVERDUE_LABEL,
  subtaskSummary,
} from '@/features/courses/ui/AssignmentsSection';
import { isOverdueAssignment } from '@/entities/assignment/model/status';
import { formatDate, getBrowserTimeZone } from '@/shared/lib/datetime';

const STATUS_OPTIONS: AssignmentStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SUBMITTED',
  'GRADED',
];
const PRIORITY_OPTIONS: AssignmentPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const TYPE_OPTIONS: AssignmentType[] = ['HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM'];
const SORT_OPTIONS: { value: ListAssignmentsParams['sort']; label: string }[] = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
];

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const initialDoneRef = useRef(false);

  const [courses, setCourses] = useState<CourseWithSemester[]>([]);

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [sort, setSort] = useState('dueDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [statusMessage, setStatusMessage] = useState('');

  const timeZone = getBrowserTimeZone();

  // Debounce search 300 ms.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // Load courses for the picker (non-fatal).
  useEffect(() => {
    void listCourses()
      .then(setCourses)
      .catch(() => undefined);
  }, []);

  const buildParams = useCallback((): ListAssignmentsParams => {
    const p: ListAssignmentsParams = {};
    if (courseId) p.courseId = courseId;
    if (status) p.status = status as AssignmentStatus;
    if (priority) p.priority = priority as AssignmentPriority;
    if (type) p.type = type as AssignmentType;
    if (dueFrom) p.dueFrom = `${dueFrom}T00:00:00`;
    if (dueTo) p.dueTo = `${dueTo}T23:59:59`;
    if (q) p.q = q;
    if (sort && sort !== 'dueDate') p.sort = sort as ListAssignmentsParams['sort'];
    if (order && order !== 'asc') p.order = order;
    return p;
  }, [courseId, status, priority, type, dueFrom, dueTo, q, sort, order]);

  const filtersActive =
    Boolean(
      courseId || status || priority || type || dueFrom || dueTo || q || searchInput.trim()
    ) ||
    sort !== 'dueDate' ||
    order !== 'asc';

  const runFetch = useCallback(
    async (params: ListAssignmentsParams, initial: boolean) => {
      if (initial) {
        setIsLoading(true);
        setInitialError(null);
      } else {
        setIsFetching(true);
      }
      try {
        const data = await listAssignments(params);
        setAssignments(data);
        const active = Boolean(
          params.courseId ||
          params.status ||
          params.priority ||
          params.type ||
          params.dueFrom ||
          params.dueTo ||
          params.q ||
          sort !== 'dueDate' ||
          order !== 'asc'
        );
        if (data.length === 0) {
          setStatusMessage(
            active ? 'No assignments match these filters.' : 'Showing 0 assignments.'
          );
        } else {
          setStatusMessage(`Showing ${data.length} assignment${data.length === 1 ? '' : 's'}.`);
        }
      } catch (err) {
        const msg = getErrorMessage(err) || 'We could not load your assignments. Try again.';
        if (initial) {
          setInitialError(msg);
        } else {
          toast.error(msg);
          const apiErr = extractApiError(err);
          if (courseId && apiErr?.statusCode === 404) {
            setCourseId('');
          }
        }
      } finally {
        if (initial) {
          setIsLoading(false);
          initialDoneRef.current = true;
        } else {
          setIsFetching(false);
        }
      }
    },
    [courseId, sort, order]
  );

  useEffect(() => {
    const params = buildParams();
    const initial = !initialDoneRef.current;
    void runFetch(params, initial);
  }, [courseId, status, priority, type, dueFrom, dueTo, q, sort, order, buildParams, runFetch]);

  const handleRetry = () => {
    const params = buildParams();
    void runFetch(params, true);
  };

  const clearFilters = () => {
    setSearchInput('');
    setQ('');
    setCourseId('');
    setStatus('');
    setPriority('');
    setType('');
    setDueFrom('');
    setDueTo('');
    setSort('dueDate');
    setOrder('asc');
  };

  const toggleOrder = () => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-secondary-900 mb-6">Assignments</h1>
        <div className="card p-6 flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary-600" size={24} aria-hidden />
          <span className="ml-3 text-sm text-secondary-600">Loading your assignments…</span>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-secondary-900 mb-6">Assignments</h1>
        <div role="alert" className="card p-6">
          <p className="text-sm text-red-600">{initialError}</p>
          <Button className="mt-4" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = assignments.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-secondary-900 mb-6">Assignments</h1>

      {/* Always-present live region (DoD 6). */}
      <div role="status" className="mb-4 min-h-5 text-sm text-secondary-600">
        {statusMessage}
      </div>

      <div className="card p-6">
        {/* Filter bar */}
        <div className="space-y-3 mb-6">
          <div className="relative w-full">
            <Input
              aria-label="Search assignments"
              placeholder="Search assignments by title or description"
              maxLength={200}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setQ(searchInput.trim());
                }
              }}
              className="pr-10"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchInput('');
                  setQ('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 focus:outline-none"
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
            <Select
              aria-label="Course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} {c.name}
                </option>
              ))}
            </Select>

            <Input
              aria-label="Due from"
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
              className="w-full"
            />
            <Input
              aria-label="Due to"
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
              className="w-full"
            />

            <Select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full"
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full"
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Sort by"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            <button
              type="button"
              aria-label={order === 'asc' ? 'Sort ascending' : 'Sort descending'}
              onClick={toggleOrder}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {order === 'asc' ? (
                <ArrowUp size={16} aria-hidden />
              ) : (
                <ArrowDown size={16} aria-hidden />
              )}
            </button>

            {isFetching && (
              <Loader2 className="animate-spin text-primary-600" size={20} aria-hidden />
            )}
          </div>
        </div>

        {isEmpty ? (
          <div className="py-8 text-center">
            {filtersActive ? (
              <>
                <p className="text-sm text-secondary-700">No assignments match these filters.</p>
                <Button className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-secondary-700">No assignments yet.</p>
                <p className="mt-1 text-sm text-secondary-500">
                  Assignments you create on your courses will show up here.
                </p>
                <Link to="/courses">
                  <Button className="mt-4">Browse courses</Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-secondary-100" aria-busy={isFetching}>
            {assignments.map((a) => {
              const course = a.course;
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 truncate" title={a.title}>
                      {course ? (
                        <Link to={`/courses/${course.id}`} className="hover:underline">
                          {a.title}
                        </Link>
                      ) : (
                        a.title
                      )}
                    </p>
                    <p
                      className={clsx(
                        'mt-1 text-sm',
                        a.dueDate === null ? 'text-secondary-500' : 'text-secondary-600'
                      )}
                    >
                      {a.dueDate === null ? (
                        'No due date'
                      ) : (
                        <>
                          {`Due ${formatDate(new Date(a.dueDate), timeZone)}`}
                          {isOverdueAssignment(a) && (
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
                    <div className="mt-1 flex items-center gap-2 text-sm text-secondary-600">
                      {course ? (
                        <>
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: course.color }}
                            aria-hidden
                          />
                          <span className="font-mono text-xs">{course.code}</span>
                          <span className="truncate">{course.name}</span>
                        </>
                      ) : (
                        <span className="text-secondary-500">No course</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-secondary-500">{subtaskSummary(a.subtasks)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        STATUS_STYLES[a.status]
                      )}
                    >
                      {STATUS_LABELS[a.status]}
                    </span>
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        PRIORITY_STYLES[a.priority]
                      )}
                    >
                      {PRIORITY_LABELS[a.priority]}
                    </span>
                    {a.type && (
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          TYPE_STYLE
                        )}
                      >
                        {TYPE_LABELS[a.type]}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filtersActive && !isEmpty && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
