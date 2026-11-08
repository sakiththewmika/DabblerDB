import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  CheckCircle2,
  MousePointer2,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { TableCard } from './TableCard';
import { RelationshipEdges } from './RelationshipEdges';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.8;
const TABLE_WIDTH = 288;

export const SchemaCanvas: React.FC = () => {
  const {
    tables,
    modules,
    selectedTableId,
    setSelectedTableId,
    updateTablePosition,
    lastSavedAt,
  } = useSchemaStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Module lookup map
  const moduleMap = useMemo(() => {
    return new Map(modules.map((m) => [m.id, m]));
  }, [modules]);

  // Center View on all tables
  const centerView = useCallback(() => {
    if (!containerRef.current || tables.length === 0) return;
    const { clientWidth, clientHeight } = containerRef.current;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    tables.forEach((t) => {
      const estimatedHeight = 80 + t.columns.length * 30;
      if (t.x < minX) minX = t.x;
      if (t.y < minY) minY = t.y;
      if (t.x + TABLE_WIDTH > maxX) maxX = t.x + TABLE_WIDTH;
      if (t.y + estimatedHeight > maxY) maxY = t.y + estimatedHeight;
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Calculate ideal zoom to fit with padding
    const padding = 100;
    const scaleX = (clientWidth - padding * 2) / contentWidth;
    const scaleY = (clientHeight - padding * 2) / contentHeight;
    const idealZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), 1.1);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(idealZoom);
    setPan({
      x: Math.round(clientWidth / 2 - centerX * idealZoom),
      y: Math.round(clientHeight / 2 - centerY * idealZoom),
    });
  }, [tables]);

  // Auto-arrange tables in a clean grid
  const autoArrangeGrid = useCallback(() => {
    const cols = Math.max(2, Math.ceil(Math.sqrt(tables.length)));
    const colSpacing = 360;
    const rowSpacing = 360;
    const startX = 60;
    const startY = 80;

    tables.forEach((table, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      updateTablePosition(table.id, startX + col * colSpacing, startY + row * rowSpacing);
    });
  }, [tables, updateTablePosition]);

  // Wheel zoom around mouse pointer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, MIN_ZOOM), MAX_ZOOM);
        const scaleChange = nextZoom / prevZoom;

        setPan((prevPan) => ({
          x: Math.round(mouseX - (mouseX - prevPan.x) * scaleChange),
          y: Math.round(mouseY - (mouseY - prevPan.y) * scaleChange),
        }));

        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Background drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan on left click on the background or middle click
    if (e.button !== 0 && e.button !== 1) return;

    // Deselect selected table when clicking background
    setSelectedTableId(null);

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPan({
        x: Math.round(moveEvent.clientX - panStartRef.current.x),
        y: Math.round(moveEvent.clientY - panStartRef.current.y),
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(Number((z + 0.15).toFixed(2)), MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(Number((z - 0.15).toFixed(2)), MIN_ZOOM));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none bg-canvas-bg transition-colors ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      style={{
        backgroundImage: 'radial-gradient(circle, var(--canvas-grid) 1.25px, transparent 1.25px)',
        backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Top-Left Floating Status Pill */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border/80 shadow-sm text-xs font-medium text-foreground">
          <div className="flex items-center gap-1.5 text-muted-foreground pr-2 border-r border-border/60">
            <MousePointer2 className="w-3.5 h-3.5 text-accent" />
            <span>Drag to pan • Scroll to zoom</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-500 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Auto-saved</span>
            <span className="text-[10px] text-muted-foreground/80 font-sans">
              ({new Date(lastSavedAt).toLocaleTimeString()})
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Transformed Canvas Plane */}
      <div
        className="absolute origin-top-left pointer-events-none"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          width: '5000px',
          height: '5000px',
        }}
      >
        {/* SVG Foreign Key Relationship Edges */}
        <RelationshipEdges
          tables={tables}
          modules={modules}
          selectedTableId={selectedTableId}
        />

        {/* Draggable Table Cards */}
        <div className="pointer-events-auto">
          {tables.map((table) => {
            const isSelected = selectedTableId === table.id;
            // Check if table is connected to selectedTableId
            const isRelated =
              !!selectedTableId &&
              !isSelected &&
              (table.columns.some((c) => c.fkTargetTableId === selectedTableId) ||
                tables
                  .find((t) => t.id === selectedTableId)
                  ?.columns.some((c) => c.fkTargetTableId === table.id));

            return (
              <TableCard
                key={table.id}
                table={table}
                module={moduleMap.get(table.moduleId)}
                zoom={zoom}
                isSelected={isSelected}
                isRelatedToSelected={isRelated}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom-Left Floating Zoom & Viewport Toolbar */}
      <div className="absolute bottom-5 left-5 z-40 flex items-center gap-1 p-1 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg">
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Zoom Out (-)"
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          className="px-2 py-1 rounded-lg text-xs font-mono font-medium hover:bg-muted/80 transition-colors"
          title="Reset Zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Zoom In (+)"
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={centerView}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Center View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Center</span>
        </button>

        <button
          type="button"
          onClick={autoArrangeGrid}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Auto-Arrange Tables in Grid"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Grid</span>
        </button>
      </div>
    </div>
  );
};
