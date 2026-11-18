import React, { useRef, useState } from 'react';
import { Layers, Palette, Plus, X } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { useClickOutside } from '../../hooks/useClickOutside';
import { MODULE_COLORS } from '../../data/moduleColors';

const pillClass = (active: boolean) =>
  `flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
    active
      ? 'bg-card text-foreground shadow-xs border border-border/80'
      : 'text-muted-foreground hover:text-foreground'
  }`;

/** "+ Module" button and its small form. */
const AddModulePopover: React.FC = () => {
  const addModule = useSchemaStore((s) => s.addModule);
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useClickOutside(ref, open, () => setOpen(false));
  const [name, setName] = useState('');
  const [color, setColor] = useState(MODULE_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addModule({ name: name.trim(), color });
    setName('');
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Create Custom Module"
      >
        <Plus className="w-3 h-3" />
        <span>Module</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 p-3 rounded-xl bg-card border border-border shadow-xl z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-accent" />
              New Module Group
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Module Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Analytics, Billing"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Theme Color</label>
              <div className="flex flex-wrap gap-1.5">
                {MODULE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Use color ${c}`}
                    aria-pressed={color === c}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-foreground ring-offset-2 ring-offset-card' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-xs"
            >
              Create Module
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/** Row of module pills that filter the canvas, plus "manage" and "+ Module". */
export const ModuleFilterBar: React.FC = () => {
  const tables = useSchemaStore((s) => s.tables);
  const modules = useSchemaStore((s) => s.modules);
  const activeModuleFilter = useSchemaStore((s) => s.activeModuleFilter);
  const setActiveModuleFilter = useSchemaStore((s) => s.setActiveModuleFilter);
  const activeSidebarTab = useSchemaStore((s) => s.activeSidebarTab);
  const setActiveSidebarTab = useSchemaStore((s) => s.setActiveSidebarTab);
  const isSidebarCollapsed = useSchemaStore((s) => s.isSidebarCollapsed);

  const isManaging = activeSidebarTab === 'modules' && !isSidebarCollapsed;

  return (
    <div className="hidden lg:flex items-center gap-1 px-1.5 py-1 rounded-xl bg-muted/60 border border-border/60 shrink-0">
      <button type="button" onClick={() => setActiveModuleFilter(null)} className={pillClass(activeModuleFilter === null)}>
        All ({tables.length})
      </button>

      {/* Scrollable: about 3 names are visible, the rest scroll sideways */}
      <div className="max-w-[280px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex items-center gap-1 py-0.5">
        {modules.map((m) => {
          const isActive = activeModuleFilter === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModuleFilter(isActive ? null : m.id)}
              className={pillClass(isActive)}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              <span>{m.name}</span>
              <span className="text-[10px] text-muted-foreground">
                ({tables.filter((t) => t.moduleId === m.id).length})
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setActiveSidebarTab('modules')}
        className={`p-1 rounded-lg text-xs transition-colors shrink-0 ${
          isManaging ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
        title="Open Module Manager in Sidebar"
        aria-label="Open Module Manager"
      >
        <Layers className="w-3.5 h-3.5" />
      </button>

      <AddModulePopover />
    </div>
  );
};
