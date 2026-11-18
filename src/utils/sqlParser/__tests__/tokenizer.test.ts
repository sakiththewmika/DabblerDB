import { describe, expect, it } from 'vitest';
import { tokenize } from '../tokenizer';

const kinds = (sql: string) => tokenize(sql).map((t) => `${t.type}:${t.value}`);

describe('tokenize', () => {
  it('splits words, symbols and numbers', () => {
    expect(kinds('id int, n numeric(10,2)')).toEqual([
      'word:id', 'word:int', 'symbol:,', 'word:n', 'word:numeric', 'symbol:(', 'number:10', 'symbol:,', 'number:2', 'symbol:)',
    ]);
  });

  it('removes quotes from quoted names and keeps spaces inside them', () => {
    expect(kinds('"my table" `col` [name]')).toEqual(['quoted:my table', 'quoted:col', 'quoted:name']);
  });

  it('understands doubled quotes as one quote', () => {
    expect(kinds(`'it''s' "say ""hi"""`)).toEqual(["string:it's", 'quoted:say "hi"']);
  });

  it('keeps ; , -- and /* inside strings', () => {
    expect(kinds(`'a;b, -- c /* d */'`)).toEqual(['string:a;b, -- c /* d */']);
  });

  it('drops line and block comments', () => {
    expect(kinds('a -- note\nb /* x\ny */ c')).toEqual(['word:a', 'word:b', 'word:c']);
  });

  it('reads E-strings with backslash escapes and other prefixes', () => {
    expect(kinds(`E'it\\'s' N'x' X'ff'`)).toEqual(["string:it's", 'string:x', 'string:ff']);
  });

  it('reads $$ blocks as one string', () => {
    expect(kinds('$$ BEGIN RETURN 1; END; $$ ;')).toEqual(['string: BEGIN RETURN 1; END; ', 'symbol:;']);
    expect(kinds('$body$ a; $body$')).toEqual(['string: a; ']);
  });

  it('treats :: as one symbol', () => {
    expect(kinds("'x'::text")).toEqual(['string:x', 'symbol:::', 'word:text']);
  });

  it('does not mistake int[] for a quoted name', () => {
    expect(kinds('int[]')).toEqual(['word:int', 'symbol:[', 'symbol:]']);
    expect(kinds('int[3]')).toEqual(['word:int', 'symbol:[', 'number:3', 'symbol:]']);
  });

  it('tracks line numbers, including lines inside comments and strings', () => {
    const tokens = tokenize("a\n/* x\ny */ b\n'p\nq' c");
    expect(tokens.map((t) => [t.value, t.line])).toEqual([['a', 1], ['b', 3], ['p\nq', 4], ['c', 5]]);
  });

  it('does not crash on unterminated quotes or comments', () => {
    expect(() => tokenize(`'abc`)).not.toThrow();
    expect(() => tokenize('/* never closed')).not.toThrow();
    expect(() => tokenize('"abc')).not.toThrow();
  });
});
