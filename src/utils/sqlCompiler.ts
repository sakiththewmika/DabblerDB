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

// ---------------------------------------------------------------------------
// SQL parsing helpers
// ---------------------------------------------------------------------------

type PendingFk = {
  colName: string;
  targetTableName: string;
  targetColName?: string;
  onDelete?: FkOnDeleteAction;
};

// One identifier: `name`, "name", [name] or a bare word
const IDENT = '(?:`[^`]+`|"[^"]+"|\\[[^\\]]+\\]|\\w+)';
// Optionally schema-qualified: public.users, "public"."users"
const QUALIFIED_IDENT = `(?:${IDENT}\\s*\\.\\s*)*${IDENT}`;

/** Removes quotes/brackets from one identifier */
const cleanId = (s: string): string => s.trim().replace(/^[`"'[]|[`"'\]]$/g, '');

/** "public"."users" -> users (the schema prefix is not shown on the canvas) */
const cleanQualifiedName = (s: string): string => {
  const parts = s.match(new RegExp(IDENT, 'g')) ?? [s];
  return cleanId(parts[parts.length - 1]);
};

/** "a, `b`, "c"" -> ['a', 'b', 'c'] */
const parseIdentList = (s: string): string[] =>
  s
    .split(',')
    .map(cleanId)
    .filter(Boolean);

const parseOnDelete = (raw?: string): FkOnDeleteAction => {
  const action = (raw ?? '').toUpperCase().replace(/\s+/g, ' ');
  if (action === 'SET NULL' || action === 'RESTRICT' || action === 'NO ACTION') return action;
  return 'CASCADE';
};

const REFERENCES_PATTERN = `REFERENCES\\s+(${QUALIFIED_IDENT})\\s*(?:\\(([^)]*)\\))?(?:\\s+ON\\s+DELETE\\s+(CASCADE|SET\\s+NULL|RESTRICT|NO\\s+ACTION))?`;

/** Removes -- and block comments, but leaves text inside 'string literals' untouched */
function stripComments(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      let j = i + 1;
      while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) {
        j += sql[j] === "'" ? 2 : 1;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (ch === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2);
      i = close === -1 ? sql.length : close + 2;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** Finds the ")" that closes the "(" just before `from`. Returns -1 if unbalanced. */
function findClosingParen(sql: string, from: number): number {
  let depth = 1;
  let quote: string | null = null;
  for (let i = from; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Splits a table body on top-level commas (ignores commas inside (), or 'quotes') */
function splitClauses(body: string): string[] {
  const clauses: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | null = null;

  for (const char of body) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    }

    if (char === ',' && depth === 0 && !quote) {
      if (current.trim()) clauses.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) clauses.push(current.trim());
  return clauses;
}

/** Splits a script into statements on ";" (ignores ";" inside quotes and $$ blocks) */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: string | null = null;
  let dollar: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        current += dollar;
        i += dollar.length - 1;
        dollar = null;
        continue;
      }
    } else if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    } else if (ch === '$') {
      const tag = sql.slice(i).match(/^\$\w*\$/)?.[0];
      if (tag) {
        dollar = tag;
        current += tag;
        i += tag.length - 1;
        continue;
      }
    } else if (ch === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

// Statements that carry no schema information, so they are never worth a warning
const SILENT_STATEMENTS = /^(?:SET|BEGIN|COMMIT|START|END|USE|PRAGMA|SELECT|LOCK|UNLOCK|ROLLBACK|DELIMITER)\b/i;

/** "CREATE UNIQUE INDEX ..." -> "CREATE INDEX", "INSERT INTO ..." -> "INSERT" */
function describeStatement(statement: string): string {
  const m = statement.match(
    /^(CREATE|ALTER|DROP|COMMENT\s+ON)\s+(?:OR\s+REPLACE\s+|UNIQUE\s+|TEMP(?:ORARY)?\s+|MATERIALIZED\s+|UNLOGGED\s+|DEFINER\s*=\s*\S+\s+)*(\w+)/i
  );
  if (m) return `${m[1]} ${m[2]}`.replace(/\s+/g, ' ').toUpperCase();
  return (statement.match(/^\w+/)?.[0] ?? 'Unknown').toUpperCase();
}

/**
 * Reads the value after DEFAULT: 'text', (expression), 42, -1, NOW(), gen_random_uuid()
 */
function extractDefault(columnRest: string): string | undefined {
  const m = columnRest.match(
    /\bDEFAULT\s+('(?:[^']|'')*'|\((?:[^()]|\([^()]*\))*\)|[\w.+-]+(?:\((?:[^()]|\([^()]*\))*\))?)/i
  );
  return m ? m[1].trim() : undefined;
}

/**
 * Parses user SQL DDL back into visual SchemaTable and SchemaColumn objects.
 *
 * Supported: CREATE TABLE (inline + table-level PRIMARY KEY / UNIQUE / FOREIGN KEY,
 * composite keys, schema-qualified and quoted names) and
 * ALTER TABLE ... ADD [CONSTRAINT x] FOREIGN KEY / PRIMARY KEY.
 */
export function parseSqlToTables(
  sqlText: string,
  existingTables: SchemaTable[] = []
): { tables: SchemaTable[]; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedTables: SchemaTable[] = [];

  const cleanSql = stripComments(sqlText);

  // CREATE TABLE [IF NOT EXISTS] <name> (   -- the body is found by matching parentheses
  const createHeader = new RegExp(
    `CREATE\\s+(?:(?:GLOBAL\\s+|LOCAL\\s+)?(?:TEMPORARY|TEMP)\\s+|UNLOGGED\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${QUALIFIED_IDENT})\\s*\\(`,
    'gi'
  );

  const found: Array<{ name: string; body: string }> = [];
  for (const m of cleanSql.matchAll(createHeader)) {
    const bodyStart = (m.index ?? 0) + m[0].length;
    const bodyEnd = findClosingParen(cleanSql, bodyStart);
    if (bodyEnd === -1) {
      errors.push(`Table "${cleanQualifiedName(m[1])}" has unbalanced parentheses and was skipped.`);
      continue;
    }
    found.push({ name: cleanQualifiedName(m[1]), body: cleanSql.slice(bodyStart, bodyEnd) });
  }

  if (found.length === 0) {
    return {
      tables: [],
      errors: [...errors, 'No valid "CREATE TABLE ... (...);" statements could be detected in the input SQL.'],
      warnings,
    };
  }

  const tableNameMap = new Map<string, { table: SchemaTable; fkPending: PendingFk[] }>();

  found.forEach(({ name: rawTableName, body }, index) => {
    const existingTable = existingTables.find(
      (t) => t.name.toLowerCase() === rawTableName.toLowerCase()
    );

    const tableId = existingTable?.id || `tbl_${Date.now()}_${index}`;
    const moduleId = existingTable?.moduleId || 'mod_identity';
    const x = existingTable ? existingTable.x : 60 + (index % 3) * 360;
    const y = existingTable ? existingTable.y : 80 + Math.floor(index / 3) * 360;

    const columns: SchemaColumn[] = [];
    const fkPending: PendingFk[] = [];
    const findCol = (name: string) =>
      columns.find((c) => c.name.toLowerCase() === name.toLowerCase());

    // Table-level constraints can appear before the columns they refer to, so apply them last
    const tableLevel: Array<() => void> = [];

    splitClauses(body).forEach((clause) => {
      // Drop an optional leading "CONSTRAINT <name>"
      const trimmed = clause.replace(new RegExp(`^CONSTRAINT\\s+${IDENT}\\s+`, 'i'), '').trim();

      // PRIMARY KEY (a, b, ...)
      const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*(?:\w+\s*)?\(([^)]*)\)/i);
      if (pkMatch) {
        tableLevel.push(() =>
          parseIdentList(pkMatch[1]).forEach((n) => {
            const col = findCol(n);
            if (col) {
              col.isPk = true;
              col.isNullable = false;
            }
          })
        );
        return;
      }

      // FOREIGN KEY (a, b) REFERENCES target (x, y) [ON DELETE ...]
      const fkMatch = trimmed.match(
        new RegExp(`^FOREIGN\\s+KEY\\s*(?:${IDENT}\\s*)?\\(([^)]*)\\)\\s*${REFERENCES_PATTERN}`, 'i')
      );
      if (fkMatch) {
        const localCols = parseIdentList(fkMatch[1]);
        const targetCols = fkMatch[3] ? parseIdentList(fkMatch[3]) : [];
        localCols.forEach((colName, i) => {
          fkPending.push({
            colName,
            targetTableName: cleanQualifiedName(fkMatch[2]),
            targetColName: targetCols[i],
            onDelete: parseOnDelete(fkMatch[4]),
          });
        });
        return;
      }

      // UNIQUE (col) / UNIQUE KEY name (col). Composite uniques are not a per-column flag, so skipped.
      const uqMatch = trimmed.match(/^UNIQUE\b(?:\s+(?:KEY|INDEX))?\s*(?:\w+\s*)?\(([^)]*)\)/i);
      if (uqMatch) {
        const names = parseIdentList(uqMatch[1]);
        if (names.length === 1) {
          tableLevel.push(() => {
            const col = findCol(names[0]);
            if (col) col.isUnique = true;
          });
        } else {
          warnings.push(`Table "${rawTableName}": composite UNIQUE (${names.join(', ')}) is not shown on the canvas.`);
        }
        return;
      }

      // CHECK, KEY, INDEX, FULLTEXT, ... are not shown on the canvas
      const skipped = trimmed.match(/^(CHECK|KEY|INDEX|FULLTEXT|SPATIAL|EXCLUDE|LIKE)\b/i);
      if (skipped) {
        warnings.push(`Table "${rawTableName}": ${skipped[1].toUpperCase()} clause skipped (not shown on the canvas).`);
        return;
      }

      // Column definition: <name> <type> [constraints...]
      const colMatch = trimmed.match(/^(`[^`]+`|"[^"]+"|\[[^\]]+\]|\S+)\s+([\s\S]+)$/);
      if (!colMatch) return;

      const rawColName = cleanId(colMatch[1]);
      const rest = colMatch[2];

      // The type runs until the first constraint keyword (so "double precision" and "int unsigned" work)
      const typeMatch = rest.match(
        /^([\s\S]*?)(?=\s+(?:NOT\s+NULL|NULL|PRIMARY|UNIQUE|DEFAULT|REFERENCES|CHECK|CONSTRAINT|GENERATED|COLLATE|AUTO_INCREMENT|AUTOINCREMENT|COMMENT|ON\s+UPDATE)\b|$)/i
      );
      const rawColType = (typeMatch?.[1] || rest).trim().replace(/\s+/g, ' ').toLowerCase();

      // Keyword checks ignore the contents of 'string literals'
      const flags = rest.replace(/'(?:[^']|'')*'/g, "''");
      if (/\bCHECK\s*\(/i.test(flags)) {
        warnings.push(`Column "${rawTableName}.${rawColName}": CHECK constraint skipped.`);
      }
      if (/\bGENERATED\b|\bAS\s*\(/i.test(flags)) {
        warnings.push(`Column "${rawTableName}.${rawColName}": generated/identity clause skipped.`);
      }
      const isPk = /\bPRIMARY\s+KEY\b/i.test(flags);
      const isUnique = /\bUNIQUE\b/i.test(flags);
      const isNotNull = /\bNOT\s+NULL\b/i.test(flags);
      const defaultValue = extractDefault(rest);

      const existingCol = existingTable?.columns.find(
        (c) => c.name.toLowerCase() === rawColName.toLowerCase()
      );
      const colId = existingCol?.id || `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const inlineFk = flags.match(new RegExp(REFERENCES_PATTERN, 'i'));
      if (inlineFk) {
        fkPending.push({
          colName: rawColName,
          targetTableName: cleanQualifiedName(inlineFk[1]),
          targetColName: inlineFk[2] ? parseIdentList(inlineFk[2])[0] : undefined,
          onDelete: parseOnDelete(inlineFk[3]),
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

    tableLevel.forEach((apply) => apply());

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

  // ALTER TABLE <t> ADD [CONSTRAINT x] FOREIGN KEY (...) REFERENCES ... / ADD [CONSTRAINT x] PRIMARY KEY (...)
  const alterFk = new RegExp(
    `ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:IF\\s+EXISTS\\s+)?(${QUALIFIED_IDENT})\\s+ADD\\s+(?:CONSTRAINT\\s+${IDENT}\\s+)?FOREIGN\\s+KEY\\s*\\(([^)]*)\\)\\s*${REFERENCES_PATTERN}`,
    'gi'
  );
  for (const m of cleanSql.matchAll(alterFk)) {
    const tableName = cleanQualifiedName(m[1]);
    const entry = tableNameMap.get(tableName.toLowerCase());
    if (!entry) {
      errors.push(`ALTER TABLE refers to unknown table "${tableName}".`);
      continue;
    }
    const localCols = parseIdentList(m[2]);
    const targetCols = m[4] ? parseIdentList(m[4]) : [];
    localCols.forEach((colName, i) => {
      entry.fkPending.push({
        colName,
        targetTableName: cleanQualifiedName(m[3]),
        targetColName: targetCols[i],
        onDelete: parseOnDelete(m[5]),
      });
    });
  }

  const alterPk = new RegExp(
    `ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:IF\\s+EXISTS\\s+)?(${QUALIFIED_IDENT})\\s+ADD\\s+(?:CONSTRAINT\\s+${IDENT}\\s+)?PRIMARY\\s+KEY\\s*\\(([^)]*)\\)`,
    'gi'
  );
  for (const m of cleanSql.matchAll(alterPk)) {
    const entry = tableNameMap.get(cleanQualifiedName(m[1]).toLowerCase());
    if (!entry) continue;
    parseIdentList(m[2]).forEach((n) => {
      const col = entry.table.columns.find((c) => c.name.toLowerCase() === n.toLowerCase());
      if (col) {
        col.isPk = true;
        col.isNullable = false;
      }
    });
  }

  // Tell the user about statements that were not turned into anything
  const ignored = new Map<string, number>();
  for (const statement of splitStatements(cleanSql)) {
    if (SILENT_STATEMENTS.test(statement)) continue;
    if (/^CREATE\s+(?:(?:GLOBAL\s+|LOCAL\s+)?(?:TEMPORARY|TEMP)\s+|UNLOGGED\s+)?TABLE\b/i.test(statement)) continue;
    if (/^ALTER\s+TABLE\b/i.test(statement)) {
      const handled =
        new RegExp(alterFk.source, 'i').test(statement) || new RegExp(alterPk.source, 'i').test(statement);
      if (handled) continue;
    }
    const label = describeStatement(statement);
    ignored.set(label, (ignored.get(label) ?? 0) + 1);
  }
  ignored.forEach((count, label) => {
    warnings.push(`Skipped ${count} ${label} statement${count > 1 ? 's' : ''} (not shown on the canvas).`);
  });

  // Resolve all pending Foreign Key references
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

  return { tables: parsedTables, errors, warnings };
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

