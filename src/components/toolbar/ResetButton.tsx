import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { confirmDialog } from '../../store/useConfirmStore';

/** Resets the canvas to the starter schema, after asking. Icon only, or with a label inside the phone menu. */
export const ResetButton: React.FC<{ showLabel?: boolean }> = ({ showLabel = false }) => {
  const resetToStarterSchema = useSchemaStore((s) => s.resetToStarterSchema);

  const handleReset = async () => {
    const confirmed = await confirmDialog({
      title: 'Reset to the starter schema?',
      message: 'This replaces everything on the canvas with the E-Commerce & Blog example. You can still undo it with Ctrl/Cmd + Z.',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (confirmed) resetToStarterSchema();
  };

  return (
    <button
      type="button"
      onClick={() => void handleReset()}
      className="flex items-center gap-1.5 p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
      title="Reset to Starter Schema"
      aria-label="Reset to starter schema"
    >
      <RotateCcw className="w-4 h-4" aria-hidden="true" />
      {showLabel && <span>Reset to starter schema</span>}
    </button>
  );
};
