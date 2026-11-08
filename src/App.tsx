import { Database, Sparkles, Moon, Sun, Layers, Table as TableIcon } from 'lucide-react';
import { useSchemaStore } from './store/useSchemaStore';

export default function App() {
  const { tables, modules, theme, toggleTheme, lastSavedAt } = useSchemaStore();

  const totalColumns = tables.reduce((acc, table) => acc + table.columns.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 select-none transition-colors duration-200">
      <div className="max-w-xl w-full bg-card border border-border rounded-2xl p-8 shadow-sm">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">DabblerDB</h1>
              <p className="text-xs text-muted-foreground">Local-first Visual Schema Studio</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-border/50 text-xs font-medium transition-colors"
            title="Toggle Light / Dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            <span className="capitalize">{theme} Mode</span>
          </button>
        </div>

        {/* Modules & Stats */}
        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Schema Modules</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {modules.length} Modules
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {modules.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs bg-muted/50"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground text-[10px]">
                  ({tables.filter((t) => t.moduleId === m.id).length} tables)
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-border bg-muted/30 flex items-center gap-3">
              <TableIcon className="w-5 h-5 text-accent" />
              <div>
                <div className="text-lg font-bold">{tables.length}</div>
                <div className="text-xs text-muted-foreground">Total Tables</div>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-muted/30 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <div>
                <div className="text-lg font-bold">{totalColumns}</div>
                <div className="text-xs text-muted-foreground">Total Columns</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Auto-saved to localStorage</span>
          <span className="font-mono text-[11px]">
            {new Date(lastSavedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
