import type { FkOnDeleteAction, ModuleGroup, SchemaColumn, SchemaTable } from '../types/schema';
import { DEFAULT_TABLES } from '../data/defaultSchema';

export type ValidationResult =
  | { ok: true; tables: SchemaTable[]; modules?: ModuleGroup[] }
  | { ok: false; error: string };

const FK_ACTIONS: FkOnDeleteAction[] = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const finiteOr = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const optionalString = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;

/**
 * Checks data coming from outside the app (JSON file, shared link) and returns a
 * clean copy that is safe to load, or a human-readable error message.
 *
 * `currentModules` is used when the data has no modules of its own, so tables
 * never end up pointing at a module that does not exist.
 */
export function validateSchemaPayload(
  raw: unknown,
  currentModules: ModuleGroup[] = []
): ValidationResult {
  if (!isObject(raw)) return { ok: false, error: 'The data is not a schema object.' };
  if (!Array.isArray(raw.tables)) return { ok: false, error: 'The data has no "tables" list.' };

  // Modules (optional)
  let modules: ModuleGroup[] | undefined;
  if (raw.modules !== undefined) {
    if (!Array.isArray(raw.modules)) return { ok: false, error: '"modules" must be a list.' };
    const valid: ModuleGroup[] = [];
    raw.modules.forEach((m) => {
      if (isObject(m) && typeof m.id === 'string' && typeof m.name === 'string' && m.id) {
        valid.push({ id: m.id, name: m.name, color: typeof m.color === 'string' ? m.color : '#6366f1' });
      }
    });
    modules = valid.length > 0 ? valid : undefined;
  }
  const knownModules = modules ?? currentModules;
  const fallbackModuleId = knownModules[0]?.id ?? 'mod_general';

  // Tables
  const tables: SchemaTable[] = [];
  const tableIds = new Set<string>();

  for (let ti = 0; ti < raw.tables.length; ti++) {
    const t = raw.tables[ti];
    const where = `tables[${ti}]`;
    if (!isObject(t)) return { ok: false, error: `${where} is not an object.` };
    if (typeof t.id !== 'string' || !t.id) return { ok: false, error: `${where} is missing an "id".` };
    if (typeof t.name !== 'string' || !t.name.trim()) {
      return { ok: false, error: `${where} is missing a "name".` };
    }
    if (tableIds.has(t.id)) return { ok: false, error: `${where} repeats the id "${t.id}".` };
    if (!Array.isArray(t.columns)) return { ok: false, error: `Table "${t.name}" has no "columns" list.` };
    tableIds.add(t.id);

    const columns: SchemaColumn[] = [];
    const columnIds = new Set<string>();
    for (let ci = 0; ci < t.columns.length; ci++) {
      const c = t.columns[ci];
      const cwhere = `Table "${t.name}", column ${ci + 1}`;
      if (!isObject(c)) return { ok: false, error: `${cwhere} is not an object.` };
      if (typeof c.id !== 'string' || !c.id) return { ok: false, error: `${cwhere} is missing an "id".` };
      if (typeof c.name !== 'string' || !c.name.trim()) {
        return { ok: false, error: `${cwhere} is missing a "name".` };
      }
      if (typeof c.type !== 'string' || !c.type.trim()) {
        return { ok: false, error: `${cwhere} ("${c.name}") is missing a "type".` };
      }
      if (columnIds.has(c.id)) return { ok: false, error: `${cwhere} repeats the id "${c.id}".` };
      columnIds.add(c.id);

      columns.push({
        id: c.id,
        name: c.name,
        type: c.type,
        isPk: c.isPk === true,
        isUnique: c.isUnique === true,
        isNullable: c.isNullable !== false,
        defaultValue: optionalString(c.defaultValue),
        fkTargetTableId: optionalString(c.fkTargetTableId),
        fkTargetColumnId: optionalString(c.fkTargetColumnId),
        fkOnDelete: FK_ACTIONS.includes(c.fkOnDelete as FkOnDeleteAction)
          ? (c.fkOnDelete as FkOnDeleteAction)
          : undefined,
      });
    }

    tables.push({
      id: t.id,
      name: t.name,
      moduleId:
        typeof t.moduleId === 'string' && knownModules.some((m) => m.id === t.moduleId)
          ? t.moduleId
          : fallbackModuleId,
      x: finiteOr(t.x, 60 + (ti % 3) * 360),
      y: finiteOr(t.y, 80 + Math.floor(ti / 3) * 360),
      comment: optionalString(t.comment),
      columns,
    });
  }

  // Remove foreign keys that point at tables or columns that are not in the file
  const columnsByTable = new Map(tables.map((t) => [t.id, new Set(t.columns.map((c) => c.id))]));
  tables.forEach((t) =>
    t.columns.forEach((c) => {
      if (!c.fkTargetTableId) return;
      const targetColumns = columnsByTable.get(c.fkTargetTableId);
      if (!targetColumns) {
        c.fkTargetTableId = c.fkTargetColumnId = c.fkOnDelete = undefined;
      } else if (c.fkTargetColumnId && !targetColumns.has(c.fkTargetColumnId)) {
        c.fkTargetColumnId = undefined;
      }
    })
  );

  return { ok: true, tables, modules };
}

/** True when the canvas holds anything other than the untouched starter schema. */
export function hasCustomWork(tables: SchemaTable[]): boolean {
  return JSON.stringify(tables) !== JSON.stringify(DEFAULT_TABLES);
}
