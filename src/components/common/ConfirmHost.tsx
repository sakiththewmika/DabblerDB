import React, { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useConfirmStore } from '../../store/useConfirmStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/** The dialog itself. It only exists while a question is open, so focus handling starts and stops with it. */
export const ConfirmDialog: React.FC = () => {
  const request = useConfirmStore((s) => s.request);
  const answer = useConfirmStore((s) => s.answer);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  if (!request) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) answer(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          answer(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5 select-text"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${request.danger ? 'bg-red-500/10 text-red-600 dark:text-red-500' : 'bg-accent/10 text-accent'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="confirm-title" className="text-sm font-bold text-foreground">
              {request.title}
            </h2>
            <p id="confirm-message" className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {request.message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => answer(false)}
            className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors ${
              request.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Shows the confirm dialog when a question is waiting. Mounted once in App. */
export const ConfirmHost: React.FC = () => {
  const open = useConfirmStore((s) => s.request !== null);
  return open ? <ConfirmDialog /> : null;
};
