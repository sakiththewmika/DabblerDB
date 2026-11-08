import type { ModuleGroup, SchemaTable, FkOnDeleteAction } from '../types/schema';

export interface SharedSchemaPayloadV1 {
  v: 1;
  m: ModuleGroup[];
  t: SchemaTable[];
}

interface CompactColumn {
  i: string; // id
  n: string; // name
  t: string; // type
  p?: 1; // isPk
  u?: 1; // isUnique
  nn?: 1; // isNullable === false
  d?: string; // defaultValue
  ft?: string; // fkTargetTableId
  fc?: string; // fkTargetColumnId
  fo?: FkOnDeleteAction; // fkOnDelete
}

interface CompactTable {
  i: string; // id
  n: string; // name
  m: string; // moduleId
  x: number; // x
  y: number; // y
  c?: string; // comment
  cols: CompactColumn[]; // columns
}

interface CompactPayloadV2 {
  v: 2;
  m: Array<{ i: string; n: string; c: string }>;
  t: CompactTable[];
}

function compactSchema(tables: SchemaTable[], modules: ModuleGroup[]): CompactPayloadV2 {
  return {
    v: 2,
    m: modules.map((m) => ({ i: m.id, n: m.name, c: m.color })),
    t: tables.map((t) => {
      const ct: CompactTable = {
        i: t.id,
        n: t.name,
        m: t.moduleId,
        x: Math.round(t.x),
        y: Math.round(t.y),
        cols: t.columns.map((c) => {
          const col: CompactColumn = { i: c.id, n: c.name, t: c.type };
          if (c.isPk) col.p = 1;
          if (c.isUnique) col.u = 1;
          if (c.isNullable === false) col.nn = 1;
          if (c.defaultValue) col.d = c.defaultValue;
          if (c.fkTargetTableId) col.ft = c.fkTargetTableId;
          if (c.fkTargetColumnId) col.fc = c.fkTargetColumnId;
          if (c.fkOnDelete) col.fo = c.fkOnDelete;
          return col;
        }),
      };
      if (t.comment) ct.c = t.comment;
      return ct;
    }),
  };
}

function expandCompactSchema(parsed: CompactPayloadV2): { tables: SchemaTable[]; modules: ModuleGroup[] } {
  const modules: ModuleGroup[] = parsed.m.map((m) => ({ id: m.i, name: m.n, color: m.c }));
  const tables: SchemaTable[] = parsed.t.map((t) => ({
    id: t.i,
    name: t.n,
    moduleId: t.m,
    x: t.x,
    y: t.y,
    comment: t.c,
    columns: t.cols.map((c) => ({
      id: c.i,
      name: c.n,
      type: c.t,
      isPk: !!c.p,
      isUnique: !!c.u,
      isNullable: !c.nn,
      defaultValue: c.d,
      fkTargetTableId: c.ft,
      fkTargetColumnId: c.fc,
      fkOnDelete: c.fo,
    })),
  }));
  return { tables, modules };
}

/**
 * Encodes the given tables and modules into a compact, compressed URL-safe Base64Url string (80%+ reduction).
 */
export async function encodeSchemaToUrlHash(
  tables: SchemaTable[],
  modules: ModuleGroup[]
): Promise<string> {
  const payload = compactSchema(tables, modules);
  const jsonStr = JSON.stringify(payload);

  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const compressedBuffer = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(compressedBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Fallback for environments without CompressionStream
  return btoa(
    encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * Parses and decodes a shared schema payload from the current window URL hash or a string.
 * Supports both v2 compressed hashes and legacy v1 uncompressed base64 payloads.
 */
export async function decodeSchemaFromUrlHash(
  hashStr?: string
): Promise<{ tables: SchemaTable[]; modules: ModuleGroup[] } | null> {
  try {
    const raw = hashStr ?? (typeof window !== 'undefined' ? window.location.hash : '');
    let clean = raw;
    if (clean.startsWith('#')) clean = clean.substring(1);
    if (clean.startsWith('schema=')) clean = clean.replace('schema=', '');
    if (!clean) return null;

    // 1. Try compressed Deflate-raw format (v2)
    if (typeof DecompressionStream !== 'undefined') {
      try {
        let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        const text = await new Response(stream).text();
        const parsed = JSON.parse(text);

        if (parsed.v === 2 && Array.isArray(parsed.t) && Array.isArray(parsed.m)) {
          return expandCompactSchema(parsed as CompactPayloadV2);
        }
        if (parsed.v === 1 && Array.isArray(parsed.t) && Array.isArray(parsed.m)) {
          return { tables: parsed.t, modules: parsed.m };
        }
      } catch {
        // Continue to legacy fallback
      }
    }

    // 2. Fallback to legacy uncompressed Base64 format (v1)
    try {
      let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const jsonStr = decodeURIComponent(
        Array.prototype.map
          .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonStr) as SharedSchemaPayloadV1;
      if (Array.isArray(parsed.t) && Array.isArray(parsed.m)) {
        return { tables: parsed.t, modules: parsed.m };
      }
    } catch {
      return null;
    }

    return null;
  } catch (err) {
    console.warn('Failed to decode schema from URL hash:', err);
    return null;
  }
}

/**
 * Generates the full URL including hash for sharing the current schema.
 */
export async function getShareableUrl(
  tables: SchemaTable[],
  modules: ModuleGroup[]
): Promise<string> {
  if (typeof window === 'undefined') return '';
  const hash = await encodeSchemaToUrlHash(tables, modules);
  const url = new URL(window.location.href);
  url.hash = `schema=${hash}`;
  return url.toString();
}

/**
 * Copies the shareable URL directly to the user's clipboard.
 */
export async function copyShareableUrlToClipboard(
  tables: SchemaTable[],
  modules: ModuleGroup[]
): Promise<boolean> {
  try {
    const shareUrl = await getShareableUrl(tables, modules);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
