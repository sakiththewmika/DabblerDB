import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSchemaStore } from '../../store/useSchemaStore';
import { useToastStore } from '../../store/useToastStore';
import { doWithUndo } from '../undoToast';
import type { SchemaTable } from '../../types/schema';

const table = (id: string): SchemaTable => ({ id, name: id, moduleId: 'm1', x: 0, y: 0, columns: [] });

beforeEach(() => {
  useSchemaStore.setState({
    tables: [table('users'), table('orders')],
    modules: [{ id: 'm1', name: 'Core', color: '#111' }],
    past: [],
    future: [],
    selectedTableId: null,
  });
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
});

const lastToast = () => useToastStore.getState().toasts.at(-1)!;
const tableIds = () => useSchemaStore.getState().tables.map((t) => t.id);

describe('doWithUndo', () => {
  it('makes the change straight away, without asking', () => {
    doWithUndo('Deleted table "users"', () => useSchemaStore.getState().deleteTable('users'));
    expect(tableIds()).toEqual(['orders']);
    expect(lastToast().title).toBe('Deleted table "users"');
    expect(lastToast().action?.label).toBe('Undo');
  });

  it('brings the data back when Undo is pressed', () => {
    doWithUndo('Deleted table "users"', () => useSchemaStore.getState().deleteTable('users'));
    lastToast().action!.onClick();
    expect(tableIds()).toEqual(['users', 'orders']);
  });

  it('does not undo newer work if something else changed after the delete', () => {
    doWithUndo('Deleted table "users"', () => useSchemaStore.getState().deleteTable('users'));
    const undoButton = lastToast().action!;

    useSchemaStore.getState().addTable({ id: 'late', name: 'late' });
    undoButton.onClick();

    // The newer table is still there, and so is the earlier delete
    expect(tableIds()).toContain('late');
    expect(tableIds()).not.toContain('users');
    expect(lastToast().kind).toBe('warning');
  });

  it('closes by itself even when it lists details', () => {
    doWithUndo('Deleted module "Core"', () => {}, ['2 table(s) moved']);
    expect(lastToast().duration).toBeGreaterThan(0);
    expect(lastToast().details).toEqual(['2 table(s) moved']);
  });
});
