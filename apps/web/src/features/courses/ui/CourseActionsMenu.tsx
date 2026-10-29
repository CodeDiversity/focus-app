import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { MoreHorizontal, SquarePen, Archive, ArchiveRestore } from 'lucide-react';

export interface CourseActionsMenuProps {
  courseId: string;
  courseName: string;
  isActive: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onArchiveRestore: () => void;
}

export function CourseActionsMenu({
  courseId,
  courseName,
  isActive,
  disabled = false,
  onEdit,
  onArchiveRestore,
}: CourseActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const triggerId = `course-actions-${courseId}`;
  const menuId = `course-menu-${courseId}`;

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
    triggerRef.current?.focus();
    setOpen(false);
    callback();
  };

  return (
    <div ref={rootRef} className="relative shrink-0 z-10">
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Actions for ${courseName}`}
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
          <button
            role="menuitem"
            type="button"
            aria-label={`Edit ${courseName}`}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted focus:outline-none focus:bg-surface-muted"
            onClick={() => runAction(onEdit)}
          >
            <SquarePen size={14} aria-hidden />
            Edit
          </button>
          {isActive ? (
            <button
              role="menuitem"
              type="button"
              aria-label={`Archive ${courseName}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 focus:outline-none focus:bg-danger/10"
              onClick={() => runAction(onArchiveRestore)}
            >
              <Archive size={14} aria-hidden />
              Archive
            </button>
          ) : (
            <button
              role="menuitem"
              type="button"
              aria-label={`Restore ${courseName}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted focus:outline-none focus:bg-surface-muted"
              onClick={() => runAction(onArchiveRestore)}
            >
              <ArchiveRestore size={14} aria-hidden />
              Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}
