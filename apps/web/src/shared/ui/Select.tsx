import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-body-sm min-h-[36px] max-sm:min-h-[44px]',
  md: 'px-4 py-2 text-body-sm min-h-[40px] max-sm:min-h-[44px]',
  lg: 'px-4 py-3 text-body min-h-[44px]',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, hint, disabled, size = 'md', id: idProp, children, ...props },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block mb-2 text-body-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={twMerge(
              clsx(
                'w-full rounded-md bg-surface border-border-strong text-text appearance-none pr-10',
                'transition-colors duration-base',
                'focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none',
                sizeStyles[size],
                error
                  ? 'border-danger text-danger focus:border-danger focus:ring-danger'
                  : 'border-border-strong',
                disabled && 'opacity-50 cursor-not-allowed bg-surface-muted',
                className
              )
            )}
            disabled={disabled}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            size={16}
            aria-hidden="true"
          />
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-body-sm text-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-body-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
