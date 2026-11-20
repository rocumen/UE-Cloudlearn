import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function ModalSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer
}: ModalSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[4px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-t-[24px] sm:rounded-[20px] border border-hairline bg-surface shadow-sheet apple-transition">
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="min-w-0 pt-1">
            <h2
              id={titleId}
              className="text-[1.125rem] font-semibold tracking-[-0.01em] text-primary"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[0.875rem] text-secondary">
                {subtitle}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px] text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-hairline px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
