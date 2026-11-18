import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  CheckCircle2,
  MousePointer2,
  Grid,
  HelpCircle,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { EmptyCanvasState } from './EmptyCanvasState';
import { startPointerDrag } from '../../utils/pointerDrag';
import { findConnectionTarget } from './connectionTarget';
import { usePinchZoom } from './usePinchZoom';
import { referencedTableNames } from './tableLabel';
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
    searchQuery,
    activeModuleFilter,
    showCanvasGrid,
    toggleCanvasGrid,
    connectingEdge,
    updateConnectingPoint,
    setConnectingEdge,
    completeConnectingEdge,
    setIsShortcutsModalOpen,
    canvasFocusTarget,
  } = useSchemaStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isCanvasGliding, setIsCanvasGliding] = useState(false);

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

  // Smoothly glide canvas to newly created table or column
  useEffect(() => {
    if (!canvasFocusTarget || !containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const targetPanX = Math.round(clientWidth / 2 - canvasFocusTarget.x * zoom);
    const targetPanY = Math.round(clientHeight / 2 - canvasFocusTarget.y * zoom);

    setIsCanvasGliding(true);
    setPan({ x: targetPanX, y: targetPanY });

    const timer = setTimeout(() => {
      setIsCanvasGliding(false);
    }, 340);

    return () => clearTimeout(timer);
  }, [canvasFocusTarget, zoom]);

  // Wheel zoom around mouse pointer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Smooth continuous zoom with dampened sensitivity
      // e.ctrlKey is true during trackpad pinch gestures
      const delta = -e.deltaY;
      const zoomSensitivity = e.ctrlKey ? 0.005 : 0.0012;
      const factor = Math.exp(delta * zoomSensitivity);
      // Clamp single-step factor to prevent extreme jumps on fast trackpad flicks or high-speed wheels
      const clampedFactor = Math.min(Math.max(factor, 0.94), 1.06);

      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * clampedFactor, MIN_ZOOM), MAX_ZOOM);
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

  // Follow the pointer while a new foreign key is being dragged, and finish it on release
  useEffect(() => {
    if (!connectingEdge) return;
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      updateConnectingPoint({
        x: Math.round((e.clientX - rect.left - pan.x) / zoom),
        y: Math.round((e.clientY - rect.top - pan.y) / zoom),
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      const target = findConnectionTarget(e.clientX, e.clientY);
      if (target && target.tableId !== connectingEdge.sourceTableId) {
        completeConnectingEdge(target.tableId, target.columnId);
      } else {
        setConnectingEdge(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [connectingEdge, pan, zoom, updateConnectingPoint, setConnectingEdge, completeConnectingEdge]);

  // Pinch with two fingers to zoom. The view is read through a ref so the gesture
  // always starts from where the canvas is right now.
  const viewRef = useRef({ pan, zoom });
  useEffect(() => {
    viewRef.current = { pan, zoom };
  });
  const getView = useCallback(() => viewRef.current, []);
  const setView = useCallback((view: { pan: { x: number; y: number }; zoom: number }) => {
    setPan(view.pan);
    setZoom(view.zoom);
  }, []);
  usePinchZoom(containerRef, getView, setView, MIN_ZOOM, MAX_ZOOM);

  // Drag the background to pan (mouse, finger or pen)
  const handlePointerDown = (e: React.PointerEvent) => {
    // With a mouse: left or middle button only
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    // The zoom buttons and other controls on top of the canvas are not the background
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return;

    // Clicking the background deselects the table
    setSelectedTableId(null);

    setIsPanning(true);
    const origin = pan;
    startPointerDrag(e, {
      onMove: (dx, dy) => setPan({ x: Math.round(origin.x + dx), y: Math.round(origin.y + dy) }),
      onEnd: () => setIsPanning(false),
    });
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
      id="schema-canvas"
      role="region"
      aria-label="Schema canvas. Tab to a table, then use the arrow keys to move it."
      tabIndex={-1}
      className={`relative w-full h-full overflow-hidden select-none touch-none bg-canvas-bg transition-colors ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onPointerDown={handlePointerDown}
      style={{
        backgroundImage: showCanvasGrid
          ? 'radial-gradient(circle, var(--canvas-grid) 1.25px, transparent 1.25px)'
          : 'none',
        backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        transition: isCanvasGliding
          ? 'background-position 320ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'none',
      }}
    >
      {tables.length === 0 && <EmptyCanvasState />}

      {/* Top-Left Floating Status Pill */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border/80 shadow-sm text-xs font-medium text-foreground">
          <div className="flex items-center gap-1.5 text-muted-foreground pr-2 border-r border-border/60 max-sm:hidden">
            <MousePointer2 className="w-3.5 h-3.5 text-accent" />
            <span>Drag to pan • Scroll or pinch to zoom</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Auto-saved</span>
            <span className="text-[10px] text-muted-foreground font-sans max-sm:hidden">
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
          transition: isCanvasGliding
            ? 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'none',
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

            // Search query and module filter dimming
            const matchesSearch =
              !searchQuery ||
              table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              table.columns.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesModule = !activeModuleFilter || table.moduleId === activeModuleFilter;
            const isDimmed = !matchesSearch || !matchesModule;

            return (
              <div
                key={table.id}
                className={`transition-opacity duration-200 ${
                  isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'
                }`}
              >
                <TableCard
                  table={table}
                  module={moduleMap.get(table.moduleId)}
                  zoom={zoom}
                  isSelected={isSelected}
                  isRelatedToSelected={isRelated}
                  referencedTableNames={referencedTableNames(table, tables)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom-Left Floating Zoom & Viewport Toolbar */}
      <div className="absolute bottom-5 left-5 z-40 flex items-center gap-1 p-1 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg">
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 [@media(pointer:coarse)]:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Zoom Out (-)"
          aria-label="Zoom Out (-)"
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          className="px-2 py-1 [@media(pointer:coarse)]:py-2 rounded-lg text-xs font-mono font-medium hover:bg-muted/80 transition-colors"
          title="Reset Zoom to 100%"
          aria-label="Reset Zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 [@media(pointer:coarse)]:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Zoom In (+)"
          aria-label="Zoom In (+)"
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={centerView}
          className="flex items-center gap-1 px-2.5 py-1.5 [@media(pointer:coarse)]:py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Center View"
          aria-label="Center View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="max-md:hidden">Center</span>
        </button>

        <button
          type="button"
          onClick={autoArrangeGrid}
          className="flex items-center gap-1 px-2.5 py-1.5 [@media(pointer:coarse)]:py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Auto-Arrange Tables in Grid"
          aria-label="Auto-Arrange Tables in Grid"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="max-md:hidden">Auto-Arrange</span>
        </button>

        <button
          type="button"
          onClick={toggleCanvasGrid}
          className={`flex items-center gap-1 px-2.5 py-1.5 [@media(pointer:coarse)]:py-2.5 rounded-lg text-xs font-medium transition-colors ${
            showCanvasGrid
              ? 'bg-accent/15 text-accent font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
          }`}
          title={showCanvasGrid ? 'Hide Canvas Grid' : 'Show Canvas Grid'}
          aria-label={showCanvasGrid ? 'Hide Canvas Grid' : 'Show Canvas Grid'}
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="max-md:hidden">{showCanvasGrid ? 'Grid: On' : 'Grid: Off'}</span>
        </button>

        <div className="w-px h-4 bg-border mx-1 max-md:hidden" />

        <button
          type="button"
          onClick={() => setIsShortcutsModalOpen(true)}
          className="max-md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
