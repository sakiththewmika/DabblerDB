/**
 * Cleans a name so it is safe as a SQL table or column name:
 * lowercase letters, digits and underscores only.
 *
 * Use this when the user FINISHES editing (Enter or leaving the field).
 * It also removes underscores at the start and end.
 */
export function sanitizeIdentifier(value: string): string {
  return sanitizeIdentifierWhileTyping(value).replace(/^_+|_+$/g, '');
}

/**
 * Same as sanitizeIdentifier but keeps underscores at the start and end.
 * Use this on every keystroke, otherwise typing "user_" would instantly
 * turn into "user" and the user could never type "user_id".
 */
export function sanitizeIdentifierWhileTyping(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
