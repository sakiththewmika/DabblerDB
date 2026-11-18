import React, { useCallback, useState } from 'react';
import { Table as TableIcon, Code2, Layers, ChevronRight, ChevronLeft, GripVertical } from 'lucide-react';
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useSchemaStore,
  type SidebarTab,
} from '../../store/useSchemaStore';
import { startPointerDrag } from '../../utils/pointerDrag';
import { TableInspector } from './TableInspector';
import { DockedSqlStudio } from './DockedSqlStudio';
import { ModuleManager } from './ModuleManager';

const TABS: Array<{ id: SidebarTab; label: string; icon: React.ElementType }> = [
  { id: 'inspector', label: 'Inspector', icon: TableIcon },
  { id: 'sql', label: 'SQL Studio', icon: Code2 },
  { id: 'modules', label: 'Modules', icon: Layers },
];

const KEYBOARD_RESIZE_STEP = 24;

/** The narrow strip shown while the panel is collapsed: one icon per tab. */
export const SidebarRail: React.FC = () => {
  const activeSidebarTab = useSchemaStore((s) => s.activeSidebarTab);
  const setActiveSidebarTab = useSchemaStore((s) => s.setActiveSidebarTab);
  const toggleSidebarCollapsed = useSchemaStore((s) => s.toggleSidebarCollapsed);
  const hasSelection = useSchemaStore((s) => s.selectedTableId !== null);

  return (
    <aside
      aria-label="Studio panel (collapsed)"
      className="w-12 border-l border-border bg-card/95 backdrop-blur-md flex flex-col items-center py-3 z-30 shrink-0 select-none shadow-sm transition-all duration-200 max-md:fixed max-md:right-3 max-md:top-24 max-md:z-40 max-md:py-2 max-md:rounded-2xl max-md:border max-md:shadow-lg"
    >
      <button
        type="button"
        onClick={toggleSidebarCollapsed}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mb-4 max-md:mb-2"
        title="Expand Studio Panel"
        aria-label="Expand Studio Panel"
      >
        {/* On a phone the panel slides up from the bottom, so the arrow points up */}
        <ChevronLeft className="w-5 h-5 text-accent max-md:rotate-90" aria-hidden="true" />
      </button>

      <div className="flex flex-col gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSidebarTab(id)}
            className={`p-2.5 rounded-xl transition-colors relative ${
              activeSidebarTab === id
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title={label}
            aria-label={id === 'inspector' && hasSelection ? `${label} (a table is selected)` : label}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {id === 'inspector' && hasSelection && (
              <span className="w-2 h-2 rounded-full bg-accent absolute top-1 right-1" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </aside>
  );
};

/** The open panel: a resizable edge, three tabs and the tab's content. */
export const SidebarPanel: React.FC = () => {
  const activeSidebarTab = useSchemaStore((s) => s.activeSidebarTab);
  const setActiveSidebarTab = useSchemaStore((s) => s.setActiveSidebarTab);
  const toggleSidebarCollapsed = useSchemaStore((s) => s.toggleSidebarCollapsed);
  const sidebarWidth = useSchemaStore((s) => s.sidebarWidth);
  const setSidebarWidth = useSchemaStore((s) => s.setSidebarWidth);
  const hasSelection = useSchemaStore((s) => s.selectedTableId !== null);
  const moduleCount = useSchemaStore((s) => s.modules.length);

  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  // Drag the left edge to resize the panel (mouse, finger or pen)
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startWidth = sidebarWidth;
      startPointerDrag(e, {
        // Moving left makes the panel wider; the store keeps it between the min and max
        onMove: (dx) => setSidebarWidth(startWidth - dx),
      });
    },
    [sidebarWidth, setSidebarWidth]
  );

  // Arrow keys resize the panel too
  const handleResizeKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowLeft: sidebarWidth + KEYBOARD_RESIZE_STEP,
      ArrowRight: sidebarWidth - KEYBOARD_RESIZE_STEP,
      Home: SIDEBAR_MIN_WIDTH,
      End: SIDEBAR_MAX_WIDTH,
    };
    if (e.key in keys) {
      e.preventDefault();
      setSidebarWidth(keys[e.key]);
    }
  };

  // Left / Right arrows move between tabs (the tab pattern screen reader users expect)
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    setActiveSidebarTab(next.id);
    document.getElementById(`studio-tab-${next.id}`)?.focus();
  };

  return (
    <aside
      aria-label="Studio panel"
      // Phones: a sheet that slides up over the bottom of the screen. Larger screens: a column of the chosen width.
      style={{ '--studio-width': `${sidebarWidth}px` } as React.CSSProperties}
      className="relative md:w-[var(--studio-width)] border-l border-border bg-card/95 backdrop-blur-md flex flex-col h-full z-30 shrink-0 select-none shadow-xl transition-all duration-75 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[65dvh] max-md:w-full max-md:border-l-0 max-md:border-t max-md:rounded-t-2xl max-md:bg-card max-md:backdrop-blur-none max-md:pb-[env(safe-area-inset-bottom)]"
    >
      {/* Left edge: drag or use the arrow keys to resize */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize studio panel"
        aria-valuenow={sidebarWidth}
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        tabIndex={0}
        onPointerDown={handleResizePointerDown}
        onKeyDown={handleResizeKeyDown}
        onMouseEnter={() => setIsHoveringHandle(true)}
        onMouseLeave={() => setIsHoveringHandle(false)}
        className={`max-md:hidden absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize touch-none z-50 flex items-center justify-center transition-colors group ${
          isHoveringHandle ? 'bg-accent/20' : 'hover:bg-accent/10'
        }`}
        title="Drag left/right to resize panel"
      >
        <div
          className={`w-1 h-8 rounded-full transition-colors ${
            isHoveringHandle ? 'bg-accent' : 'bg-border/60 group-hover:bg-accent'
          }`}
        >
          <GripVertical className="w-2.5 h-2.5 -ml-0.5 opacity-0 group-hover:opacity-100 text-white" aria-hidden="true" />
        </div>
      </div>

      {/* Handle that shows this is a sheet (phones only) */}
      <div className="md:hidden flex justify-center pt-1.5 shrink-0" aria-hidden="true">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      <div className="h-12 border-b border-border px-3 bg-muted/40 flex items-center justify-between shrink-0 gap-2">
        <div
          role="tablist"
          aria-label="Studio panels"
          className="flex items-center gap-1 p-0.5 rounded-xl bg-card border border-border/80 text-xs font-semibold"
        >
          {TABS.map(({ id, label, icon: Icon }, index) => {
            const isActive = activeSidebarTab === id;
            return (
              <button
                key={id}
                id={`studio-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="studio-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveSidebarTab(id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 max-sm:px-2.5 [@media(pointer:coarse)]:py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-accent text-accent-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {/* Narrow screens: only the open tab shows its name */}
                <span className={isActive ? '' : 'max-sm:sr-only'}>{label}</span>
                {id === 'inspector' && hasSelection && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span className="sr-only">(a table is selected)</span>
                  </>
                )}
                {id === 'modules' && <span className="text-[10px] font-mono">({moduleCount})</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="p-1.5 [@media(pointer:coarse)]:p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-colors"
          title="Collapse Panel (Full-screen Canvas)"
          aria-label="Collapse Panel (Full-screen Canvas)"
        >
          <ChevronRight className="w-4 h-4 max-md:rotate-90" aria-hidden="true" />
        </button>
      </div>

      <div
        id="studio-panel"
        role="tabpanel"
        aria-labelledby={`studio-tab-${activeSidebarTab}`}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {activeSidebarTab === 'inspector' && <TableInspector />}
        {activeSidebarTab === 'sql' && <DockedSqlStudio />}
        {activeSidebarTab === 'modules' && <ModuleManager />}
      </div>
    </aside>
  );
};

export const StudioSidebar: React.FC = () => {
  const isCollapsed = useSchemaStore((s) => s.isSidebarCollapsed);
  return isCollapsed ? <SidebarRail /> : <SidebarPanel />;
};
