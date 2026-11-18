import type { SchemaTable } from '../types/schema';

export type SupportedDialect = 'postgres' | 'mysql' | 'sqlite';

/**
 * Format identifier according to dialect rules
 */
export function quoteIdentifier(name: string, dialect: SupportedDialect): string {
  if (dialect === 'mysql') {
    return `\`${name}\``;
  }
  return `"${name}"`;
}

/**
 * Maps generic SQL types to dialect-specific types
 */
export function mapTypeToDialect(rawType: string, dialect: SupportedDialect): string {
  const t = rawType.trim().toUpperCase();

  if (dialect === 'mysql') {
    if (t === 'UUID') return 'VARCHAR(36)';
    if (t.startsWith('TIMESTAMPTZ')) return 'DATETIME';
    if (t === 'BOOLEAN' || t === 'BOOL') return 'TINYINT(1)';
    if (t.startsWith('SERIAL')) return 'BIGINT AUTO_INCREMENT';
    if (t === 'TEXT') return 'LONGTEXT';
    return t;
  }

  if (dialect === 'sqlite') {
    if (t === 'UUID') return 'TEXT';
    if (t.startsWith('VARCHAR') || t.startsWith('CHAR') || t === 'TEXT') return 'TEXT';
    if (t.startsWith('TIMESTAMP') || t === 'DATE' || t === 'TIME') return 'TEXT';
    if (t === 'BOOLEAN' || t === 'BOOL') return 'INTEGER';
    if (t.startsWith('INT') || t.startsWith('SERIAL') || t === 'BIGINT') return 'INTEGER';
    if (t.startsWith('NUMERIC') || t.startsWith('DECIMAL') || t === 'REAL' || t === 'FLOAT' || t === 'DOUBLE') return 'REAL';
    return t;
  }

  // PostgreSQL default
  return t;
}

/**
 * Generates clean, well-commented multi-dialect SQL schema
 */
export function generateSql(tables: SchemaTable[], dialect: SupportedDialect = 'postgres'): string {
  if (tables.length === 0) {
    return `-- No tables defined in schema\n`;
  }

  const dialectNames: Record<SupportedDialect, string> = {
    postgres: 'PostgreSQL',
    mysql: 'MySQL 8.0+',
    sqlite: 'SQLite 3',
  };

  const output: string[] = [
    `-- ==========================================================`,
    `-- DabblerDB SQL DDL Export`,
    `-- Dialect: ${dialectNames[dialect]}`,
    `-- Generated At: ${new Date().toISOString()}`,
    `-- Total Tables: ${tables.length}`,
    `-- ==========================================================`,
    ``,
  ];

  if (dialect === 'sqlite') {
    output.push(`PRAGMA foreign_keys = ON;`, ``);
  }

  const indexStatements: string[] = [];

  // Generate Table DDLs
  tables.forEach((table) => {
    if (table.comment) {
      output.push(`-- Table: ${table.name}`);
      output.push(`-- Description: ${table.comment}`);
    }

    const tableNameQuoted = quoteIdentifier(table.name, dialect);
    output.push(`CREATE TABLE IF NOT EXISTS ${tableNameQuoted} (`);

    const definitions: string[] = [];

    // Columns
    table.columns.forEach((col) => {
      const colNameQuoted = quoteIdentifier(col.name, dialect);
      const colType = mapTypeToDialect(col.type, dialect);
      let def = `  ${colNameQuoted} ${colType}`;

      if (col.isPk) {
        if (dialect === 'sqlite' && colType === 'INTEGER') {
          def += ' PRIMARY KEY AUTOINCREMENT';
        } else {
          def += ' PRIMARY KEY';
        }
      }

      if (col.isUnique && !col.isPk) {
        def += ' UNIQUE';
      }

      if (!col.isNullable && !col.isPk) {
        def += ' NOT NULL';
      }

      if (col.defaultValue !== undefined && col.defaultValue !== null && col.defaultValue.trim() !== '') {
        const val = col.defaultValue.trim();
        def += ` DEFAULT ${val}`;
      }

      definitions.push(def);
    });

    // Foreign Keys (inline table constraints)
    table.columns.forEach((col) => {
      if (!col.fkTargetTableId) return;

      const targetTable = tables.find((t) => t.id === col.fkTargetTableId);
      if (!targetTable) return;

      const targetCol =
        targetTable.columns.find((c) => c.id === col.fkTargetColumnId) ||
        targetTable.columns.find((c) => c.isPk) ||
        targetTable.columns[0];

      if (!targetCol) return;

      const colNameQuoted = quoteIdentifier(col.name, dialect);
      const targetTableQuoted = quoteIdentifier(targetTable.name, dialect);
      const targetColQuoted = quoteIdentifier(targetCol.name, dialect);
      const onDelete = col.fkOnDelete ? ` ON DELETE ${col.fkOnDelete}` : '';

      const constraintName = `fk_${table.name}_${col.name}`;
      const constraintNameQuoted = quoteIdentifier(constraintName, dialect);

      definitions.push(
        `  CONSTRAINT ${constraintNameQuoted} FOREIGN KEY (${colNameQuoted}) REFERENCES ${targetTableQuoted} (${targetColQuoted})${onDelete}`
      );

      // Collect Index statement on this FK column
      const idxName = `idx_${table.name}_${col.name}`;
      const idxNameQuoted = quoteIdentifier(idxName, dialect);
      if (dialect === 'mysql') {
        indexStatements.push(
          `CREATE INDEX ${idxNameQuoted} ON ${tableNameQuoted} (${colNameQuoted});`
        );
      } else {
        indexStatements.push(
          `CREATE INDEX IF NOT EXISTS ${idxNameQuoted} ON ${tableNameQuoted} (${colNameQuoted});`
        );
      }
    });

    output.push(definitions.join(',\n'));

    if (dialect === 'mysql') {
      output.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n`);
    } else {
      output.push(`);\n`);
    }
  });

  // Automatic Indexes on Foreign Keys
  if (indexStatements.length > 0) {
    output.push(
      `-- ==========================================================`,
      `-- Foreign Key Performance Indexes`,
      `-- ==========================================================`,
      ...indexStatements,
      ``
    );
  }

  return output.join('\n');
}

// SQL -> tables lives in ./sqlParser (tokenizer, parser, converter)
export { parseSqlToTables } from './sqlParser';

/**
 * Download generated SQL file directly in the browser
 */
export function downloadSqlScript(
  tables: SchemaTable[],
  dialect: SupportedDialect = 'postgres',
  filename = 'schema.sql'
): void {
  const sql = generateSql(tables, dialect);
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

