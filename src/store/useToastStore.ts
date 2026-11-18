import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** One short sentence. */
  title: string;
  /** Optional list of extra lines (for example SQL features that were skipped). */
  details?: string[];
  /** Optional button, for example "Undo". */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it closes by itself. 0 keeps it until the user closes it. */
  duration?: number;
}

export interface Toast extends ToastOptions {
  id: number;
  kind: ToastKind;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  show: (kind: ToastKind, options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const MAX_VISIBLE = 4;
let nextId = 1;

/** Messages with extra details stay until closed, so people have time to read them. */
function defaultDuration(kind: ToastKind, options: ToastOptions): number {
  if (options.details && options.details.length > 0) return 0;
  return kind === 'error' ? 8000 : 4500;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (kind, options) => {
    const id = nextId++;
    const toast: Toast = { ...options, id, kind, duration: options.duration ?? defaultDuration(kind, options) };
    set((state) => ({ toasts: [...state.toasts, toast].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Use from anywhere (components, utilities, event handlers):
 *   toast.success('Saved');
 *   toast.error('Could not read file', { details: ['Line 3 is broken'] });
 */
const make = (kind: ToastKind) => (title: string, options: Omit<ToastOptions, 'title'> = {}) =>
  useToastStore.getState().show(kind, { ...options, title });

export const toast = {
  success: make('success'),
  error: make('error'),
  warning: make('warning'),
  info: make('info'),
};
