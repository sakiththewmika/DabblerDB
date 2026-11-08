import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Search,
  Plus,
  Download,
  RotateCcw,
  Sun,
  Moon,
  X,
  Palette,
  Layers,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { downloadSqlScript } from '../../utils/sqlCompiler';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#64748b', // Slate
];

export const TopToolbar: React.FC = () => {
  const {
    tables,
    modules,
    theme,
    toggleTheme,
    activeModuleFilter,
    setActiveModuleFilter,
    searchQuery,
    setSearchQuery,
    addTable,
    addModule,
    resetToStarterSchema,
    activeSidebarTab,
    setActiveSidebarTab,
    isSidebarCollapsed,
  } = useSchemaStore();

  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleColor, setNewModuleColor] = useState(PRESET_COLORS[0]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close module popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsAddModuleOpen(false);
      }
    };
    if (isAddModuleOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddModuleOpen]);

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    addModule({
      name: newModuleName.trim(),
      color: newModuleColor,
    });
    setNewModuleName('');
    setIsAddModuleOpen(false);
  };

  const handleExportSql = () => {
    downloadSqlScript(tables, 'postgres', 'schema.sql');
  };

  const handleReset = () => {
    if (window.confirm('Reset schema back to generic E-Commerce & Blog Starter? Any unsaved edits will be lost.')) {
      resetToStarterSchema();
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card/95 backdrop-blur-md px-3.5 flex items-center justify-between z-30 shrink-0 gap-3">
      {/* 1. App Branding */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="p-2 rounded-xl bg-accent/10 text-accent">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-foreground">
              DabblerDB
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-accent/10 text-accent font-medium">
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground hidden sm:block">
            Visual Database Schema Designer
          </p>
        </div>
      </div>

      {/* 2. Color-Coded Module Filter Pills & + Module Popover */}
      <div className="hidden lg:flex items-center gap-1 px-1.5 py-1 rounded-xl bg-muted/60 border border-border/60 shrink-0">
        <button
          type="button"
          onClick={() => setActiveModuleFilter(null)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            activeModuleFilter === null
              ? 'bg-card text-foreground shadow-xs border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({tables.length})
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
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              <span>{m.name}</span>
              <span className="text-[10px] text-muted-foreground">({count})</span>
            </button>
          );
        })}

        {/* Manage Modules shortcut button */}
        <button
          type="button"
          onClick={() => setActiveSidebarTab('modules')}
          className={`p-1 rounded-lg text-xs transition-colors ${
            activeSidebarTab === 'modules' && !isSidebarCollapsed
              ? 'bg-accent/15 text-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Open Module Manager in Sidebar"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        {/* + Module Popover Button */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setIsAddModuleOpen(!isAddModuleOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Create Custom Module"
          >
            <Plus className="w-3 h-3" />
            <span>Module</span>
          </button>

          {isAddModuleOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 p-3 rounded-xl bg-card border border-border shadow-xl z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-accent" />
                  New Module Group
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddModuleOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateModule} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Module Name
                  </label>
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    placeholder="e.g. Analytics, Billing"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                    Theme Color
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewModuleColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          newModuleColor === c ? 'scale-125 ring-2 ring-foreground ring-offset-2 ring-offset-card' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newModuleName.trim()}
                  className="w-full py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-xs"
                >
                  Create Module
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 3. Live Search Input with Explicit Theme-Aware Classes */}
      <div className="relative flex-1 max-w-xs min-w-[140px]">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tables & columns..."
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Action Buttons & Theme Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => addTable()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
          title="Add New Database Table"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Table</span>
        </button>

        <button
          type="button"
          onClick={handleExportSql}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
          title="Export Schema as .sql DDL file"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Export .sql</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Reset to Starter Schema"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border mx-0.5" />

        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
  );
};
