import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { MoreHorizontal, Play, SquarePen, Trash2 } from 'lucide-react';

export interface RowActionsMenuProps {
  assignmentId: string;
  assignmentTitle: string;
  /** Disabled while the row has an in-flight subtask or status request. */
  disabled?: boolean;
  /** Hide the "Start focus session" item on finished assignments. */
  finished?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** Opens the start-focus-session dialog for this assignment. */
  onStartFocus?: () => void;
}

/**
 * The row's overflow actions (SP-125 / R-125-007): one three-dot control that
 * opens Edit and Delete on demand instead of filling every row with buttons.
 *
 * Focus model: opening focuses the first item; Escape closes and restores the
 * trigger; activating an item re-focuses the trigger *before* the callback so
 * the modal dialogs can capture it as their restoration target (the menu item
 * itself is about to unmount).
 */
export function RowActionsMenu({
  assignmentId,
  assignmentTitle,
  disabled = false,
  finished = false,
  onEdit,
  onDelete,
  onStartFocus,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const triggerId = `assignment-actions-${assignmentId}`;
  const menuId = `assignment-menu-${assignmentId}`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const focusCycle = (direction: 1 | -1) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;
    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const index = current ? items.indexOf(current as HTMLButtonElement) : -1;
    const next = items[(index + direction + items.length) % items.length];
    next?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusCycle(1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusCycle(-1);
    }
  };

  const runAction = (callback: () => void) => {
    // Return focus to the trigger first so the dialog that opens next knows
    // where to come back to (the item itself is unmounting).
    triggerRef.current?.focus();
    setOpen(false);
    callback();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Actions for ${assignmentTitle}`}
        data-assignment-focus={`actions:${assignmentId}`}
        className={clsx(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted',
          'transition-colors hover:bg-surface-muted hover:text-text',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-60'
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-labelledby={triggerId}
          aria-orientation="vertical"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {!finished && onStartFocus && (
            <button
              role="menuitem"
              type="button"
              disabled={disabled}
              aria-label={`Start focus session for ${assignmentTitle}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted focus:outline-none focus:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => runAction(onStartFocus)}
            >
              <Play size={14} aria-hidden />
              Start focus session
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            aria-label={`Edit ${assignmentTitle}`}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted focus:outline-none focus:bg-surface-muted"
            onClick={() => runAction(onEdit)}
          >
            <SquarePen size={14} aria-hidden />
            Edit
          </button>
          <button
            role="menuitem"
            type="button"
            aria-label={`Delete ${assignmentTitle}`}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 focus:outline-none focus:bg-danger/10"
            onClick={() => runAction(onDelete)}
          >
            <Trash2 size={14} aria-hidden />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
