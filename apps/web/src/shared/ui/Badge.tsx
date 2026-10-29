import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

const variants = {
  neutral: 'bg-surface-muted text-text-muted',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

const sizes = {
  sm: 'px-2 py-0.5 text-caption',
  md: 'px-2.5 py-1 text-body-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'sm', icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center gap-1 rounded-full font-medium',
            variants[variant],
            sizes[size],
            className
          )
        )}
        {...props}
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
