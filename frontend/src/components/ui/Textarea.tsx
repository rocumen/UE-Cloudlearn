import { useId, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function Textarea({
  label,
  helperText,
  error,
  id,
  className = '',
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const helperId = `${textareaId}-helper`;
  const errorId = `${textareaId}-error`;

  const describedBy = error
    ? errorId
    : helperText
      ? helperId
      : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={textareaId}
        className="block text-[0.875rem] font-medium text-primary"
      >
        {label}
      </label>

      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={[
          'w-full min-h-[112px] rounded-[12px] bg-surface border px-3.5 py-3 text-[1rem] text-primary placeholder:text-secondary',
          'apple-transition apple-focus-ring resize-y',
          error ? 'border-status-error-fg' : 'border-hairline',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />

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
