import { useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
  error?: string;
  children: ReactNode;
}

export function Select({
  label,
  helperText,
  error,
  id,
  className = '',
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;

  const describedBy = error
    ? errorId
    : helperText
      ? helperId
      : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={selectId}
        className="block text-[0.875rem] font-medium text-primary"
      >
        {label}
      </label>

      <div className="relative flex items-center">
        <select
          id={selectId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={[
            'w-full min-h-[48px] appearance-none [-webkit-appearance:none] [-moz-appearance:none] bg-none truncate rounded-[12px] bg-surface border pl-3.5 pr-11 text-[1rem] text-primary',
            'apple-transition apple-focus-ring',
            error ? 'border-status-error-fg' : 'border-hairline',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            className
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3.5 h-4 w-4 text-secondary"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-[0.8125rem] text-status-error-fg"
        >
          <AlertCircle
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[0.8125rem] text-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
