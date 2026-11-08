import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';

const SHORTCUT_GROUPS = [
  {
    category: 'History & Editing',
    items: [
      { keys: ['⌘ / Ctrl', 'Z'], description: 'Undo last change' },
      { keys: ['⌘ / Ctrl', '⇧', 'Z'], description: 'Redo change' },
      { keys: ['⌘ / Ctrl', 'Y'], description: 'Redo change (alt)' },
    ],
  },
  {
    category: 'Table Operations',
    items: [
      { keys: ['⇧', 'N'], description: 'Create new table' },
      { keys: ['⌘ / Ctrl', 'D'], description: 'Duplicate selected table' },
      { keys: ['Delete', '⌫'], description: 'Delete selected table' },
      { keys: ['Esc'], description: 'Deselect table / close panel' },
      { keys: ['Double-Click'], description: 'Inline edit table or column' },
    ],
  },
  {
    category: 'Canvas & Navigation',
    items: [
      { keys: ['⌘ / Ctrl', 'K'], description: 'Focus search bar' },
      { keys: ['/'], description: 'Focus search bar (quick)' },
      { keys: ['Drag'], description: 'Pan canvas viewport' },
      { keys: ['Scroll'], description: 'Zoom in / out (25% to 180%)' },
      { keys: ['?'], description: 'Open this shortcuts cheatsheet' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setIsShortcutsModalOpen } = useSchemaStore();

  if (!isShortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Keyboard Shortcuts</span>
                <Command className="w-3.5 h-3.5 text-muted-foreground" />
              </h2>
              <p className="text-xs text-muted-foreground">
                Speed up schema modeling with power-user hotkeys.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(false)}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {group.category}
              </h3>

              <div className="divide-y divide-border/50 border border-border/80 rounded-xl overflow-hidden bg-muted/20">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="text-foreground/90 font-medium">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-card border border-border shadow-2xs text-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 text-center text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px]">Esc</kbd> anytime to close
        </div>
      </div>
    </div>
  );
};

