import {
  forwardRef,
  InputHTMLAttributes,
  useState,
  useId,
} from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

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
      id: idProp,
      ...props
    },
    ref,
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
            <label htmlFor={id} className="block mb-2 text-sm font-medium text-secondary-700">
              {label}
            </label>
          )}
          <div className="relative">
            {leftIcon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              id={id}
              type={inputType}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={clsx(
                'w-full px-4 py-2 border rounded-lg bg-white text-secondary-900 placeholder-secondary-400',
                'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none',
                'transition-colors duration-200',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                isPassword && 'pr-10',
                error ? 'border-red-500 text-red-900 placeholder-red-700' : 'border-secondary-300',
                disabled && 'opacity-50 cursor-not-allowed bg-secondary-50',
                className,
              )}
              disabled={disabled}
              {...props}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}
            {rightIcon && !isPassword && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
                {rightIcon}
              </div>
            )}
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
  },
);

Input.displayName = 'Input';
