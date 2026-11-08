import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ModuleGroup,
  SchemaColumn,
  SchemaTable,
  ThemeMode,
} from '../types/schema';
import { DEFAULT_MODULES, DEFAULT_TABLES } from '../data/defaultSchema';

export type SidebarTab = 'inspector' | 'sql' | 'modules';

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

  // Table CRUD
  addTable: (custom?: Partial<SchemaTable>) => void;
  updateTable: (id: string, updates: Partial<SchemaTable>) => void;
  deleteTable: (id: string) => void;
  updateTablePosition: (id: string, x: number, y: number) => void;
  setSelectedTableId: (id: string | null) => void;

  // Column & FK CRUD
  addColumn: (tableId: string, column?: Partial<SchemaColumn>) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<SchemaColumn>) => void;
  moveColumn: (tableId: string, columnId: string, direction: 'up' | 'down') => void;
  deleteColumn: (tableId: string, columnId: string) => void;

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

  // Utilities & Theme
  resetToStarterSchema: () => void;
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
      isSidebarCollapsed: false,
      sidebarWidth: 440,
      isSqlStudioOpen: false,

      // Table CRUD
      addTable: (custom) => {
        const id = custom?.id || `tbl_${Date.now()}`;
        const defaultModule = get().modules[0]?.id || 'mod_general';
        const newTable: SchemaTable = {
          id,
          name: custom?.name || `new_table_${get().tables.length + 1}`,
          moduleId: custom?.moduleId || get().activeModuleFilter || defaultModule,
          x: custom?.x ?? (100 + (get().tables.length % 4) * 40),
          y: custom?.y ?? (100 + (get().tables.length % 4) * 40),
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

        set((state) => ({
          tables: [...state.tables, newTable],
          selectedTableId: id,
          activeSidebarTab: 'inspector',
          isSidebarCollapsed: false,
          lastSavedAt: new Date().toISOString(),
        }));
      },

      updateTable: (id, updates) => {
        set((state) => ({
          tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)),
          lastSavedAt: new Date().toISOString(),
        }));
      },

      deleteTable: (id) => {
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
          // When selecting a table, open inspector tab and expand sidebar if collapsed
          activeSidebarTab: id ? 'inspector' : state.activeSidebarTab,
          isSidebarCollapsed: id ? false : state.isSidebarCollapsed,
        })),

      // Column & FK CRUD
      addColumn: (tableId, column) => {
        const newColId = column?.id || `col_${Date.now()}`;
        const newColumn: SchemaColumn = {
          id: newColId,
          name: column?.name || 'new_column',
          type: column?.type || 'varchar(255)',
          isPk: column?.isPk ?? false,
          isUnique: column?.isUnique ?? false,
          isNullable: column?.isNullable ?? true,
          defaultValue: column?.defaultValue,
          fkTargetTableId: column?.fkTargetTableId,
          fkTargetColumnId: column?.fkTargetColumnId,
          fkOnDelete: column?.fkOnDelete,
        };

        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, columns: [...t.columns, newColumn] } : t
          ),
          lastSavedAt: new Date().toISOString(),
        }));
      },

      updateColumn: (tableId, columnId, updates) => {
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  columns: t.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
                }
              : t
          ),
          lastSavedAt: new Date().toISOString(),
        }));
      },

      moveColumn: (tableId, columnId, direction) => {
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
          lastSavedAt: new Date().toISOString(),
        }));
      },

      deleteColumn: (tableId, columnId) => {
        set((state) => ({
          tables: state.tables.map((t) => {
            if (t.id === tableId) {
              return {
                ...t,
                columns: t.columns.filter((c) => c.id !== columnId),
              };
            }
            // Clean up any other table referencing this column as FK
            return {
              ...t,
              columns: t.columns.map((c) =>
                c.fkTargetColumnId === columnId
                  ? { ...c, fkTargetTableId: undefined, fkTargetColumnId: undefined, fkOnDelete: undefined }
                  : c
              ),
            };
          }),
          lastSavedAt: new Date().toISOString(),
        }));
      },

      // Module CRUD
      addModule: (moduleData) => {
        const newModule: ModuleGroup = {
          id: moduleData.id || `mod_${Date.now()}`,
          name: moduleData.name.trim(),
          color: moduleData.color || '#6366f1',
        };

        set((state) => ({
          modules: [...state.modules, newModule],
          lastSavedAt: new Date().toISOString(),
        }));
      },

      updateModule: (id, updates) => {
        set((state) => ({
          modules: state.modules.map((m) => (m.id === id ? { ...m, ...updates } : m)),
          lastSavedAt: new Date().toISOString(),
        }));
      },

      deleteModule: (id) => {
        set((state) => {
          const remainingModules = state.modules.filter((m) => m.id !== id);
          const fallbackModuleId = remainingModules[0]?.id || 'mod_general';

          return {
            modules: remainingModules.length > 0 ? remainingModules : [
              { id: 'mod_general', name: 'General', color: '#3b82f6' },
            ],
            // Reassign tables in deleted module
            tables: state.tables.map((t) =>
              t.moduleId === id ? { ...t, moduleId: fallbackModuleId } : t
            ),
            activeModuleFilter: state.activeModuleFilter === id ? null : state.activeModuleFilter,
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

      // Utilities & Theme
      resetToStarterSchema: () => {
        set({
          tables: DEFAULT_TABLES,
          modules: DEFAULT_MODULES,
          selectedTableId: null,
          activeModuleFilter: null,
          searchQuery: '',
          lastSavedAt: new Date().toISOString(),
        });
      },

      importSchemaJson: (data) => {
        set((state) => ({
          tables: data.tables,
          modules: data.modules && data.modules.length > 0 ? data.modules : state.modules,
          selectedTableId: null,
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
        // When opening SQL studio, switch to the 'sql' tab and expand the sidebar
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
