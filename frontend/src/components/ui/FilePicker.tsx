import { useId, useRef, type ChangeEvent } from 'react';
import { AlertCircle, FileText, Upload, X } from 'lucide-react';
import {
  ALLOWED_FILE_ACCEPT,
  formatFileSize,
  validateUploadFile
} from '../../lib/formatters';

export interface FilePickerProps {
  label: string;
  file: File | null;
  onChange: (file: File | null, validationError: string | null) => void;
  existingFileName?: string | null;
  helperText?: string;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
}

export function FilePicker({
  label,
  file,
  onChange,
  existingFileName,
  helperText = 'Max 15 MB · PDF, DOCX, PPTX, XLSX, TXT, PNG, JPG, ZIP',
  error,
  disabled = false,
  required = false
}: FilePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) {
      onChange(null, required ? 'Please select a file to upload.' : null);
      return;
    }

    const validationError = validateUploadFile(picked, required);
    if (validationError) {
      onChange(null, validationError);
      event.target.value = '';
      return;
    }

    onChange(picked, null);
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onChange(null, null);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-[0.875rem] font-medium text-primary"
      >
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ALLOWED_FILE_ACCEPT}
        onChange={handleFileChange}
        disabled={disabled}
        className="peer sr-only"
      />

      {file ? (
        <div className="flex min-h-[56px] items-center justify-between gap-3 rounded-[12px] border border-hairline bg-surface px-3.5 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
              <FileText
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium text-primary">
                {file.name}
              </p>
              <p className="text-[0.8125rem] text-secondary">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Remove selected file"
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={[
            'flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-[12px] border border-dashed px-4 py-3 apple-transition peer-focus-visible:border-accent',
            error ? 'border-status-error-fg bg-status-error-bg' : 'border-hairline bg-surface hover:bg-subtle',
            disabled ? 'cursor-not-allowed opacity-60' : ''
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-subtle text-secondary">
              <Upload
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium text-primary">
                {existingFileName
                  ? `Replace current file (${existingFileName})`
                  : 'Choose a file to upload'}
              </p>
              <p className="truncate text-[0.8125rem] text-secondary">
                {helperText}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[0.875rem] font-medium text-accent">
            Browse
          </span>
        </label>
      )}

      {error ? (
        <p
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
      ) : null}
    </div>
  );
}
