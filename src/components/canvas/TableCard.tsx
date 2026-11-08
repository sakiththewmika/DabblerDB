import React, { useRef, useState } from 'react';
import { Key, Link, ShieldAlert, Sparkles, Hash, Plus, X, GripVertical } from 'lucide-react';
import type { SchemaTable, SchemaColumn, ModuleGroup } from '../../types/schema';
import { useSchemaStore } from '../../store/useSchemaStore';
import {
  SQL_TYPE_CATEGORIES,
  getCategoryForType,
  getTypesForCategory,
} from '../../data/sqlDataTypes';

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

  // Column Drag-and-Drop Reorder state
  const [dragColState, setDragColState] = useState<{
    sourceIndex: number;
    targetIndex: number;
  } | null>(null);

  const [editingCol, setEditingCol] = useState<{
    colId: string;
    field: 'name' | 'type';
    value: string;
  } | null>(null);

  // Two-step column type selector state
  const [cardTypeCategory, setCardTypeCategory] = useState<string>('text');
  const [customCardTypeInput, setCustomCardTypeInput] = useState<string>('');

  // Helper to sanitize identifier
  const sanitize = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

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

  // Column Drag-and-Drop Reorder handler
  const handleStartColReorder = (e: React.MouseEvent, colIndex: number) => {
    e.stopPropagation();
    e.preventDefault();

    let targetIdx = colIndex;
    setDragColState({ sourceIndex: colIndex, targetIndex: colIndex });
    document.body.style.cursor = 'grabbing';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const elements = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
      for (const el of elements) {
        const rowEl = el.closest(
          `[data-table-col-index][data-table-id="${table.id}"]`
        ) as HTMLElement | null;
        if (rowEl && rowEl.dataset.tableColIndex !== undefined) {
          const idx = parseInt(rowEl.dataset.tableColIndex, 10);
          if (!isNaN(idx) && idx !== targetIdx) {
            targetIdx = idx;
            setDragColState({ sourceIndex: colIndex, targetIndex: idx });
          }
          break;
        }
      }
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (targetIdx !== colIndex) {
        reorderColumns(table.id, colIndex, targetIdx);
      }
      setDragColState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Table Name Inline Edit
  const handleSaveTableName = () => {
    const clean = sanitize(tableNameInput);
    if (clean && clean !== table.name) {
      updateTable(table.id, { name: clean });
    }
    setIsEditingTableName(false);
  };

  // Column Inline Edit
  const handleSaveColEdit = () => {
    if (!editingCol) return;
    const { colId, field, value } = editingCol;
    const clean = field === 'name' ? sanitize(value) : value.trim().toLowerCase();
    if (clean) {
      updateColumn(table.id, colId, { [field]: clean });
    }
    setEditingCol(null);
  };

  // Quick Add Column footer button
  const handleQuickAddColumn = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newColId = `col_${Date.now()}`;
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
          const isDraggingThis = dragColState?.sourceIndex === colIndex;
          const isDropTarget = dragColState?.targetIndex === colIndex && !isDraggingThis;

          return (
            <div
              key={col.id}
              id={`col-row-${col.id}`}
              data-table-id={table.id}
              data-table-col-index={colIndex}
              onMouseUp={(e) => handleCardMouseUp(e, col.id)}
              className={`relative px-3 py-1.5 flex items-center justify-between text-xs transition-all group/row ${
                isDraggingThis
                  ? 'opacity-40 bg-accent/10 border-y border-dashed border-accent'
                  : isDropTarget
                  ? 'bg-accent/20 ring-1 ring-accent'
                  : 'hover:bg-muted/40'
              }`}
            >
              {/* Left Connection Port Dot */}
              <div
                onMouseDown={(e) => handleStartConnecting(e, col, colIndex, 'left')}
                className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-card border-2 border-accent shadow-xs opacity-0 group-hover/row:opacity-100 hover:scale-125 transition-all cursor-crosshair z-30"
                title="Drag to connect Foreign Key"
              />

              {/* Right Connection Port Dot */}
              <div
                onMouseDown={(e) => handleStartConnecting(e, col, colIndex, 'right')}
                className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-card border-2 border-accent shadow-xs opacity-0 group-hover/row:opacity-100 hover:scale-125 transition-all cursor-crosshair z-30"
                title="Drag to connect Foreign Key"
              />

              {/* Drag-to-Reorder Grip Handle */}
              <div
                onMouseDown={(e) => handleStartColReorder(e, colIndex)}
                className="opacity-0 group-hover/row:opacity-100 hover:text-accent cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:bg-muted rounded transition-all shrink-0 -ml-1 mr-1"
                title="Drag to reorder column"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Column Name & Badges */}
            <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
              {col.isPk ? (
                <span
                  className="px-1 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 flex items-center gap-0.5 shrink-0"
                  title="Primary Key"
                >
                  <Key className="w-2.5 h-2.5" />
                  PK
                </span>
              ) : col.fkTargetTableId ? (
                <span
                  className="px-1 py-0.2 rounded text-[10px] font-bold bg-blue-500/15 text-blue-500 flex items-center gap-0.5 shrink-0"
                  title="Foreign Key"
                >
                  <Link className="w-2.5 h-2.5" />
                  FK
                </span>
              ) : col.isUnique ? (
                <span
                  className="px-1 py-0.2 rounded text-[10px] font-bold bg-purple-500/15 text-purple-500 flex items-center gap-0.5 shrink-0"
                  title="Unique Constraint"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  UQ
                </span>
              ) : (
                <Hash className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              )}

              {editingCol?.colId === col.id && editingCol.field === 'name' ? (
                <input
                  type="text"
                  value={editingCol.value}
                  onChange={(e) => setEditingCol({ ...editingCol, value: e.target.value })}
                  onBlur={handleSaveColEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') handleSaveColEdit();
                    if (e.key === 'Escape') setEditingCol(null);
                  }}
                  autoFocus
                  className="px-1 py-0.2 text-xs font-mono font-medium rounded border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-accent focus:outline-hidden w-full"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingCol({ colId: col.id, field: 'name', value: col.name });
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

            {/* Column Data Type & Actions */}
            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground font-mono text-[11px]">
              {editingCol?.colId === col.id && editingCol.field === 'type' ? (
                <div
                  className="absolute right-2 top-full mt-1 z-50 bg-card border border-border shadow-2xl rounded-xl p-2.5 flex gap-2 text-xs animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Step 1: Category */}
                  <div className="flex flex-col gap-0.5 border-r border-border/80 pr-2.5 w-32 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 mb-1">
                      1. Category
                    </span>
                    {SQL_TYPE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCardTypeCategory(cat.id)}
                        className={`px-2 py-1 text-left rounded-lg text-[11px] font-medium transition-colors ${
                          cardTypeCategory === cat.id
                            ? 'bg-accent text-accent-foreground font-semibold shadow-2xs'
                            : 'hover:bg-muted text-foreground/80'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCardTypeCategory('custom')}
                      className={`px-2 py-1 text-left rounded-lg text-[11px] font-medium transition-colors ${
                        cardTypeCategory === 'custom'
                          ? 'bg-accent text-accent-foreground font-semibold shadow-2xs'
                          : 'hover:bg-muted text-foreground/80'
                      }`}
                    >
                      ⚙️ Custom...
                    </button>
                  </div>

                  {/* Step 2: Types in Category */}
                  <div className="flex flex-col gap-0.5 w-36 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 mb-1">
                      2. Type
                    </span>
                    {cardTypeCategory === 'custom' ? (
                      <div className="p-1 space-y-2">
                        <input
                          type="text"
                          value={customCardTypeInput}
                          onChange={(e) => setCustomCardTypeInput(e.target.value)}
                          placeholder="e.g. citext"
                          autoFocus
                          className="w-full px-2 py-1 text-[11px] font-mono rounded border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-accent focus:outline-hidden"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customCardTypeInput.trim()) {
                              updateColumn(table.id, col.id, {
                                type: customCardTypeInput.trim(),
                              });
                              setEditingCol(null);
                            }
                            if (e.key === 'Escape') setEditingCol(null);
                          }}
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (customCardTypeInput.trim()) {
                                updateColumn(table.id, col.id, {
                                  type: customCardTypeInput.trim(),
                                });
                                setEditingCol(null);
                              }
                            }}
                            className="flex-1 px-2 py-1 bg-accent text-white rounded text-[11px] font-semibold hover:bg-accent-hover"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCol(null)}
                            className="px-2 py-1 bg-muted text-muted-foreground rounded text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      getTypesForCategory(cardTypeCategory).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            updateColumn(table.id, col.id, { type: t });
                            setEditingCol(null);
                          }}
                          className={`px-2 py-1 text-left rounded-lg font-mono text-[11px] hover:bg-accent/15 hover:text-accent transition-colors ${
                            col.type.toUpperCase() === t.toUpperCase()
                              ? 'bg-accent/10 text-accent font-bold'
                              : 'text-foreground/90'
                          }`}
                        >
                          {t}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const cat = getCategoryForType(col.type);
                    setCardTypeCategory(cat);
                    setCustomCardTypeInput(cat === 'custom' ? col.type : '');
                    setEditingCol({ colId: col.id, field: 'type', value: col.type });
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

              {/* Hover Quick Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteColumn(table.id, col.id);
                }}
                className="opacity-0 group-hover/row:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 rounded transition-opacity"
                title="Delete column"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
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
