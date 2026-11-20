import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  variant?: ToastVariant;
}

interface ToastItem {
  id: number;
  title: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
} as const;

const TOAST_ICON_COLORS: Record<ToastVariant, string> = {
  success: 'text-status-success-fg',
  error: 'text-status-error-fg',
  info: 'text-accent'
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, variant = 'info' }: ToastInput) => {
      const id = nextIdRef.current++;
      setToasts((prev) => [
        ...prev.filter((item) => item.title !== title).slice(-1),
        { id, title, variant }
      ]);
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, 4000);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-[380px] lg:bottom-6"
      >
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex items-center justify-between gap-2 rounded-[14px] border border-hairline bg-surface py-2 pl-3.5 pr-1.5 shadow-sheet apple-transition"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon
                  className={`h-5 w-5 shrink-0 ${TOAST_ICON_COLORS[toast.variant]}`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <p className="truncate text-[0.9375rem] font-medium text-primary">
                  {toast.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
