import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Table as TableIcon,
  Palette,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import type { ModuleGroup } from '../../types/schema';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#64748b', // Slate
  '#14b8a6', // Teal
  '#e11d48', // Rose
];

export const ModuleManager: React.FC = () => {
  const { modules, tables, addModule, updateModule, deleteModule } = useSchemaStore();

  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleColor, setNewModuleColor] = useState(PRESET_COLORS[0]);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    addModule({
      name: newModuleName.trim(),
      color: newModuleColor,
    });
    setNewModuleName('');
  };

  const startEditing = (m: ModuleGroup) => {
    setEditingModuleId(m.id);
    setEditName(m.name);
    setEditColor(m.color);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateModule(id, {
      name: editName.trim(),
      color: editColor,
    });
    setEditingModuleId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (modules.length <= 1) {
      alert('You must keep at least one module group.');
      return;
    }
    const tableCount = tables.filter((t) => t.moduleId === id).length;
    const confirmMsg =
      tableCount > 0
        ? `Delete module "${name}"? ${tableCount} table(s) in this module will be reassigned to the default module.`
        : `Delete module "${name}"?`;

    if (window.confirm(confirmMsg)) {
      deleteModule(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Create New Module Section */}
      <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          <Palette className="w-3.5 h-3.5 text-accent" />
          <span>Create New Module</span>
        </div>

        <form onSubmit={handleCreateModule} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Module Name
            </label>
            <input
              type="text"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              placeholder="e.g., Billing, Authentication, Analytics"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Theme Color
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewModuleColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newModuleColor === c
                      ? 'scale-125 ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900'
                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={newModuleColor}
                onChange={(e) => setNewModuleColor(e.target.value)}
                className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
                title="Custom color picker"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!newModuleName.trim()}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Module</span>
          </button>
        </form>
      </div>

      {/* Existing Modules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-accent" />
            <span>Active Modules ({modules.length})</span>
          </span>
        </div>

        <div className="space-y-2">
          {modules.map((m) => {
            const tableCount = tables.filter((t) => t.moduleId === m.id).length;
            const isEditing = editingModuleId === m.id;

            if (isEditing) {
              return (
                <div
                  key={m.id}
                  className="p-3 rounded-xl border border-accent bg-accent/5 dark:bg-accent/10 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs font-medium rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(m.id)}
                      className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      title="Save changes"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingModuleId(null)}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-muted transition-colors text-slate-600 dark:text-slate-300"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          editColor === c
                            ? 'scale-125 ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-card'
                            : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-5 h-5 p-0 border-0 rounded cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: m.color }}
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block truncate">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <TableIcon className="w-2.5 h-2.5" />
                      {tableCount} {tableCount === 1 ? 'table' : 'tables'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => startEditing(m)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit module name & color"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id, m.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete module"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
