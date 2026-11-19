import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from '@/shared/lib/twMerge';

export interface DisclosureProps {
  /** Stable id base — the panel renders as `${id}-panel`. */
  id: string;
  /** The visible button label. */
  label: string;
  /** Initial state; later prop changes do not override a student's toggle. */
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * EP17F (D-F6) — the one shared disclosure: a labelled
 * `<button aria-expanded aria-controls>` plus its panel. No animation
 * (reduced-motion safe by construction), a 44 px target below `sm` and the
 * shared focus ring. `aria-controls` is set only while open — the panel
 * mounts on open, and a reference to an unrendered id is an axe violation.
 */
export function Disclosure({
  id,
  label,
  defaultOpen = false,
  children,
  className,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id}-panel`;
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={twMerge(
          clsx(
            'flex w-full items-center justify-between gap-2 rounded-md border border-border',
            'bg-surface px-4 py-2 text-left text-sm font-medium text-text max-sm:min-h-[44px]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
            'focus-visible:ring-offset-2'
          )
        )}
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className={clsx('h-4 w-4 shrink-0 text-text-muted', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div id={panelId} className="mt-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default Disclosure;
