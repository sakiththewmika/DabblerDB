import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergePersistedState, useSchemaStore } from '../useSchemaStore';
import { DEFAULT_MODULES, DEFAULT_TABLES } from '../../data/defaultSchema';
import type { SchemaColumn, SchemaTable } from '../../types/schema';

const col = (id: string, name: string, extra: Partial<SchemaColumn> = {}): SchemaColumn => ({
  id,
  name,
  type: 'int',
  isPk: false,
  ...extra,
});

/** Two small tables: orders.user_id -> users.id */
const makeTables = (): SchemaTable[] => [
  { id: 'users', name: 'users', moduleId: 'm1', x: 0, y: 0, columns: [col('u_id', 'id', { isPk: true }), col('u_name', 'name')] },
  {
    id: 'orders',
    name: 'orders',
    moduleId: 'm1',
    x: 300,
    y: 0,
    columns: [
      col('o_id', 'id', { isPk: true }),
      col('o_user', 'user_id', { fkTargetTableId: 'users', fkTargetColumnId: 'u_id', fkOnDelete: 'CASCADE' }),
    ],
  },
];
const modules = [
  { id: 'm1', name: 'Core', color: '#111' },
  { id: 'm2', name: 'Extra', color: '#222' },
];

const state = () => useSchemaStore.getState();
const orderUserCol = () => state().tables.find((t) => t.id === 'orders')!.columns[1];

// Each test gets its own fake clock, far away from the previous one,
// so "edits within one second are merged" never leaks between tests.
let fakeNow = Date.UTC(2030, 0, 1);

