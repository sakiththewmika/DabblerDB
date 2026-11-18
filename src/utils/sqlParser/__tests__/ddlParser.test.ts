import { describe, expect, it } from 'vitest';
import { parseDdl } from '../ddlParser';
import { parseSqlToTables } from '../toSchema';

const firstTable = (sql: string) => parseDdl(sql).tables[0];
const column = (sql: string, name: string) => firstTable(sql).columns.find((c) => c.name === name)!;

describe('column types', () => {
  it('reads multi-word and parameterised types', () => {
    const t = firstTable(`CREATE TABLE a (
      p double precision,
      q timestamp with time zone,
      r character varying(20),
      s numeric(10, 2),
      u int unsigned,
      v int[],
      w timestamp(3) without time zone
    );`);
    expect(t.columns.map((c) => c.type)).toEqual([
      'double precision', 'timestamp with time zone', 'character varying(20)', 'numeric(10,2)', 'int unsigned', 'int[]', 'timestamp(3) without time zone',
    ]);
  });

  it('keeps the values of an enum exactly as written', () => {
    expect(column(`CREATE TABLE a (kind ENUM('Small','Big Sur') NOT NULL);`, 'kind').type).toBe("enum('Small','Big Sur')");
  });

  it('gives a column without a type the type "text" (SQLite allows this)', () => {
    expect(column(`CREATE TABLE a (id INTEGER PRIMARY KEY, note);`, 'note').type).toBe('text');
  });

  it('is not case sensitive', () => {
    const c = column(`create table a (ID Int primary Key not null);`, 'ID');
    expect(c).toMatchObject({ type: 'int', isPk: true, notNull: true });
  });
});

describe('DEFAULT values', () => {
  const defaultOf = (definition: string) => column(`CREATE TABLE a (c ${definition});`, 'c').defaultValue;

  it.each([
    ["text DEFAULT 'it''s' NOT NULL", "'it''s'"],
    ['int DEFAULT -1', '-1'],
    ['numeric(5,2) DEFAULT 0.50', '0.50'],
    ['timestamp DEFAULT CURRENT_TIMESTAMP(6)', 'CURRENT_TIMESTAMP(6)'],
    ['timestamptz DEFAULT now() NOT NULL', 'now()'],
    ["text DEFAULT 'x'::text", "'x'::text"],
    ["int DEFAULT nextval('users_id_seq'::regclass)", "nextval('users_id_seq'::regclass)"],
    ["varchar DEFAULT ('a' || 'b')", "('a' || 'b')"],
    ["timestamp DEFAULT now() + interval '1 day' NOT NULL", "now() + interval '1 day'"],
    ['bool DEFAULT TRUE', 'TRUE'],
    ['text DEFAULT NULL', 'NULL'],
    ["char(1) DEFAULT 'N' CHECK (c IN ('Y','N'))", "'N'"],
    ["text DEFAULT 'a, b' UNIQUE", "'a, b'"],
  ])('%s', (definition, expected) => {
    expect(defaultOf(definition)).toBe(expected);
  });

  it('has no default when none is written', () => {
    expect(defaultOf('int NOT NULL')).toBeUndefined();
  });
});

