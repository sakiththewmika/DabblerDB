/**
 * Creates a unique id such as "tbl_3f9a1c2e".
 * Two ids created in the same millisecond never collide (unlike Date.now()).
 */
export function createId(prefix: 'tbl' | 'col' | 'mod'): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${random}`;
}
