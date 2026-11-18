import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type Toast, type ToastKind } from '../../store/useToastStore';

const STYLES: Record<ToastKind, { icon: React.ElementType; color: string; border: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', border: 'border-emerald-500/40' },
  error: { icon: AlertCircle, color: 'text-red-500', border: 'border-red-500/40' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', border: 'border-amber-500/40' },
  info: { icon: Info, color: 'text-accent', border: 'border-accent/40' },
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const dismiss = useToastStore((s) => s.dismiss);
  const { icon: Icon, color, border } = STYLES[toast.kind];

  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto w-full max-w-md flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-card border ${border} shadow-xl text-xs text-foreground select-text`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold">{toast.title}</p>
        {toast.details && toast.details.length > 0 && (
          <ul className="mt-1 max-h-40 overflow-y-auto list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
            {toast.details.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              dismiss(toast.id);
            }}
            className="mt-1.5 font-semibold text-accent hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Close message"
        className="p-0.5 rounded text-muted-foreground hover:text-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/** Renders all toasts. Mounted once in App. */
export const ToastHost: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-3 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
};
