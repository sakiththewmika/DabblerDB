import { describe, it, expect } from 'vitest';
import { parseSqlToTables } from '../sqlCompiler';

const col = (sql: string, table: string, column: string) => {
  const { tables } = parseSqlToTables(sql);
  return tables.find((t) => t.name === table)!.columns.find((c) => c.name === column)!;
};

describe('SQL parser - DEFAULT values', () => {
  it('keeps a DEFAULT that is the last thing on the column', () => {
    const sql = `CREATE TABLE a (id int PRIMARY KEY, name varchar(10) DEFAULT 'x');`;
    expect(col(sql, 'a', 'name').defaultValue).toBe(`'x'`);
  });

  it('keeps function, numeric and quoted defaults followed by other keywords', () => {
    const sql = `CREATE TABLE a (
      created timestamp DEFAULT NOW() NOT NULL,
      qty int DEFAULT 0 NOT NULL,
      label text DEFAULT 'a, b' NOT NULL
    );`;
    expect(col(sql, 'a', 'created').defaultValue).toBe('NOW()');
    expect(col(sql, 'a', 'qty').defaultValue).toBe('0');
    expect(col(sql, 'a', 'label').defaultValue).toBe(`'a, b'`);
    expect(col(sql, 'a', 'label').isNullable).toBe(false);
  });

  it('does not treat the word UNIQUE inside a default string as a constraint', () => {
    const sql = `CREATE TABLE a (note text DEFAULT 'not unique');`;
    expect(col(sql, 'a', 'note').isUnique).toBe(false);
  });
});

describe('SQL parser - composite primary keys', () => {
  it('marks every column of PRIMARY KEY (a, b) and creates no fake column', () => {
    const { tables } = parseSqlToTables(`CREATE TABLE a (id int, b_id int, PRIMARY KEY (id, b_id));`);
    const columns = tables[0].columns;
    expect(columns.map((c) => c.name)).toEqual(['id', 'b_id']);
    expect(columns.every((c) => c.isPk && c.isNullable === false)).toBe(true);
  });

  it('supports a named PRIMARY KEY constraint', () => {
    const { tables } = parseSqlToTables(`CREATE TABLE a (id int, CONSTRAINT pk_a PRIMARY KEY (id));`);
    expect(tables[0].columns).toHaveLength(1);
    expect(tables[0].columns[0].isPk).toBe(true);
  });
});

describe('SQL parser - schema-qualified and quoted names', () => {
  it('imports public.users and "public"."users"', () => {
    const { tables, errors } = parseSqlToTables(
      `CREATE TABLE public.users (id int primary key);\nCREATE TABLE "public"."orders" (id int primary key);`
    );
    expect(errors).toEqual([]);
    expect(tables.map((t) => t.name)).toEqual(['users', 'orders']);
  });

  it('resolves foreign keys to schema-qualified targets', () => {
    const { tables, errors } = parseSqlToTables(
      `CREATE TABLE public.users (id int primary key);
       CREATE TABLE public.orders (id int primary key, user_id int REFERENCES public.users (id));`
    );
    expect(errors).toEqual([]);
    expect(tables[1].columns[1].fkTargetTableId).toBe(tables[0].id);
  });

  it('works without a trailing semicolon', () => {
    const { tables } = parseSqlToTables(`CREATE TABLE a (id int PRIMARY KEY)`);
    expect(tables).toHaveLength(1);
  });
});

describe('SQL parser - ALTER TABLE foreign keys', () => {
  const base = `
    CREATE TABLE users (id int PRIMARY KEY);
    CREATE TABLE orders (id int PRIMARY KEY, user_id int);
  `;

  it('applies ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY (pg_dump style)', () => {
    const { tables, errors } = parseSqlToTables(
      base +
        `ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`
    );
    const userId = tables[1].columns[1];
    expect(errors).toEqual([]);
    expect(userId.fkTargetTableId).toBe(tables[0].id);
    expect(userId.fkTargetColumnId).toBe(tables[0].columns[0].id);
    expect(userId.fkOnDelete).toBe('SET NULL');
  });

  it('reports ALTER TABLE on a table that does not exist', () => {
    const { errors } = parseSqlToTables(
      base + `ALTER TABLE ghosts ADD FOREIGN KEY (user_id) REFERENCES users(id);`
    );
    expect(errors.join(' ')).toContain('ghosts');
  });

  it('applies ALTER TABLE ... ADD PRIMARY KEY', () => {
    const { tables } = parseSqlToTables(
      `CREATE TABLE a (id int);\nALTER TABLE a ADD PRIMARY KEY (id);`
    );
    expect(tables[0].columns[0].isPk).toBe(true);
  });
});

describe('SQL parser - table-level foreign keys', () => {
  it('supports quoted names, composite keys and named constraints', () => {
    const { tables, errors } = parseSqlToTables(
      `CREATE TABLE "parent" (a int, b int, PRIMARY KEY (a, b));
       CREATE TABLE "child" (
         pa int, pb int,
         CONSTRAINT "fk_child" FOREIGN KEY ("pa", "pb") REFERENCES "parent" ("a", "b") ON DELETE RESTRICT
       );`
    );
    const [parent, child] = tables;
    expect(errors).toEqual([]);
    expect(child.columns[0].fkTargetColumnId).toBe(parent.columns[0].id);
    expect(child.columns[1].fkTargetColumnId).toBe(parent.columns[1].id);
    expect(child.columns[0].fkOnDelete).toBe('RESTRICT');
  });

  it('ignores CHECK, KEY and composite UNIQUE clauses instead of creating columns', () => {
    const { tables } = parseSqlToTables(
      `CREATE TABLE a (
        id int PRIMARY KEY, x int, y int,
        CHECK (x > 0),
        KEY idx_x (x),
        UNIQUE (x, y)
      );`
    );
    expect(tables[0].columns.map((c) => c.name)).toEqual(['id', 'x', 'y']);
    expect(tables[0].columns[1].isUnique).toBe(false);
  });
});
