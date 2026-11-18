import { describe, it, expect } from 'vitest';
import { validateSchemaPayload, hasCustomWork } from '../schemaValidation';
import { DEFAULT_MODULES, DEFAULT_TABLES } from '../../data/defaultSchema';
import { parseShareHash } from '../urlShare';

const validTable = {
  id: 't1',
  name: 'users',
  moduleId: 'm1',
  x: 10,
  y: 20,
  columns: [{ id: 'c1', name: 'id', type: 'int', isPk: true }],
};
const modules = [{ id: 'm1', name: 'Core', color: '#fff' }];

describe('validateSchemaPayload', () => {
  it('accepts the built-in starter schema', () => {
    const result = validateSchemaPayload({ tables: DEFAULT_TABLES, modules: DEFAULT_MODULES });
    expect(result.ok).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hello'],
    ['no tables list', { modules }],
  ])('rejects %s', (_label, input) => {
    expect(validateSchemaPayload(input).ok).toBe(false);
  });

  it('rejects a table without columns, naming the table', () => {
    const result = validateSchemaPayload({ tables: [{ ...validTable, columns: undefined }], modules });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('users') });
  });

  it('rejects a column without a name or type', () => {
    const noName = { ...validTable, columns: [{ id: 'c1', type: 'int' }] };
    const noType = { ...validTable, columns: [{ id: 'c1', name: 'id' }] };
    expect(validateSchemaPayload({ tables: [noName], modules }).ok).toBe(false);
    expect(validateSchemaPayload({ tables: [noType], modules }).ok).toBe(false);
  });

  it('rejects duplicate table ids', () => {
    expect(validateSchemaPayload({ tables: [validTable, validTable], modules }).ok).toBe(false);
  });

  it('repairs bad positions and unknown modules instead of crashing', () => {
    const result = validateSchemaPayload({
      tables: [{ ...validTable, x: 'left', y: NaN, moduleId: 'gone' }],
      modules,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Number.isFinite(result.tables[0].x)).toBe(true);
      expect(Number.isFinite(result.tables[0].y)).toBe(true);
      expect(result.tables[0].moduleId).toBe('m1');
    }
  });

  it('uses the current modules when the file has none', () => {
    const result = validateSchemaPayload({ tables: [{ ...validTable, moduleId: 'gone' }] }, modules);
    expect(result.ok && result.tables[0].moduleId).toBe('m1');
  });

  it('removes foreign keys that point to missing tables or columns', () => {
    const child = {
      ...validTable,
      id: 't2',
      name: 'orders',
      columns: [
        { id: 'c9', name: 'user_id', type: 'int', fkTargetTableId: 'nope', fkTargetColumnId: 'x', fkOnDelete: 'CASCADE' },
        { id: 'c8', name: 'u2', type: 'int', fkTargetTableId: 't1', fkTargetColumnId: 'missing' },
      ],
    };
    const result = validateSchemaPayload({ tables: [validTable, child], modules });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const [dangling, halfValid] = result.tables[1].columns;
      expect(dangling.fkTargetTableId).toBeUndefined();
      expect(dangling.fkOnDelete).toBeUndefined();
      expect(halfValid.fkTargetTableId).toBe('t1');
      expect(halfValid.fkTargetColumnId).toBeUndefined();
    }
  });

  it('drops unknown fkOnDelete values', () => {
    const t = { ...validTable, columns: [{ id: 'c1', name: 'a', type: 'int', fkOnDelete: 'EXPLODE' }] };
    const result = validateSchemaPayload({ tables: [t], modules });
    expect(result.ok && result.tables[0].columns[0].fkOnDelete).toBeUndefined();
  });
});

describe('hasCustomWork', () => {
  it('is false for the untouched starter schema and true after any change', () => {
    expect(hasCustomWork(DEFAULT_TABLES)).toBe(false);
    expect(hasCustomWork([])).toBe(true);
    expect(hasCustomWork(DEFAULT_TABLES.map((t, i) => (i === 0 ? { ...t, x: t.x + 1 } : t)))).toBe(true);
  });
});

describe('parseShareHash', () => {
  it('returns the payload only for #schema= links', () => {
    expect(parseShareHash('#schema=abc_-123')).toBe('abc_-123');
    expect(parseShareHash('schema=abc')).toBe('abc');
    expect(parseShareHash('#about')).toBeNull();
    expect(parseShareHash('')).toBeNull();
    expect(parseShareHash('#schema=')).toBeNull();
  });
});
