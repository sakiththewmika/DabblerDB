import React, { useState } from 'react';
import {
  Table as TableIcon,
  X,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Key,
  Sparkles,
  Link2,
  FileText,
  MousePointerClick,
  Palette,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import type { FkOnDeleteAction } from '../../types/schema';
import {
  SQL_TYPE_CATEGORIES,
  getCategoryForType,
  getTypesForCategory,
  getDefaultTypeForCategory,
} from '../../data/sqlDataTypes';

const ON_DELETE_OPTIONS: FkOnDeleteAction[] = [
  'CASCADE',
  'SET NULL',
  'RESTRICT',
  'NO ACTION',
];

export const TableInspector: React.FC = () => {
  const {
    tables,
    modules,
    selectedTableId,
    setSelectedTableId,
    updateTable,
    deleteTable,
    addColumn,
    updateColumn,
    moveColumn,
    deleteColumn,
    addTable,
    addModule,
  } = useSchemaStore();

  const [isQuickModuleOpen, setIsQuickModuleOpen] = useState(false);
  const [quickModuleName, setQuickModuleName] = useState('');
  const [quickModuleColor, setQuickModuleColor] = useState('#3b82f6');
  const [customTypeColIds, setCustomTypeColIds] = useState<Record<string, boolean>>({});

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // Helper to sanitize SQL identifiers
  const sanitizeIdentifier = (val: string) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleCreateQuickModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickModuleName.trim() || !selectedTable) return;
    const newId = `mod_${Date.now()}`;
    addModule({
      id: newId,
      name: quickModuleName.trim(),
      color: quickModuleColor,
    });
    // Immediately assign this new module to the currently selected table
    updateTable(selectedTable.id, { moduleId: newId });
    setQuickModuleName('');
    setIsQuickModuleOpen(false);
  };

  if (!selectedTable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-card">
        <div className="p-3.5 rounded-2xl bg-muted/60 text-muted-foreground mb-4 border border-border/80">
          <MousePointerClick className="w-8 h-8 text-accent animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
          No Table Selected
        </h3>
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

  const currentModule = modules.find((m) => m.id === selectedTable.moduleId);

  const handleDeleteTable = () => {
    if (window.confirm(`Are you sure you want to delete table "${selectedTable.name}"?`)) {
      deleteTable(selectedTable.id);
    }
  };

  const handleAddColumn = () => {
    if (!selectedTable) return;
    const newColId = addColumn(selectedTable.id);
    setTimeout(() => {
      const input = document.getElementById(
        `col-name-input-${newColId}`
      ) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-card">
      {/* Drawer Sub-Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between shrink-0 bg-card">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: currentModule?.color || '#3b82f6' }}
          />
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold truncate text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <TableIcon className="w-4 h-4 text-accent shrink-0" />
              <span>{selectedTable.name}</span>
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono">
              {selectedTable.columns.length} columns defined
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDeleteTable}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete this table"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedTableId(null)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Deselect table"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {/* Section 1: Table Metadata */}
        <div className="p-4 space-y-3.5 bg-muted/20">
          {/* Table Name */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Table Name
            </label>
            <input
              type="text"
              value={selectedTable.name}
              onChange={(e) =>
                updateTable(selectedTable.id, {
                  name: sanitizeIdentifier(e.target.value),
                })
              }
              className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent"
              placeholder="table_name"
            />
          </div>

          {/* Module Assignment with Quick "+ New Module" Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-accent" />
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

            {/* Quick Create Module Inline Form */}
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
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                  <input
                    type="color"
                    value={quickModuleColor}
                    onChange={(e) => setQuickModuleColor(e.target.value)}
                    className="w-7 h-7 p-0 border-0 rounded cursor-pointer bg-transparent"
                    title="Choose module color"
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
              value={selectedTable.moduleId}
              onChange={(e) => updateTable(selectedTable.id, { moduleId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent cursor-pointer"
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description / Comment */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-muted-foreground" />
              <span>Description / Comment</span>
            </label>
            <textarea
              value={selectedTable.comment || ''}
              onChange={(e) => updateTable(selectedTable.id, { comment: e.target.value })}
              rows={2}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent resize-none"
              placeholder="Optional notes or documentation..."
            />
          </div>
        </div>

        {/* Section 2: Columns & Foreign Keys Editor */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Columns</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-muted text-muted-foreground">
                {selectedTable.columns.length}
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

          {/* Columns List with Theme-Aware High-Contrast Inputs */}
          <div className="space-y-3">
            {selectedTable.columns.map((col, index) => {
              const isFirst = index === 0;
              const isLast = index === selectedTable.columns.length - 1;

              return (
                <div
                  key={col.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2.5 shadow-2xs"
                >
                  {/* Top Bar: Reorder, Name, Type, and Delete */}
                  <div className="flex items-center gap-1.5">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveColumn(selectedTable.id, col.id, 'up')}
                        className="p-0.5 rounded hover:bg-muted text-slate-500 dark:text-slate-400 disabled:opacity-20 transition-opacity"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveColumn(selectedTable.id, col.id, 'down')}
                        className="p-0.5 rounded hover:bg-muted text-slate-500 dark:text-slate-400 disabled:opacity-20 transition-opacity"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Column Name Input */}
                    <input
                      id={`col-name-input-${col.id}`}
                      type="text"
                      value={col.name}
                      onChange={(e) =>
                        updateColumn(selectedTable.id, col.id, {
                          name: sanitizeIdentifier(e.target.value),
                        })
                      }
                      className="flex-1 min-w-0 px-2.5 py-1 text-xs font-mono font-medium rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent"
                      placeholder="column_name"
                    />

                    {/* Delete Column Button */}
                    <button
                      type="button"
                      onClick={() => deleteColumn(selectedTable.id, col.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                      title="Delete column"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Two-Step Data Type Selector (Step 1: Category -> Step 2: Specific Type) */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                    {/* Step 1: Category Dropdown */}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        1. Category
                      </label>
                      <select
                        value={
                          customTypeColIds[col.id]
                            ? 'custom'
                            : getCategoryForType(col.type)
                        }
                        onChange={(e) => {
                          const newCat = e.target.value;
                          if (newCat === 'custom') {
                            setCustomTypeColIds((prev) => ({ ...prev, [col.id]: true }));
                          } else {
                            setCustomTypeColIds((prev) => ({ ...prev, [col.id]: false }));
                            const defType = getDefaultTypeForCategory(newCat);
                            updateColumn(selectedTable.id, col.id, { type: defType });
                          }
                        }}
                        className="w-full px-2 py-1 text-xs font-medium rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent cursor-pointer truncate"
                      >
                        {SQL_TYPE_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                        <option value="custom">⚙️ Custom Type...</option>
                      </select>
                    </div>

                    {/* Step 2: Specific Type Dropdown */}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        2. Data Type
                      </label>
                      {customTypeColIds[col.id] || getCategoryForType(col.type) === 'custom' ? (
                        <input
                          type="text"
                          value={col.type}
                          onChange={(e) =>
                            updateColumn(selectedTable.id, col.id, { type: e.target.value })
                          }
                          className="w-full px-2 py-1 text-xs font-mono rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-accent focus:outline-hidden"
                          placeholder="custom_type"
                        />
                      ) : (
                        <select
                          value={
                            getTypesForCategory(getCategoryForType(col.type)).find(
                              (t) => t.toUpperCase() === col.type.toUpperCase()
                            ) || col.type
                          }
                          onChange={(e) =>
                            updateColumn(selectedTable.id, col.id, { type: e.target.value })
                          }
                          className="w-full px-2 py-1 text-xs font-mono rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent cursor-pointer truncate"
                        >
                          {getTypesForCategory(getCategoryForType(col.type)).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Constraints Checkboxes & Default Value */}
                  <div className="flex items-center gap-3 text-[11px] pt-1">
                    {/* PK */}
                    <label className="flex items-center gap-1 cursor-pointer font-semibold text-slate-900 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={col.isPk}
                        onChange={(e) =>
                          updateColumn(selectedTable.id, col.id, {
                            isPk: e.target.checked,
                            isNullable: e.target.checked ? false : col.isNullable,
                          })
                        }
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-accent focus:ring-accent"
                      />
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Key className="w-2.5 h-2.5" />
                        PK
                      </span>
                    </label>

                    {/* UNIQUE */}
                    <label className="flex items-center gap-1 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!col.isUnique}
                        onChange={(e) =>
                          updateColumn(selectedTable.id, col.id, {
                            isUnique: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-accent focus:ring-accent"
                      />
                      <span className="flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                        UQ
                      </span>
                    </label>

                    {/* NOT NULL */}
                    <label className="flex items-center gap-1 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!col.isNullable}
                        disabled={col.isPk}
                        onChange={(e) =>
                          updateColumn(selectedTable.id, col.id, {
                            isNullable: !e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-accent focus:ring-accent disabled:opacity-50"
                      />
                      <span>Not Null</span>
                    </label>

                    {/* Default Value Input */}
                    <div className="flex-1 min-w-[70px]">
                      <input
                        type="text"
                        value={col.defaultValue || ''}
                        onChange={(e) =>
                          updateColumn(selectedTable.id, col.id, {
                            defaultValue: e.target.value ? e.target.value : undefined,
                          })
                        }
                        placeholder="default"
                        className="w-full px-2 py-0.5 text-[10px] font-mono rounded border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  {/* Foreign Key Relation Selector */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                      <Link2 className="w-3 h-3 text-blue-500" />
                      <span>Foreign Key Relation:</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Target Table Dropdown */}
                      <select
                        value={col.fkTargetTableId || ''}
                        onChange={(e) => {
                          const targetTblId = e.target.value || undefined;
                          updateColumn(selectedTable.id, col.id, {
                            fkTargetTableId: targetTblId,
                            fkOnDelete: targetTblId ? (col.fkOnDelete || 'CASCADE') : undefined,
                          });
                        }}
                        className="w-full px-2 py-1 text-[11px] font-mono rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent cursor-pointer"
                      >
                        <option value="">-- No FK --</option>
                        {tables.map((t) => (
                          <option key={t.id} value={t.id}>
                            FK → {t.name}
                          </option>
                        ))}
                      </select>

                      {/* ON DELETE Action */}
                      <select
                        value={col.fkOnDelete || 'CASCADE'}
                        disabled={!col.fkTargetTableId}
                        onChange={(e) =>
                          updateColumn(selectedTable.id, col.id, {
                            fkOnDelete: e.target.value as FkOnDeleteAction,
                          })
                        }
                        className="w-full px-2 py-1 text-[11px] font-mono rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent disabled:opacity-40 cursor-pointer"
                      >
                        {ON_DELETE_OPTIONS.map((action) => (
                          <option key={action} value={action}>
                            ON DELETE {action}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Column Button at bottom of column list */}
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
