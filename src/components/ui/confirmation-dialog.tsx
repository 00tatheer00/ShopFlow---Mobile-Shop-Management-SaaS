import React from 'react';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  children,
}: ConfirmationDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  let iconBg = 'bg-destructive/10 text-destructive';
  let confirmBtnClass = 'bg-destructive text-white hover:bg-destructive/90 shadow-xs shadow-destructive/20';
  let Icon = AlertCircle;

  if (variant === 'warning') {
    iconBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    confirmBtnClass = 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs shadow-amber-600/20';
    Icon = AlertTriangle;
  } else if (variant === 'primary') {
    iconBg = 'bg-primary/10 text-primary';
    confirmBtnClass = 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs shadow-primary/20';
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="flex items-start gap-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 id="dialog-title" className="text-base font-bold text-foreground tracking-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {children && <div className="pt-1">{children}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 ${confirmBtnClass}`}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
