import React from 'react';
import { ArrowDown, ArrowUp, Key, Link2, Sparkles, X } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import type { FkOnDeleteAction, SchemaColumn, SchemaTable } from '../../types/schema';
import { sanitizeIdentifierWhileTyping } from '../../utils/identifiers';
import { ColumnTypeSelect } from './ColumnTypeSelect';

const ON_DELETE_OPTIONS: FkOnDeleteAction[] = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'];

const inputClass =
  'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-accent';
const checkboxClass =
  'rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-accent focus:ring-accent';

/** The editing card for one column in the inspector. */
export const ColumnEditor: React.FC<{
  table: SchemaTable;
  column: SchemaColumn;
  index: number;
}> = ({ table, column: col, index }) => {
  const tables = useSchemaStore((s) => s.tables);
  const updateColumn = useSchemaStore((s) => s.updateColumn);
  const moveColumn = useSchemaStore((s) => s.moveColumn);
  const deleteColumn = useSchemaStore((s) => s.deleteColumn);

  const update = (changes: Partial<SchemaColumn>) => updateColumn(table.id, col.id, changes);

  return (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2.5 shadow-2xs">
      {/* Reorder, name, delete */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => moveColumn(table.id, col.id, 'up')}
            className="p-0.5 rounded hover:bg-muted text-slate-500 dark:text-slate-400 disabled:opacity-20 transition-opacity"
            title="Move Up"
            aria-label="Move column up"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            disabled={index === table.columns.length - 1}
            onClick={() => moveColumn(table.id, col.id, 'down')}
            className="p-0.5 rounded hover:bg-muted text-slate-500 dark:text-slate-400 disabled:opacity-20 transition-opacity"
            title="Move Down"
            aria-label="Move column down"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        <input
          id={`col-name-input-${col.id}`}
          type="text"
          value={col.name}
          onChange={(e) => update({ name: sanitizeIdentifierWhileTyping(e.target.value) })}
          aria-label="Column name"
          className={`flex-1 min-w-0 px-2.5 py-1 text-xs font-mono font-medium rounded-lg border ${inputClass}`}
          placeholder="column_name"
        />

        <button
          type="button"
          onClick={() => deleteColumn(table.id, col.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
          title="Delete column"
          aria-label="Delete column"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ColumnTypeSelect type={col.type} onChange={(type) => update({ type })} />

      {/* Constraints and default value */}
      <div className="flex items-center gap-3 text-[11px] pt-1">
        <label className="flex items-center gap-1 cursor-pointer font-semibold text-slate-900 dark:text-slate-100">
          <input
            type="checkbox"
            checked={col.isPk}
            onChange={(e) =>
              update({ isPk: e.target.checked, isNullable: e.target.checked ? false : col.isNullable })
            }
            className={checkboxClass}
          />
          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
            <Key className="w-2.5 h-2.5" />
            PK
          </span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-foreground">
          <input
            type="checkbox"
            checked={!!col.isUnique}
            onChange={(e) => update({ isUnique: e.target.checked })}
            className={checkboxClass}
          />
          <span className="flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
            UQ
          </span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-foreground">
          <input
            type="checkbox"
            checked={!col.isNullable}
            disabled={col.isPk}
            onChange={(e) => update({ isNullable: !e.target.checked })}
            className={`${checkboxClass} disabled:opacity-50`}
          />
          <span>Not Null</span>
        </label>

        <div className="flex-1 min-w-[70px]">
          <input
            type="text"
            value={col.defaultValue || ''}
            onChange={(e) => update({ defaultValue: e.target.value ? e.target.value : undefined })}
            placeholder="default"
            aria-label="Default value"
            className={`w-full px-2 py-0.5 text-[10px] font-mono rounded border ${inputClass}`}
          />
        </div>
      </div>

      {/* Foreign key */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
          <Link2 className="w-3 h-3 text-blue-500" />
          <span>Foreign Key Relation:</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={col.fkTargetTableId || ''}
            onChange={(e) => {
              const target = e.target.value || undefined;
              update({ fkTargetTableId: target, fkOnDelete: target ? col.fkOnDelete || 'CASCADE' : undefined });
            }}
            className={`w-full px-2 py-1 text-[11px] font-mono rounded-lg border cursor-pointer ${inputClass}`}
          >
            <option value="">-- No FK --</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                FK → {t.name}
              </option>
            ))}
          </select>

          <select
            value={col.fkOnDelete || 'CASCADE'}
            disabled={!col.fkTargetTableId}
            onChange={(e) => update({ fkOnDelete: e.target.value as FkOnDeleteAction })}
            className={`w-full px-2 py-1 text-[11px] font-mono rounded-lg border disabled:opacity-40 cursor-pointer ${inputClass}`}
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
};
