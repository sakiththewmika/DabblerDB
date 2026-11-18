import React, { useRef, useState } from 'react';
import { Plus, ShieldAlert } from 'lucide-react';

import type { SchemaTable, SchemaColumn, ModuleGroup } from '../../types/schema';
import { useSchemaStore } from '../../store/useSchemaStore';
import { createId } from '../../utils/ids';
import { sanitizeIdentifier } from '../../utils/identifiers';
import { ColumnRow, type EditingColumn } from './ColumnRow';
import { useColumnReorder } from './useColumnReorder';

interface TableCardProps {
  table: SchemaTable;
  module?: ModuleGroup;
  zoom: number;
  isSelected: boolean;
  isRelatedToSelected?: boolean;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  module,
  zoom,
  isSelected,
  isRelatedToSelected,
}) => {
  const {
    updateTablePosition,
    setSelectedTableId,
    updateTable,
    updateColumn,
    deleteColumn,
    addColumn,
    reorderColumns,
    recordHistorySnapshot,
    connectingEdge,
    setConnectingEdge,
    completeConnectingEdge,
  } = useSchemaStore();

  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const tablePosRef = useRef({ x: table.x, y: table.y });

  // Inline editing state
  const [isEditingTableName, setIsEditingTableName] = useState(false);
  const [tableNameInput, setTableNameInput] = useState(table.name);

  const { dragState: dragColState, startReorder } = useColumnReorder(table.id, (from, to) =>
    reorderColumns(table.id, from, to)
  );

  // The column name/type currently being edited on the card (only one at a time)
  const [editingCol, setEditingCol] = useState<EditingColumn | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click and if not editing
    if (e.button !== 0 || isEditingTableName || editingCol) return;
    e.stopPropagation();

    setSelectedTableId(table.id);
    recordHistorySnapshot();

    isDraggingRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    tablePosRef.current = { x: table.x, y: table.y };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = (moveEvent.clientX - startPosRef.current.x) / zoom;
      const dy = (moveEvent.clientY - startPosRef.current.y) / zoom;
      const nextX = Math.round(tablePosRef.current.x + dx);
      const nextY = Math.round(tablePosRef.current.y + dy);
      updateTablePosition(table.id, nextX, nextY);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Table Name Inline Edit
  const handleSaveTableName = () => {
    const clean = sanitizeIdentifier(tableNameInput);
    if (clean && clean !== table.name) {
      updateTable(table.id, { name: clean });
    }
    setIsEditingTableName(false);
  };

  // Column Inline Edit
  const handleSaveColEdit = () => {
    if (!editingCol) return;
    const { colId, field, value } = editingCol;
    const clean = field === 'name' ? sanitizeIdentifier(value) : value.trim().toLowerCase();
    if (clean) {
      updateColumn(table.id, colId, { [field]: clean });
    }
    setEditingCol(null);
  };

  // Quick Add Column footer button
  const handleQuickAddColumn = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newColId = createId('col');
    addColumn(table.id, {
      id: newColId,
      name: `col_${table.columns.length + 1}`,
      type: 'varchar(255)',
    });
    // Immediately open for inline editing
    setEditingCol({
      colId: newColId,
      field: 'name',
      value: `col_${table.columns.length + 1}`,
    });
  };

  // Drag-to-connect port start
  const handleStartConnecting = (e: React.MouseEvent, col: SchemaColumn, colIndex: number, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();

    const headerOffset = 44 + (table.comment ? 28 : 0) + 4;
    const anchorY = table.y + headerOffset + colIndex * 29 + 14.5;
    const anchorX = side === 'left' ? table.x : table.x + 288;

    setConnectingEdge({
      sourceTableId: table.id,
      sourceColumnId: col.id,
      sourceAnchor: { x: anchorX, y: anchorY },
      currentPoint: { x: anchorX, y: anchorY },
    });
  };

  // Drop target for connecting edge
  const handleCardMouseUp = (e: React.MouseEvent, targetColId?: string) => {
    if (connectingEdge && connectingEdge.sourceTableId !== table.id) {
      e.stopPropagation();
      completeConnectingEdge(table.id, targetColId);
    }
  };

  const moduleColor = module?.color || '#3b82f6';

  return (
    <div
      id={`table-card-${table.id}`}
      style={{
        transform: `translate3d(${table.x}px, ${table.y}px, 0)`,
      }}
      className={`group/card absolute w-72 select-none rounded-xl bg-card border shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'ring-2 ring-accent border-accent shadow-lg shadow-accent/15 z-30'
          : isRelatedToSelected
          ? 'border-accent/60 shadow-md z-20 ring-1 ring-accent/30'
          : 'border-border hover:border-border/80 hover:shadow-lg z-10'
      }`}
      onMouseDown={handleMouseDown}
      onMouseUp={(e) => handleCardMouseUp(e)}
    >
      {/* Semantic Zoom: High-contrast label for far zoom levels (< 45%) */}
      {zoom < 0.45 && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none z-40 whitespace-nowrap">
          <div
            className="px-3 py-1 rounded-md text-base font-extrabold text-white shadow-xl border border-white/30 tracking-wide"
            style={{ backgroundColor: moduleColor }}
          >
            {table.name}
          </div>
        </div>
      )}

      {/* Module color top indicator bar */}
      <div
        className="h-1.5 w-full rounded-t-xl transition-colors"
        style={{ backgroundColor: moduleColor }}
      />

      {/* Table Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-border bg-card-header/50">
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: moduleColor }}
            title={module?.name || 'Unassigned Module'}
          />

          {isEditingTableName ? (
            <input
              type="text"
              value={tableNameInput}
              onChange={(e) => setTableNameInput(e.target.value)}
              onBlur={handleSaveTableName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTableName();
                if (e.key === 'Escape') setIsEditingTableName(false);
              }}
              autoFocus
              className="px-1.5 py-0.5 text-xs font-mono font-bold rounded border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-accent focus:outline-hidden w-full"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTableName(true);
                setTableNameInput(table.name);
              }}
              className="font-semibold text-sm tracking-tight truncate text-foreground cursor-text hover:text-accent transition-colors"
              title="Double-click to rename table"
            >
              {table.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {table.columns.length} cols
          </span>
        </div>
      </div>

      {/* Table Comment if available */}
      {table.comment && (
        <div className="px-3.5 py-1.5 text-[11px] text-muted-foreground italic border-b border-border/50 bg-muted/20 truncate">
          {table.comment}
        </div>
      )}

      {/* Column Rows */}
      <div className="divide-y divide-border/40 py-1">
        {table.columns.map((col, colIndex) => {
          const isDragSource = dragColState?.sourceIndex === colIndex;
          return (
            <ColumnRow
              key={col.id}
              tableId={table.id}
              column={col}
              index={colIndex}
              editing={editingCol}
              isDragSource={isDragSource}
              isDropTarget={dragColState?.targetIndex === colIndex && !isDragSource}
              onEditingChange={setEditingCol}
              onSaveEdit={handleSaveColEdit}
              onChangeType={(type) => {
                updateColumn(table.id, col.id, { type });
                setEditingCol(null);
              }}
              onDelete={() => deleteColumn(table.id, col.id)}
              onStartReorder={(e) => startReorder(e, colIndex)}
              onStartConnecting={(e, side) => handleStartConnecting(e, col, colIndex, side)}
              onDropConnection={(e) => handleCardMouseUp(e, col.id)}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {table.columns.length === 0 && (
        <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>No columns defined</span>
        </div>
      )}

      {/* Subtle "+ Add Column" Footer (visible on hover or card selection) */}
      <div
        onClick={handleQuickAddColumn}
        className={`px-3 py-1.5 border-t border-border/50 text-[11px] text-muted-foreground hover:text-accent hover:bg-muted/40 cursor-pointer items-center justify-center gap-1.5 font-medium transition-colors ${
          isSelected ? 'flex' : 'hidden group-hover/card:flex'
        }`}
      >
        <Plus className="w-3 h-3 text-accent" />
        <span>Add Column</span>
      </div>
    </div>
  );
};
