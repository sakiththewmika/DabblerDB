import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ModuleGroup,
  SchemaColumn,
  SchemaTable,
  ThemeMode,
} from '../types/schema';
import { DEFAULT_MODULES, DEFAULT_TABLES } from '../data/defaultSchema';
import { STARTER_TEMPLATES } from '../data/starterTemplates';

export type SidebarTab = 'inspector' | 'sql' | 'modules';

export interface ConnectingEdge {
  sourceTableId: string;
  sourceColumnId: string;
  sourceAnchor: { x: number; y: number };
  currentPoint: { x: number; y: number };
}

export interface HistorySnapshot {
  tables: SchemaTable[];
  modules: ModuleGroup[];
}

const MAX_HISTORY = 50;

export interface SchemaStoreState {
  // State
  tables: SchemaTable[];
  modules: ModuleGroup[];
  selectedTableId: string | null;
  activeModuleFilter: string | null;
  searchQuery: string;
  theme: ThemeMode;
  lastSavedAt: string;
  showCanvasGrid: boolean;
  activeSidebarTab: SidebarTab;
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  isSqlStudioOpen: boolean;

  // History Stack
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  isShortcutsModalOpen: boolean;
  connectingEdge: ConnectingEdge | null;

  // Connecting Edge Actions
  setConnectingEdge: (edge: ConnectingEdge | null) => void;
  updateConnectingPoint: (point: { x: number; y: number }) => void;
  completeConnectingEdge: (targetTableId: string, targetColumnId?: string) => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  recordHistorySnapshot: () => void;

  // Table CRUD
  addTable: (custom?: Partial<SchemaTable>) => void;
  updateTable: (id: string, updates: Partial<SchemaTable>) => void;
  deleteTable: (id: string) => void;
  duplicateTable: (id: string) => void;
  updateTablePosition: (id: string, x: number, y: number) => void;
  setSelectedTableId: (id: string | null) => void;

  // Column & FK CRUD
  addColumn: (tableId: string, column?: Partial<SchemaColumn>) => string;
  updateColumn: (tableId: string, columnId: string, updates: Partial<SchemaColumn>) => void;
  moveColumn: (tableId: string, columnId: string, direction: 'up' | 'down') => void;
  reorderColumns: (tableId: string, sourceIndex: number, targetIndex: number) => void;
  deleteColumn: (tableId: string, columnId: string) => void;

  // Canvas Navigation & Focus
  canvasFocusTarget: { x: number; y: number; timestamp: number } | null;
  setCanvasFocusTarget: (target: { x: number; y: number } | null) => void;

