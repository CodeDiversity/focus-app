import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { updateAssignment } from '@/entities/assignment/api/assignmentApi';
import { isUnfinishedAssignment } from '@/entities/assignment/model/status';
import type { AssignmentStatus } from '@/shared/types/academic';
import type { AssignmentInteractionItem, SubtaskChangeAction } from './types';

type AssignmentAction = 'added' | 'updated' | 'deleted';

export interface UseAssignmentActionsOptions {
  /** The rows currently visible in this host. */
  items: AssignmentInteractionItem[];
  /** A create/edit/delete succeeded; the host refetches its own source. */
  onChanged: (action: AssignmentAction) => void;
  /** Optional copy hook after a successful status PATCH. */
  onStatusChanged?: (status: AssignmentStatus) => void;
  onSubtaskChanged: (action: SubtaskChangeAction) => void;
  onSubtaskRefresh: () => void;
  /** Clears the host live region before a request so repeats announce. */
  onPending?: () => void;
  /** Called when a dialog opens, mirroring the course section's re-arm. */
  onFormOpen?: () => void;
}

/**
 * The single owner of assignment row state: status PATCHes, edit/delete dialog
 * selection, subtask expand/busy state, and focus restoration.
 *
 * The hook owns state only; the host renders `AssignmentRow` per item and the
 * returned dialogs once. Two renders never share state, so two hosts (course
 * page and list page) stay isolated.
 */
