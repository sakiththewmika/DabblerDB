import React from 'react';
import { Key, Link, Sparkles, Hash, X, GripVertical } from 'lucide-react';
import type { SchemaColumn } from '../../types/schema';
import { ColumnTypePopup } from './ColumnTypePopup';

/** Which part of a column is being edited on the card, and the text typed so far. */
export interface EditingColumn {
  colId: string;
  field: 'name' | 'type';
  value: string;
}

const connectionPortClass =
  'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-card border-2 border-accent shadow-xs opacity-0 group-hover/row:opacity-100 hover:scale-125 transition-all cursor-crosshair z-30';

const badgeClass = 'px-1 py-0.2 rounded text-[10px] font-bold flex items-center gap-0.5 shrink-0';

/** PK / FK / UQ badge, or a quiet "#" for plain columns. */
const ColumnBadge: React.FC<{ column: SchemaColumn }> = ({ column }) => {
  if (column.isPk) {
    return (
      <span className={`${badgeClass} bg-amber-500/15 text-amber-500`} title="Primary Key">
        <Key className="w-2.5 h-2.5" />
        PK
      </span>
    );
  }
  if (column.fkTargetTableId) {
    return (
      <span className={`${badgeClass} bg-blue-500/15 text-blue-500`} title="Foreign Key">
        <Link className="w-2.5 h-2.5" />
        FK
      </span>
    );
  }
  if (column.isUnique) {
    return (
      <span className={`${badgeClass} bg-purple-500/15 text-purple-500`} title="Unique Constraint">
        <Sparkles className="w-2.5 h-2.5" />
        UQ
      </span>
    );
  }
  return <Hash className="w-3 h-3 text-muted-foreground/40 shrink-0" />;
};

interface ColumnRowProps {
  tableId: string;
  column: SchemaColumn;
  index: number;
  editing: EditingColumn | null;
  isDragSource: boolean;
  isDropTarget: boolean;
  onEditingChange: (editing: EditingColumn | null) => void;
  onSaveEdit: () => void;
  onChangeType: (type: string) => void;
  onDelete: () => void;
  onStartReorder: (e: React.MouseEvent) => void;
  onStartConnecting: (e: React.MouseEvent, side: 'left' | 'right') => void;
  onDropConnection: (e: React.MouseEvent) => void;
}

/** One column line on a table card. Double-click the name or type to edit it. */
export const ColumnRow: React.FC<ColumnRowProps> = ({
  tableId,
  column: col,
  index,
  editing,
  isDragSource,
  isDropTarget,
  onEditingChange,
  onSaveEdit,
  onChangeType,
  onDelete,
  onStartReorder,
  onStartConnecting,
  onDropConnection,
}) => {
  const isEditingName = editing?.colId === col.id && editing.field === 'name';
  const isEditingType = editing?.colId === col.id && editing.field === 'type';

  return (
    <div
      id={`col-row-${col.id}`}
      data-table-id={tableId}
      data-table-col-index={index}
      onMouseUp={onDropConnection}
      className={`relative px-3 py-1.5 flex items-center justify-between text-xs transition-all group/row ${
        isDragSource
          ? 'opacity-40 bg-accent/10 border-y border-dashed border-accent'
          : isDropTarget
          ? 'bg-accent/20 ring-1 ring-accent'
          : 'hover:bg-muted/40'
      }`}
    >
      {/* Connection ports: drag from one to another table to create a foreign key */}
      <div
        onMouseDown={(e) => onStartConnecting(e, 'left')}
        className={`${connectionPortClass} -left-1.5`}
        title="Drag to connect Foreign Key"
      />
      <div
        onMouseDown={(e) => onStartConnecting(e, 'right')}
        className={`${connectionPortClass} -right-1.5`}
        title="Drag to connect Foreign Key"
      />

      {/* Grip handle: drag to reorder */}
      <div
        onMouseDown={onStartReorder}
        className="opacity-0 group-hover/row:opacity-100 hover:text-accent cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:bg-muted rounded transition-all shrink-0 -ml-1 mr-1"
        title="Drag to reorder column"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Badge and name */}
      <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
        <ColumnBadge column={col} />

        {isEditingName ? (
          <input
            type="text"
            value={editing.value}
            onChange={(e) => onEditingChange({ ...editing, value: e.target.value })}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') onSaveEdit();
              if (e.key === 'Escape') onEditingChange(null);
            }}
            autoFocus
            className="px-1 py-0.2 text-xs font-mono font-medium rounded border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-accent focus:outline-hidden w-full"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditingChange({ colId: col.id, field: 'name', value: col.name });
            }}
            className={`truncate font-mono cursor-text hover:text-accent transition-colors ${
              col.isPk ? 'font-semibold text-foreground' : 'text-foreground/90'
            }`}
            title="Double-click to edit column name"
          >
            {col.name}
          </span>
        )}
      </div>

      {/* Type, nullable mark, default value, delete */}
      <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground font-mono text-[11px]">
        {isEditingType ? (
          <ColumnTypePopup currentType={col.type} onPick={onChangeType} onClose={() => onEditingChange(null)} />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditingChange({ colId: col.id, field: 'type', value: col.type });
            }}
            className="cursor-pointer hover:text-accent transition-colors"
            title="Double-click to change type"
          >
            {col.type}
          </span>
        )}

        {col.isNullable && (
          <span className="text-[10px] text-muted-foreground/60" title="Nullable">
            ?
          </span>
        )}

        {col.defaultValue && (
          <span
            className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground/80 max-w-[50px] truncate"
            title={`Default: ${col.defaultValue}`}
          >
            ={col.defaultValue}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover/row:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 rounded transition-opacity"
          title="Delete column"
          aria-label="Delete column"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
