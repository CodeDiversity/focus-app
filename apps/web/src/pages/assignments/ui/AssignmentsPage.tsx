import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Loader2,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  ClipboardList,
  Search,
} from 'lucide-react';
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
import { useAssignmentActions } from '@/features/assignments/model/useAssignmentActions';
import type { SubtaskChangeAction } from '@/features/assignments/model/types';
import { AssignmentDialogs } from '@/features/assignments/ui/AssignmentDialogs';
import { AssignmentRow } from '@/features/assignments/ui/AssignmentRow';
import { StartFocusSessionDialog } from '@/features/focus-session/ui/StartFocusSessionDialog';
import type { StartFocusSessionAssignment } from '@/features/focus-session/ui/StartFocusSessionDialog';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  TYPE_LABELS,
} from '@/features/assignments/ui/assignmentPresentation';

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

type FormAction = 'added' | 'updated' | 'deleted';

/** Page live-region copy, matching the course host's sentences (SP-124B host parity). */
const ACTION_SENTENCES: Record<FormAction, string> = {
  added: 'Assignment added.',
  updated: 'Assignment updated.',
  deleted: 'Assignment deleted.',
};

const STATUS_SENTENCES: Record<AssignmentStatus, string> = {
  PENDING: 'Assignment set to pending.',
  IN_PROGRESS: 'Assignment marked as in progress.',
  COMPLETED: 'Assignment marked as completed.',
  SUBMITTED: 'Assignment marked as submitted.',
  GRADED: 'Assignment marked as graded.',
};