describe('column constraints', () => {
  it('reads inline PRIMARY KEY, UNIQUE, NOT NULL in any order', () => {
    const c = column(`CREATE TABLE a (c int NOT NULL UNIQUE PRIMARY KEY);`, 'c');
    expect(c).toMatchObject({ isPk: true, isUnique: true, notNull: true });
  });

  it('reads MySQL options without changing the type', () => {
    const c = column("CREATE TABLE a (c int unsigned NOT NULL AUTO_INCREMENT COMMENT 'the id' PRIMARY KEY);", 'c');
    expect(c).toMatchObject({ type: 'int unsigned', isPk: true, notNull: true });
  });

  it('reads SQLite AUTOINCREMENT', () => {
    expect(column(`CREATE TABLE a (c INTEGER PRIMARY KEY AUTOINCREMENT);`, 'c')).toMatchObject({ type: 'integer', isPk: true });
  });

  it('reads COLLATE and ON UPDATE without losing later constraints', () => {
    const c = column(
      `CREATE TABLE a (c timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP UNIQUE);`,
      'c'
    );
    expect(c).toMatchObject({ notNull: true, isUnique: true, defaultValue: 'CURRENT_TIMESTAMP' });
    expect(column(`CREATE TABLE a (c text COLLATE "C" NOT NULL);`, 'c').notNull).toBe(true);
  });

  it('flags CHECK and generated columns', () => {
    expect(column(`CREATE TABLE a (c int CHECK (c > 0 AND c < 10) NOT NULL);`, 'c')).toMatchObject({ hasCheck: true, notNull: true });
    expect(column(`CREATE TABLE a (c int GENERATED ALWAYS AS IDENTITY (START WITH 5) PRIMARY KEY);`, 'c')).toMatchObject({
      isGenerated: true,
      isPk: true,
    });
    expect(column(`CREATE TABLE a (c int GENERATED ALWAYS AS (a + b) STORED NOT NULL);`, 'c')).toMatchObject({
      isGenerated: true,
      notNull: true,
    });
  });

  it('allows a column to be called key, index, unique-ish names', () => {
    const t = firstTable(`CREATE TABLE a ("key" varchar(10), "index" int, key2 text);`);
    expect(t.columns.map((c) => c.name)).toEqual(['key', 'index', 'key2']);
    // unquoted too: "key varchar(10)" is a column, "KEY idx (col)" is an index
    const t2 = firstTable(`CREATE TABLE a (key varchar(10), KEY idx (key));`);
    expect(t2.columns.map((c) => c.name)).toEqual(['key']);
    expect(t2.skippedClauses).toEqual(['KEY']);
  });
});

describe('references', () => {
  const ref = (definition: string) => column(`CREATE TABLE a (c ${definition});`, 'c').references;

  it('reads table, column and action', () => {
    expect(ref('int REFERENCES public.users (id) ON DELETE SET NULL')).toEqual({
      table: 'users',
      columns: ['id'],
      onDelete: 'SET NULL',
    });
  });

  it('reads every action, including SET DEFAULT', () => {
    for (const action of ['CASCADE', 'RESTRICT', 'NO ACTION', 'SET NULL', 'SET DEFAULT']) {
      expect(ref(`int REFERENCES u(id) ON DELETE ${action}`)?.onDelete).toBe(action);
    }
  });

  it('ignores ON UPDATE, MATCH and DEFERRABLE but keeps ON DELETE', () => {
    expect(ref('int REFERENCES u(id) ON UPDATE CASCADE MATCH FULL ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED')).toMatchObject({
      onDelete: 'RESTRICT',
    });
  });

  it('allows a missing column list', () => {
    expect(ref('int REFERENCES users')).toEqual({ table: 'users', columns: [] });
  });

  it('leaves onDelete empty when the SQL does not say, and the importer then uses NO ACTION', () => {
    const { tables } = parseSqlToTables(
      `CREATE TABLE u (id int PRIMARY KEY); CREATE TABLE a (u_id int REFERENCES u(id));`
    );
    expect(tables[1].columns[0].fkOnDelete).toBe('NO ACTION');
  });
});

