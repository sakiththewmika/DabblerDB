import React from 'react';
import { Database, Moon, Plus, Redo2, RotateCcw, Sun, Undo2 } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { ModuleFilterBar } from './ModuleFilterBar';
import { SearchBox } from './SearchBox';
import { DialectSelect } from './DialectSelect';
import { TemplatesMenu } from './TemplatesMenu';
import { ImportMenu } from './ImportMenu';
import { ExportMenu } from './ExportMenu';

const iconButtonClass =
  'p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors';
const historyButtonClass =
  'p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors';

/** The top bar. Each part lives in its own file next to this one. */
export const TopToolbar: React.FC = () => {
  const theme = useSchemaStore((s) => s.theme);
  const toggleTheme = useSchemaStore((s) => s.toggleTheme);
  const addTable = useSchemaStore((s) => s.addTable);
  const resetToStarterSchema = useSchemaStore((s) => s.resetToStarterSchema);
  const undo = useSchemaStore((s) => s.undo);
  const redo = useSchemaStore((s) => s.redo);
  const canUndo = useSchemaStore((s) => s.past.length > 0);
  const canRedo = useSchemaStore((s) => s.future.length > 0);

  const handleReset = () => {
    if (window.confirm('Reset schema back to generic E-Commerce & Blog Starter? Any unsaved edits will be lost.')) {
      resetToStarterSchema();
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card/95 backdrop-blur-md px-3.5 flex items-center justify-between z-30 shrink-0 gap-3">
      {/* Brand + undo / redo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-foreground">DabblerDB</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-accent/10 text-accent font-medium">
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 pl-2 border-l border-border/80">
          <button type="button" onClick={undo} disabled={!canUndo} className={historyButtonClass} title="Undo (Ctrl/Cmd + Z)" aria-label="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} className={historyButtonClass} title="Redo (Ctrl/Cmd + Shift + Z)" aria-label="Redo">
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ModuleFilterBar />
      <SearchBox />

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <DialectSelect />

        <button
          type="button"
          onClick={() => addTable()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
          title="Add New Database Table (Shift + N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Table</span>
        </button>

        <TemplatesMenu />
        <ImportMenu />
        <ExportMenu />

        <button type="button" onClick={handleReset} className={iconButtonClass} title="Reset to Starter Schema" aria-label="Reset to starter schema">
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border mx-0.5" />

        <button
          type="button"
          onClick={toggleTheme}
          className={iconButtonClass}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle light and dark theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>
    </header>
  );
};