const SUBTASK_SENTENCES: Record<SubtaskChangeAction, string> = {
  added: 'Subtask added.',
  completed: 'Subtask completed.',
  reopened: 'Subtask marked incomplete.',
  moved: 'Subtask moved.',
  deleted: 'Subtask deleted.',
};

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
  /** Secondary filter panel visibility (SP-125 / D125-7). Collapsed by default. */
  const [showFilters, setShowFilters] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  /** Only the newest list request may commit rows/loading/status (R-124-001). */
  const requestSeq = useRef(0);

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

  /**
   * Active secondary controls (SP-125 / D125-7): the count on the Filters
   * toggle tells a collapsed panel's controls are doing something — including
   * a non-default sort, since the sort pair lives in the secondary panel.
   */
  const secondaryActiveCount = [
    Boolean(dueFrom),
    Boolean(dueTo),
    Boolean(priority),
    Boolean(type),
    sort !== 'dueDate',
    order !== 'asc',
  ].filter(Boolean).length;

  const runFetch = useCallback(
    async (params: ListAssignmentsParams, initial: boolean, prefix?: string) => {
      const seq = ++requestSeq.current;
      const isCurrent = () => seq === requestSeq.current;
      if (initial) {
        setIsLoading(true);
        setInitialError(null);
      } else {
        setIsFetching(true);
      }
      try {
        const data = await listAssignments(params);
        // A slower earlier request must not replace the newest result
        // (e.g. a filter changed while a mutation refetch was in flight).
        if (!isCurrent()) return;
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
        const count =
          data.length === 0
            ? active
              ? 'No assignments match these filters.'
              : 'Showing 0 assignments.'
            : `Showing ${data.length} assignment${data.length === 1 ? '' : 's'}.`;
        setStatusMessage(prefix ? `${prefix} ${count}` : count);
      } catch (err) {
        if (!isCurrent()) return;
        if (initial) {
          setInitialError(getErrorMessage(err) || 'We could not load your assignments. Try again.');
        } else {
          // A background refetch never clears the list; it only says the reload
          // failed with actionable copy (SP-124B AC 4).
          toast.error('We could not load your assignments. Try again.');
          const apiErr = extractApiError(err);
          if (courseId && apiErr?.statusCode === 404) {
            setCourseId('');
          }
        }
      } finally {
        if (isCurrent()) {
          if (initial) {
            setIsLoading(false);
            initialDoneRef.current = true;
          } else {
            setIsFetching(false);
          }
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

  /** Re-read the list with the parameters currently in the filter bar. */
  const refetchCurrent = (prefix?: string) => {
    void runFetch(buildParams(), false, prefix);
  };

  // One owner for status, edit/delete dialogs, subtasks, and focus (D124-10).
  // The page only supplies rows, copy, and its own refetch (D124-4).
  const [startingAssignment, setStartingAssignment] = useState<StartFocusSessionAssignment | null>(
    null
  );

  const actions = useAssignmentActions({
    items: assignments,
    onChanged: (action: FormAction) => refetchCurrent(ACTION_SENTENCES[action]),
    onStatusChanged: (next: AssignmentStatus) => refetchCurrent(STATUS_SENTENCES[next]),
    onSubtaskChanged: (action: SubtaskChangeAction) => refetchCurrent(SUBTASK_SENTENCES[action]),
    onSubtaskRefresh: () => refetchCurrent(),
    // Clear before a request so a repeated sentence announces again.
    onPending: () => setStatusMessage(''),
    onFormOpen: () => setStatusMessage(''),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-text mb-6">Assignments</h1>
        <div className="card p-6 flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={24} aria-hidden />
          <span className="ml-3 text-sm text-text-muted">Loading your assignments…</span>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-text mb-6">Assignments</h1>
        <div role="alert" className="card border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">{initialError}</p>
          <Button className="mt-4 max-sm:min-h-[44px]" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = assignments.length === 0;

  return (
    <section
      ref={actions.sectionRef}
      aria-labelledby="assignments-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 id="assignments-heading" className="text-3xl font-bold text-text">
          Assignments
        </h1>
        {/* Stable focus target for the shared hook's last-row delete fallback. */}
        <Button
          data-assignment-focus="add"
          className="max-sm:min-h-[44px]"
          onClick={actions.openForm}
        >
          Add assignment
        </Button>
      </div>

      {/* Filter toolbar: outside the results card (R-125-007) so search,
          filters, and results read as separate layers. Width lives on explicit
          wrappers because `Input`/`Select` put their own hard `w-full` on an
          inner wrapper; sizing the wrappers directly is what stops the search
          from collapsing and the dropdown chevrons from separating from their
          labels. Date range, priority, type, and the sort pair stay in the
          collapsible panel below; the toggle's badge shows the active
          secondary count so a collapsed panel is never silently filtering. */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:min-w-[280px] sm:flex-1">
          {/* The magnifier labels the field visually (R-125-002). */}
          <Input
            aria-label="Search assignments"
            placeholder="Search assignments..."
            maxLength={200}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQ(searchInput.trim());
              }
            }}
            leftIcon={<Search size={16} aria-hidden />}
            className="h-[42px] pr-10 max-sm:min-h-[44px]"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchInput('');
                setQ('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-muted focus:outline-none"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>

        {/* Compact, non-stretching dropdowns; height/radius/border match the
            search input. Label and chevron are inside one control. */}
        <div className="w-full sm:w-[170px] sm:shrink-0">
          <Select
            aria-label="Course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-[42px] w-full pr-8 max-sm:min-h-[44px]"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full sm:w-[150px] sm:shrink-0">
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-[42px] w-full pr-8 max-sm:min-h-[44px]"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="h-[42px] shrink-0 sm:ml-auto max-sm:min-h-[44px]"
          aria-label={
            showFilters
              ? 'Hide filters'
              : secondaryActiveCount > 0
                ? `Filters (${secondaryActiveCount})`
                : 'Filters'
          }
          aria-expanded={showFilters}
          aria-controls="advanced-filters-panel"
          leftIcon={<SlidersHorizontal size={16} aria-hidden />}
          onClick={() => setShowFilters((value) => !value)}
        >
          <span>{showFilters ? 'Hide filters' : 'Filters'}</span>
          {secondaryActiveCount > 0 && (
            <span className="ml-1 rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold leading-none text-white">
              {secondaryActiveCount}
            </span>
          )}
        </Button>
      </div>

      {/* Advanced filter panel: outside the results card, directly under the
          toolbar (R-125-007). Inline labels sit left of their control
          (R-125-004), and the order arrow is attached to the sort select. */}
      {showFilters && (
        <div
          id="advanced-filters-panel"
          className="mb-5 grid grid-cols-1 items-start gap-2 rounded-lg border border-border bg-surface-muted/60 p-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-due-from"
              className="shrink-0 text-xs font-medium text-text-muted"
            >
              Due from
            </label>
            <Input
              id="filter-due-from"
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
              className="max-sm:min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-due-to" className="shrink-0 text-xs font-medium text-text-muted">
              Due to
            </label>
            <Input
              id="filter-due-to"
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
              className="max-sm:min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-priority"
              className="shrink-0 text-xs font-medium text-text-muted"
            >
              Priority
            </label>
            <Select
              id="filter-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full max-sm:min-h-[44px]"
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-type" className="shrink-0 text-xs font-medium text-text-muted">
              Type
            </label>
            <Select
              id="filter-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full max-sm:min-h-[44px]"
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-sort" className="shrink-0 text-xs font-medium text-text-muted">
              Sort by
            </label>
            <Select
              id="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full max-sm:min-h-[44px]"
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
              title="Toggle sort order"
              onClick={toggleOrder}
              className="inline-flex min-h-[44px] w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {order === 'asc' ? (
                <ArrowUp size={16} aria-hidden />
              ) : (
                <ArrowDown size={16} aria-hidden />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results card (R-125-007): its own section under the toolbar. The
          always-present live region (DoD 6) doubles as the subtle count
          header and hosts the refetch spinner. */}
      <div className="card p-4 sm:p-6">
        <div
          role="status"
          className="mb-3 flex min-h-5 items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted"
        >
          {isFetching && <Loader2 className="animate-spin text-accent" size={16} aria-hidden />}
          {statusMessage}
        </div>

        {isEmpty ? (
          <div className="py-8 text-center">
            {filtersActive ? (
              <>
                <Search size={36} aria-hidden className="mx-auto mb-3 text-text-muted" />
                <p className="text-sm text-text">No assignments match these filters.</p>
                <p className="mt-1 text-sm text-text-muted">
                  Try adjusting your search terms or clearing filters.
                </p>
                <Button className="mt-4 max-sm:min-h-[44px]" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <ClipboardList size={40} aria-hidden className="mx-auto mb-3 text-text-muted" />
                <p className="text-sm text-text">No assignments yet.</p>
                <p className="mt-1 text-sm text-text-muted">
                  Create an assignment directly or browse your courses.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    data-assignment-focus="empty-add"
                    className="max-sm:min-h-[44px]"
                    onClick={actions.openForm}
                  >
                    Add your first assignment
                  </Button>
                  <Link to="/courses">
                    <Button variant="outline" className="max-sm:min-h-[44px]">
                      Browse courses
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <ul
            className="space-y-3 max-sm:[&_button]:min-h-[44px] max-sm:[&_select]:min-h-[44px]"
            aria-busy={isFetching}
          >
            {assignments.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                statusValue={actions.pendingStatus[a.id] ?? a.status}
                statusDisabled={actions.statusBusyIds.has(a.id)}
                expanded={actions.expandedIds.has(a.id)}
                busy={actions.busyIds.has(a.id)}
                course={a.course}
                onStatusChange={(next) => void actions.handleStatusChange(a, next)}
                onToggleExpanded={() => actions.toggleExpanded(a.id)}
                onOpenEdit={() => actions.openEdit(a)}
                onOpenDelete={() => actions.openDelete(a)}
                onStartFocus={() =>
                  setStartingAssignment({
                    id: a.id,
                    title: a.title,
                    dueDate: a.dueDate,
                    estimatedHours: a.estimatedHours,
                  })
                }
                onTitleActivate={() => actions.openEdit(a)}
                onSubtaskChanged={actions.onSubtaskChanged}
                onSubtaskRefresh={actions.onSubtaskRefresh}
                onSubtaskPending={actions.onPending}
                onSubtaskBusyChange={(busy) => actions.setAssignmentBusy(a.id, busy)}
              />
            ))}
          </ul>
        )}

        {filtersActive && !isEmpty && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs text-text-muted">
              Change the search above, or reset every filter and sort.
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/*
       * One dialog mount for the list (D124-10 / AC 5). No fixed course: create
       * mode picks one from this host's course list, prefilled by the active
       * filter (SP-124C).
       */}
      <AssignmentDialogs
        actions={actions}
        courses={courses}
        initialCourseId={courseId || undefined}
      />
      <StartFocusSessionDialog
        assignment={startingAssignment}
        open={!!startingAssignment}
        onClose={() => setStartingAssignment(null)}
      />
    </section>
  );
}
