import { describe, it, expect } from 'vitest';
import { parseGameConfig } from './urlConfig';
import { DEFAULT_DIFFICULTY } from '../constants';

describe('parseGameConfig', () => {
  it('returns defaults for an empty search string', () => {
    expect(parseGameConfig('')).toEqual({ difficulty: DEFAULT_DIFFICULTY });
  });

  it('parses a numeric seed', () => {
    expect(parseGameConfig('?seed=42')).toEqual({
      difficulty: DEFAULT_DIFFICULTY,
      seed: 42,
    });
  });

  it('truncates a fractional seed to an integer', () => {
    expect(parseGameConfig('?seed=42.9').seed).toBe(42);
  });

  it('ignores a non-numeric seed', () => {
    expect(parseGameConfig('?seed=abc').seed).toBeUndefined();
  });

  it('ignores an empty seed parameter', () => {
    expect(parseGameConfig('?seed=').seed).toBeUndefined();
  });

  it('parses a valid difficulty', () => {
    expect(parseGameConfig('?difficulty=1').difficulty).toBe(1);
    expect(parseGameConfig('?difficulty=5').difficulty).toBe(5);
  });

  it('rejects an out-of-range difficulty', () => {
    expect(parseGameConfig('?difficulty=0').difficulty).toBe(DEFAULT_DIFFICULTY);
    expect(parseGameConfig('?difficulty=6').difficulty).toBe(DEFAULT_DIFFICULTY);
    expect(parseGameConfig('?difficulty=abc').difficulty).toBe(DEFAULT_DIFFICULTY);
  });

  it('parses seed and difficulty together', () => {
    expect(parseGameConfig('?seed=1337&difficulty=2')).toEqual({
      seed: 1337,
      difficulty: 2,
    });
  });

  it('accepts a negative seed', () => {
    expect(parseGameConfig('?seed=-7').seed).toBe(-7);
  });
});
