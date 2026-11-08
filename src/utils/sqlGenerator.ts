import type { SchemaTable } from '../types/schema';

export function generateSqlSchema(tables: SchemaTable[]): string {
  if (tables.length === 0) {
    return '-- No tables defined yet\n';
  }

  const lines: string[] = [
    '--',
    '-- DabblerDB / PrismDB Studio Export',
    `-- Generated at: ${new Date().toISOString()}`,
    '--',
    '',
  ];

  tables.forEach((table) => {
    if (table.comment) {
      lines.push(`-- ${table.name}: ${table.comment}`);
    }

    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);

    const colDefinitions = table.columns.map((col) => {
      let def = `  "${col.name}" ${col.type.toUpperCase()}`;

      if (col.isPk) {
        def += ' PRIMARY KEY';
      }

      if (col.isUnique && !col.isPk) {
        def += ' UNIQUE';
      }

      if (!col.isNullable && !col.isPk) {
        def += ' NOT NULL';
      }

      if (col.defaultValue) {
        def += ` DEFAULT ${col.defaultValue}`;
      }

      return def;
    });

    lines.push(colDefinitions.join(',\n'));
    lines.push(');');
    lines.push('');
  });

  // Foreign Key Constraints
  const fkStatements: string[] = [];

  tables.forEach((table) => {
    table.columns.forEach((col) => {
      if (!col.fkTargetTableId) return;

      const targetTable = tables.find((t) => t.id === col.fkTargetTableId);
      if (!targetTable) return;

      const targetCol = targetTable.columns.find((c) => c.id === col.fkTargetColumnId) ||
        targetTable.columns.find((c) => c.isPk) ||
        targetTable.columns[0];

      if (!targetCol) return;

      const constraintName = `fk_${table.name}_${col.name}_${targetTable.name}`;
      const onDelete = col.fkOnDelete ? ` ON DELETE ${col.fkOnDelete}` : '';

      fkStatements.push(
        `ALTER TABLE "${table.name}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${col.name}") REFERENCES "${targetTable.name}" ("${targetCol.name}")${onDelete};`
      );
    });
  });

  if (fkStatements.length > 0) {
    lines.push('-- Foreign Key Relationships');
    lines.push(...fkStatements);
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadSqlFile(tables: SchemaTable[], filename = 'database_schema.sql'): void {
  const sql = generateSqlSchema(tables);
  const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
