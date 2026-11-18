import type { SchemaColumn } from '../types/schema';
import type { SupportedDialect } from '../utils/sqlCompiler';
import { createId } from '../utils/ids';

export const DIALECTS: Array<{ id: SupportedDialect; label: string }> = [
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'sqlite', label: 'SQLite' },
];

export const DIALECT_LABELS: Record<SupportedDialect, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
};

export const isDialect = (value: unknown): value is SupportedDialect =>
  value === 'postgres' || value === 'mysql' || value === 'sqlite';

/**
 * The two columns every new table starts with. They are chosen so the exported
 * SQL is valid in the selected database:
 *  - PostgreSQL has uuid and gen_random_uuid().
 *  - MySQL and SQLite have no such function, so the id counts up automatically instead.
 */
export function getDefaultColumns(dialect: SupportedDialect): SchemaColumn[] {
  const idColumn: SchemaColumn =
    dialect === 'postgres'
      ? { id: createId('col'), name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' }
      : {
          id: createId('col'),
          name: 'id',
          // "serial" becomes BIGINT AUTO_INCREMENT in MySQL and INTEGER ... AUTOINCREMENT in SQLite
          type: dialect === 'mysql' ? 'serial' : 'integer',
          isPk: true,
          isNullable: false,
        };

  const createdAt: SchemaColumn = {
    id: createId('col'),
    name: 'created_at',
    type: dialect === 'postgres' ? 'timestamptz' : 'timestamp',
    isPk: false,
    isNullable: false,
    defaultValue: 'CURRENT_TIMESTAMP',
  };

  return [idColumn, createdAt];
}
