import { useEffect, useRef, useState, useCallback, useId, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from '@/shared/lib/twMerge';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  disableBackdropClose?: boolean;
  /** When true, Escape and backdrop clicks are inert and focus is held on the
   *  container (in-flight state). Backwards compatible: omitting behaves as
   *  the reviewed EP10B primitive. */
  busy?: boolean;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  disableBackdropClose = false,
  busy,
  className,
}: DialogProps) {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      const dialog = dialogRef.current;
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (busy) {
          // In-flight: Escape is inert.
          e.preventDefault();
          return;
        }
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (!dialog) return;
      // While busy, hold focus on the container.
      if (busy) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled')
      );
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    },
    [open, onClose, busy]
  );

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? dialogRef.current)?.focus();
    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
      setVisible(false);
    };
  }, [open, handleKeyDown]);

  // Hold focus on the container while busy (in-flight), including when the
  // focusable set becomes empty mid-flight.
  useEffect(() => {
    if (!open || !busy) return;
    dialogRef.current?.focus();
  }, [open, busy]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-text/50 transition-opacity duration-base"
        aria-hidden="true"
        onClick={() => {
          if (disableBackdropClose || busy) return;
          onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        {...(busy !== undefined ? { 'aria-busy': busy } : {})}
        tabIndex={-1}
        className={twMerge(
          clsx(
            'relative w-full rounded-lg bg-surface shadow-lg p-6',
            sizeClasses[size],
            'transition-all duration-base ease-standard motion-reduce:transition-none motion-reduce:transform-none',
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          ),
          className
        )}
      >
        <h2 id={titleId} className="text-h3 text-text">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-2 text-body-sm text-text-muted">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
        {footer && (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

Dialog.displayName = 'Dialog';
