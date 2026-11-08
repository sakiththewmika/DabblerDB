import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Table as TableIcon,
  Code2,
  Layers,
  ChevronRight,
  ChevronLeft,
  GripVertical,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { TableInspector } from './TableInspector';
import { DockedSqlStudio } from './DockedSqlStudio';
import { ModuleManager } from './ModuleManager';

export const StudioSidebar: React.FC = () => {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    selectedTableId,
    tables,
    modules,
  } = useSchemaStore();

  const isResizingRef = useRef(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  // Drag-to-resize handle logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      // Moving left increases sidebar width
      const deltaX = startX - moveEvent.clientX;
      const nextWidth = Math.min(Math.max(startWidth + deltaX, 340), 850);
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, setSidebarWidth]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isResizingRef.current = false;
    };
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // If collapsed, show a sleek docked vertical strip with tab icons and expand button
  if (isSidebarCollapsed) {
    return (
      <aside className="w-12 border-l border-border bg-card/95 backdrop-blur-md flex flex-col items-center py-3 z-30 shrink-0 select-none shadow-sm transition-all duration-200">
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mb-4"
          title="Expand Studio Panel"
        >
          <ChevronLeft className="w-5 h-5 text-accent" />
        </button>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveSidebarTab('inspector')}
            className={`p-2.5 rounded-xl transition-colors relative ${
              activeSidebarTab === 'inspector'
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Table Inspector"
          >
            <TableIcon className="w-4 h-4" />
            {selectedTableId && (
              <span className="w-2 h-2 rounded-full bg-accent absolute top-1 right-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('sql')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeSidebarTab === 'sql'
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="SQL Studio"
          >
            <Code2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('modules')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeSidebarTab === 'modules'
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Modules Manager"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="relative border-l border-border bg-card/95 backdrop-blur-md flex flex-col h-full z-30 shrink-0 select-none shadow-xl transition-all duration-75"
    >
      {/* Drag-Resize Left Border Handle */}
      <div
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHoveringHandle(true)}
        onMouseLeave={() => setIsHoveringHandle(false)}
        className={`absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize z-50 flex items-center justify-center transition-colors group ${
          isHoveringHandle ? 'bg-accent/20' : 'hover:bg-accent/10'
        }`}
        title="Drag left/right to resize panel"
      >
        <div
          className={`w-1 h-8 rounded-full transition-colors ${
            isHoveringHandle ? 'bg-accent' : 'bg-border/60 group-hover:bg-accent'
          }`}
        >
          <GripVertical className="w-2.5 h-2.5 -ml-0.5 opacity-0 group-hover:opacity-100 text-white" />
        </div>
      </div>

      {/* Top Navigation Tabs Header */}
      <div className="h-12 border-b border-border px-3 bg-muted/40 flex items-center justify-between shrink-0 gap-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-card border border-border/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSidebarTab('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSidebarTab === 'inspector'
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Inspector</span>
            {selectedTable && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('sql')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSidebarTab === 'sql'
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>SQL Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('modules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSidebarTab === 'modules'
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Modules</span>
            <span className="text-[10px] font-mono opacity-80">({modules.length})</span>
          </button>
        </div>

        {/* Collapse Button */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-colors"
          title="Collapse Panel (Full-screen Canvas)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Viewport Contents */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSidebarTab === 'inspector' && <TableInspector />}
        {activeSidebarTab === 'sql' && <DockedSqlStudio />}
        {activeSidebarTab === 'modules' && <ModuleManager />}
      </div>
    </aside>
  );
};
