import { forwardRef, HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from '@/shared/lib/twMerge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'muted';
  padding?: 'sm' | 'md' | 'lg';
}

const variants = {
  default: 'bg-surface rounded-lg shadow-md',
  elevated: 'bg-surface rounded-lg shadow-lg',
  outlined: 'bg-surface rounded-lg border border-border shadow-none',
  muted: 'bg-surface-muted rounded-lg shadow-none',
};

const paddings = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(clsx(variants[variant], paddings[padding], className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