describe('table-level constraints', () => {
  it('reads composite keys, named constraints and MySQL UNIQUE KEY', () => {
    const t = firstTable(`CREATE TABLE a (
      x int, y int, z int,
      CONSTRAINT pk PRIMARY KEY (x, y),
      CONSTRAINT u1 UNIQUE (z),
      UNIQUE KEY u2 (x, z),
      CONSTRAINT fk FOREIGN KEY (z) REFERENCES b (id) ON DELETE CASCADE
    );`);
    expect(t.primaryKey).toEqual(['x', 'y']);
    expect(t.uniques).toEqual([['z'], ['x', 'z']]);
    expect(t.foreignKeys).toEqual([{ columns: ['z'], reference: { table: 'b', columns: ['id'], onDelete: 'CASCADE' } }]);
  });

  it('ignores prefix lengths and sort order in key lists', () => {
    const t = firstTable('CREATE TABLE a (x text, y int, PRIMARY KEY (x(10), y DESC));');
    expect(t.primaryKey).toEqual(['x', 'y']);
  });

  it('records skipped clauses by name', () => {
    const t = firstTable(`CREATE TABLE a (x int, CHECK (x > 0), INDEX i (x), FULLTEXT (x), EXCLUDE USING gist (x WITH =));`);
    expect(t.skippedClauses).toEqual(['CHECK', 'INDEX', 'FULLTEXT', 'EXCLUDE']);
    expect(t.columns).toHaveLength(1);
  });
});

describe('statements', () => {
  it('reads CREATE TEMP / UNLOGGED / IF NOT EXISTS variants', () => {
    const script = parseDdl(`
      CREATE TEMPORARY TABLE a (id int);
      CREATE UNLOGGED TABLE IF NOT EXISTS b (id int);
      CREATE GLOBAL TEMP TABLE c (id int);
    `);
    expect(script.tables.map((t) => t.name)).toEqual(['a', 'b', 'c']);
  });

  it('ignores whatever follows the closing parenthesis (ENGINE, PARTITION BY, WITHOUT ROWID, ...)', () => {
    const script = parseDdl(`
      CREATE TABLE a (id int) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='x';
      CREATE TABLE b (id int) PARTITION BY RANGE (id);
      CREATE TABLE c (id int PRIMARY KEY) WITHOUT ROWID;
    `);
    expect(script.tables.map((t) => t.name)).toEqual(['a', 'b', 'c']);
    expect(script.errors).toEqual([]);
  });

  it('counts statements without a column list as ignored, not as errors', () => {
    const script = parseDdl(`CREATE TABLE a AS SELECT 1; CREATE TABLE p PARTITION OF q FOR VALUES IN (1);`);
    expect(script.tables).toEqual([]);
    expect(script.ignored.get('CREATE TABLE AS/PARTITION')).toBe(2);
  });

  it('reads ALTER TABLE with several comma-separated actions', () => {
    const [alter] = parseDdl(`
      ALTER TABLE IF EXISTS ONLY public.a
        ADD COLUMN IF NOT EXISTS note text DEFAULT 'x',
        ADD CONSTRAINT fk FOREIGN KEY (b_id) REFERENCES b (id) NOT VALID,
        ADD PRIMARY KEY (id),
        ADD UNIQUE (note),
        ADD CHECK (id > 0),
        DROP COLUMN old;
    `).alters;
    expect(alter.table).toBe('a');
    expect(alter.actions.map((a) => a.kind)).toEqual(['addColumn', 'addForeignKey', 'addPrimaryKey', 'addUnique', 'skipped', 'other']);
  });

  it('counts the statement as ignored when an ALTER has actions it cannot show', () => {
    expect(parseDdl(`ALTER TABLE a RENAME TO b;`).ignored.get('ALTER TABLE')).toBe(1);
    expect(parseDdl(`ALTER TABLE a ADD FOREIGN KEY (x) REFERENCES b(id);`).ignored.size).toBe(0);
  });

  it('describes ignored statements in a friendly way', () => {
    const { ignored } = parseDdl(`
      CREATE OR REPLACE VIEW v AS SELECT 1;
      CREATE UNIQUE INDEX i ON t (a);
      CREATE MATERIALIZED VIEW m AS SELECT 1;
      CREATE DEFINER = root@localhost TRIGGER t BEFORE INSERT ON a FOR EACH ROW SET x = 1;
      DROP TABLE old;
      COMMENT ON TABLE a IS 'x';
      GRANT ALL ON a TO bob;
    `);
    expect([...ignored.keys()].sort()).toEqual(
      ['COMMENT ON', 'CREATE INDEX', 'CREATE VIEW', 'CREATE TRIGGER', 'DROP TABLE', 'GRANT'].sort()
    );
    expect(ignored.get('CREATE VIEW')).toBe(2);
  });

  it('skips SET / BEGIN / COMMIT / PRAGMA / USE silently', () => {
    const { ignored, errors } = parseDdl(`SET NAMES utf8; BEGIN; PRAGMA foreign_keys=ON; USE shop; COMMIT;`);
    expect(ignored.size).toBe(0);
    expect(errors).toEqual([]);
  });
});

