import { forwardRef, useId, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'role' | 'type'
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  /** Optional one-line description under the label. */
  hint?: string;
}

/**
 * Toggle switch (EP15F, owned here for EP15G's reuse — R-EP15-14): a native
 * `button` with `role="switch"` and `aria-checked`, so Space/Enter toggle it
 * and screen readers announce "on/off". The label is a real `<label>` bound
 * by id; the state is also shown as text ("On"/"Off") so it never relies on
 * colour alone. ≥ 44 px tall on narrow screens.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, label, hint, className, disabled, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const hintId = `${id}-hint`;
    return (
      <div className={clsx('flex items-start justify-between gap-3', className)}>
        <span className="min-w-0">
          <label htmlFor={id} className="block text-body-sm font-medium text-text">
            {label}
          </label>
          {hint && (
            <span id={hintId} className="mt-0.5 block text-xs text-text-muted">
              {hint}
            </span>
          )}
        </span>
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={hint ? hintId : undefined}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={clsx(
            'inline-flex shrink-0 items-center gap-2 rounded-full border px-1 py-0.5 text-xs font-medium transition-colors motion-reduce:transition-none',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
            'max-sm:min-h-[44px]',
            checked
              ? 'border-accent bg-accent/10 text-text'
              : 'border-border-strong bg-surface text-text-muted',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          {...props}
        >
          <span
            aria-hidden
            className={clsx(
              'relative inline-block h-5 w-9 rounded-full transition-colors motion-reduce:transition-none',
              checked ? 'bg-accent' : 'bg-border-strong'
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform motion-reduce:transition-none',
                checked ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </span>
          <span className="pr-1">{checked ? 'On' : 'Off'}</span>
        </button>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
