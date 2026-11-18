/**
 * Step 2 of reading SQL: understand the tokens.
 *
 * This is a small hand-written parser for the part of SQL that describes the
 * shape of a database: CREATE TABLE and ALTER TABLE. It turns the text into
 * plain objects (see the interfaces below) and does not know anything about
 * the canvas. `toSchema.ts` is the step that turns these objects into tables.
 *
 * Rules that keep it friendly:
 *  - It never throws. Something it does not understand is skipped, and the
 *    rest of the script is still read.
 *  - Every message includes the line number.
 */
import { tokenize, type Token } from './tokenizer';

export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';

export interface ParsedReference {
  table: string;
  columns: string[];
  onDelete?: ReferentialAction;
}

export interface ParsedColumn {
  name: string;
  type: string;
  isPk: boolean;
  isUnique: boolean;
  notNull: boolean;
  defaultValue?: string;
  references?: ParsedReference;
  hasCheck: boolean;
  isGenerated: boolean;
}

export interface ParsedTable {
  name: string;
  line: number;
  columns: ParsedColumn[];
  /** From a table-level PRIMARY KEY (a, b). Inline "PRIMARY KEY" is on the column itself. */
  primaryKey: string[];
  uniques: string[][];
  foreignKeys: Array<{ columns: string[]; reference: ParsedReference }>;
  /** Keywords of clauses that were read but cannot be shown: CHECK, KEY, INDEX, ... */
  skippedClauses: string[];
}

export type AlterAction =
  | { kind: 'addColumn'; column: ParsedColumn }
  | { kind: 'addPrimaryKey'; columns: string[] }
  | { kind: 'addUnique'; columns: string[] }
  | { kind: 'addForeignKey'; columns: string[]; reference: ParsedReference }
  | { kind: 'skipped'; keyword: string }
  | { kind: 'other' };

export interface ParsedAlter {
  table: string;
  line: number;
  actions: AlterAction[];
}

