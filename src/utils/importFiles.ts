import { useSchemaStore } from '../store/useSchemaStore';
import { toast } from '../store/useToastStore';
import { parseSqlToTables } from './sqlCompiler';
import { validateSchemaPayload } from './schemaValidation';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMPORT_TYPES = '.sql,.txt,.json';

const undoAction = { label: 'Undo import', onClick: () => useSchemaStore.getState().undo() };

/** Turns SQL text into tables on the canvas and tells the user what happened. */
export function importSqlText(sqlText: string, sourceName = 'SQL'): void {
  if (!sqlText.trim()) {
    toast.error(`${sourceName} is empty`, { details: ['Nothing to import. Check that you picked the right file.'] });
    return;
  }

  const { tables, modules, importSchemaJson } = useSchemaStore.getState();
  const { tables: parsed, errors, warnings } = parseSqlToTables(sqlText, tables);

  if (parsed.length === 0) {
    toast.error(`No tables found in ${sourceName}`, {
      details: errors.length > 0 ? errors : ['Expected at least one CREATE TABLE statement.'],
    });
    return;
  }

  importSchemaJson({ tables: parsed, modules });

  const notes = [...errors, ...warnings];
  const title = `Imported ${parsed.length} table${parsed.length > 1 ? 's' : ''} from ${sourceName}`;
  if (notes.length > 0) {
    toast.warning(`${title}, with ${notes.length} note${notes.length > 1 ? 's' : ''}`, { details: notes, action: undoAction });
  } else {
    toast.success(title, { action: undoAction });
  }
}

/** Turns a DabblerDB JSON workspace file into tables on the canvas. */
export function importJsonText(text: string, sourceName = 'JSON file'): void {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    toast.error(`${sourceName} is not valid JSON`, {
      details: ['Only workspace files exported from DabblerDB can be imported as .json.'],
    });
    return;
  }

  const { modules, importSchemaJson } = useSchemaStore.getState();
  const result = validateSchemaPayload(data, modules);
  if (!result.ok) {
    toast.error(`${sourceName} is not a DabblerDB workspace`, { details: [result.error] });
    return;
  }

  importSchemaJson({ tables: result.tables, modules: result.modules });
  toast.success(`Imported ${result.tables.length} table${result.tables.length === 1 ? '' : 's'} from ${sourceName}`, {
    action: undoAction,
  });
}

/** Reads a picked or dropped file and imports it, based on its extension. */
export async function importFile(file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension !== 'sql' && extension !== 'txt' && extension !== 'json') {
    toast.error(`"${file.name}" can't be imported`, { details: ['Use a .sql file with CREATE TABLE statements, or a .json workspace file.'] });
    return;
  }
  if (file.size > MAX_IMPORT_BYTES) {
    toast.error(`"${file.name}" is too large`, { details: ['Files up to 5 MB can be imported.'] });
    return;
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    toast.error(`Could not read "${file.name}"`);
    return;
  }

  if (extension === 'json') importJsonText(text, file.name);
  else importSqlText(text, file.name);
}
