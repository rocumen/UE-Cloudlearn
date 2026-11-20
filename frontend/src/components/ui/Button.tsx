import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-fill text-accent-on hover:bg-accent-hover border border-transparent shadow-sm',
  secondary:
    'bg-subtle text-primary hover:opacity-90 border border-transparent',
  outline:
    'bg-surface text-primary border border-hairline hover:bg-subtle',
  ghost:
    'bg-transparent text-primary hover:bg-subtle border border-transparent',
  danger:
    'bg-status-error-bg text-status-error-fg border border-hairline hover:opacity-90'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-[44px] min-w-[44px] px-4 py-2 text-[0.9375rem]',
  lg: 'min-h-[48px] min-w-[44px] px-5 py-3 text-[1rem]',
  icon: 'h-[44px] w-[44px] min-h-[44px] min-w-[44px] p-0'
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  fullWidth = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[12px] font-medium leading-none select-none',
        'apple-transition apple-focus-ring active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2
            className="h-4 w-4 animate-spin shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
