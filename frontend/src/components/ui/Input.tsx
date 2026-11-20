import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  trailingAction?: ReactNode;
}

export function Input({
  label,
  helperText,
  error,
  trailingAction,
  id,
  className = '',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const describedBy = error
    ? errorId
    : helperText
      ? helperId
      : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-[0.875rem] font-medium text-primary"
      >
        {label}
      </label>

      <div className="relative flex items-center">
        <input
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={[
            'w-full min-h-[48px] rounded-[12px] bg-surface border text-[1rem] text-primary placeholder:text-secondary',
            'apple-transition apple-focus-ring',
            trailingAction ? 'pl-3.5 pr-12' : 'px-3.5',
            error ? 'border-status-error-fg' : 'border-hairline',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            className
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {trailingAction ? (
          <div className="absolute right-1 flex items-center justify-center">
            {trailingAction}
          </div>
        ) : null}
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