describe('errors and tolerance', () => {
  it('reports an unclosed table with its line number and still reads other tables', () => {
    const script = parseDdl(`CREATE TABLE ok (id int);\n\nCREATE TABLE broken (id int,\nname text`);
    expect(script.tables.map((t) => t.name)).toEqual(['ok']);
    expect(script.errors).toEqual([expect.stringContaining('Line 3')]);
    expect(script.errors[0]).toContain('broken');
  });

  it('reports a missing table name', () => {
    expect(parseDdl('CREATE TABLE (id int);').errors[0]).toContain('Line 1');
  });

  it('reads a table defined twice only once, and says so', () => {
    const script = parseDdl(`CREATE TABLE a (x int);\nCREATE TABLE A (y int);`);
    expect(script.tables).toHaveLength(1);
    expect(script.tables[0].columns[0].name).toBe('x');
    expect(script.errors[0]).toContain('Line 2');
  });

  it('never throws, whatever it is given', () => {
    const garbage = [
      '', ';;;', '(((', ')))', "CREATE TABLE a (", 'CREATE TABLE', "CREATE TABLE a (x int DEFAULT", 'ALTER TABLE',
      'ALTER TABLE a ADD', "CREATE TABLE a (x int REFERENCES", "CREATE TABLE a (x int DEFAULT '", 'CREATE TABLE a (,,,)',
      'CREATE TABLE a (CONSTRAINT)', 'CREATE TABLE a (PRIMARY KEY)', 'CREATE TABLE a (FOREIGN KEY (x))',
      '\u0000\u0001', '💥 CREATE TABLE a (id int)',
    ];
    for (const sql of garbage) expect(() => parseDdl(sql)).not.toThrow();
  });
});

