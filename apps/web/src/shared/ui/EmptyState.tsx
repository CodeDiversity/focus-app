import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx('flex flex-col items-center text-center gap-3 py-8 sm:py-12', className)
      )}
      {...props}
    >
      {icon && (
        <div className="text-text-muted" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-text font-semibold text-body">{title}</h3>
      {description && <p className="text-text-muted text-body-sm max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';
