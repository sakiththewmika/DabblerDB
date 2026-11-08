import React, { useRef } from 'react';
import { Key, Link, ShieldAlert, Sparkles, Hash } from 'lucide-react';
import type { SchemaTable, ModuleGroup } from '../../types/schema';
import { useSchemaStore } from '../../store/useSchemaStore';

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
  const { updateTablePosition, setSelectedTableId } = useSchemaStore();
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const tablePosRef = useRef({ x: table.x, y: table.y });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    e.stopPropagation();

    setSelectedTableId(table.id);
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

  const moduleColor = module?.color || '#3b82f6';

  return (
    <div
      id={`table-card-${table.id}`}
      style={{
        transform: `translate3d(${table.x}px, ${table.y}px, 0)`,
      }}
      className={`absolute w-72 select-none rounded-xl bg-card border shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'ring-2 ring-accent border-accent shadow-lg shadow-accent/15 z-30'
          : isRelatedToSelected
          ? 'border-accent/60 shadow-md z-20 ring-1 ring-accent/30'
          : 'border-border hover:border-border/80 hover:shadow-lg z-10'
      }`}
      onMouseDown={handleMouseDown}
    >
      {/* Module color top indicator bar */}
      <div
        className="h-1.5 w-full rounded-t-xl transition-colors"
        style={{ backgroundColor: moduleColor }}
      />

      {/* Table Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-border bg-card-header/50">
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: moduleColor }}
            title={module?.name || 'Unassigned Module'}
          />
          <span className="font-semibold text-sm tracking-tight truncate text-foreground">
            {table.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
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
        {table.columns.map((col) => (
          <div
            key={col.id}
            id={`col-row-${col.id}`}
            className="px-3.5 py-1.5 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors group"
          >
            {/* Column Name & Badge */}
            <div className="flex items-center gap-2 min-w-0 pr-2">
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

              <span
                className={`truncate font-mono ${
                  col.isPk ? 'font-semibold text-foreground' : 'text-foreground/90'
                }`}
              >
                {col.name}
              </span>
            </div>

            {/* Column Data Type */}
            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground font-mono text-[11px]">
              <span>{col.type}</span>
              {col.isNullable && (
                <span className="text-[10px] text-muted-foreground/60" title="Nullable">
                  ?
                </span>
              )}
              {col.defaultValue && (
                <span
                  className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground/80 max-w-[60px] truncate"
                  title={`Default: ${col.defaultValue}`}
                >
                  ={col.defaultValue}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {table.columns.length === 0 && (
        <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>No columns defined</span>
        </div>
      )}
    </div>
  );
};
