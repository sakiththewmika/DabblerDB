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
import { createId } from '../utils/ids';
import type { SupportedDialect } from '../utils/sqlCompiler';
import { getDefaultColumns, isDialect } from '../data/dialectDefaults';
import { validateSchemaPayload } from '../utils/schemaValidation';

export type SidebarTab = 'inspector' | 'sql' | 'modules';

export const SIDEBAR_MIN_WIDTH = 340;
export const SIDEBAR_MAX_WIDTH = 850;

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
  /** The database the user is designing for. Decides default columns and the .sql export. */
  dialect: SupportedDialect;
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
  setDialect: (dialect: SupportedDialect) => void;
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

/** Edits to the same field within this time (ms) become one undo step. */
const COALESCE_WINDOW_MS = 1000;

/**
 * Loads saved data from localStorage safely: if it is damaged, the app starts
 * from the starter schema instead of crashing.
 */
export function mergePersistedState(
  persisted: unknown,
  current: SchemaStoreState
): SchemaStoreState {
  if (typeof persisted !== 'object' || persisted === null) return current;
  const saved = persisted as Partial<SchemaStoreState>;

  const checked = validateSchemaPayload({ tables: saved.tables, modules: saved.modules }, current.modules);
  return {
    ...current,
    theme: saved.theme === 'light' ? 'light' : 'dark',
    dialect: isDialect(saved.dialect) ? saved.dialect : current.dialect,
    lastSavedAt: typeof saved.lastSavedAt === 'string' ? saved.lastSavedAt : current.lastSavedAt,
    showCanvasGrid: typeof saved.showCanvasGrid === 'boolean' ? saved.showCanvasGrid : current.showCanvasGrid,
    sidebarWidth: typeof saved.sidebarWidth === 'number' ? saved.sidebarWidth : current.sidebarWidth,
    ...(checked.ok ? { tables: checked.tables, modules: checked.modules ?? current.modules } : {}),
  };
}

