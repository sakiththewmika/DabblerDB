import { describe, it, expect } from 'vitest';
import { generateSql, parseSqlToTables } from '../sqlCompiler';
import { DEFAULT_TABLES, DEFAULT_MODULES } from '../../data/defaultSchema';
import { encodeSchemaToUrlHash, decodeSchemaFromUrlHash } from '../urlShare';

describe('sqlCompiler - SQL Generator', () => {
  it('generates valid PostgreSQL DDL with primary keys, unique constraints, and foreign keys', () => {
    const sql = generateSql(DEFAULT_TABLES, 'postgres');

    expect(sql).toContain('Dialect: PostgreSQL');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(sql).toContain('"id" UUID PRIMARY KEY');
    expect(sql).toContain('"email" VARCHAR(255) UNIQUE NOT NULL');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "orders"');
    expect(sql).toContain('REFERENCES "users" ("id") ON DELETE RESTRICT');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS');
  });

  it('generates valid MySQL DDL with backticks and auto-increment types', () => {
    const sql = generateSql(DEFAULT_TABLES, 'mysql');

    expect(sql).toContain('Dialect: MySQL 8.0+');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS `users`');
    expect(sql).toContain('`id` VARCHAR(36) PRIMARY KEY');
    expect(sql).toContain('ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    expect(sql).toContain('REFERENCES `users` (`id`) ON DELETE RESTRICT');
  });

  it('generates valid SQLite DDL with PRAGMA foreign_keys enabled', () => {
    const sql = generateSql(DEFAULT_TABLES, 'sqlite');

    expect(sql).toContain('Dialect: SQLite 3');
    expect(sql).toContain('PRAGMA foreign_keys = ON;');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(sql).toContain('"id" TEXT PRIMARY KEY');
    expect(sql).toContain('REFERENCES "users" ("id") ON DELETE RESTRICT');
  });
});

describe('sqlCompiler - SQL Parser', () => {
  const sampleDdl = `
    CREATE TABLE organizations (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE
    );

    CREATE TABLE employees (
      id UUID PRIMARY KEY,
      org_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      salary NUMERIC(10,2) DEFAULT 0
    );
  `;

  it('parses DDL blocks into visual SchemaTable and SchemaColumn objects', () => {
    const { tables, errors } = parseSqlToTables(sampleDdl, []);

    expect(errors).toHaveLength(0);
    expect(tables).toHaveLength(2);

    const orgs = tables.find((t) => t.name === 'organizations');
    expect(orgs).toBeDefined();
    expect(orgs?.columns).toHaveLength(3);

    const orgId = orgs?.columns.find((c) => c.name === 'id');
    expect(orgId?.isPk).toBe(true);

    const orgSlug = orgs?.columns.find((c) => c.name === 'slug');
    expect(orgSlug?.isUnique).toBe(true);

    const employees = tables.find((t) => t.name === 'employees');
    expect(employees).toBeDefined();
    expect(employees?.columns).toHaveLength(4);

    const orgFk = employees?.columns.find((c) => c.name === 'org_id');
    expect(orgFk?.fkTargetTableId).toBe(orgs?.id);
    expect(orgFk?.fkOnDelete).toBe('CASCADE');
  });

  it('preserves coordinates and module assignments of existing tables', () => {
    const existing = [
      {
        id: 'existing_orgs',
        name: 'organizations',
        moduleId: 'mod_custom',
        x: 500,
        y: 600,
        columns: [],
      },
    ];

    const { tables } = parseSqlToTables(sampleDdl, existing);
    const orgs = tables.find((t) => t.name === 'organizations');

    expect(orgs?.id).toBe('existing_orgs');
    expect(orgs?.moduleId).toBe('mod_custom');
    expect(orgs?.x).toBe(500);
    expect(orgs?.y).toBe(600);
  });
});

describe('urlShare - Schema URL Hash Encoding & Decoding', () => {
  it('encodes and decodes schema tables and modules losslessly with compact compression', async () => {
    const encoded = await encodeSchemaToUrlHash(DEFAULT_TABLES, DEFAULT_MODULES);
    expect(typeof encoded).toBe('string');
    // Compact compressed hash is significantly smaller than raw JSON/base64 (~72%+ reduction)
    expect(encoded.length).toBeLessThan(1200);

    const decoded = await decodeSchemaFromUrlHash(`schema=${encoded}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.tables).toHaveLength(DEFAULT_TABLES.length);
    expect(decoded?.modules).toHaveLength(DEFAULT_MODULES.length);

    expect(decoded?.tables[0].name).toBe(DEFAULT_TABLES[0].name);
    expect(decoded?.modules[0].name).toBe(DEFAULT_MODULES[0].name);
  });

  it('handles invalid or empty hash gracefully', async () => {
    expect(await decodeSchemaFromUrlHash('')).toBeNull();
    expect(await decodeSchemaFromUrlHash('#schema=invalid_garbage')).toBeNull();
  });
});