describe('import conversion', () => {
  it('adds columns and keys from ALTER TABLE', () => {
    const { tables, errors } = parseSqlToTables(`
      CREATE TABLE users (id int);
      CREATE TABLE orders (id int);
      ALTER TABLE users ADD PRIMARY KEY (id);
      ALTER TABLE orders ADD COLUMN user_id int REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE orders ADD COLUMN note text UNIQUE;
    `);
    expect(errors).toEqual([]);
    expect(tables[0].columns[0]).toMatchObject({ isPk: true, isNullable: false });
    expect(tables[1].columns.map((c) => c.name)).toEqual(['id', 'user_id', 'note']);
    expect(tables[1].columns[1]).toMatchObject({ fkTargetTableId: tables[0].id, fkOnDelete: 'CASCADE' });
    expect(tables[1].columns[2].isUnique).toBe(true);
  });

  it('keeps ids and positions of tables that are already on the canvas', () => {
    const first = parseSqlToTables(`CREATE TABLE a (id int PRIMARY KEY, name text);`).tables;
    first[0].x = 777;
    const again = parseSqlToTables(`CREATE TABLE A (id int PRIMARY KEY, name text, extra int);`, first).tables;
    expect(again[0]).toMatchObject({ id: first[0].id, x: 777 });
    expect(again[0].columns[0].id).toBe(first[0].columns[0].id);
    expect(again[0].columns).toHaveLength(3);
  });

  it('reports foreign keys to tables that are not in the script', () => {
    const { errors } = parseSqlToTables(`CREATE TABLE a (x int REFERENCES missing(id));`);
    expect(errors).toEqual(['Table "a" references unknown target table "missing".']);
  });

  it('puts an error with a line number when a column definition is unreadable', () => {
    const { tables, errors } = parseSqlToTables(`CREATE TABLE a (\n  id int,\n  'oops' int\n);`);
    expect(tables[0].columns.map((c) => c.name)).toEqual(['id']);
    expect(errors[0]).toContain('Line 3');
  });

  it('reads a realistic pg_dump excerpt', () => {
    const { tables, errors, warnings } = parseSqlToTables(`
      --
      -- PostgreSQL database dump
      --
      SET statement_timeout = 0;
      SET client_encoding = 'UTF8';
      SELECT pg_catalog.set_config('search_path', '', false);

      CREATE TABLE public.users (
          id integer NOT NULL,
          email character varying(255) NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL
      );
      ALTER TABLE public.users OWNER TO postgres;

      CREATE SEQUENCE public.users_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

      CREATE TABLE public.posts (
          id integer NOT NULL,
          user_id integer NOT NULL,
          body text
      );

      ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.posts ADD CONSTRAINT posts_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.posts
          ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      CREATE INDEX posts_user_idx ON public.posts USING btree (user_id);
    `);
    expect(errors).toEqual([]);
    expect(tables.map((t) => t.name)).toEqual(['users', 'posts']);
    expect(tables[0].columns[2]).toMatchObject({ type: 'timestamp without time zone', defaultValue: 'now()', isNullable: false });
    expect(tables[1].columns[1]).toMatchObject({ fkTargetTableId: tables[0].id, fkOnDelete: 'CASCADE' });
    expect(tables[0].columns[0].isPk && tables[1].columns[0].isPk).toBe(true);
    expect(warnings).toEqual(
      expect.arrayContaining([
        'Skipped 1 CREATE SEQUENCE statement (not shown on the canvas).',
        'Skipped 1 CREATE INDEX statement (not shown on the canvas).',
        'Skipped 2 ALTER TABLE statements (not shown on the canvas).',
      ])
    );
  });

  it('reads a realistic mysqldump excerpt', () => {
    const { tables, errors } = parseSqlToTables(`
      /*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
      DROP TABLE IF EXISTS \`orders\`;
      CREATE TABLE \`orders\` (
        \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint unsigned NOT NULL,
        \`total\` decimal(10,2) NOT NULL DEFAULT '0.00',
        \`status\` enum('new','paid') NOT NULL DEFAULT 'new',
        PRIMARY KEY (\`id\`),
        KEY \`orders_user_idx\` (\`user_id\`),
        CONSTRAINT \`orders_user_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      CREATE TABLE \`users\` (\`id\` bigint unsigned NOT NULL AUTO_INCREMENT, PRIMARY KEY (\`id\`)) ENGINE=InnoDB;
    `);
    expect(errors).toEqual([]);
    expect(tables[0].columns.map((c) => [c.name, c.type, c.defaultValue])).toEqual([
      ['id', 'bigint unsigned', undefined],
      ['user_id', 'bigint unsigned', undefined],
      ['total', 'decimal(10,2)', "'0.00'"],
      ['status', "enum('new','paid')", "'new'"],
    ]);
    expect(tables[0].columns[0].isPk).toBe(true);
    expect(tables[0].columns[1].fkTargetTableId).toBe(tables[1].id);
  });
});

describe('speed', () => {
  it('reads a 500-table script quickly', () => {
    const sql = Array.from(
      { length: 500 },
      (_, i) => `CREATE TABLE t${i} (id int PRIMARY KEY, name varchar(50) DEFAULT 'x', other_id int REFERENCES t${Math.max(0, i - 1)}(id));`
    ).join('\n');
    const started = performance.now();
    const { tables } = parseSqlToTables(sql);
    expect(tables).toHaveLength(500);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