export function useAssignmentActions({
  items,
  onChanged,
  onStatusChanged,
  onSubtaskChanged,
  onSubtaskRefresh,
  onPending,
  onFormOpen,
}: UseAssignmentActionsOptions) {
  const sectionRef = useRef<HTMLElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentInteractionItem | null>(null);
  const [deleting, setDeleting] = useState<AssignmentInteractionItem | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [statusBusyIds, setStatusBusyIds] = useState<Set<string>>(() => new Set());
  const [pendingStatus, setPendingStatus] = useState<Record<string, AssignmentStatus>>({});
  const [focusAfterDelete, setFocusAfterDelete] = useState<{
    deletedId: string;
    neighborId: string | null;
  } | null>(null);
  const [focusAfterStatus, setFocusAfterStatus] = useState<{
    finishedId: string;
    neighborId: string | null;
  } | null>(null);

  const focusControl = (selector: string) => {
    sectionRef.current?.querySelector<HTMLButtonElement>(selector)?.focus();
  };

  const openForm = () => {
    onFormOpen?.();
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleCreateSuccess = () => {
    setFormOpen(false);
    onChanged('added');
  };

  const openEdit = (assignment: AssignmentInteractionItem) => {
    onFormOpen?.();
    setEditing(assignment);
  };

  const closeEdit = () => setEditing(null);

  const handleEditSuccess = () => {
    setEditing(null);
    onChanged('updated');
  };

  const openDelete = (assignment: AssignmentInteractionItem) => {
    onFormOpen?.();
    setDeleting(assignment);
  };

  const closeDelete = () => setDeleting(null);

  const handleDeleted = () => {
    if (!deleting) return;
    const index = items.findIndex((item) => item.id === deleting.id);
    const neighbor = items[index + 1] ?? items[index - 1] ?? null;
    setFocusAfterDelete({ deletedId: deleting.id, neighborId: neighbor?.id ?? null });
    setDeleting(null);
    onChanged('deleted');
    // Leave the dialog before it unmounts. A neighboring Edit control is
    // already mounted; the last-row case uses the stable Add control until
    // the empty-state button exists.
    if (neighbor) focusControl(`[data-assignment-focus="edit:${CSS.escape(neighbor.id)}"]`);
    else focusControl('[data-assignment-focus="add"]');
  };

  const handleStatusChange = async (
    assignment: AssignmentInteractionItem,
    newStatus: AssignmentStatus
  ) => {
    if (statusBusyIds.has(assignment.id)) return;
    if (newStatus === assignment.status && pendingStatus[assignment.id] === undefined) {
      // no-op when choosing the already-stored value
      return;
    }
    // Block a duplicate submit while a request is in flight.
    setStatusBusyIds((current) => {
      const next = new Set(current);
      next.add(assignment.id);
      return next;
    });
    setPendingStatus((current) => ({ ...current, [assignment.id]: newStatus }));
    onFormOpen?.();

    // Compute the focus neighbor for the case where this row finishes and
    // leaves the unfinished view (D121-4/D121-7).
    const idx = items.findIndex((item) => item.id === assignment.id);
    let neighbor: AssignmentInteractionItem | null = null;
    for (let i = idx + 1; i < items.length; i++) {
      const candidate = items[i];
      if (candidate && candidate.id !== assignment.id && isUnfinishedAssignment(candidate)) {
        neighbor = candidate;
        break;
      }
    }
    if (!neighbor) {
      for (let i = idx - 1; i >= 0; i--) {
        const candidate = items[i];
        if (candidate && candidate.id !== assignment.id && isUnfinishedAssignment(candidate)) {
          neighbor = candidate;
          break;
        }
      }
    }

    const finishes = !isUnfinishedAssignment(newStatus);
    try {
      await updateAssignment(assignment.id, { status: newStatus });
      if (finishes) {
        setFocusAfterStatus({ finishedId: assignment.id, neighborId: neighbor?.id ?? null });
      }
      onStatusChanged?.(newStatus);
    } catch {
      toast.error('We could not update the status. Try again.');
    } finally {
      setStatusBusyIds((current) => {
        const next = new Set(current);
        next.delete(assignment.id);
        return next;
      });
      setPendingStatus((current) => {
        const next = { ...current };
        delete next[assignment.id];
        return next;
      });
    }
  };

  const toggleExpanded = (assignmentId: string) => {
    if (busyIds.has(assignmentId)) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(assignmentId)) next.delete(assignmentId);
      else next.add(assignmentId);
      return next;
    });
  };

  const setAssignmentBusy = (assignmentId: string, busy: boolean) => {
    setBusyIds((current) => {
      if (busy === current.has(assignmentId)) return current;
      const next = new Set(current);
      if (busy) next.add(assignmentId);
      else next.delete(assignmentId);
      return next;
    });
  };

  // Drop expanded ids that disappeared after a refetch.
  useEffect(() => {
    setExpandedIds((current) => {
      let dropped = false;
      const next = new Set<string>();
      for (const id of current) {
        if (items.some((item) => item.id === id)) next.add(id);
        else dropped = true;
      }
      return dropped ? next : current;
    });
  }, [items]);

  useLayoutEffect(() => {
    if (!focusAfterDelete) return;
    if (items.some((item) => item.id === focusAfterDelete.deletedId)) return;
    if (items.length === 0) {
      const empty = sectionRef.current?.querySelector<HTMLButtonElement>(
        '[data-assignment-focus="empty-add"]'
      );
      (
        empty ??
        sectionRef.current?.querySelector<HTMLButtonElement>('[data-assignment-focus="add"]')
      )?.focus();
    } else if (
      focusAfterDelete.neighborId &&
      items.some((item) => item.id === focusAfterDelete.neighborId)
    ) {
      focusControl(`[data-assignment-focus="edit:${CSS.escape(focusAfterDelete.neighborId)}"]`);
    } else if (items[0]) {
      focusControl(`[data-assignment-focus="edit:${CSS.escape(items[0].id)}"]`);
    }
    setFocusAfterDelete(null);
  }, [items, focusAfterDelete]);

  useLayoutEffect(() => {
    if (!focusAfterStatus) return;
    const stillUnfinished = items.some(
      (item) => item.id === focusAfterStatus.finishedId && isUnfinishedAssignment(item)
    );
    if (stillUnfinished) return;
    if (focusAfterStatus.neighborId) {
      const sel = sectionRef.current?.querySelector<HTMLSelectElement>(
        `[data-assignment-focus="status:${CSS.escape(focusAfterStatus.neighborId)}"]`
      );
      sel?.focus();
    } else {
      focusControl('[data-assignment-focus="add"]');
    }
    setFocusAfterStatus(null);
  }, [items, focusAfterStatus]);

  return {
    sectionRef,
    formOpen,
    openForm,
    closeForm,
    handleCreateSuccess,
    editing,
    openEdit,
    closeEdit,
    handleEditSuccess,
    deleting,
    openDelete,
    closeDelete,
    handleDeleted,
    expandedIds,
    toggleExpanded,
    busyIds,
    setAssignmentBusy,
    statusBusyIds,
    pendingStatus,
    handleStatusChange,
    onPending,
    onSubtaskChanged,
    onSubtaskRefresh,
  };
}
