import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  createSubtask,
  updateSubtask,
  type UpdateSubtaskRequest,
} from '@/entities/assignment/api/assignmentApi';
import {
  apiErrorMessage,
  extractApiError,
  getErrorMessage,
  getFieldError,
} from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { Subtask } from '@/shared/types/academic';
import { DeleteSubtaskDialog } from './DeleteSubtaskDialog';

/** Page live-region actions. Sentences live on the page, not here. */
export type SubtaskChangeAction = 'added' | 'completed' | 'reopened' | 'moved' | 'deleted';

export interface SubtaskChecklistProps {
  assignmentId: string;
  assignmentTitle: string;
  /** API order. Render as given — no client re-sort. */
  subtasks: Subtask[];
  onChanged: (action: SubtaskChangeAction) => void;
  /** Partial reorder only: first PATCH landed, second failed. No success sentence. */
  onRefresh: () => void;
  /** Locks the row disclosure while this checklist has a request in flight. */
  onBusyChange?: (busy: boolean) => void;
  /**
   * Clears the page live region before the request so a repeated sentence
   * is announced again (the assignment-form re-arm).
   */
  onPendingAnnouncement?: () => void;
}

type PendingFocus =
  | { kind: 'add' }
  | { kind: 'toggle'; id: string }
  | { kind: 'move'; id: string; direction: 'up' | 'down' }
  | { kind: 'delete'; nextId: string | null; prevId: string | null };

function titleError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Title is required';
  if (trimmed.length > 200) return 'Title must be 200 characters or fewer';
  return null;
}

function mutationMessage(err: unknown, fallback: string): string {
  const apiError = extractApiError(err);
  if (apiError) return apiErrorMessage(apiError) || fallback;
  return getErrorMessage(err) || fallback;
}

/**
 * Ordered subtask checklist for one expanded assignment row (SP-120J).
 * Mutations go through the assignment client; the list itself always comes
 * from the course-detail projection after the page refetches.
 */
