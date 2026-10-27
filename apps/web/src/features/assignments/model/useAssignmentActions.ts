import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [focusAfterCreate, setFocusAfterCreate] = useState(false);
  /**
   * Latest host callbacks/items. Async mutations can outlive the render that
   * started them (e.g. a status PATCH while the list filters change), so their
   * completion must use the current host source rather than a stale closure
   * (R-124-001).
   */
  const latest = useRef({
    items,
    onChanged,
    onStatusChanged,
    onSubtaskChanged,
    onSubtaskRefresh,
    onPending,
    onFormOpen,
  });
  useEffect(() => {
    latest.current = {
      items,
      onChanged,
      onStatusChanged,
      onSubtaskChanged,
      onSubtaskRefresh,
      onPending,
      onFormOpen,
    };
  });

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
    // The activating control may disappear (empty-state CTA); an effect below
    // moves focus to the stable host Add control once the refetch lands.
    setFocusAfterCreate(true);
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

    const finishes = !isUnfinishedAssignment(newStatus);
    try {
      await updateAssignment(assignment.id, { status: newStatus });
      if (finishes) {
        // Compute the focus neighbor from the latest host rows. A refetch may
        // have completed while the PATCH was in flight.
        const currentItems = latest.current.items;
        const idx = currentItems.findIndex((item) => item.id === assignment.id);
        let neighbor: AssignmentInteractionItem | null = null;
        for (let i = idx + 1; i < currentItems.length; i++) {
          const candidate = currentItems[i];
          if (candidate && candidate.id !== assignment.id && isUnfinishedAssignment(candidate)) {
            neighbor = candidate;
            break;
          }
        }
        if (!neighbor) {
          for (let i = idx - 1; i >= 0; i--) {
            const candidate = currentItems[i];
            if (candidate && candidate.id !== assignment.id && isUnfinishedAssignment(candidate)) {
              neighbor = candidate;
              break;
            }
          }
        }
        setFocusAfterStatus({ finishedId: assignment.id, neighborId: neighbor?.id ?? null });
      }
      latest.current.onStatusChanged?.(newStatus);
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

  // D124-5 / R-124-004: expanded ids reset whenever the host supplies a new
  // items array (an ordinary refetch), and are retained when identity is stable.
  const previousItems = useRef(items);
  useEffect(() => {
    if (previousItems.current === items) return;
    previousItems.current = items;
    // Avoid a state update (and render) when nothing is expanded.
    setExpandedIds((current) => (current.size === 0 ? current : new Set()));
  }, [items]);

  useLayoutEffect(() => {
    if (!focusAfterCreate) return;
    // While the list is still empty the activating empty-state control is
    // mounted and the form's own cleanup restores it. Once the refetch shows
    // rows, that control may be gone; use the stable Add control instead.
    if (items.length === 0) return;
    focusControl('[data-assignment-focus="add"]');
    setFocusAfterCreate(false);
  }, [items, focusAfterCreate]);

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

  const handleSubtaskChanged = useCallback(
    (action: SubtaskChangeAction) => latest.current.onSubtaskChanged(action),
    []
  );
  const handleSubtaskRefresh = useCallback(() => latest.current.onSubtaskRefresh(), []);
  const handlePending = useCallback(() => latest.current.onPending?.(), []);

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
    onPending: handlePending,
    onSubtaskChanged: handleSubtaskChanged,
    onSubtaskRefresh: handleSubtaskRefresh,
  };
}
