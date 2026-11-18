import { describe, expect, it } from 'vitest';
import { sanitizeIdentifier, sanitizeIdentifierWhileTyping } from '../identifiers';

describe('sanitizeIdentifier', () => {
  it('lowercases and replaces unsafe characters with underscores', () => {
    expect(sanitizeIdentifier('User Name')).toBe('user_name');
    expect(sanitizeIdentifier('order-items!')).toBe('order_items');
  });

  it('removes underscores at the start and end', () => {
    expect(sanitizeIdentifier('__id__')).toBe('id');
  });

  it('returns an empty string when nothing usable is left', () => {
    expect(sanitizeIdentifier('  ')).toBe('');
  });
});

describe('sanitizeIdentifierWhileTyping', () => {
  it('keeps a trailing underscore so "user_id" can be typed one key at a time', () => {
    let typed = '';
    for (const key of 'user_id') typed = sanitizeIdentifierWhileTyping(typed + key);
    expect(typed).toBe('user_id');
  });

  it('still replaces unsafe characters', () => {
    expect(sanitizeIdentifierWhileTyping('A b')).toBe('a_b');
  });
});
