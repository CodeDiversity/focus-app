import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  listSemesters,
  updateSemester,
  type SemesterWithCount,
} from '@/entities/semester/api/semesterApi';
import { SemesterList } from '@/features/semesters/ui/SemesterList';
import { SemesterForm } from '@/features/semesters/ui/SemesterForm';
import { DeleteSemesterDialog } from '@/features/semesters/ui/DeleteSemesterDialog';

type FormMode = 'closed' | 'create' | 'edit';

/**
 * `/semesters` (SP-110B): the student's semester management surface —
 * list (name, readable dates, "Active" badge, course count) with create,
 * edit, activate/deactivate and delete-with-confirmation.
 *
 * State is page-local (the profile-page precedent; no new RTK slice — the
 * entity API is the data home). The list is the single source of truth and
 * is re-read after every successful mutation, so row order (startDate desc)
 * and badges always re-derive from the API response — the single-active
 * invariant (D110-1) is visible as at most one badge.
 *
 * Feedback: successes announce through the `role="status"` live region
 * (AC 5); failures toast the sanitized message (app convention).
 */
export function SemestersPage() {
  const [semesters, setSemesters] = useState<SemesterWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingSemester, setEditingSemester] = useState<SemesterWithCount | null>(null);
  const [deletingSemester, setDeletingSemester] = useState<SemesterWithCount | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      setSemesters(await listSemesters());
    } catch (err: unknown) {
      setListError(getErrorMessage(err) || 'We could not load your semesters. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingSemester(null);
    setFormMode('create');
  };

  const openEdit = (semester: SemesterWithCount) => {
    setEditingSemester(semester);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode('closed');
    setEditingSemester(null);
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

  const handleActivate = async (semester: SemesterWithCount, isActive: boolean) => {
    setActivatingId(semester.id);
    try {
      await updateSemester(semester.id, { isActive });
      setStatusMessage(
        isActive ? `${semester.name} is now your active semester.` : `${semester.name} deactivated.`
      );
      // Re-read: the single-active invariant (D110-1) re-derives the badges
      // from the API response — at most one badge.
      await load();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'We could not update the semester. Try again.');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeleted = () => {
    const name = deletingSemester?.name;
    setDeletingSemester(null);
    if (name) {
      setStatusMessage(`${name} deleted. Its courses remain, unaffiliated.`);
    }
    void load();
  };

  const showList = !isLoading && !listError && formMode === 'closed';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-text">Semesters</h1>
        {showList && semesters.length > 0 && <Button onClick={openCreate}>Add semester</Button>}
      </div>

      {/* Always present so status changes are announced (AC 5). */}
      <div role="status" className="mb-4 min-h-5 text-sm text-text-muted">
        {statusMessage}
      </div>

      <div className="card p-6">
        {isLoading ? (
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
            <p className="text-sm text-text-muted">Loading your semesters…</p>
          </div>
        ) : listError ? (
          <div className="py-8 text-center" role="alert">
            <p className="text-sm text-text">{listError}</p>
            <Button className="mt-4" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : formMode === 'create' ? (
          <SemesterForm mode="create" onSuccess={handleCreateSuccess} onClose={closeForm} />
        ) : formMode === 'edit' && editingSemester ? (
          <SemesterForm
            mode="edit"
            semester={editingSemester}
            onSuccess={handleEditSuccess}
            onClose={closeForm}
          />
        ) : semesters.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text">No semesters yet</p>
            <Button className="mt-4" onClick={openCreate}>
              Add your first semester
            </Button>
          </div>
        ) : (
          <SemesterList
            semesters={semesters}
            activatingId={activatingId}
            onEdit={openEdit}
            onDelete={setDeletingSemester}
            onActivate={(semester, isActive) => void handleActivate(semester, isActive)}
          />
        )}
      </div>

      {deletingSemester && (
        <DeleteSemesterDialog
          semester={deletingSemester}
          onDeleted={handleDeleted}
          onCancel={() => setDeletingSemester(null)}
        />
      )}
    </div>
  );
}
