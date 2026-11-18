import React from 'react';
import { Table as TableIcon, X, Trash2, Plus, MousePointerClick } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { ColumnEditor } from './ColumnEditor';
import { TableMetaSection } from './TableMetaSection';
import { doWithUndo } from '../../utils/undoToast';

/** Right-hand panel for editing the selected table. Pieces live in the files next to this one. */
export const TableInspector: React.FC = () => {
  const tables = useSchemaStore((s) => s.tables);
  const modules = useSchemaStore((s) => s.modules);
  const selectedTableId = useSchemaStore((s) => s.selectedTableId);
  const setSelectedTableId = useSchemaStore((s) => s.setSelectedTableId);
  const deleteTable = useSchemaStore((s) => s.deleteTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const addTable = useSchemaStore((s) => s.addTable);

  const table = tables.find((t) => t.id === selectedTableId);

  if (!table) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-card">
        <div className="p-3.5 rounded-2xl bg-muted/60 text-muted-foreground mb-4 border border-border/80">
          <MousePointerClick className="w-8 h-8 text-accent animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">No Table Selected</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mb-6">
          Click any table card on the canvas to inspect, rename, and edit its columns, constraints, and foreign key relationships.
        </p>
        <button
          type="button"
          onClick={() => addTable()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Table</span>
        </button>
      </div>
    );
  }

  const currentModule = modules.find((m) => m.id === table.moduleId);

  const handleDeleteTable = () => {
    doWithUndo(`Deleted table "${table.name}"`, () => deleteTable(table.id));
  };

  // Add a column, then focus its name field so the user can type right away
  const handleAddColumn = () => {
    const newColId = addColumn(table.id);
    setTimeout(() => {
      const input = document.getElementById(`col-name-input-${newColId}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-card">
      <div className="p-3.5 border-b border-border flex items-center justify-between shrink-0 bg-card">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: currentModule?.color || '#3b82f6' }}
          />
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold truncate text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <TableIcon className="w-4 h-4 text-accent shrink-0" />
              <span>{table.name}</span>
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono">{table.columns.length} columns defined</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDeleteTable}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete this table"
            aria-label="Delete this table"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedTableId(null)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Deselect table"
            aria-label="Deselect table"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        <TableMetaSection key={table.id} table={table} />

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Columns</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-muted text-muted-foreground">
                {table.columns.length}
              </span>
            </span>

            <button
              type="button"
              onClick={handleAddColumn}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Column</span>
            </button>
          </div>

          <div className="space-y-3">
            {table.columns.map((col, index) => (
              <ColumnEditor key={col.id} table={table} column={col} index={index} />
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddColumn}
            className="w-full mt-3 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-accent text-slate-600 dark:text-slate-400 hover:text-accent hover:bg-accent/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            <span>Add New Column</span>
          </button>
        </div>
      </div>
    </div>
  );
};
