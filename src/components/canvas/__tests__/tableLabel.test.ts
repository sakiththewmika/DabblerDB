import { describe, expect, it } from 'vitest';
import { describeTable, referencedTableNames } from '../tableLabel';
import type { SchemaTable } from '../../../types/schema';

const make = (id: string, name: string, fks: string[] = [], columnCount = 2): SchemaTable => ({
  id,
  name,
  moduleId: 'm',
  x: 0,
  y: 0,
  columns: [
    ...Array.from({ length: columnCount - fks.length }, (_, i) => ({ id: `${id}_c${i}`, name: `c${i}`, type: 'int', isPk: false })),
    ...fks.map((target, i) => ({ id: `${id}_fk${i}`, name: `fk${i}`, type: 'int', isPk: false, fkTargetTableId: target })),
  ],
});

describe('describeTable', () => {
  it('says the name and the number of columns', () => {
    expect(describeTable(make('a', 'users', [], 3), [], false)).toBe('Table users, 3 columns');
  });

  it('uses the singular for one column', () => {
    expect(describeTable(make('a', 'tags', [], 1), [], false)).toBe('Table tags, 1 column');
  });

  it('mentions related tables and the selected state', () => {
    expect(describeTable(make('o', 'orders', ['u', 'p']), ['users', 'products'], true)).toBe(
      'Table orders, 2 columns, references users and products, selected'
    );
  });
});

describe('referencedTableNames', () => {
  const users = make('u', 'users');
  const products = make('p', 'products');

  it('lists each referenced table once, ignoring missing ones', () => {
    const orders = make('o', 'orders', ['u', 'u', 'p', 'gone'], 4);
    expect(referencedTableNames(orders, [users, products, orders])).toEqual(['users', 'products']);
  });

  it('is empty for a table without foreign keys', () => {
    expect(referencedTableNames(users, [users, products])).toEqual([]);
  });
});
