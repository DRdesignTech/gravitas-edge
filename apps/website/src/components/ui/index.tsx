'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Button                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const baseButton =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C8943E] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#061B36] text-[#FFFEFA] shadow-sm hover:bg-[#071A35] dark:bg-brand-400 dark:text-[#061B36] dark:hover:bg-brand-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm transition-all duration-200',
  secondary:
    'bg-[#FFF3D9] text-[#061B36] hover:bg-[#FFEFCB] dark:bg-brand-950 dark:text-brand-200 dark:hover:bg-brand-900 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm transition-all duration-200',
  outline:
    'border border-line bg-surface text-content hover:border-[#C8943E] hover:bg-surface-muted hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 active:translate-y-0 transition-all duration-200',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500 focus-visible:ring-offset-surface',
  ghost:
    'bg-transparent text-content-muted hover:bg-surface-muted hover:text-content focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 transition-all duration-200',
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
      className={`${baseButton} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Input / Select / Textarea (shared field shell)                     */
/* ------------------------------------------------------------------ */

const fieldBase =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-content shadow-sm transition placeholder:text-content-faint focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500';

function fieldError(error?: string) {
  return error ? '!border-red-500 focus:!ring-red-500/50' : 'border-line focus:border-brand-500';
}

export function FieldLabel({
  label,
  required,
  children,
}: {
  label?: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  if (!label) return children ? <>{children}</> : null;
  return (
    <label className="mb-1.5 block text-sm font-medium text-content">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className = '', trailing, ...props }, ref) => {
    return (
      <div className="w-full">
        <FieldLabel label={label} required={required} />
        <div className="relative">
          <input
            ref={ref}
            required={required}
            aria-invalid={!!error}
            className={`${fieldBase} ${fieldError(error)} ${trailing ? 'pr-11' : ''} ${className}`}
            {...props}
          />
          {trailing && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>
          )}
        </div>
        <FieldError error={error} />
      </div>
    );
  },
);
Input.displayName = 'Input';

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
        <FieldLabel label={label} />
        <div className="relative">
          <select
            ref={ref}
            className={`${fieldBase} ${fieldError(error)} appearance-none pr-10 ${className}`}
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
          <svg
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <FieldError error={error} />
      </div>
    );
  },
);
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <FieldLabel label={label} />
        <textarea
          ref={ref}
          className={`${fieldBase} ${fieldError(error)} ${className}`}
          {...props}
        />
        <FieldError error={error} />
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

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
      className={`rounded-2xl border border-line bg-surface shadow-card dark:bg-surface-elevated ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h3 className="text-base font-semibold text-content">{title}</h3>
          {action}
        </div>
      )}
      <div className={padding ? 'px-6 py-5' : ''}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge / StatusBadge / AccessBadge                                  */
/* ------------------------------------------------------------------ */

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'premium';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const badgeClasses: Record<BadgeVariant, string> = {
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400',
  neutral: 'bg-slate-50 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-300',
  premium: 'bg-[#A77931] text-white ring-[#A77931]/40',
};