export const useSchemaStore = create<SchemaStoreState>()(
  persist(
    (set, get) => {
      /**
       * Every action that changes the schema goes through this helper. It:
       *  1. saves the current schema so Undo can restore it,
       *  2. applies the change,
       *  3. clears the Redo stack and updates "last saved".
       *
       * Pass a `coalesceKey` for edits that fire many times in a row (typing in
       * a text box): calls with the same key within a second share one undo step.
       */
      let lastCoalesce: { key: string; time: number } | null = null;

      const commit = (
        update: Partial<SchemaStoreState> | ((state: SchemaStoreState) => Partial<SchemaStoreState>),
        coalesceKey?: string
      ) => {
        const now = Date.now();
        const merge =
          !!coalesceKey &&
          lastCoalesce?.key === coalesceKey &&
          now - lastCoalesce.time < COALESCE_WINDOW_MS;
        lastCoalesce = coalesceKey ? { key: coalesceKey, time: now } : null;

        const snapshot = merge ? null : takeSnapshot(get());
        set((state) => ({
          ...(typeof update === 'function' ? update(state) : update),
          ...(snapshot ? { past: [...state.past.slice(-MAX_HISTORY + 1), snapshot] } : {}),
          future: [],
          lastSavedAt: new Date(now).toISOString(),
        }));
      };

      const mapTable = (tableId: string, change: (t: SchemaTable) => SchemaTable) => (state: SchemaStoreState) => ({
        tables: state.tables.map((t) => (t.id === tableId ? change(t) : t)),
      });

      /** Removes the link from every column that points at a deleted table or column. */
      const clearFkTo = (tables: SchemaTable[], matches: (c: SchemaColumn) => boolean): SchemaTable[] =>
        tables.map((t) => ({
          ...t,
          columns: t.columns.map((c) =>
            matches(c)
              ? { ...c, fkTargetTableId: undefined, fkTargetColumnId: undefined, fkOnDelete: undefined }
              : c
          ),
        }));

      const focusOn = (x: number, y: number) => ({ x: x + 144, y: y + 60, timestamp: Date.now() });

      return {
        tables: DEFAULT_TABLES,
        modules: DEFAULT_MODULES,
        selectedTableId: null,
        activeModuleFilter: null,
        searchQuery: '',
        theme: 'dark',
        dialect: 'postgres',
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

          // A column may point at its own table (self-reference), so no extra check is needed
          commit((state) => ({
            ...mapTable(edge.sourceTableId, (t) => ({
              ...t,
              columns: t.columns.map((c) =>
                c.id === edge.sourceColumnId
                  ? { ...c, fkTargetTableId: targetTableId, fkTargetColumnId: targetColumnId, fkOnDelete: 'CASCADE' }
                  : c
              ),
            }))(state),
            connectingEdge: null,
          }));
        },

        // ---- History -------------------------------------------------------
        recordHistorySnapshot: () => commit({}),

        undo: () => {
          const { past, future, tables, modules } = get();
          if (past.length === 0) return;
          const previous = past[past.length - 1];
          lastCoalesce = null;
          set({
            tables: previous.tables,
            modules: previous.modules,
            past: past.slice(0, -1),
            future: [takeSnapshot({ tables, modules }), ...future],
            lastSavedAt: new Date().toISOString(),
          });
        },

        redo: () => {
          const { past, future, tables, modules } = get();
          if (future.length === 0) return;
          const next = future[0];
          lastCoalesce = null;
          set({
            tables: next.tables,
            modules: next.modules,
            past: [...past, takeSnapshot({ tables, modules })],
            future: future.slice(1),
            lastSavedAt: new Date().toISOString(),
          });
        },

        // ---- Tables --------------------------------------------------------
        addTable: (custom) => {
          const { tables, modules, activeModuleFilter } = get();
          const id = custom?.id || createId('tbl');
          const newTable: SchemaTable = {
            id,
            name: custom?.name || `new_table_${tables.length + 1}`,
            moduleId: custom?.moduleId || activeModuleFilter || modules[0]?.id || 'mod_general',
            x: custom?.x ?? 120 + (tables.length % 4) * 40,
            y: custom?.y ?? 120 + (tables.length % 4) * 40,
            comment: custom?.comment || '',
            columns: custom?.columns || getDefaultColumns(get().dialect),
          };

          commit((state) => ({
            tables: [...state.tables, newTable],
            selectedTableId: id,
            activeSidebarTab: 'inspector',
            isSidebarCollapsed: false,
            canvasFocusTarget: focusOn(newTable.x, newTable.y),
          }));
        },

        duplicateTable: (id) => {
          const table = get().tables.find((t) => t.id === id);
          if (!table) return;

          const duplicated: SchemaTable = {
            ...table,
            id: createId('tbl'),
            name: `${table.name}_copy`,
            x: table.x + 40,
            y: table.y + 40,
            columns: table.columns.map((c) => ({ ...c, id: createId('col') })),
          };

          commit((state) => ({
            tables: [...state.tables, duplicated],
            selectedTableId: duplicated.id,
            activeSidebarTab: 'inspector',
            isSidebarCollapsed: false,
            canvasFocusTarget: focusOn(duplicated.x, duplicated.y),
          }));
        },

        updateTable: (id, updates) =>
          commit(mapTable(id, (t) => ({ ...t, ...updates })), `table:${id}:${Object.keys(updates).join(',')}`),

        deleteTable: (id) =>
          commit((state) => ({
            // Also unlink every foreign key that pointed at this table
            tables: clearFkTo(
              state.tables.filter((t) => t.id !== id),
              (c) => c.fkTargetTableId === id
            ),
            selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
          })),

        // Dragging is not an undo step on its own: TableCard records one snapshot when the drag starts
        updateTablePosition: (id, x, y) =>
          set((state) => ({
            tables: state.tables.map((t) => (t.id === id ? { ...t, x, y } : t)),
            lastSavedAt: new Date().toISOString(),
          })),

        setSelectedTableId: (id) =>
          set((state) => ({
            selectedTableId: id,
            activeSidebarTab: id ? 'inspector' : state.activeSidebarTab,
            isSidebarCollapsed: id ? false : state.isSidebarCollapsed,
          })),

        // ---- Columns -------------------------------------------------------
        addColumn: (tableId, column) => {
          const table = get().tables.find((t) => t.id === tableId);
          const newColId = column?.id || createId('col');
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

          commit((state) => ({
            ...mapTable(tableId, (t) => ({ ...t, columns: [...t.columns, newColumn] }))(state),
            canvasFocusTarget: table ? focusOn(table.x, table.y) : state.canvasFocusTarget,
          }));

          return newColId;
        },

        updateColumn: (tableId, columnId, updates) =>
          commit(
            mapTable(tableId, (t) => ({
              ...t,
              columns: t.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
            })),
            `column:${columnId}:${Object.keys(updates).join(',')}`
          ),

        reorderColumns: (tableId, sourceIndex, targetIndex) => {
          if (sourceIndex === targetIndex) return;
          const table = get().tables.find((t) => t.id === tableId);
          const last = (table?.columns.length ?? 0) - 1;
          if (!table || sourceIndex < 0 || targetIndex < 0 || sourceIndex > last || targetIndex > last) return;

          commit(
            mapTable(tableId, (t) => {
              const columns = [...t.columns];
              const [moved] = columns.splice(sourceIndex, 1);
              columns.splice(targetIndex, 0, moved);
              return { ...t, columns };
            })
          );
        },

        moveColumn: (tableId, columnId, direction) => {
          const columns = get().tables.find((t) => t.id === tableId)?.columns ?? [];
          const index = columns.findIndex((c) => c.id === columnId);
          if (index < 0) return;
          get().reorderColumns(tableId, index, direction === 'up' ? index - 1 : index + 1);
        },

        deleteColumn: (tableId, columnId) =>
          commit((state) => ({
            tables: clearFkTo(
              state.tables.map((t) =>
                t.id === tableId ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) } : t
              ),
              (c) => c.fkTargetColumnId === columnId
            ),
          })),

        // ---- Modules -------------------------------------------------------
        addModule: (moduleData) => {
          const newModule: ModuleGroup = {
            id: moduleData.id || createId('mod'),
            name: moduleData.name.trim(),
            color: moduleData.color || '#6366f1',
          };
          commit((state) => ({ modules: [...state.modules, newModule] }));
        },

        updateModule: (id, updates) =>
          commit(
            (state) => ({ modules: state.modules.map((m) => (m.id === id ? { ...m, ...updates } : m)) }),
            `module:${id}:${Object.keys(updates).join(',')}`
          ),

        deleteModule: (id) =>
          commit((state) => {
            const remaining = state.modules.filter((m) => m.id !== id);
            const modules = remaining.length > 0 ? remaining : [{ id: 'mod_general', name: 'General', color: '#3b82f6' }];
            return {
              modules,
              // Tables of the deleted module move to the first remaining module
              tables: state.tables.map((t) => (t.moduleId === id ? { ...t, moduleId: modules[0].id } : t)),
              activeModuleFilter: state.activeModuleFilter === id ? null : state.activeModuleFilter,
            };
          }),

        setActiveModuleFilter: (moduleId) => set({ activeModuleFilter: moduleId }),
        setSearchQuery: (query) => set({ searchQuery: query }),

        // ---- Sidebar & canvas view ----------------------------------------
        setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab, isSidebarCollapsed: false }),
        setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
        toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
        setSidebarWidth: (width) =>
          set({ sidebarWidth: Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH) }),
        toggleCanvasGrid: () => set((state) => ({ showCanvasGrid: !state.showCanvasGrid })),
        setShowCanvasGrid: (show) => set({ showCanvasGrid: show }),
        setIsShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),

        // ---- Whole-schema actions & theme ---------------------------------
        resetToStarterSchema: () =>
          commit({
            tables: DEFAULT_TABLES,
            modules: DEFAULT_MODULES,
            selectedTableId: null,
            activeModuleFilter: null,
            searchQuery: '',
          }),

        loadTemplate: (templateId) => {
          const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
          if (!tpl) return;
          commit({
            tables: tpl.tables,
            modules: tpl.modules,
            selectedTableId: null,
            activeModuleFilter: null,
            searchQuery: '',
            canvasFocusTarget: { x: 300, y: 200, timestamp: Date.now() },
          });
        },

        importSchemaJson: (data) =>
          commit((state) => {
            const modules = data.modules && data.modules.length > 0 ? data.modules : state.modules;
            // Tables pointing at a module that does not exist (e.g. from SQL import) join the first one
            const fallbackModuleId = modules[0]?.id;
            const tables = data.tables.map((t) =>
              fallbackModuleId && !modules.some((m) => m.id === t.moduleId)
                ? { ...t, moduleId: fallbackModuleId }
                : t
            );
            return { tables, modules, selectedTableId: null };
          }),

        toggleTheme: () => {
          const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
          syncThemeClass(nextTheme);
          set({ theme: nextTheme, lastSavedAt: new Date().toISOString() });
        },

        setDialect: (dialect) => set({ dialect }),

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
      };
    },
    {
      name: 'dabblerdb_schema_v1',
      version: 1,
      partialize: (state) => ({
        tables: state.tables,
        modules: state.modules,
        theme: state.theme,
        dialect: state.dialect,
        lastSavedAt: state.lastSavedAt,
        showCanvasGrid: state.showCanvasGrid,
        sidebarWidth: state.sidebarWidth,
      }),
      merge: mergePersistedState,
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          syncThemeClass(state.theme);
        }
      },
    }
  )
);
