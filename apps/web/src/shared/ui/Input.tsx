import { forwardRef, InputHTMLAttributes, useState, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from '@/shared/lib/twMerge';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-body-sm min-h-[36px] max-sm:min-h-[44px]',
  md: 'px-4 py-2 text-body-sm min-h-[40px] max-sm:min-h-[44px]',
  lg: 'px-4 py-3 text-body min-h-[44px]',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      disabled,
      size = 'md',
      id: idProp,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const autoId = useId();
    const id = idProp ?? autoId;
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
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
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={twMerge(
              clsx(
                'w-full rounded-md bg-surface border-border-strong text-text placeholder:text-text-muted',
                'transition-colors duration-base',
                'focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none',
                sizeStyles[size],
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                isPassword && 'pr-10',
                error
                  ? 'border-danger text-danger placeholder:text-danger/70 focus:border-danger focus:ring-danger'
                  : 'border-border-strong',
                disabled && 'opacity-50 cursor-not-allowed bg-surface-muted',
                className
              )
            )}
            disabled={disabled}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none max-sm:min-h-[44px] max-sm:min-w-[44px] inline-flex items-center justify-center"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