beforeEach(() => {
  fakeNow += 60_000;
  vi.useFakeTimers();
  vi.setSystemTime(fakeNow);
  useSchemaStore.setState({
    tables: makeTables(),
    modules,
    selectedTableId: null,
    activeModuleFilter: null,
    past: [],
    future: [],
    connectingEdge: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('undo and redo', () => {
  it('undoes and redoes a change', () => {
    state().updateTable('users', { name: 'people' });
    expect(state().tables[0].name).toBe('people');

    state().undo();
    expect(state().tables[0].name).toBe('users');

    state().redo();
    expect(state().tables[0].name).toBe('people');
  });

  it('does nothing when there is nothing to undo or redo', () => {
    const before = state().tables;
    state().undo();
    state().redo();
    expect(state().tables).toBe(before);
  });

  it('clears the redo stack after a new change', () => {
    state().updateTable('users', { name: 'a' });
    state().undo();
    expect(state().future).toHaveLength(1);
    state().updateTable('users', { comment: 'new' });
    expect(state().future).toHaveLength(0);
  });

  it('keeps at most 50 undo steps', () => {
    for (let i = 0; i < 60; i++) {
      vi.advanceTimersByTime(2000); // far apart, so no merging
      state().addColumn('users');
    }
    expect(state().past).toHaveLength(50);
  });

  it('undo restores modules too', () => {
    state().deleteModule('m2');
    expect(state().modules).toHaveLength(1);
    state().undo();
    expect(state().modules).toHaveLength(2);
  });

  it('stores independent copies, so later edits do not change old snapshots', () => {
    state().updateTable('users', { name: 'a' });
    state().updateColumn('users', 'u_name', { type: 'text' });
    state().undo();
    state().undo();
    expect(state().tables[0].name).toBe('users');
    expect(state().tables[0].columns[1].type).toBe('int');
  });
});

describe('merging rapid edits into one undo step', () => {
  it('treats typing in the same field as a single step', () => {
    for (const text of ['h', 'he', 'hel', 'hell', 'hello']) {
      vi.advanceTimersByTime(100);
      state().updateTable('users', { comment: text });
    }
    expect(state().past).toHaveLength(1);
    expect(state().tables[0].comment).toBe('hello');

    state().undo();
    expect(state().tables[0].comment).toBeUndefined();
  });

  it('starts a new step after a pause', () => {
    state().updateTable('users', { comment: 'a' });
    vi.advanceTimersByTime(1500);
    state().updateTable('users', { comment: 'ab' });
    expect(state().past).toHaveLength(2);
  });

  it('does not merge edits to different fields', () => {
    state().updateTable('users', { comment: 'a' });
    vi.advanceTimersByTime(100);
    state().updateTable('users', { name: 'b' });
    expect(state().past).toHaveLength(2);
  });
});

describe('tables', () => {
  it('addTable adds a table with default columns, selects it and opens the inspector', () => {
    state().addTable({ name: 'products' });
    const added = state().tables.at(-1)!;
    expect(added.name).toBe('products');
    expect(added.columns.map((c) => c.name)).toEqual(['id', 'created_at']);
    expect(state().selectedTableId).toBe(added.id);
    expect(state().isSidebarCollapsed).toBe(false);
  });

  it('gives every new table and column a different id', () => {
    state().addTable();
    state().addTable();
    const ids = state().tables.flatMap((t) => [t.id, ...t.columns.map((c) => c.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('new tables join the active module filter', () => {
    state().setActiveModuleFilter('m2');
    state().addTable();
    expect(state().tables.at(-1)!.moduleId).toBe('m2');
  });

  it('duplicateTable copies columns with new ids and offsets the position', () => {
    state().duplicateTable('users');
    const copy = state().tables.at(-1)!;
    expect(copy.name).toBe('users_copy');
    expect(copy.x).toBe(40);
    expect(copy.columns.map((c) => c.name)).toEqual(['id', 'name']);
    expect(copy.columns[0].id).not.toBe('u_id');
  });

  it('duplicateTable ignores an unknown id', () => {
    state().duplicateTable('nope');
    expect(state().tables).toHaveLength(2);
    expect(state().past).toHaveLength(0);
  });

  it('deleteTable removes foreign keys that pointed at it', () => {
    state().deleteTable('users');
    expect(state().tables.map((t) => t.id)).toEqual(['orders']);
    expect(orderUserCol().fkTargetTableId).toBeUndefined();
    expect(orderUserCol().fkOnDelete).toBeUndefined();
  });

  it('deleteTable clears the selection only when the selected table is deleted', () => {
    state().setSelectedTableId('orders');
    state().deleteTable('users');
    expect(state().selectedTableId).toBe('orders');
    state().deleteTable('orders');
    expect(state().selectedTableId).toBeNull();
  });

  it('moving a table does not add an undo step', () => {
    state().updateTablePosition('users', 50, 60);
    expect(state().tables[0]).toMatchObject({ x: 50, y: 60 });
    expect(state().past).toHaveLength(0);
  });
});

describe('columns', () => {
  it('addColumn returns the new id and appends the column', () => {
    const id = state().addColumn('users', { name: 'email' });
    const columns = state().tables[0].columns;
    expect(columns.at(-1)).toMatchObject({ id, name: 'email', type: 'varchar(255)', isNullable: true });
  });

  it('deleteColumn removes foreign keys that pointed at that column', () => {
    state().deleteColumn('users', 'u_id');
    expect(state().tables[0].columns.map((c) => c.id)).toEqual(['u_name']);
    expect(orderUserCol().fkTargetTableId).toBeUndefined();
  });

  it('moveColumn moves down and up, and stops at the edges', () => {
    state().moveColumn('users', 'u_id', 'down');
    expect(state().tables[0].columns.map((c) => c.id)).toEqual(['u_name', 'u_id']);
    state().moveColumn('users', 'u_id', 'down'); // already last
    expect(state().tables[0].columns.map((c) => c.id)).toEqual(['u_name', 'u_id']);
    expect(state().past).toHaveLength(1);
    state().moveColumn('users', 'u_id', 'up');
    expect(state().tables[0].columns.map((c) => c.id)).toEqual(['u_id', 'u_name']);
  });

  it('reorderColumns ignores out-of-range indexes', () => {
    state().reorderColumns('users', 0, 9);
    state().reorderColumns('users', -1, 0);
    expect(state().past).toHaveLength(0);
  });
});

describe('foreign key drag-to-connect', () => {
  it('sets the foreign key and clears the in-progress edge', () => {
    state().setConnectingEdge({
      sourceTableId: 'users',
      sourceColumnId: 'u_name',
      sourceAnchor: { x: 0, y: 0 },
      currentPoint: { x: 1, y: 1 },
    });
    state().completeConnectingEdge('orders', 'o_id');

    const linked = state().tables[0].columns[1];
    expect(linked).toMatchObject({ fkTargetTableId: 'orders', fkTargetColumnId: 'o_id', fkOnDelete: 'CASCADE' });
    expect(state().connectingEdge).toBeNull();
    expect(state().past).toHaveLength(1);
  });

  it('does nothing when no edge is being drawn', () => {
    state().completeConnectingEdge('orders', 'o_id');
    expect(state().past).toHaveLength(0);
  });
});

describe('modules', () => {
  it('addModule trims the name and creates an id', () => {
    state().addModule({ name: '  Billing ', color: '#abc' });
    expect(state().modules.at(-1)).toMatchObject({ name: 'Billing', color: '#abc' });
    expect(state().modules.at(-1)!.id).toMatch(/^mod_/);
  });

  it('deleteModule moves its tables to the first remaining module and clears the filter', () => {
    state().updateTable('orders', { moduleId: 'm2' });
    state().setActiveModuleFilter('m2');
    state().deleteModule('m2');
    expect(state().tables.find((t) => t.id === 'orders')!.moduleId).toBe('m1');
    expect(state().activeModuleFilter).toBeNull();
  });

  it('deleting the last module leaves a General module so tables are never orphaned', () => {
    useSchemaStore.setState({ modules: [modules[0]] });
    state().deleteModule('m1');
    expect(state().modules).toEqual([{ id: 'mod_general', name: 'General', color: '#3b82f6' }]);
    expect(state().tables.every((t) => t.moduleId === 'mod_general')).toBe(true);
  });
});

describe('whole-schema actions', () => {
  it('loadTemplate replaces tables and modules and can be undone', () => {
    state().loadTemplate('saas');
    expect(state().tables.some((t) => t.name === 'organizations')).toBe(true);
    state().undo();
    expect(state().tables.map((t) => t.id)).toEqual(['users', 'orders']);
  });

  it('loadTemplate ignores an unknown template', () => {
    state().loadTemplate('nope');
    expect(state().past).toHaveLength(0);
  });

  it('resetToStarterSchema restores the starter data', () => {
    state().resetToStarterSchema();
    expect(state().tables).toEqual(DEFAULT_TABLES);
    expect(state().modules).toEqual(DEFAULT_MODULES);
  });

  it('importSchemaJson moves tables with an unknown module into the first module', () => {
    const tables = makeTables().map((t) => ({ ...t, moduleId: 'ghost' }));
    state().importSchemaJson({ tables });
    expect(state().tables.every((t) => t.moduleId === 'm1')).toBe(true);
  });
});

describe('mergePersistedState (loading from localStorage)', () => {
  const current = () => state();

  it('uses saved tables and settings when they are valid', () => {
    const saved = { tables: makeTables(), modules, theme: 'light', showCanvasGrid: false, sidebarWidth: 500 };
    const merged = mergePersistedState(saved, current());
    expect(merged.tables.map((t) => t.id)).toEqual(['users', 'orders']);
    expect(merged.theme).toBe('light');
    expect(merged.showCanvasGrid).toBe(false);
    expect(merged.sidebarWidth).toBe(500);
  });

  it('falls back to the current tables when saved data is damaged', () => {
    const merged = mergePersistedState({ tables: [{ id: 5 }], modules }, current());
    expect(merged.tables).toBe(current().tables);
  });

  it('ignores missing or non-object saved data', () => {
    expect(mergePersistedState(undefined, current())).toBe(current());
    expect(mergePersistedState('oops', current())).toBe(current());
  });

  it('keeps an intentionally empty canvas', () => {
    expect(mergePersistedState({ tables: [], modules }, current()).tables).toEqual([]);
  });
});
