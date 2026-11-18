import { beforeEach, describe, expect, it } from 'vitest';
import { getDefaultColumns, isDialect } from '../dialectDefaults';
import { generateSql, parseSqlToTables, type SupportedDialect } from '../../utils/sqlCompiler';
import { mergePersistedState, useSchemaStore } from '../../store/useSchemaStore';
import type { SchemaTable } from '../../types/schema';

const newTable = (dialect: SupportedDialect): SchemaTable => ({
  id: 't',
  name: 'things',
  moduleId: 'm',
  x: 0,
  y: 0,
  columns: getDefaultColumns(dialect),
});

describe('default columns follow the selected database', () => {
  it('PostgreSQL gets a uuid id with gen_random_uuid()', () => {
    const sql = generateSql([newTable('postgres')], 'postgres');
    expect(sql).toContain('"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(sql).toContain('"created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
  });

  it('MySQL gets an auto-increment id and no PostgreSQL-only functions', () => {
    const sql = generateSql([newTable('mysql')], 'mysql');
    expect(sql).toContain('`id` BIGINT AUTO_INCREMENT PRIMARY KEY');
    expect(sql).toContain('`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(sql).not.toContain('gen_random_uuid');
    expect(sql).not.toContain('TIMESTAMPTZ');
  });

  it('SQLite gets an integer autoincrement id and no PostgreSQL-only functions', () => {
    const sql = generateSql([newTable('sqlite')], 'sqlite');
    expect(sql).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(sql).not.toContain('gen_random_uuid');
  });

  it('every dialect produces SQL that the importer reads back as 2 columns', () => {
    for (const dialect of ['postgres', 'mysql', 'sqlite'] as const) {
      const { tables, errors } = parseSqlToTables(generateSql([newTable(dialect)], dialect));
      expect(errors).toEqual([]);
      expect(tables[0].columns.map((c) => c.name)).toEqual(['id', 'created_at']);
    }
  });

  it('gives each column a new id every time', () => {
    const a = getDefaultColumns('postgres');
    const b = getDefaultColumns('postgres');
    expect(new Set([...a, ...b].map((c) => c.id)).size).toBe(4);
  });

  it('isDialect only accepts the three supported names', () => {
    expect(isDialect('mysql')).toBe(true);
    expect(isDialect('oracle')).toBe(false);
    expect(isDialect(undefined)).toBe(false);
  });
});

describe('dialect in the store', () => {
  beforeEach(() => useSchemaStore.setState({ dialect: 'postgres', tables: [], past: [], future: [] }));

  it('new tables use the selected dialect', () => {
    useSchemaStore.getState().setDialect('sqlite');
    useSchemaStore.getState().addTable();
    const columns = useSchemaStore.getState().tables[0].columns;
    expect(columns[0].type).toBe('integer');
    expect(columns[0].defaultValue).toBeUndefined();
  });

  it('changing the dialect does not change existing tables or add an undo step', () => {
    useSchemaStore.getState().addTable();
    const before = useSchemaStore.getState().past.length;
    useSchemaStore.getState().setDialect('mysql');
    expect(useSchemaStore.getState().tables[0].columns[0].type).toBe('uuid');
    expect(useSchemaStore.getState().past).toHaveLength(before);
  });

  it('is restored from saved data, and an invalid saved value is ignored', () => {
    const current = useSchemaStore.getState();
    expect(mergePersistedState({ dialect: 'mysql' }, current).dialect).toBe('mysql');
    expect(mergePersistedState({ dialect: 'oracle' }, current).dialect).toBe('postgres');
  });
});
