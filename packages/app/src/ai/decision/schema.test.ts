/**
 * Tests for AI decision validation.
 */

import { describe, it, expect } from 'vitest';
import { parseDecision, validateDecision } from './schema';
import { AIError } from '../types';

describe('validateDecision', () => {
  const LEGAL_COUNT = 5;

  it('accepts a well-formed decision', () => {
    const result = validateDecision(
      { moveIndex: 2, reasoning: 'Best move.', confidence: 0.8 },
      LEGAL_COUNT,
    );
    expect(result).toEqual({
      moveIndex: 2,
      reasoning: 'Best move.',
      confidence: 0.8,
      alternativeMoveIndex: undefined,
    });
  });

  it('rejects a non-object', () => {
    expect(() => validateDecision('nope', LEGAL_COUNT)).toThrow(AIError);
    expect(() => validateDecision(null, LEGAL_COUNT)).toThrow(AIError);
    expect(() => validateDecision([1, 2], LEGAL_COUNT)).toThrow(AIError);
  });

  it('rejects a non-integer moveIndex', () => {
    expect(() =>
      validateDecision({ moveIndex: 1.5, reasoning: 'x', confidence: 1 }, LEGAL_COUNT),
    ).toThrow(/non-integer/);
  });

  it('rejects a moveIndex below range', () => {
    expect(() =>
      validateDecision({ moveIndex: -1, reasoning: 'x', confidence: 1 }, LEGAL_COUNT),
    ).toThrow(/outside the valid range/);
  });

  it('rejects a moveIndex at or above the legal count', () => {
    expect(() =>
      validateDecision({ moveIndex: 5, reasoning: 'x', confidence: 1 }, LEGAL_COUNT),
    ).toThrow(/outside the valid range/);
  });

  it('accepts a string moveIndex that is integral', () => {
    const result = validateDecision(
      { moveIndex: '3', reasoning: 'x', confidence: 0.5 },
      LEGAL_COUNT,
    );
    expect(result.moveIndex).toBe(3);
  });

  it('coerces a missing reasoning to a placeholder', () => {
    const result = validateDecision({ moveIndex: 0, confidence: 0.5 }, LEGAL_COUNT);
    expect(result.reasoning).toBe('No reasoning provided.');
  });

  it('coerces an empty reasoning to a placeholder', () => {
    const result = validateDecision(
      { moveIndex: 0, reasoning: '   ', confidence: 0.5 },
      LEGAL_COUNT,
    );
    expect(result.reasoning).toBe('No reasoning provided.');
  });

  it('clamps confidence into [0, 1]', () => {
    expect(
      validateDecision({ moveIndex: 0, reasoning: 'x', confidence: -3 }, LEGAL_COUNT)
        .confidence,
    ).toBe(0);
  });

  it('rescales a 0-100 confidence to 0-1', () => {
    expect(
      validateDecision({ moveIndex: 0, reasoning: 'x', confidence: 90 }, LEGAL_COUNT)
        .confidence,
    ).toBeCloseTo(0.9);
  });

  it('defaults a missing/NaN confidence to 0.5', () => {
    expect(
      validateDecision({ moveIndex: 0, reasoning: 'x' }, LEGAL_COUNT).confidence,
    ).toBe(0.5);
  });

  it('keeps a valid alternativeMoveIndex', () => {
    const result = validateDecision(
      { moveIndex: 0, reasoning: 'x', confidence: 1, alternativeMoveIndex: 3 },
      LEGAL_COUNT,
    );
    expect(result.alternativeMoveIndex).toBe(3);
  });

  it('drops an out-of-range alternativeMoveIndex', () => {
    const result = validateDecision(
      { moveIndex: 0, reasoning: 'x', confidence: 1, alternativeMoveIndex: 99 },
      LEGAL_COUNT,
    );
    expect(result.alternativeMoveIndex).toBeUndefined();
  });

  it('drops an alternativeMoveIndex equal to moveIndex', () => {
    const result = validateDecision(
      { moveIndex: 2, reasoning: 'x', confidence: 1, alternativeMoveIndex: 2 },
      LEGAL_COUNT,
    );
    expect(result.alternativeMoveIndex).toBeUndefined();
  });
});

describe('parseDecision', () => {
  it('parses a plain JSON response', () => {
    const result = parseDecision('{"moveIndex":1,"reasoning":"go","confidence":0.7}', 3);
    expect(result.moveIndex).toBe(1);
  });

  it('parses a fenced JSON response', () => {
    const result = parseDecision(
      '```json\n{"moveIndex":0,"reasoning":"go","confidence":1}\n```',
      3,
    );
    expect(result.moveIndex).toBe(0);
  });

  it('parses JSON that follows reasoning prose (thinking model output)', () => {
    const text =
      'Let me think... index 2 reveals a card.\n{"moveIndex":2,"reasoning":"reveal","confidence":0.9}';
    expect(parseDecision(text, 5).moveIndex).toBe(2);
  });

  it('throws bad_response for unparseable output', () => {
    try {
      parseDecision('the model rambled and never answered', 3);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AIError);
      expect((err as AIError).kind).toBe('bad_response');
    }
  });
});
