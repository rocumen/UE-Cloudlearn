import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'crimson'
  | 'success'
  | 'warning'
  | 'error';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-subtle text-secondary',
  crimson: 'bg-accent-soft text-accent',
  success: 'bg-status-success-bg text-status-success-fg',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  error: 'bg-status-error-bg text-status-error-fg'
};

export function Badge({
  variant = 'neutral',
  children,
  className = ''
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-medium leading-none whitespace-nowrap',
        BADGE_CLASSES[variant],
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
