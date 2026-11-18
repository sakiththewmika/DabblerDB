import { beforeEach, describe, expect, it } from 'vitest';
import { useSchemaStore } from '../../store/useSchemaStore';
import { toast, useToastStore } from '../../store/useToastStore';
import { importFile, importJsonText, importSqlText } from '../importFiles';
import { DEFAULT_MODULES, DEFAULT_TABLES } from '../../data/defaultSchema';

const lastToast = () => useToastStore.getState().toasts.at(-1)!;

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  useSchemaStore.setState({
    tables: DEFAULT_TABLES,
    modules: DEFAULT_MODULES,
    past: [],
    future: [],
  });
});

describe('toast store', () => {
  it('keeps toasts with details open until closed, and closes plain ones by themselves', () => {
    toast.success('Saved');
    toast.warning('Careful', { details: ['one'] });
    const [plain, detailed] = useToastStore.getState().toasts;
    expect(plain.duration).toBeGreaterThan(0);
    expect(detailed.duration).toBe(0);
  });

  it('shows at most 4 toasts and can dismiss one', () => {
    for (let i = 0; i < 6; i++) toast.info(`m${i}`);
    const toasts = useToastStore.getState().toasts;
    expect(toasts.map((t) => t.title)).toEqual(['m2', 'm3', 'm4', 'm5']);
    useToastStore.getState().dismiss(toasts[0].id);
    expect(useToastStore.getState().toasts).toHaveLength(3);
  });
});

describe('importSqlText', () => {
  it('imports tables and shows a success toast with Undo', () => {
    importSqlText(`CREATE TABLE a (id int PRIMARY KEY);`, 'a.sql');
    expect(useSchemaStore.getState().tables.map((t) => t.name)).toEqual(['a']);
    expect(lastToast().kind).toBe('success');
    expect(lastToast().title).toContain('a.sql');

    lastToast().action!.onClick();
    expect(useSchemaStore.getState().tables).toEqual(DEFAULT_TABLES);
  });

  it('shows a warning toast listing skipped SQL features', () => {
    importSqlText(`CREATE TABLE a (id int PRIMARY KEY);\nCREATE INDEX i ON a (id);`, 'a.sql');
    expect(lastToast().kind).toBe('warning');
    expect(lastToast().details?.join(' ')).toContain('CREATE INDEX');
  });

  it('keeps the canvas and shows an error toast when no table is found', () => {
    importSqlText(`SELECT 1;`, 'q.sql');
    expect(useSchemaStore.getState().tables).toEqual(DEFAULT_TABLES);
    expect(lastToast().kind).toBe('error');
  });

  it('reports an empty file', () => {
    importSqlText('   \n', 'empty.sql');
    expect(lastToast().kind).toBe('error');
    expect(lastToast().title).toContain('empty');
  });

  it('puts imported tables into an existing module (no ghost module)', () => {
    importSqlText(`CREATE TABLE a (id int PRIMARY KEY);`);
    const { tables, modules } = useSchemaStore.getState();
    expect(modules.some((m) => m.id === tables[0].moduleId)).toBe(true);
  });
});

describe('importJsonText', () => {
  it('shows an error toast for text that is not JSON, and leaves the canvas alone', () => {
    importJsonText('{ nope', 'w.json');
    expect(lastToast().kind).toBe('error');
    expect(useSchemaStore.getState().tables).toEqual(DEFAULT_TABLES);
  });

  it('shows the validation message for JSON that is not a workspace', () => {
    importJsonText('{"hello": 1}');
    expect(lastToast().kind).toBe('error');
    expect(lastToast().details?.[0]).toContain('tables');
  });

  it('imports a valid workspace', () => {
    importJsonText(JSON.stringify({ tables: DEFAULT_TABLES, modules: DEFAULT_MODULES }));
    expect(lastToast().kind).toBe('success');
  });
});

describe('importFile', () => {
  it('rejects unsupported file types', async () => {
    await importFile(new File(['x'], 'photo.png'));
    expect(lastToast().kind).toBe('error');
    expect(lastToast().title).toContain('photo.png');
  });

  it('rejects files over 5 MB', async () => {
    await importFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.sql'));
    expect(lastToast().title).toContain('too large');
  });

  it('imports a .sql file by extension', async () => {
    await importFile(new File([`CREATE TABLE z (id int PRIMARY KEY);`], 'z.sql'));
    expect(useSchemaStore.getState().tables[0].name).toBe('z');
  });
});
