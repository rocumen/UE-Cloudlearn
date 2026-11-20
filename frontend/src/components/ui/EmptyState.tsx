import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center px-4 py-8',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-subtle text-secondary">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="text-[1.0625rem] font-semibold text-primary">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-[360px] text-[0.9375rem] text-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
