import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';
import { ModalSheet } from './ModalSheet';

export interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  error?: string | null;
}

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  error = null
}: ConfirmSheetProps) {
  return (
    <ModalSheet
      open={open}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={() => void onConfirm()}
            isLoading={isLoading}
            loadingText="Processing..."
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[0.9375rem] leading-relaxed text-secondary">
          {description}
        </p>
        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </ModalSheet>
  );
}
