/**
 * Tests for core game constants
 */

import { describe, it, expect } from 'vitest';
import {
  DECK_SIZE,
  TABLEAU_COLUMNS,
  CARDS_PER_SUIT,
  NUM_SUITS,
  TABLEAU_INITIAL_CARDS,
} from './constants';

describe('Game Constants', () => {
  it('DECK_SIZE should be 52', () => {
    expect(DECK_SIZE).toBe(52);
  });

  it('DECK_SIZE should equal NUM_SUITS × CARDS_PER_SUIT', () => {
    expect(DECK_SIZE).toBe(NUM_SUITS * CARDS_PER_SUIT);
  });

  it('TABLEAU_COLUMNS should be 7', () => {
    expect(TABLEAU_COLUMNS).toBe(7);
  });

  it('CARDS_PER_SUIT should be 13', () => {
    expect(CARDS_PER_SUIT).toBe(13);
  });

  it('NUM_SUITS should be 4', () => {
    expect(NUM_SUITS).toBe(4);
  });

  it('TABLEAU_INITIAL_CARDS should be 28 (sum of 1..7)', () => {
    expect(TABLEAU_INITIAL_CARDS).toBe(28);
  });

  it('TABLEAU_INITIAL_CARDS should equal sum of 1 to TABLEAU_COLUMNS', () => {
    const expectedSum = (TABLEAU_COLUMNS * (TABLEAU_COLUMNS + 1)) / 2;
    expect(TABLEAU_INITIAL_CARDS).toBe(expectedSum);
  });
});