export function SubtaskChecklist({
  assignmentId,
  assignmentTitle,
  subtasks,
  onChanged,
  onRefresh,
  onBusyChange,
  onPendingAnnouncement,
}: SubtaskChecklistProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const pendingFocus = useRef<PendingFocus | null>(null);
  const seenSubtasks = useRef(subtasks);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Subtask | null>(null);

  const setBusyState = (next: boolean) => {
    setBusy(next);
    onBusyChange?.(next);
  };

  const focusControl = (selector: string) => {
    panelRef.current?.querySelector<HTMLElement>(selector)?.focus();
  };

  useLayoutEffect(() => {
    if (subtasks === seenSubtasks.current) return;
    const pending = pendingFocus.current;
    seenSubtasks.current = subtasks;
    if (!pending) return;
    pendingFocus.current = null;
    if (pending.kind === 'add') {
      focusControl('[data-subtask-focus="add-input"]');
      return;
    }
    if (pending.kind === 'toggle') {
      focusControl(`[data-subtask-focus="check:${CSS.escape(pending.id)}"]`);
      return;
    }
    if (pending.kind === 'move') {
      const preferred = panelRef.current?.querySelector<HTMLButtonElement>(
        `[data-subtask-focus="${pending.direction}:${CSS.escape(pending.id)}"]`
      );
      const otherDirection = pending.direction === 'up' ? 'down' : 'up';
      const other = panelRef.current?.querySelector<HTMLButtonElement>(
        `[data-subtask-focus="${otherDirection}:${CSS.escape(pending.id)}"]`
      );
      if (preferred && !preferred.disabled) preferred.focus();
      else if (other && !other.disabled) other.focus();
      return;
    }
    const next = pending.nextId
      ? panelRef.current?.querySelector<HTMLButtonElement>(
          `[data-subtask-focus="delete:${CSS.escape(pending.nextId)}"]`
        )
      : null;
    const prev = pending.prevId
      ? panelRef.current?.querySelector<HTMLButtonElement>(
          `[data-subtask-focus="delete:${CSS.escape(pending.prevId)}"]`
        )
      : null;
    if (next) next.focus();
    else if (prev) prev.focus();
    else focusControl('[data-subtask-focus="add-input"]');
  }, [subtasks]);

  const fail = (err: unknown, fallback: string) => {
    const apiError = extractApiError(err);
    if (apiError?.statusCode === 400) {
      const field = getFieldError(apiError, 'title');
      if (field) {
        setError(field);
        return;
      }
    }
    toast.error(mutationMessage(err, fallback));
  };

  const begin = (control: string) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusyState(true);
    setActive(control);
    onPendingAnnouncement?.();
    return true;
  };

  const end = () => {
    inFlight.current = false;
    setBusyState(false);
    setActive(null);
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = titleError(title);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!begin('add')) return;
    setError(null);
    try {
      await createSubtask(assignmentId, { title: title.trim() });
      setTitle('');
      pendingFocus.current = { kind: 'add' };
      focusControl('[data-subtask-focus="add-input"]');
      onChanged('added');
    } catch (err: unknown) {
      fail(err, 'We could not add the subtask. Try again.');
    } finally {
      end();
    }
  };

  const handleToggle = async (subtask: Subtask) => {
    if (!begin(`toggle:${subtask.id}`)) return;
    const status = subtask.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await updateSubtask(assignmentId, subtask.id, { status });
      pendingFocus.current = { kind: 'toggle', id: subtask.id };
      focusControl(`[data-subtask-focus="check:${CSS.escape(subtask.id)}"]`);
      onChanged(status === 'COMPLETED' ? 'completed' : 'reopened');
    } catch (err: unknown) {
      fail(err, 'We could not update the subtask. Try again.');
    } finally {
      end();
    }
  };

  const patchOrder = (subtaskId: string, orderIndex: number) =>
    updateSubtask(assignmentId, subtaskId, { orderIndex } satisfies UpdateSubtaskRequest);

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const neighborIndex = direction === 'up' ? index - 1 : index + 1;
    const moved = subtasks[index];
    const neighbor = subtasks[neighborIndex];
    if (!moved || !neighbor) return;
    if (!begin(`${direction}:${moved.id}`)) return;
    try {
      if (moved.orderIndex !== neighbor.orderIndex) {
        await patchOrder(moved.id, neighbor.orderIndex);
        try {
          await patchOrder(neighbor.id, moved.orderIndex);
        } catch (err: unknown) {
          toast.error(mutationMessage(err, 'We could not move the subtask. Try again.'));
          onRefresh();
          return;
        }
      } else if (direction === 'up') {
        if (neighbor.orderIndex - 1 >= 0) {
          await patchOrder(moved.id, neighbor.orderIndex - 1);
        } else {
          await patchOrder(neighbor.id, moved.orderIndex + 1);
        }
      } else {
        await patchOrder(moved.id, neighbor.orderIndex + 1);
      }
      pendingFocus.current = { kind: 'move', id: moved.id, direction };
      onChanged('moved');
    } catch (err: unknown) {
      toast.error(mutationMessage(err, 'We could not move the subtask. Try again.'));
    } finally {
      end();
    }
  };

  const handleDeleted = () => {
    if (!deleting) return;
    const index = subtasks.findIndex((item) => item.id === deleting.id);
    const nextId = subtasks[index + 1]?.id ?? null;
    const prevId = subtasks[index - 1]?.id ?? null;
    pendingFocus.current = { kind: 'delete', nextId, prevId };
    setDeleting(null);
    setBusyState(false);
    if (nextId) focusControl(`[data-subtask-focus="delete:${CSS.escape(nextId)}"]`);
    else if (prevId) focusControl(`[data-subtask-focus="delete:${CSS.escape(prevId)}"]`);
    else focusControl('[data-subtask-focus="add-input"]');
    onChanged('deleted');
  };

  return (
    <div
      ref={panelRef}
      id={`subtasks-${assignmentId}`}
      role="region"
      aria-labelledby={`subtasks-toggle-${assignmentId}`}
      aria-busy={busy}
      className="min-w-0"
    >
      {subtasks.length === 0 ? (
        <p className="text-sm text-secondary-700">No subtasks yet.</p>
      ) : (
        <ul>
          {subtasks.map((subtask, index) => {
            const upDisabled = busy || index === 0;
            const downDisabled = busy || index === subtasks.length - 1;
            return (
              <li
                key={subtask.id}
                className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <label className="flex min-w-0 items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-6 w-6 shrink-0 accent-primary-600"
                    checked={subtask.status === 'COMPLETED'}
                    disabled={busy}
                    data-subtask-focus={`check:${subtask.id}`}
                    onChange={() => void handleToggle(subtask)}
                  />
                  <span className="min-w-0 break-words font-medium text-secondary-900">
                    {subtask.title}
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${subtask.title} up`}
                    disabled={upDisabled}
                    isLoading={active === `up:${subtask.id}`}
                    data-subtask-focus={`up:${subtask.id}`}
                    onClick={() => void handleMove(index, 'up')}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${subtask.title} down`}
                    disabled={downDisabled}
                    isLoading={active === `down:${subtask.id}`}
                    data-subtask-focus={`down:${subtask.id}`}
                    onClick={() => void handleMove(index, 'down')}
                  >
                    Down
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${subtask.title}`}
                    disabled={busy}
                    data-subtask-focus={`delete:${subtask.id}`}
                    onClick={() => setDeleting(subtask)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => void handleAdd(event)}
      >
        <div className="min-w-0 flex-1">
          <Input
            id={`subtask-title-${assignmentId}`}
            label="Subtask title"
            value={title}
            error={error ?? undefined}
            disabled={busy}
            data-subtask-focus="add-input"
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          variant="primary"
          className="shrink-0"
          aria-label={`Add subtask to ${assignmentTitle}`}
          isLoading={active === 'add'}
          disabled={busy}
        >
          Add subtask
        </Button>
      </form>

      {deleting && (
        <DeleteSubtaskDialog
          assignmentId={assignmentId}
          subtask={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={handleDeleted}
          onPendingChange={(pending) => {
            if (pending) onPendingAnnouncement?.();
            setBusyState(pending);
          }}
        />
      )}
    </div>
  );
}
