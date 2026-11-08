import type { ModuleGroup, SchemaTable } from '../types/schema';

export interface SharedSchemaPayload {
  v: number;
  m: ModuleGroup[];
  t: SchemaTable[];
}

/**
 * Encodes the given tables and modules into a compact, URL-safe Base64 string.
 */
export function encodeSchemaToUrlHash(tables: SchemaTable[], modules: ModuleGroup[]): string {
  const payload: SharedSchemaPayload = {
    v: 1,
    m: modules,
    t: tables,
  };
  const jsonStr = JSON.stringify(payload);
  // UTF-8 safe base64 encoding in browser
  return btoa(
    encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * Parses and decodes a shared schema payload from the current window URL hash or a string.
 */
export function decodeSchemaFromUrlHash(
  hashStr?: string
): { tables: SchemaTable[]; modules: ModuleGroup[] } | null {
  try {
    const raw = hashStr ?? (typeof window !== 'undefined' ? window.location.hash : '');
    let clean = raw;
    if (clean.startsWith('#')) clean = clean.substring(1);
    if (clean.startsWith('schema=')) clean = clean.replace('schema=', '');
    if (!clean) return null;

    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(clean), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonStr) as SharedSchemaPayload;
    if (Array.isArray(parsed.t) && Array.isArray(parsed.m)) {
      return { tables: parsed.t, modules: parsed.m };
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
export function getShareableUrl(tables: SchemaTable[], modules: ModuleGroup[]): string {
  if (typeof window === 'undefined') return '';
  const hash = encodeSchemaToUrlHash(tables, modules);
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
    const shareUrl = getShareableUrl(tables, modules);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

