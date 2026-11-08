import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Search,
  Plus,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  X,
  Palette,
  Layers,
  Undo2,
  Redo2,
  HelpCircle,
  ChevronDown,
  FileCode,
  Image,
  FileJson,
  Share2,
  Check,
  ShoppingBag,
  Building2,
  FileText,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { downloadSqlScript } from '../../utils/sqlCompiler';
import { downloadSvgDiagram, downloadJsonSchema } from '../../utils/diagramExporter';
import { copyShareableUrlToClipboard } from '../../utils/urlShare';
import { STARTER_TEMPLATES } from '../../data/starterTemplates';

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
    loadTemplate,
    importSchemaJson,
    activeSidebarTab,
    setActiveSidebarTab,
    isSidebarCollapsed,
    past,
    future,
    undo,
    redo,
    setIsShortcutsModalOpen,
  } = useSchemaStore();

  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleColor, setNewModuleColor] = useState(PRESET_COLORS[0]);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const templatesMenuRef = useRef<HTMLDivElement>(null);
  const [isCopiedShare, setIsCopiedShare] = useState(false);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsAddModuleOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (templatesMenuRef.current && !templatesMenuRef.current.contains(e.target as Node)) {
        setIsTemplatesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    const ok = await copyShareableUrlToClipboard(tables, modules);
    if (ok) {
      setIsCopiedShare(true);
      setTimeout(() => setIsCopiedShare(false), 2200);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    loadTemplate(templateId);
    setIsTemplatesOpen(false);
  };

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
    downloadSqlScript(tables, 'postgres', 'dabblerdb_schema.sql');
    setIsExportMenuOpen(false);
  };

  const handleExportSvg = () => {
    downloadSvgDiagram(tables, modules, 'dabblerdb_diagram.svg');
    setIsExportMenuOpen(false);
  };

  const handleExportJson = () => {
    downloadJsonSchema(tables, modules, 'dabblerdb_workspace.json');
    setIsExportMenuOpen(false);
  };

  const handleImportJsonClick = () => {
    setIsExportMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.tables && Array.isArray(parsed.tables)) {
          importSchemaJson({
            tables: parsed.tables,
            modules: parsed.modules,
          });
        } else {
          alert('Invalid schema JSON file structure.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset file input value so re-selecting same file triggers change
    e.target.value = '';
  };

  const handleReset = () => {
    if (window.confirm('Reset schema back to generic E-Commerce & Blog Starter? Any unsaved edits will be lost.')) {
      resetToStarterSchema();
    }
  };

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return (
    <header className="h-14 border-b border-border bg-card/95 backdrop-blur-md px-3.5 flex items-center justify-between z-30 shrink-0 gap-3">
      {/* Hidden File Input for Importing JSON Workspace */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. App Branding & History Undo/Redo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
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

        {/* Undo / Redo Toolbar Buttons */}
        <div className="flex items-center gap-0.5 pl-2 border-l border-border/80">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Undo (Ctrl/Cmd + Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Redo (Ctrl/Cmd + Shift + Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
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

      {/* 3. Live Search Input with id="top-search-input" and Keyboard Hint */}
      <div className="relative flex-1 max-w-xs min-w-[140px]">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          id="top-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tables & columns..."
          className="w-full pl-8 pr-12 py-1.5 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent transition-all"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border/60 pointer-events-none">
            /
          </kbd>
        )}
      </div>

      {/* 4. Action Buttons, Export Menu, Shortcuts & Theme Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => addTable()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
          title="Add New Database Table (Shift + N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Table</span>
        </button>

        {/* Templates Dropdown */}
        <div className="relative" ref={templatesMenuRef}>
          <button
            type="button"
            onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shadow-2xs"
            title="Browse Starter Database Templates"
          >
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Templates</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {isTemplatesOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 p-1.5 rounded-xl bg-card border border-border shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
                Starter Schemas
              </div>
              {STARTER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleLoadTemplate(tpl.id)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted text-foreground transition-colors group cursor-pointer"
                >
                  <div className="p-1 rounded-md bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors shrink-0 mt-0.5">
                    {tpl.id === 'ecommerce' && <ShoppingBag className="w-3.5 h-3.5" />}
                    {tpl.id === 'saas' && <Building2 className="w-3.5 h-3.5" />}
                    {tpl.id === 'blog' && <FileText className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">{tpl.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {tpl.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share Button with Live Link Copied Indicator */}
        <button
          type="button"
          onClick={handleShare}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-2xs ${
            isCopiedShare
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 font-semibold'
              : 'border-border bg-card hover:bg-muted text-foreground'
          }`}
          title="Share Schema via URL Hash Link"
        >
          {isCopiedShare ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>

        {/* Export / Share Dropdown Menu */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shadow-2xs"
            title="Export / Share Schema"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 p-1.5 rounded-xl bg-card border border-border shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={handleExportSql}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted text-foreground transition-colors font-medium"
              >
                <FileCode className="w-4 h-4 text-blue-500" />
                <div className="flex-1">
                  <div>Export .sql</div>
                  <div className="text-[10px] text-muted-foreground">PostgreSQL / SQL DDL</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportSvg}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted text-foreground transition-colors font-medium"
              >
                <Image className="w-4 h-4 text-emerald-500" />
                <div className="flex-1">
                  <div>Export SVG Diagram</div>
                  <div className="text-[10px] text-muted-foreground">For GitHub READMEs</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted text-foreground transition-colors font-medium"
              >
                <FileJson className="w-4 h-4 text-amber-500" />
                <div className="flex-1">
                  <div>Export JSON Workspace</div>
                  <div className="text-[10px] text-muted-foreground">Full project backup</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleShare();
                  setIsExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted text-foreground transition-colors font-medium"
              >
                <Share2 className="w-4 h-4 text-cyan-500" />
                <div className="flex-1">
                  <div>Share via URL Link</div>
                  <div className="text-[10px] text-muted-foreground">Copy hash link to clipboard</div>
                </div>
              </button>

              <div className="h-px bg-border my-1" />

              <button
                type="button"
                onClick={handleImportJsonClick}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted text-foreground transition-colors font-medium"
              >
                <Upload className="w-4 h-4 text-purple-500" />
                <div className="flex-1">
                  <div>Import JSON Workspace</div>
                  <div className="text-[10px] text-muted-foreground">Load from file</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Reset to Starter Schema"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Keyboard Shortcuts Trigger Button */}
        <button
          type="button"
          onClick={() => setIsShortcutsModalOpen(true)}
          className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
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
