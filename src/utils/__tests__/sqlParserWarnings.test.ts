import { describe, it, expect } from 'vitest';
import { parseSqlToTables } from '../sqlCompiler';

describe('SQL parser - reports what it skipped', () => {
  it('has no warnings for plain tables', () => {
    const { warnings } = parseSqlToTables(`CREATE TABLE a (id int PRIMARY KEY, name text NOT NULL);`);
    expect(warnings).toEqual([]);
  });

  it('warns about CREATE INDEX, CREATE VIEW and INSERT statements, with counts', () => {
    const { tables, warnings } = parseSqlToTables(`
      CREATE TABLE a (id int PRIMARY KEY, name text);
      CREATE INDEX idx_a ON a (name);
      CREATE UNIQUE INDEX idx_b ON a (id);
      CREATE OR REPLACE VIEW v AS SELECT * FROM a;
      INSERT INTO a VALUES (1, 'x; y');
    `);
    expect(tables).toHaveLength(1);
    expect(warnings).toContain('Skipped 2 CREATE INDEX statements (not shown on the canvas).');
    expect(warnings).toContain('Skipped 1 CREATE VIEW statement (not shown on the canvas).');
    expect(warnings).toContain('Skipped 1 INSERT statement (not shown on the canvas).');
  });

  it('does not warn about SET, BEGIN, COMMIT, PRAGMA or the ALTER TABLE keys it understands', () => {
    const { warnings } = parseSqlToTables(`
      SET search_path = public;
      BEGIN;
      PRAGMA foreign_keys = ON;
      CREATE TABLE a (id int PRIMARY KEY);
      CREATE TABLE b (id int PRIMARY KEY, a_id int);
      ALTER TABLE b ADD CONSTRAINT fk FOREIGN KEY (a_id) REFERENCES a(id);
      COMMIT;
    `);
    expect(warnings).toEqual([]);
  });

  it('warns about other ALTER TABLE changes', () => {
    const { warnings } = parseSqlToTables(`
      CREATE TABLE a (id int PRIMARY KEY);
      ALTER TABLE a DROP COLUMN extra;
    `);
    expect(warnings).toEqual(['Skipped 1 ALTER TABLE statement (not shown on the canvas).']);
  });

  it('does not split statements on semicolons inside $$ function bodies', () => {
    const { warnings } = parseSqlToTables(`
      CREATE TABLE a (id int PRIMARY KEY);
      CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;
    `);
    expect(warnings).toEqual(['Skipped 1 CREATE FUNCTION statement (not shown on the canvas).']);
  });

  it('warns about table-level CHECK, KEY and composite UNIQUE clauses', () => {
    const { warnings } = parseSqlToTables(`
      CREATE TABLE a (id int PRIMARY KEY, x int, y int, CHECK (x > 0), KEY idx_x (x), UNIQUE (x, y));
    `);
    expect(warnings.join('\n')).toContain('CHECK clause skipped');
    expect(warnings.join('\n')).toContain('KEY clause skipped');
    expect(warnings.join('\n')).toContain('composite UNIQUE (x, y)');
  });

  it('warns about column-level CHECK constraints', () => {
    const { warnings } = parseSqlToTables(`CREATE TABLE a (id int PRIMARY KEY, age int CHECK (age > 0));`);
    expect(warnings).toEqual(['Column "a.age": CHECK constraint skipped.']);
  });

  it('returns an empty table list (not the existing tables) when nothing can be parsed', () => {
    const existing = parseSqlToTables(`CREATE TABLE old (id int);`).tables;
    const result = parseSqlToTables(`SELECT 1;`, existing);
    expect(result.tables).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
});
