import React, { useId, useState } from 'react';
import { FileText, Layers, Palette, Plus, X } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import type { SchemaTable } from '../../types/schema';
import { createId } from '../../utils/ids';
import { sanitizeIdentifierWhileTyping } from '../../utils/identifiers';

const fieldClass =
  'w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent';
const labelClass = 'block text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider';

/** Table name, module group (with quick "new module") and description. */
export const TableMetaSection: React.FC<{ table: SchemaTable }> = ({ table }) => {
  const modules = useSchemaStore((s) => s.modules);
  const updateTable = useSchemaStore((s) => s.updateTable);
  const addModule = useSchemaStore((s) => s.addModule);

  const id = useId(); // makes each label point at its own field
  const [isQuickModuleOpen, setIsQuickModuleOpen] = useState(false);
  const [quickModuleName, setQuickModuleName] = useState('');
  const [quickModuleColor, setQuickModuleColor] = useState('#3b82f6');

  const handleCreateQuickModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickModuleName.trim()) return;
    const id = createId('mod');
    addModule({ id, name: quickModuleName.trim(), color: quickModuleColor });
    updateTable(table.id, { moduleId: id }); // assign the new module right away
    setQuickModuleName('');
    setIsQuickModuleOpen(false);
  };

  return (
    <div className="p-4 space-y-3.5 bg-muted/20">
      <div>
        <label htmlFor={`${id}-name`} className={labelClass}>
          Table Name
        </label>
        <input
          id={`${id}-name`}
          type="text"
          value={table.name}
          onChange={(e) => updateTable(table.id, { name: sanitizeIdentifierWhileTyping(e.target.value) })}
          className={`${fieldClass} font-mono font-semibold`}
          placeholder="table_name"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={`${id}-module`}
            className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-accent" aria-hidden="true" />
            <span>Module Group</span>
          </label>

          <button
            type="button"
            onClick={() => setIsQuickModuleOpen(!isQuickModuleOpen)}
            className="text-[11px] font-semibold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>New Module</span>
          </button>
        </div>

        {isQuickModuleOpen && (
          <form
            onSubmit={handleCreateQuickModule}
            className="p-3 mb-2 rounded-xl border border-accent/40 bg-accent/5 dark:bg-accent/10 space-y-2.5 animate-in fade-in"
          >
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-1">
                <Palette className="w-3 h-3 text-accent" />
                <span>Quick Create Module</span>
              </span>
              <button
                type="button"
                onClick={() => setIsQuickModuleOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickModuleName}
                onChange={(e) => setQuickModuleName(e.target.value)}
                placeholder="Module Name (e.g. Payments)"
                aria-label="New module name"
                className={`flex-1 ${fieldClass} py-1`}
                autoFocus
              />
              <input
                type="color"
                value={quickModuleColor}
                onChange={(e) => setQuickModuleColor(e.target.value)}
                className="w-7 h-7 p-0 border-0 rounded cursor-pointer bg-transparent"
                title="Choose module color"
                aria-label="Module color"
              />
            </div>

            <button
              type="submit"
              disabled={!quickModuleName.trim()}
              className="w-full py-1 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-xs"
            >
              Create & Assign
            </button>
          </form>
        )}

        <select
          id={`${id}-module`}
          value={table.moduleId}
          onChange={(e) => updateTable(table.id, { moduleId: e.target.value })}
          className={`${fieldClass} cursor-pointer`}
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-comment`} className={`${labelClass} flex items-center gap-1`}>
          <FileText className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
          <span>Description / Comment</span>
        </label>
        <textarea
          id={`${id}-comment`}
          value={table.comment || ''}
          onChange={(e) => updateTable(table.id, { comment: e.target.value })}
          rows={2}
          className={`${fieldClass} resize-none`}
          placeholder="Optional notes or documentation..."
        />
      </div>
    </div>
  );
};
