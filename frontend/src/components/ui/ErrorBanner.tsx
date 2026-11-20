import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Try again',
  className = ''
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col gap-3 rounded-[14px] bg-status-error-bg px-4 py-3.5 text-status-error-fg sm:flex-row sm:items-center sm:justify-between',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-2.5 sm:items-center">
        <AlertCircle
          className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <p className="text-[0.9375rem] font-medium leading-snug">{message}</p>
      </div>

      {onRetry ? (
        <Button
          variant="outline"
          size="md"
          onClick={onRetry}
          className="shrink-0 self-start sm:self-auto"
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