export function Badge({ variant = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Map a raw status string to a Badge variant. */
export function statusVariant(status?: string | null): BadgeVariant {
  const s = (status || '').toUpperCase();
  if (
    s === 'ACTIVE' ||
    s === 'PUBLISHED' ||
    s === 'SUCCESS' ||
    s === 'SUCCESSFUL' ||
    s === 'UNLOCKED' ||
    s === 'APPROVED' ||
    s === 'PAID'
  )
    return 'success';
  if (s === 'PENDING' || s === 'DRAFT' || s === 'INACTIVE' || s === 'EXPIRING') return 'warning';
  if (
    s === 'EXPIRED' ||
    s === 'CANCELLED' ||
    s === 'FAILED' ||
    s === 'ARCHIVED' ||
    s === 'SUSPENDED' ||
    s === 'LOCKED' ||
    s === 'INVALID' ||
    s === 'REJECTED'
  )
    return 'danger';
  return 'neutral';
}

export function StatusBadge({ status }: { status?: string | null }) {
  return <Badge variant={statusVariant(status)}>{status || '—'}</Badge>;
}

export function AccessBadge({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <Badge variant="danger" className="!gap-1">
        <LockIcon className="h-3 w-3" /> Locked
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="!gap-1">
      <UnlockIcon className="h-3 w-3" /> Unlocked
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons (small set)                                                  */
/* ------------------------------------------------------------------ */

export function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

export function UnlockIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative mx-0 w-full sm:mx-4 ${maxWidth} max-h-[92vh] overflow-y-auto rounded-t-2xl bg-surface shadow-pop dark:bg-surface-elevated sm:rounded-2xl`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-lg font-semibold text-content">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1 text-content-faint hover:bg-surface-muted hover:text-content"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

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

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  label: string;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey?: (item: T) => string;
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No data found',
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-muted dark:bg-surface-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-content-muted"
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
                className="px-5 py-10 text-center text-sm text-content-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr
                key={rowKey ? rowKey(item) : idx}
                className="transition-colors hover:bg-surface-muted"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`whitespace-nowrap px-5 py-3.5 text-sm text-content ${col.className || ''}`}
                  >
                    {col.render ? col.render(item) : (item[col.key] as React.ReactNode)}
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

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-line dark:bg-surface-elevated dark:opacity-70 ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

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

const toastColors: Record<ToastType, string> = {
  success: 'border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200',
  error: 'border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-200',
  info: 'border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200',
  warning: 'border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200',
};

const toastDot: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, 4500);
  }, []);

  useEffect(() => {
    const current = timers.current;
    return () => {
      Object.values(current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) clearTimeout(timers.current[id]);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5 sm:right-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm shadow-pop dark:bg-surface-elevated ${toastColors[toast.type]}`}
          >
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${toastDot[toast.type]}`} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
              className="rounded p-0.5 opacity-60 hover:opacity-100"
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

/* ------------------------------------------------------------------ */
/*  Pagination                                                         */
/* ------------------------------------------------------------------ */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
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
    'inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-content hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav className={`flex flex-wrap items-center justify-center gap-1 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={arrowCls}
      >
        <ChevronIcon className="h-4 w-4" flip /> Previous
      </button>
      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={`dots-${i}`} className="px-1 py-2 text-sm text-content-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              p === currentPage
                ? 'bg-brand-600 text-white shadow-sm'
                : 'border border-line bg-surface text-content hover:bg-surface-muted'
            }`}
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
        Next <ChevronIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}

function ChevronIcon({ className = 'h-4 w-4', flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={`${className} ${flip ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState                                                         */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-content-faint dark:bg-surface-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-content">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-content-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ErrorState                                                         */
/* ------------------------------------------------------------------ */

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "We couldn't load this information",
  message = 'Please refresh and try again.',
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10">
        <AlertIcon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-content">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-content-muted">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="outline" size="md" onClick={onRetry}>
            <RefreshIcon className="h-4 w-4" /> {retryLabel}
          </Button>
        </div>
      )}
    </div>
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
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

export function RefreshIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
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

/* ------------------------------------------------------------------ */
/*  Alert (inline banner)                                              */
/* ------------------------------------------------------------------ */

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const alertClasses: Record<AlertVariant, string> = {
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
};

export function Alert({ variant = 'info', title, children, className = '' }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${alertClasses[variant]} ${className}`}
    >
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-snug">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ViewToggle (grid / list)                                           */
/* ------------------------------------------------------------------ */

export function GridIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

export function ListIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

export function SlidersIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
      />
    </svg>
  );
}

interface ViewToggleProps {
  value: 'grid' | 'list';
  onChange: (value: 'grid' | 'list') => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className = '' }: ViewToggleProps) {
  const active = 'bg-brand-600 text-white shadow-sm dark:bg-brand-500';
  const idle =
    'text-content-muted hover:bg-surface-muted hover:text-content dark:text-content-faint dark:hover:text-content';
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5 shadow-sm ${className}`}
      role="group"
      aria-label="Choose view layout"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={value === 'grid'}
        title="Grid view"
        className={`inline-flex h-8 w-9 items-center justify-center rounded-lg transition-colors ${
          value === 'grid' ? active : idle
        }`}
      >
        <GridIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={value === 'list'}
        title="List view"
        className={`inline-flex h-8 w-9 items-center justify-center rounded-lg transition-colors ${
          value === 'list' ? active : idle
        }`}
      >
        <ListIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PageHeader                                                         */
/* ------------------------------------------------------------------ */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-content-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LoadingSpinner (full block)                                        */
/* ------------------------------------------------------------------ */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const spinnerSizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Spinner className={`${spinnerSizes[size]} text-brand-600 dark:text-brand-400`} />
      {label && <p className="mt-3 text-sm text-content-muted">{label}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ConfirmDialog                                                      */
/* ------------------------------------------------------------------ */

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
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-content-muted">{message}</p>
    </Modal>
  );
}
