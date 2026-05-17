/**
 * Tests for lenient JSON extraction from free-form model output.
 */

import { describe, it, expect } from 'vitest';
import { extractFirstJsonObject, parseLooseJsonObject } from './jsonExtract';

describe('extractFirstJsonObject', () => {
  it('extracts a plain object', () => {
    expect(extractFirstJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it('extracts an object embedded in prose', () => {
    const text = 'Here is my answer: {"moveIndex": 2, "confidence": 0.9} — done.';
    expect(extractFirstJsonObject(text)).toBe('{"moveIndex": 2, "confidence": 0.9}');
  });

  it('handles nested objects', () => {
    const text = 'noise {"a": {"b": 1}, "c": 2} trailing';
    expect(extractFirstJsonObject(text)).toBe('{"a": {"b": 1}, "c": 2}');
  });

  it('ignores braces inside string literals', () => {
    const text = '{"reasoning": "use the } brace { trick"}';
    expect(extractFirstJsonObject(text)).toBe(text);
  });

  it('ignores escaped quotes inside strings', () => {
    const text = '{"reasoning": "she said \\"hi\\" }"}';
    expect(extractFirstJsonObject(text)).toBe(text);
  });

  it('returns null when there is no object', () => {
    expect(extractFirstJsonObject('no json here')).toBeNull();
  });

  it('returns null for an unbalanced object', () => {
    expect(extractFirstJsonObject('{"a": 1')).toBeNull();
  });
});

describe('parseLooseJsonObject', () => {
  it('parses plain JSON', () => {
    expect(parseLooseJsonObject('{"x":1}')).toEqual({ x: 1 });
  });

  it('parses JSON wrapped in a markdown fence', () => {
    expect(parseLooseJsonObject('```json\n{"x":1}\n```')).toEqual({ x: 1 });
  });

  it('parses JSON wrapped in a bare fence', () => {
    expect(parseLooseJsonObject('```\n{"x":2}\n```')).toEqual({ x: 2 });
  });

  it('parses JSON embedded after reasoning prose', () => {
    const text = 'I think move 1 is best.\n\n{"moveIndex": 1, "confidence": 0.8}';
    expect(parseLooseJsonObject(text)).toEqual({ moveIndex: 1, confidence: 0.8 });
  });

  it('returns null for unparseable input', () => {
    expect(parseLooseJsonObject('completely not json')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseLooseJsonObject('')).toBeNull();
  });
});
