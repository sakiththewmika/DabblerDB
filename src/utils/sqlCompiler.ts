import type { SchemaTable, SchemaColumn, FkOnDeleteAction } from '../types/schema';

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
    const tableHeader = dialect === 'mysql'
      ? `CREATE TABLE IF NOT EXISTS ${tableNameQuoted} (`
      : `CREATE TABLE IF NOT EXISTS ${tableNameQuoted} (` ;

    output.push(tableHeader);

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

/**
 * Parses user SQL DDL back into visual SchemaTable and SchemaColumn objects
 */
export function parseSqlToTables(
  sqlText: string,
  existingTables: SchemaTable[] = []
): { tables: SchemaTable[]; errors: string[] } {
  const errors: string[] = [];
  const parsedTables: SchemaTable[] = [];

  // 1. Strip comments
  const cleanSql = sqlText
    .replace(/--.*$/gm, '') // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments

  // 2. Match CREATE TABLE statements
  // Matches: CREATE TABLE [IF NOT EXISTS] <tableName> ( <body> );
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w]+)\s*\(([\s\S]*?)\)\s*(?:ENGINE\s*=\s*\w+)?\s*(?:DEFAULT\s+CHARSET\s*=\s*\w+)?\s*(?:COLLATE\s*=\s*\w+)?\s*;/gi;

  const matches = [...cleanSql.matchAll(createTableRegex)];

  if (matches.length === 0) {
    return {
      tables: existingTables,
      errors: ['No valid "CREATE TABLE ... (...);" statements could be detected in the input SQL.'],
    };
  }

  // Helper to strip quotes
  const cleanId = (s: string) => s.trim().replace(/^[`"']|[`"']$/g, '');

  // Map of table names to their parsed object
  const tableNameMap = new Map<string, { table: SchemaTable; fkPending: Array<{ colName: string; targetTableName: string; targetColName?: string; onDelete?: FkOnDeleteAction }> }>();

  // Helper to split column definitions considering parentheses (e.g. VARCHAR(255), NUMERIC(10,2))
  const splitClauses = (body: string): string[] => {
    const clauses: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;

      if (char === ',' && parenDepth === 0) {
        if (current.trim()) clauses.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) clauses.push(current.trim());
    return clauses;
  };

  matches.forEach((match, index) => {
    const rawTableName = cleanId(match[1]);
    const body = match[2];

    // Find existing table to preserve coordinates & module
    const existingTable = existingTables.find(
      (t) => t.name.toLowerCase() === rawTableName.toLowerCase()
    );

    const tableId = existingTable?.id || `tbl_${Date.now()}_${index}`;
    const moduleId = existingTable?.moduleId || 'mod_identity';
    const x = existingTable ? existingTable.x : 60 + (index % 3) * 360;
    const y = existingTable ? existingTable.y : 80 + Math.floor(index / 3) * 360;

    const columns: SchemaColumn[] = [];
    const fkPending: Array<{ colName: string; targetTableName: string; targetColName?: string; onDelete?: FkOnDeleteAction }> = [];

    const clauses = splitClauses(body);

    clauses.forEach((clause) => {
      const trimmed = clause.trim();

      // Check for standalone table-level PRIMARY KEY (col1, col2)
      const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\(\s*[`"']?(\w+)[`"']?\s*\)/i);
      if (pkMatch) {
        const pkColName = cleanId(pkMatch[1]).toLowerCase();
        const col = columns.find((c) => c.name.toLowerCase() === pkColName);
        if (col) {
          col.isPk = true;
          col.isNullable = false;
        }
        return;
      }

      // Check for standalone table-level FOREIGN KEY constraint
      // e.g. [CONSTRAINT <name>] FOREIGN KEY (<col>) REFERENCES <target> (<target_col>) [ON DELETE <action>]
      const fkMatch = trimmed.match(
        /(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?FOREIGN\s+KEY\s*\(\s*[`"']?(\w+)[`"']?\s*\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*(?:\(\s*[`"']?(\w+)[`"']?\s*\))?(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i
      );

      if (fkMatch) {
        const colName = cleanId(fkMatch[1]);
        const targetTableName = cleanId(fkMatch[2]);
        const targetColName = fkMatch[3] ? cleanId(fkMatch[3]) : undefined;
        let onDeleteAction: FkOnDeleteAction = 'CASCADE';
        if (fkMatch[4]) {
          const actionUpper = fkMatch[4].toUpperCase().replace(/\s+/, ' ');
          if (actionUpper === 'SET NULL') onDeleteAction = 'SET NULL';
          else if (actionUpper === 'RESTRICT') onDeleteAction = 'RESTRICT';
          else if (actionUpper === 'NO ACTION') onDeleteAction = 'NO ACTION';
        }

        fkPending.push({
          colName,
          targetTableName,
          targetColName,
          onDelete: onDeleteAction,
        });
        return;
      }

      // Check for standalone UNIQUE (col)
      const uqMatch = trimmed.match(/^UNIQUE\s*\(\s*[`"']?(\w+)[`"']?\s*\)/i);
      if (uqMatch) {
        const uqColName = cleanId(uqMatch[1]).toLowerCase();
        const col = columns.find((c) => c.name.toLowerCase() === uqColName);
        if (col) col.isUnique = true;
        return;
      }

      // Check if this is an INDEX or KEY declaration (MySQL specific)
      if (/^(?:KEY|INDEX)\s+/i.test(trimmed)) {
        return;
      }

      // Parse column definition: `<col_name> <type> [PRIMARY KEY] [UNIQUE] [NOT NULL] [DEFAULT <val>] [REFERENCES ...]`
      const colTokens = trimmed.split(/\s+/);
      if (colTokens.length < 2) return;

      const rawColName = cleanId(colTokens[0]);
      const rawColType = colTokens[1].toLowerCase();

      // Check existing column to preserve ID if possible
      const existingCol = existingTable?.columns.find(
        (c) => c.name.toLowerCase() === rawColName.toLowerCase()
      );

      const colId = existingCol?.id || `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isPk = /PRIMARY\s+KEY/i.test(trimmed);
      const isUnique = /UNIQUE/i.test(trimmed);
      const isNotNull = /NOT\s+NULL/i.test(trimmed);

      // Extract default value
      const defaultMatch = trimmed.match(/DEFAULT\s+([^,]+?)(?:\s+(?:NOT|NULL|PRIMARY|UNIQUE|REFERENCES|$))/i);
      const defaultValue = defaultMatch ? defaultMatch[1].trim() : undefined;

      // Extract inline REFERENCES if present
      const inlineFkMatch = trimmed.match(
        /REFERENCES\s+[`"']?(\w+)[`"']?\s*(?:\(\s*[`"']?(\w+)[`"']?\s*\))?(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i
      );

      if (inlineFkMatch) {
        let onDeleteAction: FkOnDeleteAction = 'CASCADE';
        if (inlineFkMatch[3]) {
          const actionUpper = inlineFkMatch[3].toUpperCase().replace(/\s+/, ' ');
          if (actionUpper === 'SET NULL') onDeleteAction = 'SET NULL';
          else if (actionUpper === 'RESTRICT') onDeleteAction = 'RESTRICT';
          else if (actionUpper === 'NO ACTION') onDeleteAction = 'NO ACTION';
        }

        fkPending.push({
          colName: rawColName,
          targetTableName: cleanId(inlineFkMatch[1]),
          targetColName: inlineFkMatch[2] ? cleanId(inlineFkMatch[2]) : undefined,
          onDelete: onDeleteAction,
        });
      }

      columns.push({
        id: colId,
        name: rawColName,
        type: rawColType,
        isPk,
        isUnique,
        isNullable: isPk ? false : !isNotNull,
        defaultValue,
      });
    });

    const newTable: SchemaTable = {
      id: tableId,
      name: rawTableName,
      moduleId,
      x,
      y,
      comment: existingTable?.comment || '',
      columns,
    };

    tableNameMap.set(rawTableName.toLowerCase(), { table: newTable, fkPending });
    parsedTables.push(newTable);
  });

  // 3. Resolve all pending Foreign Key references
  tableNameMap.forEach(({ table, fkPending }) => {
    fkPending.forEach(({ colName, targetTableName, targetColName, onDelete }) => {
      const col = table.columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
      if (!col) return;

      const targetEntry = tableNameMap.get(targetTableName.toLowerCase());
      if (!targetEntry) {
        errors.push(
          `Table "${table.name}" references unknown target table "${targetTableName}".`
        );
        return;
      }

      const targetTable = targetEntry.table;
      let targetCol = targetColName
        ? targetTable.columns.find((c) => c.name.toLowerCase() === targetColName.toLowerCase())
        : undefined;

      if (!targetCol) {
        targetCol = targetTable.columns.find((c) => c.isPk) || targetTable.columns[0];
      }

      col.fkTargetTableId = targetTable.id;
      col.fkTargetColumnId = targetCol?.id;
      col.fkOnDelete = onDelete;
    });
  });

  return { tables: parsedTables, errors };
}

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

