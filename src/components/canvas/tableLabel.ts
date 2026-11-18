import type { SchemaTable } from '../../types/schema';

/** The sentence a screen reader says for a table card, for example "Table orders, 5 columns, references users, selected". */
export function describeTable(table: SchemaTable, referencedTableNames: string[], isSelected: boolean): string {
  const columns = `${table.columns.length} column${table.columns.length === 1 ? '' : 's'}`;
  const references = referencedTableNames.length > 0 ? `, references ${referencedTableNames.join(' and ')}` : '';
  return `Table ${table.name}, ${columns}${references}${isSelected ? ', selected' : ''}`;
}

/** Names of the other tables this table points at with foreign keys (each name once). */
export function referencedTableNames(table: SchemaTable, allTables: SchemaTable[]): string[] {
  const names = new Set<string>();
  table.columns.forEach((c) => {
    const target = c.fkTargetTableId ? allTables.find((t) => t.id === c.fkTargetTableId) : undefined;
    if (target) names.add(target.name);
  });
  return [...names];
}