export interface ParsedScript {
  tables: ParsedTable[];
  alters: ParsedAlter[];
  /** Statements that were not turned into anything, counted by kind: "CREATE INDEX" -> 2 */
  ignored: Map<string, number>;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Small helpers for walking a list of tokens
// ---------------------------------------------------------------------------

const upper = (t: Token | undefined) => (t?.type === 'word' ? t.value.toUpperCase() : '');
const isSymbol = (t: Token | undefined, s: string) => t?.type === 'symbol' && t.value === s;
const isName = (t: Token | undefined) => t?.type === 'word' || t?.type === 'quoted';

/** Statements that carry no schema information. They are skipped without a warning. */
const SILENT_STATEMENTS = new Set([
  'SET', 'BEGIN', 'COMMIT', 'START', 'END', 'USE', 'PRAGMA', 'SELECT', 'LOCK', 'UNLOCK', 'ROLLBACK', 'DELIMITER',
]);

/** Words that end a column's data type and start its constraints. */
const COLUMN_STOP_WORDS = new Set([
  'NOT', 'NULL', 'PRIMARY', 'UNIQUE', 'DEFAULT', 'REFERENCES', 'CHECK', 'CONSTRAINT', 'GENERATED',
  'COLLATE', 'AUTO_INCREMENT', 'AUTOINCREMENT', 'COMMENT', 'ON', 'IDENTITY', 'AS',
]);

/** Index of the ")" that closes the "(" at `open`, or -1. */
function findClosing(tokens: Token[], open: number): number {
  let depth = 0;
  for (let i = open; i < tokens.length; i++) {
    if (isSymbol(tokens[i], '(')) depth++;
    else if (isSymbol(tokens[i], ')')) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(tokens: Token[]): Token[][] {
  const parts: Token[][] = [];
  let current: Token[] = [];
  let depth = 0;
  for (const t of tokens) {
    if (isSymbol(t, '(')) depth++;
    if (isSymbol(t, ')')) depth--;
    if (isSymbol(t, ',') && depth === 0) {
      if (current.length) parts.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length) parts.push(current);
  return parts;
}

/** Reads `name`, `schema.name` or `"schema"."name"`. Returns the last part (the schema is dropped). */
function readQualifiedName(tokens: Token[], from: number): { name: string; next: number } | null {
  if (!isName(tokens[from])) return null;
  let i = from;
  let name = tokens[i].value;
  while (isSymbol(tokens[i + 1], '.') && isName(tokens[i + 2])) {
    i += 2;
    name = tokens[i].value;
  }
  return { name, next: i + 1 };
}

/** Reads "(a, b, c)" and returns the names. Extra bits like "(20)" or "DESC" are ignored. */
function readNameList(tokens: Token[], open: number): { names: string[]; next: number } | null {
  if (!isSymbol(tokens[open], '(')) return null;
  const close = findClosing(tokens, open);
  if (close === -1) return null;
  const names = splitTopLevel(tokens.slice(open + 1, close))
    .map((part) => (isName(part[0]) ? part[0].value : ''))
    .filter(Boolean);
  return { names, next: close + 1 };
}

/** Turns type tokens into text: numeric(10,2), double precision, enum('a','b') */
function formatType(tokens: Token[]): string {
  let out = '';
  let prev: Token | undefined;
  for (const t of tokens) {
    const text = t.type === 'string' ? `'${t.value.replace(/'/g, "''")}'` : t.type === 'quoted' ? t.value : t.value.toLowerCase();
    const needsSpace =
      prev !== undefined &&
      (prev.type !== 'symbol' || prev.value === ')') &&
      (t.type !== 'symbol');
    out += (needsSpace ? ' ' : '') + text;
    prev = t;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Column pieces
// ---------------------------------------------------------------------------

function readAction(tokens: Token[], i: number): { action: ReferentialAction; next: number } | null {
  const a = upper(tokens[i]);
  if (a === 'CASCADE' || a === 'RESTRICT') return { action: a, next: i + 1 };
  if (a === 'NO' && upper(tokens[i + 1]) === 'ACTION') return { action: 'NO ACTION', next: i + 2 };
  if (a === 'SET' && upper(tokens[i + 1]) === 'NULL') return { action: 'SET NULL', next: i + 2 };
  if (a === 'SET' && upper(tokens[i + 1]) === 'DEFAULT') return { action: 'SET DEFAULT', next: i + 2 };
  return null;
}

/** REFERENCES table [(cols)] [ON DELETE x] [ON UPDATE y] [MATCH z] [DEFERRABLE ...]; `i` is just after REFERENCES. */
function readReference(tokens: Token[], i: number): { reference: ParsedReference; next: number } | null {
  const target = readQualifiedName(tokens, i);
  if (!target) return null;
  const reference: ParsedReference = { table: target.name, columns: [] };
  let next = target.next;

  const list = readNameList(tokens, next);
  if (list) {
    reference.columns = list.names;
    next = list.next;
  }

  for (;;) {
    const word = upper(tokens[next]);
    if (word === 'ON' && (upper(tokens[next + 1]) === 'DELETE' || upper(tokens[next + 1]) === 'UPDATE')) {
      const parsed = readAction(tokens, next + 2);
      if (!parsed) break;
      if (upper(tokens[next + 1]) === 'DELETE') reference.onDelete = parsed.action;
      next = parsed.next;
    } else if (word === 'MATCH' && tokens[next + 1]) {
      next += 2;
    } else if (word === 'DEFERRABLE') {
      next += 1;
    } else if (word === 'NOT' && upper(tokens[next + 1]) === 'DEFERRABLE') {
      next += 2;
    } else if (word === 'INITIALLY' && tokens[next + 1]) {
      next += 2;
    } else {
      break;
    }
  }
  return { reference, next };
}

/**
 * Reads one value after DEFAULT, for example:
 *   'text'   42   -1   NOW()   (1 + 2)   'x'::text   nextval('seq'::regclass)   interval '1 day'
 * Returns the index of the first token after it.
 */
function skipDefaultExpression(tokens: Token[], from: number): number {
  let i = from;

  const skipPrimary = () => {
    if (isSymbol(tokens[i], '+') || isSymbol(tokens[i], '-')) i++;
    const t = tokens[i];
    if (!t) return;
    if (isSymbol(t, '(')) {
      const close = findClosing(tokens, i);
      i = close === -1 ? tokens.length : close + 1;
    } else if (t.type === 'string' || t.type === 'number') {
      i++;
    } else if (isName(t)) {
      i++;
      while (isSymbol(tokens[i], '.') && isName(tokens[i + 1])) i += 2;
      if (isSymbol(tokens[i], '(')) {
        const close = findClosing(tokens, i);
        i = close === -1 ? tokens.length : close + 1;
      } else if (tokens[i]?.type === 'string' && t.type === 'word') {
        i++; // typed literal: interval '1 day', date '2020-01-01'
      }
    } else {
      i++; // unknown token: move on rather than get stuck
    }
  };

  skipPrimary();
  for (;;) {
    if (isSymbol(tokens[i], '::')) {
      // PostgreSQL cast: ::text, ::character varying(10), ::int[]
      i++;
      if (isName(tokens[i])) i++;
      while (['VARYING', 'PRECISION', 'WITH', 'WITHOUT', 'TIME', 'ZONE'].includes(upper(tokens[i]))) i++;
      if (isSymbol(tokens[i], '(')) {
        const close = findClosing(tokens, i);
        i = close === -1 ? tokens.length : close + 1;
      }
      while (isSymbol(tokens[i], '[') && isSymbol(tokens[i + 1], ']')) i += 2;
    } else if (['+', '-', '*', '/', '|'].some((op) => isSymbol(tokens[i], op)) && tokens[i + 1]) {
      i++;
      if (isSymbol(tokens[i], '|')) i++; // || (string join)
      skipPrimary();
    } else {
      break;
    }
  }
  return i;
}

/** Reads GENERATED ... / AS (...) / IDENTITY ... up to the next real constraint. */
function skipGeneratedClause(tokens: Token[], from: number): number {
  const END = new Set(['NOT', 'NULL', 'PRIMARY', 'UNIQUE', 'DEFAULT', 'REFERENCES', 'CHECK', 'CONSTRAINT', 'COLLATE', 'COMMENT']);
  let i = from;
  while (i < tokens.length) {
    if (isSymbol(tokens[i], '(')) {
      const close = findClosing(tokens, i);
      i = close === -1 ? tokens.length : close + 1;
    } else if (END.has(upper(tokens[i]))) {
      break;
    } else {
      i++;
    }
  }
  return i;
}

/** <name> <type> [constraints...] */
function parseColumn(tokens: Token[], source: string): ParsedColumn | null {
  if (!isName(tokens[0])) return null;
  const column: ParsedColumn = {
    name: tokens[0].value,
    type: '',
    isPk: false,
    isUnique: false,
    notNull: false,
    hasCheck: false,
    isGenerated: false,
  };

  // The type: everything up to the first constraint word
  let i = 1;
  while (i < tokens.length) {
    if (isSymbol(tokens[i], '(')) {
      const close = findClosing(tokens, i);
      i = close === -1 ? tokens.length : close + 1;
    } else if (COLUMN_STOP_WORDS.has(upper(tokens[i]))) {
      break;
    } else {
      i++;
    }
  }
  column.type = formatType(tokens.slice(1, i)) || 'text'; // SQLite allows columns without a type

  // Constraints, in any order
  while (i < tokens.length) {
    const word = upper(tokens[i]);
    if (word === 'CONSTRAINT') {
      i += 2; // CONSTRAINT <name>
    } else if (word === 'NOT' && upper(tokens[i + 1]) === 'NULL') {
      column.notNull = true;
      i += 2;
    } else if (word === 'PRIMARY') {
      column.isPk = true;
      i += upper(tokens[i + 1]) === 'KEY' ? 2 : 1;
    } else if (word === 'UNIQUE') {
      column.isUnique = true;
      i += ['KEY', 'INDEX'].includes(upper(tokens[i + 1])) ? 2 : 1;
    } else if (word === 'DEFAULT') {
      const end = skipDefaultExpression(tokens, i + 1);
      const text = tokens.slice(i + 1, end);
      if (text.length) {
        // cut from the original text so spacing and quotes are kept exactly as written
        column.defaultValue = source.slice(text[0].start, text[text.length - 1].end).trim();
      }
      i = end;
    } else if (word === 'REFERENCES') {
      const parsed = readReference(tokens, i + 1);
      if (parsed) {
        column.references = parsed.reference;
        i = parsed.next;
      } else {
        i++;
      }
    } else if (word === 'CHECK') {
      column.hasCheck = true;
      i++;
      if (isSymbol(tokens[i], '(')) {
        const close = findClosing(tokens, i);
        i = close === -1 ? tokens.length : close + 1;
      }
    } else if (word === 'GENERATED' || word === 'AS' || word === 'IDENTITY') {
      column.isGenerated = true;
      i = skipGeneratedClause(tokens, i + 1);
    } else if (word === 'COLLATE' || word === 'COMMENT') {
      i += 2;
    } else if (word === 'ON' && upper(tokens[i + 1]) === 'UPDATE') {
      i = skipDefaultExpression(tokens, i + 2);
    } else {
      i++; // NULL, AUTO_INCREMENT, ... or something unknown
    }
  }
  return column;
}

// ---------------------------------------------------------------------------
// Table body items: a column, or a table-level constraint
// ---------------------------------------------------------------------------

type Item =
  | { kind: 'column'; column: ParsedColumn }
  | { kind: 'primaryKey'; columns: string[] }
  | { kind: 'unique'; columns: string[] }
  | { kind: 'foreignKey'; columns: string[]; reference: ParsedReference }
  | { kind: 'skipped'; keyword: string }
  | { kind: 'unknown' };

/** True for "KEY idx (a, b)" but not for a column like "key varchar(10)". */
function looksLikeIndexDefinition(tokens: Token[]): boolean {
  let i = 1;
  if (isName(tokens[i]) && isSymbol(tokens[i + 1], '(')) i++;
  if (!isSymbol(tokens[i], '(')) return false;
  const close = findClosing(tokens, i);
  const inner = tokens.slice(i + 1, close === -1 ? tokens.length : close);
  return inner.length > 0 && inner.every((t) => isName(t) || isSymbol(t, ',') || upper(t) === 'ASC' || upper(t) === 'DESC');
}

function parseItem(tokens: Token[], source: string): Item {
  let i = 0;
  if (upper(tokens[0]) === 'CONSTRAINT' && isName(tokens[1])) {
    const after = upper(tokens[2]);
    if (['PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'EXCLUDE'].includes(after)) i = 2;
  }
  const rest = tokens.slice(i);
  const word = upper(rest[0]);

  if (word === 'PRIMARY' && upper(rest[1]) === 'KEY') {
    const list = readNameList(rest, isSymbol(rest[2], '(') ? 2 : 3);
    return list ? { kind: 'primaryKey', columns: list.names } : { kind: 'skipped', keyword: 'PRIMARY KEY' };
  }

  if (word === 'UNIQUE') {
    let j = 1;
    if (['KEY', 'INDEX'].includes(upper(rest[j]))) j++;
    if (isName(rest[j]) && isSymbol(rest[j + 1], '(')) j++;
    const list = readNameList(rest, j);
    if (list) return { kind: 'unique', columns: list.names };
    // "UNIQUE" with no list is not a table-level constraint: fall through to "column named unique"
  }

  if (word === 'FOREIGN' && upper(rest[1]) === 'KEY') {
    let j = 2;
    if (isName(rest[j]) && isSymbol(rest[j + 1], '(')) j++;
    const list = readNameList(rest, j);
    if (list && upper(rest[list.next]) === 'REFERENCES') {
      const ref = readReference(rest, list.next + 1);
      if (ref) return { kind: 'foreignKey', columns: list.names, reference: ref.reference };
    }
    return { kind: 'skipped', keyword: 'FOREIGN KEY' };
  }

  if (word === 'CHECK' || word === 'EXCLUDE') return { kind: 'skipped', keyword: word };
  if (word === 'FULLTEXT' || word === 'SPATIAL') return { kind: 'skipped', keyword: word };
  if ((word === 'KEY' || word === 'INDEX') && looksLikeIndexDefinition(rest)) return { kind: 'skipped', keyword: word };
  if (word === 'LIKE' && isName(rest[1]) && rest.length <= 4) return { kind: 'skipped', keyword: 'LIKE' };

  const column = parseColumn(rest, source);
  return column ? { kind: 'column', column } : { kind: 'unknown' };
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

/** "CREATE UNIQUE INDEX ..." -> "CREATE INDEX", "INSERT INTO ..." -> "INSERT" */
function describeStatement(tokens: Token[]): string {
  const first = upper(tokens[0]);
  if (first === 'CREATE' || first === 'ALTER' || first === 'DROP') {
    // Skip words that only modify the statement: OR REPLACE, UNIQUE, TEMP, ALGORITHM=x, DEFINER=user@host, ...
    const MODIFIERS = new Set(['OR', 'REPLACE', 'UNIQUE', 'TEMP', 'TEMPORARY', 'MATERIALIZED', 'UNLOGGED', 'GLOBAL', 'LOCAL', 'RECURSIVE', 'DEFINER', 'ALGORITHM', 'SQL', 'SECURITY']);
    let i = 1;
    while (i < tokens.length && tokens[i].type === 'word' && MODIFIERS.has(upper(tokens[i]))) {
      i++;
      if (isSymbol(tokens[i], '=')) {
        i += 2; // the value, for example UNDEFINED or root
        while (isSymbol(tokens[i], '@')) i += 2; // @host
      }
    }
    return `${first} ${upper(tokens[i]) || '?'}`.trim();
  }
  if (first === 'COMMENT' && upper(tokens[1]) === 'ON') return 'COMMENT ON';
  return first || 'UNKNOWN';
}

function parseCreateTable(tokens: Token[], script: ParsedScript, seen: Set<string>, source: string): boolean {
  // CREATE [GLOBAL|LOCAL] [TEMP|TEMPORARY|UNLOGGED] TABLE [IF NOT EXISTS] name
  let i = 1;
  while (['GLOBAL', 'LOCAL', 'TEMP', 'TEMPORARY', 'UNLOGGED'].includes(upper(tokens[i]))) i++;
  if (upper(tokens[i]) !== 'TABLE') return false;
  i++;
  if (upper(tokens[i]) === 'IF' && upper(tokens[i + 1]) === 'NOT' && upper(tokens[i + 2]) === 'EXISTS') i += 3;

  const line = tokens[0].line;
  const name = readQualifiedName(tokens, i);
  if (!name) {
    script.errors.push(`Line ${line}: expected a table name after CREATE TABLE.`);
    return true;
  }
  if (!isSymbol(tokens[name.next], '(')) {
    // CREATE TABLE x AS SELECT ..., CREATE TABLE x PARTITION OF y ... have no column list
    countIgnored(script, 'CREATE TABLE AS/PARTITION');
    return true;
  }
  const close = findClosing(tokens, name.next);
  if (close === -1) {
    script.errors.push(`Line ${line}: table "${name.name}" is missing a closing ")" and was skipped.`);
    return true;
  }

  const table: ParsedTable = {
    name: name.name,
    line,
    columns: [],
    primaryKey: [],
    uniques: [],
    foreignKeys: [],
    skippedClauses: [],
  };

  for (const part of splitTopLevel(tokens.slice(name.next + 1, close))) {
    const item = parseItem(part, source);
    if (item.kind === 'column') table.columns.push(item.column);
    else if (item.kind === 'primaryKey') table.primaryKey.push(...item.columns);
    else if (item.kind === 'unique') table.uniques.push(item.columns);
    else if (item.kind === 'foreignKey') table.foreignKeys.push({ columns: item.columns, reference: item.reference });
    else if (item.kind === 'skipped') table.skippedClauses.push(item.keyword);
    else script.errors.push(`Line ${part[0].line}: could not understand "${source.slice(part[0].start, part[part.length - 1].end).slice(0, 40)}" in table "${table.name}".`);
  }

  if (seen.has(table.name.toLowerCase())) {
    script.errors.push(`Line ${line}: table "${table.name}" is defined more than once. The first definition is used.`);
  } else {
    seen.add(table.name.toLowerCase());
    script.tables.push(table);
  }
  return true;
}

function parseAlterTable(tokens: Token[], script: ParsedScript, source: string): boolean {
  let i = 1;
  if (upper(tokens[i]) !== 'TABLE') return false;
  i++;
  if (upper(tokens[i]) === 'IF' && upper(tokens[i + 1]) === 'EXISTS') i += 2;
  if (upper(tokens[i]) === 'ONLY') i++;
  const name = readQualifiedName(tokens, i);
  if (!name) return false;

  const alter: ParsedAlter = { table: name.name, line: tokens[0].line, actions: [] };

  for (const part of splitTopLevel(tokens.slice(name.next))) {
    if (upper(part[0]) !== 'ADD') {
      alter.actions.push({ kind: 'other' });
      continue;
    }
    let j = 1;
    if (upper(part[j]) === 'COLUMN') j++;
    if (upper(part[j]) === 'IF' && upper(part[j + 1]) === 'NOT' && upper(part[j + 2]) === 'EXISTS') j += 3;

    const item = parseItem(part.slice(j), source);
    if (item.kind === 'column') alter.actions.push({ kind: 'addColumn', column: item.column });
    else if (item.kind === 'primaryKey') alter.actions.push({ kind: 'addPrimaryKey', columns: item.columns });
    else if (item.kind === 'unique') alter.actions.push({ kind: 'addUnique', columns: item.columns });
    else if (item.kind === 'foreignKey') alter.actions.push({ kind: 'addForeignKey', columns: item.columns, reference: item.reference });
    else if (item.kind === 'skipped') alter.actions.push({ kind: 'skipped', keyword: item.keyword });
    else alter.actions.push({ kind: 'other' });
  }

  script.alters.push(alter);
  if (alter.actions.some((a) => a.kind === 'other')) countIgnored(script, 'ALTER TABLE');
  return true;
}

function countIgnored(script: ParsedScript, label: string) {
  script.ignored.set(label, (script.ignored.get(label) ?? 0) + 1);
}

/** Reads a whole SQL script. */
export function parseDdl(sql: string): ParsedScript {
  const script: ParsedScript = { tables: [], alters: [], ignored: new Map(), errors: [] };
  const seen = new Set<string>();

  // Split into statements at ";"
  const statements: Token[][] = [];
  let current: Token[] = [];
  for (const token of tokenize(sql)) {
    if (isSymbol(token, ';')) {
      if (current.length) statements.push(current);
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length) statements.push(current);

  for (const tokens of statements) {
    const first = upper(tokens[0]);
    if (SILENT_STATEMENTS.has(first)) continue;

    const handled =
      (first === 'CREATE' && parseCreateTable(tokens, script, seen, sql)) ||
      (first === 'ALTER' && parseAlterTable(tokens, script, sql));
    if (!handled) countIgnored(script, describeStatement(tokens));
  }

  return script;
}
