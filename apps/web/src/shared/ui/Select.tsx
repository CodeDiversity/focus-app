import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, disabled, id: idProp, children, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block mb-2 text-sm font-medium text-secondary-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={clsx(
              'w-full px-4 py-2 border rounded-lg bg-white text-secondary-900 appearance-none pr-10',
              'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none',
              'transition-colors duration-200',
              error ? 'border-red-500 text-red-900' : 'border-secondary-300',
              disabled && 'opacity-50 cursor-not-allowed bg-secondary-50',
              className
            )}
            disabled={disabled}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none"
            size={16}
          />
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-sm text-secondary-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
