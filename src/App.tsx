import {
  Database,
  Moon,
  Sun,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useSchemaStore } from './store/useSchemaStore';
import { SchemaCanvas } from './components/canvas/SchemaCanvas';

export default function App() {
  const {
    tables,
    modules,
    theme,
    toggleTheme,
    activeModuleFilter,
    setActiveModuleFilter,
  } = useSchemaStore();

  const totalColumns = tables.reduce((acc, table) => acc + table.columns.length, 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-border bg-card/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight">DabblerDB</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-accent/10 text-accent font-medium">
                studio
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Visual Database Schema Designer
            </p>
          </div>
        </div>

        {/* Center: Module Filter Pills */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-muted/60 border border-border/60">
          <button
            type="button"
            onClick={() => setActiveModuleFilter(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeModuleFilter === null
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Tables ({tables.length})
          </button>

          {modules.map((m) => {
            const count = tables.filter((t) => t.moduleId === m.id).length;
            const isActive = activeModuleFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModuleFilter(isActive ? null : m.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-card text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span>{m.name}</span>
                <span className="text-[10px] text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Stats & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground border-r border-border/80 pr-3">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-accent" />
              {tables.length} tables
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {totalColumns} columns
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <main className="flex-1 w-full h-full relative overflow-hidden">
        <SchemaCanvas />
      </main>
    </div>
  );
}
