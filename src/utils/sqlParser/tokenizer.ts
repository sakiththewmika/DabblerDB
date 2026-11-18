/**
 * Step 1 of reading SQL: cut the text into small pieces ("tokens").
 *
 *   CREATE TABLE "users" (id int, name text DEFAULT 'a;b');
 *
 * becomes: CREATE · TABLE · "users" · ( · id · int · , · name · text · DEFAULT · 'a;b' · ) · ;
 *
 * Comments are dropped and quoted text stays in one piece, so later steps never
 * have to worry about a ";" or "--" hiding inside a string.
 */

export type TokenType =
  | 'word' //    CREATE, users, int (bare names and keywords)
  | 'quoted' //  "users", `users`, [users] (a quoted name)
  | 'string' //  'hello', $$hello$$
  | 'number' //  42, 3.14
  | 'symbol'; // ( ) , ; . = ::

export interface Token {
  type: TokenType;
  /** The meaning: quotes removed and escapes resolved. */
  value: string;
  /** Position in the original text, so text can be cut out unchanged. */
  start: number;
  end: number;
  /** 1-based line number, used in error messages. */
  line: number;
}

const isWordStart = (c: string) => /[A-Za-z_\u0080-￿]/.test(c);
const isWordPart = (c: string) => /[A-Za-z0-9_$\u0080-￿]/.test(c);
const isDigit = (c: string) => c >= '0' && c <= '9';

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;

  const push = (type: TokenType, value: string, start: number, end: number, startLine: number) =>
    tokens.push({ type, value, start, end, line: startLine });

  /** Reads text up to the closing quote. A doubled quote ('') means one literal quote. */
  const readQuoted = (open: string, close: string, backslashEscapes = false): { value: string; end: number } => {
    let value = '';
    let j = i + 1;
    while (j < sql.length) {
      const c = sql[j];
      if (backslashEscapes && c === '\\' && j + 1 < sql.length) {
        value += sql[j + 1];
        j += 2;
      } else if (c === close) {
        if (sql[j + 1] === close && open === close) {
          value += close;
          j += 2;
        } else {
          return { value, end: j + 1 };
        }
      } else {
        value += c;
        j++;
      }
    }
    return { value, end: sql.length }; // unterminated: take the rest
  };

  const countLines = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (sql[k] === '\n') line++;
  };

  while (i < sql.length) {
    const c = sql[i];

    if (c === '\n') {
      line++;
      i++;
    } else if (/\s/.test(c)) {
      i++;
    } else if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (c === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2);
      const end = close === -1 ? sql.length : close + 2;
      countLines(i, end);
      i = end;
    } else if (c === "'") {
      const startLine = line;
      const { value, end } = readQuoted("'", "'");
      push('string', value, i, end, startLine);
      countLines(i, end);
      i = end;
    } else if (c === '"' || c === '`') {
      const startLine = line;
      const { value, end } = readQuoted(c, c);
      push('quoted', value, i, end, startLine);
      i = end;
    } else if (c === '[' && /^\[[A-Za-z_][^\]\n]*\]/.test(sql.slice(i))) {
      // [name] is a quoted name in SQL Server / SQLite. int[] and int[3] are not.
      const end = sql.indexOf(']', i) + 1;
      push('quoted', sql.slice(i + 1, end - 1), i, end, line);
      i = end;
    } else if (c === '$' && /^\$[A-Za-z_]*\$/.test(sql.slice(i))) {
      // PostgreSQL $$ ... $$ blocks (function bodies) count as one string
      const tag = sql.slice(i).match(/^\$[A-Za-z_]*\$/)![0];
      const close = sql.indexOf(tag, i + tag.length);
      const end = close === -1 ? sql.length : close + tag.length;
      push('string', sql.slice(i + tag.length, close === -1 ? end : close), i, end, line);
      countLines(i, end);
      i = end;
    } else if (isDigit(c) || (c === '.' && isDigit(sql[i + 1] ?? ''))) {
      const m = sql.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)!;
      push('number', m[0], i, i + m[0].length, line);
      i += m[0].length;
    } else if (isWordStart(c)) {
      let j = i + 1;
      while (j < sql.length && isWordPart(sql[j])) j++;
      const word = sql.slice(i, j);
      // E'it\'s', N'text', X'ff', B'01' are string prefixes
      if (/^[EeNnXxBb]$/.test(word) && sql[j] === "'") {
        const startLine = line;
        const start = i;
        i = j; // readQuoted starts at the opening quote
        const { value, end } = readQuoted("'", "'", word.toLowerCase() === 'e');
        push('string', value, start, end, startLine);
        countLines(start, end);
        i = end;
      } else {
        push('word', word, i, j, line);
        i = j;
      }
    } else if (c === ':' && sql[i + 1] === ':') {
      push('symbol', '::', i, i + 2, line);
      i += 2;
    } else {
      push('symbol', c, i, i + 1, line);
      i++;
    }
  }

  return tokens;
}
