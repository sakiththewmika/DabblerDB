import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  /** One or two sentences about what will happen. */
  message: string;
  /** Text of the main button. Say what it does ("Reset"), not "OK". */
  confirmLabel: string;
  /** Colors the main button red. Use it when the action replaces or removes a lot. */
  danger?: boolean;
}

interface ConfirmState {
  /** The question currently on screen, or null. */
  request: (ConfirmOptions & { resolve: (answer: boolean) => void }) | null;
  /** Used by the dialog's buttons. */
  answer: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  answer: (value) => {
    get().request?.resolve(value);
    set({ request: null });
  },
}));

/**
 * An in-app replacement for window.confirm. Resolves to true when the person confirms.
 *
 *   if (await confirmDialog({ title: 'Reset?', message: '...', confirmLabel: 'Reset' })) { ... }
 *
 * Only use it for actions that replace the whole schema. For smaller deletes, do the change
 * and offer Undo instead (see doWithUndo).
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // A new question replaces an unanswered one, which counts as "no"
  useConfirmStore.getState().request?.resolve(false);
  return new Promise((resolve) => {
    useConfirmStore.setState({ request: { ...options, resolve } });
  });
}
