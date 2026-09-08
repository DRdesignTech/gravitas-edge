'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* ---------- Icons ---------- */
export function CloseIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function AlertIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

export function RefreshIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

export function MoreIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </svg>
  );
}

/* ---------- Button ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400',
  secondary:
    'bg-surface-muted text-content hover:bg-line focus-visible:ring-line-strong dark:bg-surface-elevated dark:hover:bg-line',
  outline:
    'border border-line-strong bg-transparent text-content hover:bg-surface-muted focus-visible:ring-line-strong dark:border-line',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost:
    'bg-transparent text-content-muted hover:bg-surface-muted hover:text-content focus-visible:ring-line-strong',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-surface',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ---------- Field wrapper ---------- */
const fieldLabel = 'mb-1.5 block text-sm font-medium text-content';
const fieldError = 'mt-1.5 text-xs text-red-600 dark:text-red-400';
const fieldInput =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-content shadow-sm placeholder:text-content-faint focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-line dark:bg-surface-elevated dark:focus:border-brand-400';

/* ---------- Input ---------- */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className={fieldLabel}>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          required={required}
          className={cn(
            fieldInput,
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
            className,
          )}
          {...props}
        />
        {error && <p className={fieldError}>{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

/* ---------- Select ---------- */
export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className={fieldLabel}>{label}</label>}
        <select
          ref={ref}
          className={cn(fieldInput, error ? 'border-red-500' : '', className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className={fieldError}>{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

/* ---------- Textarea ---------- */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className={fieldLabel}>{label}</label>}
        <textarea
          ref={ref}
          className={cn(fieldInput, error ? 'border-red-500' : '', className)}
          {...props}
        />
        {error && <p className={fieldError}>{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

/* ---------- Card ---------- */
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  padding?: boolean;
}

export function Card({ title, children, className = '', action, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface shadow-card dark:bg-surface-elevated',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="text-base font-semibold text-content">{title}</h3>
          {action}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

/* ---------- Badge ---------- */
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const badgeClasses: Record<BadgeVariant, string> = {
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  warning:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  danger:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20',
  neutral:
    'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-gray-400/20',
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeClasses[variant],
      )}
    >
      {children}
    </span>
  );
}

const STATUS_KEYS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  PUBLISHED: 'success',
  COMPLETED: 'success',
  SUCCESS: 'success',
  VERIFIED: 'success',
  PENDING: 'warning',
  INACTIVE: 'neutral',
  EXPIRED: 'warning',
  DRAFT: 'neutral',
  CANCELLED: 'danger',
  FAILED: 'danger',
  SUSPENDED: 'danger',
  ARCHIVED: 'neutral',
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <Badge variant="neutral">—</Badge>;
  return <Badge variant={STATUS_KEYS[value.toUpperCase()] ?? 'neutral'}>{value}</Badge>;
}

/* ---------- Alert ---------- */
type AlertVariant = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const alertClasses: Record<AlertVariant, string> = {
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300',
};

const alertDot: Record<AlertVariant, string> = {
  error: 'bg-red-500',
  success: 'bg-emerald-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
};

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm',
        alertClasses[variant],
        className,
      )}
    >
      <AlertIcon className={cn('mt-0.5 h-4 w-4 shrink-0', alertDot[variant])} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ---------- Modal ---------- */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-pop dark:bg-surface-elevated sm:max-h-[90vh] sm:rounded-2xl',
          width,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-lg font-semibold text-content">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1 text-content-faint transition hover:bg-surface-muted hover:text-content"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- Table ---------- */
export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No data found',
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-muted dark:bg-surface">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-content-muted"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface dark:bg-surface-elevated">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-content-faint"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={idx} className="transition-colors hover:bg-surface-muted">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-content">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Skeleton ---------- */
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-line dark:bg-surface-elevated dark:opacity-70',
        className,
      )}
    />
  );
}

/* ---------- Toast ---------- */
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

let toastId = 0;

const toastMeta: Record<ToastType, { cls: string; dot: string }> = {
  success: {
    cls: 'border-emerald-200 bg-surface text-content dark:border-emerald-900 dark:bg-surface-elevated',
    dot: 'bg-emerald-500',
  },
  error: {
    cls: 'border-red-200 bg-surface text-content dark:border-red-900 dark:bg-surface-elevated',
    dot: 'bg-red-500',
  },
  info: {
    cls: 'border-brand-200 bg-surface text-content dark:border-brand-900 dark:bg-surface-elevated',
    dot: 'bg-brand-500',
  },
  warning: {
    cls: 'border-amber-200 bg-surface text-content dark:border-amber-900 dark:bg-surface-elevated',
    dot: 'bg-amber-500',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = React.useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      Object.values(map).forEach((t) => clearTimeout(t));
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }].slice(-4));
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-pop',
              toastMeta[toast.type].cls,
            )}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', toastMeta[toast.type].dot)} />
            <span className="flex-1 text-content">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
              className="rounded p-0.5 text-content-faint transition hover:bg-surface-muted hover:text-content"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ---------- Pagination ---------- */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const arrowCls =
    'rounded-lg px-3 py-2 text-sm font-medium text-content-muted hover:bg-surface-muted dark:hover:bg-line disabled:cursor-not-allowed disabled:opacity-40';
  const pageCls = (active: boolean) =>
    cn(
      'min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium',
      active
        ? 'bg-brand-600 text-white dark:bg-brand-500'
        : 'text-content-muted hover:bg-surface-muted dark:hover:bg-line',
    );

  return (
    <nav className="mt-6 flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={arrowCls}
      >
        Previous
      </button>
      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={`dots-${i}`} className="px-2 py-2 text-sm text-content-faint">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={pageCls(p === currentPage)}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={arrowCls}
      >
        Next
      </button>
    </nav>
  );
}

/* ---------- EmptyState ---------- */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-content-faint dark:bg-line/40">
        {icon ?? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-content">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-content-muted">{description}</p>}
    </div>
  );
}

/* ---------- ErrorState ---------- */
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <AlertIcon />
      </div>
      <h3 className="font-semibold text-content">Unable to load</h3>
      <p className="mt-1 max-w-sm text-sm text-content-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshIcon className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}

/* ---------- PageHeader ---------- */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- LoadingSpinner ---------- */
export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-content-muted">
      <Spinner className="h-8 w-8 text-brand-600 dark:text-brand-400" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}

/* ---------- ConfirmDialog ---------- */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-content-muted">{message}</p>
    </Modal>
  );
}

/* ---------- ActionMenu ---------- */
export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
  label?: string;
}

export function ActionMenu({ items, className = '', label = 'Actions' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-content-muted transition hover:bg-surface-muted hover:text-content dark:hover:bg-line"
      >
        <MoreIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-36 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop dark:bg-surface-elevated">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cn(
                'block w-full px-4 py-2 text-left text-sm transition hover:bg-surface-muted dark:hover:bg-line',
                item.danger ? 'text-red-600 dark:text-red-400' : 'text-content',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
