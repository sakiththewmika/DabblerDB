/**
 * Step 3 of reading SQL: turn the parsed script into canvas tables.
 *
 * Besides converting, this step:
 *  - keeps the id, position, module and description of tables that already exist
 *    on the canvas (matched by name), so re-applying SQL does not move things around,
 *  - links foreign keys to the right table and column,
 *  - writes friendly warnings for everything that could not be shown.
 */
import type { FkOnDeleteAction, SchemaColumn, SchemaTable } from '../../types/schema';
import { createId } from '../ids';
import { parseDdl, type ParsedColumn, type ParsedReference } from './ddlParser';

interface PendingFk {
  columnName: string;
  reference: ParsedReference;
  /** Which column of the referenced table, when the SQL names one */
  targetColumnName?: string;
}

export interface SqlImportResult {
  tables: SchemaTable[];
  /** Problems: something was wrong or could not be read. */
  errors: string[];
  /** Notes: valid SQL that cannot be shown on the canvas (indexes, CHECK, ...). */
  warnings: string[];
}

const NOT_SHOWN = 'not shown on the canvas';

function toSchemaColumn(parsed: ParsedColumn, existingId?: string): SchemaColumn {
  return {
    id: existingId ?? createId('col'),
    name: parsed.name,
    type: parsed.type,
    isPk: parsed.isPk,
    isUnique: parsed.isUnique,
    isNullable: parsed.isPk ? false : !parsed.notNull,
    defaultValue: parsed.defaultValue,
  };
}

export function parseSqlToTables(sqlText: string, existingTables: SchemaTable[] = []): SqlImportResult {
  const script = parseDdl(sqlText);
  const errors = [...script.errors];
  const warnings: string[] = [];

  if (script.tables.length === 0) {
    return {
      tables: [],
      errors: [...errors, 'No valid "CREATE TABLE ... (...);" statements could be detected in the input SQL.'],
      warnings,
    };
  }

  const byName = new Map<string, { table: SchemaTable; pending: PendingFk[] }>();
  const result: SchemaTable[] = [];

  script.tables.forEach((parsed, index) => {
    const existing = existingTables.find((t) => t.name.toLowerCase() === parsed.name.toLowerCase());
    const pending: PendingFk[] = [];

    const table: SchemaTable = {
      id: existing?.id ?? createId('tbl'),
      name: parsed.name,
      moduleId: existing?.moduleId ?? 'mod_identity', // importSchemaJson moves unknown modules to the first one
      x: existing ? existing.x : 60 + (index % 3) * 360,
      y: existing ? existing.y : 80 + Math.floor(index / 3) * 360,
      comment: existing?.comment ?? '',
      columns: parsed.columns.map((c) =>
        toSchemaColumn(c, existing?.columns.find((e) => e.name.toLowerCase() === c.name.toLowerCase())?.id)
      ),
    };

    const findColumn = (name: string) => table.columns.find((c) => c.name.toLowerCase() === name.toLowerCase());

    // Table-level constraints
    parsed.primaryKey.forEach((name) => {
      const col = findColumn(name);
      if (col) {
        col.isPk = true;
        col.isNullable = false;
      }
    });
    parsed.uniques.forEach((names) => {
      if (names.length === 1) {
        const col = findColumn(names[0]);
        if (col) col.isUnique = true;
      } else {
        warnings.push(`Table "${parsed.name}": composite UNIQUE (${names.join(', ')}) is ${NOT_SHOWN}.`);
      }
    });
    parsed.skippedClauses.forEach((keyword) => {
      warnings.push(`Table "${parsed.name}": ${keyword} clause skipped (${NOT_SHOWN}).`);
    });

    // Foreign keys: inline ("user_id int REFERENCES users(id)") and table-level
    parsed.columns.forEach((c) => {
      if (c.references) {
        pending.push({ columnName: c.name, reference: c.references, targetColumnName: c.references.columns[0] });
      }
      if (c.hasCheck) warnings.push(`Column "${parsed.name}.${c.name}": CHECK constraint skipped.`);
      if (c.isGenerated) warnings.push(`Column "${parsed.name}.${c.name}": generated/identity clause skipped.`);
    });
    parsed.foreignKeys.forEach(({ columns, reference }) => {
      columns.forEach((columnName, i) => {
        pending.push({ columnName, reference, targetColumnName: reference.columns[i] });
      });
    });

    byName.set(parsed.name.toLowerCase(), { table, pending });
    result.push(table);
  });

  // ALTER TABLE statements (pg_dump and many migration tools put keys here)
  script.alters.forEach((alter) => {
    const entry = byName.get(alter.table.toLowerCase());
    if (!entry) {
      errors.push(`Line ${alter.line}: ALTER TABLE refers to unknown table "${alter.table}".`);
      return;
    }
    const { table, pending } = entry;
    const findColumn = (name: string) => table.columns.find((c) => c.name.toLowerCase() === name.toLowerCase());

    alter.actions.forEach((action) => {
      if (action.kind === 'addColumn') {
        if (!findColumn(action.column.name)) {
          table.columns.push(toSchemaColumn(action.column));
          if (action.column.references) {
            pending.push({
              columnName: action.column.name,
              reference: action.column.references,
              targetColumnName: action.column.references.columns[0],
            });
          }
        }
      } else if (action.kind === 'addPrimaryKey') {
        action.columns.forEach((name) => {
          const col = findColumn(name);
          if (col) {
            col.isPk = true;
            col.isNullable = false;
          }
        });
      } else if (action.kind === 'addUnique') {
        if (action.columns.length === 1) {
          const col = findColumn(action.columns[0]);
          if (col) col.isUnique = true;
        } else {
          warnings.push(`Table "${table.name}": composite UNIQUE (${action.columns.join(', ')}) is ${NOT_SHOWN}.`);
        }
      } else if (action.kind === 'addForeignKey') {
        action.columns.forEach((columnName, i) => {
          pending.push({ columnName, reference: action.reference, targetColumnName: action.reference.columns[i] });
        });
      } else if (action.kind === 'skipped') {
        warnings.push(`Table "${table.name}": ${action.keyword} clause skipped (${NOT_SHOWN}).`);
      }
    });
  });

  // Statements that were not turned into anything
  script.ignored.forEach((count, label) => {
    warnings.push(`Skipped ${count} ${label} statement${count > 1 ? 's' : ''} (${NOT_SHOWN}).`);
  });

  // Link every foreign key to its target table and column
  byName.forEach(({ table, pending }) => {
    pending.forEach(({ columnName, reference, targetColumnName }) => {
      const column = table.columns.find((c) => c.name.toLowerCase() === columnName.toLowerCase());
      if (!column) return;

      const target = byName.get(reference.table.toLowerCase())?.table;
      if (!target) {
        errors.push(`Table "${table.name}" references unknown target table "${reference.table}".`);
        return;
      }

      const targetColumn =
        (targetColumnName && target.columns.find((c) => c.name.toLowerCase() === targetColumnName.toLowerCase())) ||
        target.columns.find((c) => c.isPk) ||
        target.columns[0];

      column.fkTargetTableId = target.id;
      column.fkTargetColumnId = targetColumn?.id;
      // When the SQL says nothing, the database default is NO ACTION
      column.fkOnDelete = (reference.onDelete ?? 'NO ACTION') as FkOnDeleteAction;
    });
  });

  return { tables: result, errors, warnings };
}