  // Module CRUD & Filtering
  addModule: (moduleData: Omit<ModuleGroup, 'id'> & { id?: string }) => void;
  updateModule: (id: string, updates: Partial<ModuleGroup>) => void;
  deleteModule: (id: string) => void;
  setActiveModuleFilter: (moduleId: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Sidebar & Canvas Controls
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarWidth: (width: number) => void;
  toggleCanvasGrid: () => void;
  setShowCanvasGrid: (show: boolean) => void;
  setIsShortcutsModalOpen: (open: boolean) => void;

  // Utilities & Theme
  resetToStarterSchema: () => void;
  loadTemplate: (templateId: string) => void;
  importSchemaJson: (data: { modules?: ModuleGroup[]; tables: SchemaTable[] }) => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setIsSqlStudioOpen: (open: boolean) => void;
}

const syncThemeClass = (theme: ThemeMode) => {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

const takeSnapshot = (state: { tables: SchemaTable[]; modules: ModuleGroup[] }): HistorySnapshot => ({
  tables: JSON.parse(JSON.stringify(state.tables)),
  modules: JSON.parse(JSON.stringify(state.modules)),
});

export const useSchemaStore = create<SchemaStoreState>()(
  persist(
    (set, get) => ({
      tables: DEFAULT_TABLES,
      modules: DEFAULT_MODULES,
      selectedTableId: null,
      activeModuleFilter: null,
      searchQuery: '',
      theme: 'dark',
      lastSavedAt: new Date().toISOString(),
      showCanvasGrid: true,
      activeSidebarTab: 'inspector',
      isSidebarCollapsed: true,
      sidebarWidth: 440,
      isSqlStudioOpen: false,

      // History
      past: [],
      future: [],
      isShortcutsModalOpen: false,
      connectingEdge: null,
      canvasFocusTarget: null,

      setCanvasFocusTarget: (target) =>
        set({
          canvasFocusTarget: target ? { ...target, timestamp: Date.now() } : null,
        }),
      setConnectingEdge: (edge) => set({ connectingEdge: edge }),
      updateConnectingPoint: (point) =>
        set((state) => ({
          connectingEdge: state.connectingEdge
            ? { ...state.connectingEdge, currentPoint: point }
            : null,
        })),
      completeConnectingEdge: (targetTableId, targetColumnId) => {
        const edge = get().connectingEdge;
        if (!edge) return;
        if (edge.sourceTableId === targetTableId) {
          // Self-FK allowed or cancel
        }

        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === edge.sourceTableId
              ? {
                  ...t,
                  columns: t.columns.map((c) =>
                    c.id === edge.sourceColumnId
                      ? {
                          ...c,
                          fkTargetTableId: targetTableId,
                          fkTargetColumnId: targetColumnId,
                          fkOnDelete: 'CASCADE',
                        }
                      : c
                  ),
                }
              : t
          ),
          connectingEdge: null,
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      recordHistorySnapshot: () => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      undo: () => {
        const { past, future, tables, modules } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        const current = takeSnapshot({ tables, modules });
        set({
          tables: previous.tables,
          modules: previous.modules,
          past: newPast,
          future: [current, ...future],
          lastSavedAt: new Date().toISOString(),
        });
      },

      redo: () => {
        const { past, future, tables, modules } = get();
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        const current = takeSnapshot({ tables, modules });
        set({
          tables: next.tables,
          modules: next.modules,
          past: [...past, current],
          future: newFuture,
          lastSavedAt: new Date().toISOString(),
        });
      },

      // Table CRUD
      addTable: (custom) => {
        const snapshot = takeSnapshot(get());
        const id = custom?.id || `tbl_${Date.now()}`;
        const defaultModule = get().modules[0]?.id || 'mod_general';
        const newTable: SchemaTable = {
          id,
          name: custom?.name || `new_table_${get().tables.length + 1}`,
          moduleId: custom?.moduleId || get().activeModuleFilter || defaultModule,
          x: custom?.x ?? (120 + (get().tables.length % 4) * 40),
          y: custom?.y ?? (120 + (get().tables.length % 4) * 40),
          comment: custom?.comment || '',
          columns: custom?.columns || [
            {
              id: `col_${Date.now()}_1`,
              name: 'id',
              type: 'uuid',
              isPk: true,
              isNullable: false,
              defaultValue: 'gen_random_uuid()',
            },
            {
              id: `col_${Date.now()}_2`,
              name: 'created_at',
              type: 'timestamptz',
              isPk: false,
              isNullable: false,
              defaultValue: 'CURRENT_TIMESTAMP',
            },
          ],
        };

        const focus = { x: newTable.x + 144, y: newTable.y + 60, timestamp: Date.now() };

        set((state) => ({
          tables: [...state.tables, newTable],
          selectedTableId: id,
          activeSidebarTab: 'inspector',
          isSidebarCollapsed: false,
          canvasFocusTarget: focus,
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      duplicateTable: (id) => {
        const table = get().tables.find((t) => t.id === id);
        if (!table) return;
        const snapshot = takeSnapshot(get());
        const newTableId = `tbl_${Date.now()}`;
        const newColumns = table.columns.map((c, i) => ({
          ...c,
          id: `col_${Date.now()}_${i}`,
        }));

        const duplicated: SchemaTable = {
          ...table,
          id: newTableId,
          name: `${table.name}_copy`,
          x: table.x + 40,
          y: table.y + 40,
          columns: newColumns,
        };

        const focus = { x: duplicated.x + 144, y: duplicated.y + 60, timestamp: Date.now() };

        set((state) => ({
          tables: [...state.tables, duplicated],
          selectedTableId: newTableId,
          activeSidebarTab: 'inspector',
          isSidebarCollapsed: false,
          canvasFocusTarget: focus,
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      updateTable: (id, updates) => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)),
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      deleteTable: (id) => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: state.tables
            .filter((t) => t.id !== id)
            .map((t) => ({
              ...t,
              // Clean up FKs targeting the deleted table
              columns: t.columns.map((c) =>
                c.fkTargetTableId === id
                  ? { ...c, fkTargetTableId: undefined, fkTargetColumnId: undefined, fkOnDelete: undefined }
                  : c
              ),
            })),
          selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      updateTablePosition: (id, x, y) => {
        set((state) => ({
          tables: state.tables.map((t) => (t.id === id ? { ...t, x, y } : t)),
          lastSavedAt: new Date().toISOString(),
        }));
      },

      setSelectedTableId: (id) =>
        set((state) => ({
          selectedTableId: id,
          activeSidebarTab: id ? 'inspector' : state.activeSidebarTab,
          isSidebarCollapsed: id ? false : state.isSidebarCollapsed,
        })),

      // Column & FK CRUD
      addColumn: (tableId, column) => {
        const table = get().tables.find((t) => t.id === tableId);
        const snapshot = takeSnapshot(get());
        const newColId = column?.id || `col_${Date.now()}`;
        const newColumn: SchemaColumn = {
          id: newColId,
          name: column?.name || `col_${(table?.columns.length ?? 0) + 1}`,
          type: column?.type || 'varchar(255)',
          isPk: column?.isPk ?? false,
          isUnique: column?.isUnique ?? false,
          isNullable: column?.isNullable ?? true,
          defaultValue: column?.defaultValue,
          fkTargetTableId: column?.fkTargetTableId,
          fkTargetColumnId: column?.fkTargetColumnId,
          fkOnDelete: column?.fkOnDelete,
        };

        const focus = table
          ? { x: table.x + 144, y: table.y + 60, timestamp: Date.now() }
          : null;

        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, columns: [...t.columns, newColumn] } : t
          ),
          canvasFocusTarget: focus || state.canvasFocusTarget,
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));

        return newColId;
      },

      updateColumn: (tableId, columnId, updates) => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  columns: t.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
                }
              : t
          ),
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      moveColumn: (tableId, columnId, direction) => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: state.tables.map((t) => {
            if (t.id !== tableId) return t;
            const index = t.columns.findIndex((c) => c.id === columnId);
            if (index < 0) return t;
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= t.columns.length) return t;

            const updatedColumns = [...t.columns];
            const [moved] = updatedColumns.splice(index, 1);
            updatedColumns.splice(targetIndex, 0, moved);
            return { ...t, columns: updatedColumns };
          }),
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      reorderColumns: (tableId, sourceIndex, targetIndex) => {
        if (sourceIndex === targetIndex) return;
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: state.tables.map((t) => {
            if (t.id !== tableId) return t;
            if (
              sourceIndex < 0 ||
              sourceIndex >= t.columns.length ||
              targetIndex < 0 ||
              targetIndex >= t.columns.length
            ) {
              return t;
            }
            const updatedColumns = [...t.columns];
            const [moved] = updatedColumns.splice(sourceIndex, 1);
            updatedColumns.splice(targetIndex, 0, moved);
            return { ...t, columns: updatedColumns };
          }),
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      deleteColumn: (tableId, columnId) => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: state.tables.map((t) => {
            if (t.id === tableId) {
              return {
                ...t,
                columns: t.columns.filter((c) => c.id !== columnId),
              };
            }
            return {
              ...t,
              columns: t.columns.map((c) =>
                c.fkTargetColumnId === columnId
                  ? { ...c, fkTargetTableId: undefined, fkTargetColumnId: undefined, fkOnDelete: undefined }
                  : c
              ),
            };
          }),
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      // Module CRUD
      addModule: (moduleData) => {
        const snapshot = takeSnapshot(get());
        const newModule: ModuleGroup = {
          id: moduleData.id || `mod_${Date.now()}`,
          name: moduleData.name.trim(),
          color: moduleData.color || '#6366f1',
        };

        set((state) => ({
          modules: [...state.modules, newModule],
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      updateModule: (id, updates) => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          modules: state.modules.map((m) => (m.id === id ? { ...m, ...updates } : m)),
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      deleteModule: (id) => {
        const snapshot = takeSnapshot(get());
        set((state) => {
          const remainingModules = state.modules.filter((m) => m.id !== id);
          const fallbackModuleId = remainingModules[0]?.id || 'mod_general';

          return {
            modules: remainingModules.length > 0 ? remainingModules : [
              { id: 'mod_general', name: 'General', color: '#3b82f6' },
            ],
            tables: state.tables.map((t) =>
              t.moduleId === id ? { ...t, moduleId: fallbackModuleId } : t
            ),
            activeModuleFilter: state.activeModuleFilter === id ? null : state.activeModuleFilter,
            past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
            future: [],
            lastSavedAt: new Date().toISOString(),
          };
        });
      },

      setActiveModuleFilter: (moduleId) => set({ activeModuleFilter: moduleId }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Sidebar & Canvas Controls
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab, isSidebarCollapsed: false }),
      setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.min(Math.max(width, 340), 850) }),
      toggleCanvasGrid: () => set((state) => ({ showCanvasGrid: !state.showCanvasGrid })),
      setShowCanvasGrid: (show) => set({ showCanvasGrid: show }),
      setIsShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),

      // Utilities & Theme
      resetToStarterSchema: () => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: DEFAULT_TABLES,
          modules: DEFAULT_MODULES,
          selectedTableId: null,
          activeModuleFilter: null,
          searchQuery: '',
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      loadTemplate: (templateId) => {
        const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
        if (!tpl) return;
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: tpl.tables,
          modules: tpl.modules,
          selectedTableId: null,
          activeModuleFilter: null,
          searchQuery: '',
          canvasFocusTarget: { x: 300, y: 200, timestamp: Date.now() },
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      importSchemaJson: (data) => {
        const snapshot = takeSnapshot(get());
        set((state) => ({
          tables: data.tables,
          modules: data.modules && data.modules.length > 0 ? data.modules : state.modules,
          selectedTableId: null,
          past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
          future: [],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      toggleTheme: () => {
        const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
        syncThemeClass(nextTheme);
        set({ theme: nextTheme, lastSavedAt: new Date().toISOString() });
      },

      setTheme: (theme) => {
        syncThemeClass(theme);
        set({ theme, lastSavedAt: new Date().toISOString() });
      },

      setIsSqlStudioOpen: (open) => {
        if (open) {
          set({ activeSidebarTab: 'sql', isSidebarCollapsed: false, isSqlStudioOpen: true });
        } else {
          set({ isSqlStudioOpen: false });
        }
      },
    }),
    {
      name: 'dabblerdb_schema_v1',
      partialize: (state) => ({
        tables: state.tables,
        modules: state.modules,
        theme: state.theme,
        lastSavedAt: state.lastSavedAt,
        showCanvasGrid: state.showCanvasGrid,
        sidebarWidth: state.sidebarWidth,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          syncThemeClass(state.theme);
        }
      },
    }
  )
);
