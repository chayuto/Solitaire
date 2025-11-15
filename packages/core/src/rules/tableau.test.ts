/**
 * Tests for tableau rules
 */

import { describe, it, expect } from 'vitest';
import { canMoveToTableau, canMoveSequence, getValidTableauDestinations } from './tableau';
import { createCard } from '../utils/card';
import type { Card } from '../types';

describe('canMoveToTableau', () => {
  it('allows King to empty column', () => {
    const king = createCard('hearts', 'K', true);
    const emptyColumn: Card[] = [];
    
    expect(canMoveToTableau(king, emptyColumn)).toBe(true);
  });

  it('disallows non-King to empty column', () => {
    const queen = createCard('hearts', 'Q', true);
    const emptyColumn: Card[] = [];
    
    expect(canMoveToTableau(queen, emptyColumn)).toBe(false);
  });

  it('allows opposite color descending rank', () => {
    const redSeven = createCard('hearts', '7', true);
    const blackEight = createCard('clubs', '8', true);
    
    expect(canMoveToTableau(redSeven, [blackEight])).toBe(true);
  });

  it('disallows same color', () => {
    const redSeven = createCard('hearts', '7', true);
    const redEight = createCard('diamonds', '8', true);
    
    expect(canMoveToTableau(redSeven, [redEight])).toBe(false);
  });

  it('disallows non-sequential rank', () => {
    const redSix = createCard('hearts', '6', true);
    const blackEight = createCard('clubs', '8', true);
    
    expect(canMoveToTableau(redSix, [blackEight])).toBe(false);
  });

  it('disallows ascending rank', () => {
    const redNine = createCard('hearts', '9', true);
    const blackEight = createCard('clubs', '8', true);
    
    expect(canMoveToTableau(redNine, [blackEight])).toBe(false);
  });
});

describe('canMoveSequence', () => {
  it('allows valid single card sequence', () => {
    const redSeven = createCard('hearts', '7', true);
    const blackEight = createCard('clubs', '8', true);
    
    expect(canMoveSequence([redSeven], [blackEight])).toBe(true);
  });

  it('allows valid multi-card sequence', () => {
    const redSeven = createCard('hearts', '7', true);
    const blackSix = createCard('clubs', '6', true);
    const redFive = createCard('diamonds', '5', true);
    const blackEight = createCard('spades', '8', true);
    
    expect(canMoveSequence([redSeven, blackSix, redFive], [blackEight])).toBe(true);
  });

  it('disallows empty sequence', () => {
    const blackEight = createCard('clubs', '8', true);
    
    expect(canMoveSequence([], [blackEight])).toBe(false);
  });

  it('disallows sequence with same color cards', () => {
    const redSeven = createCard('hearts', '7', true);
    const redSix = createCard('diamonds', '6', true);
    const blackEight = createCard('clubs', '8', true);
    
    expect(canMoveSequence([redSeven, redSix], [blackEight])).toBe(false);
  });

  it('disallows sequence with non-sequential ranks', () => {
    const redSeven = createCard('hearts', '7', true);
    const blackFive = createCard('clubs', '5', true);
    const blackEight = createCard('spades', '8', true);
    
    expect(canMoveSequence([redSeven, blackFive], [blackEight])).toBe(false);
  });

  it('allows King sequence to empty column', () => {
    const king = createCard('hearts', 'K', true);
    const blackQueen = createCard('clubs', 'Q', true);
    const emptyColumn: Card[] = [];
    
    expect(canMoveSequence([king, blackQueen], emptyColumn)).toBe(true);
  });
});

describe('getValidTableauDestinations', () => {
  it('returns empty array when no valid destinations', () => {
    const redSeven = createCard('hearts', '7', true);
    const tableau: Card[][] = [
      [createCard('clubs', '6', true)], // Wrong rank
      [createCard('diamonds', '8', true)], // Same color
      [createCard('spades', 'K', true)], // Wrong rank
      [],
      [],
      [],
      [],
    ];
    
    expect(getValidTableauDestinations(redSeven, tableau)).toEqual([]);
  });

  it('returns valid destination columns', () => {
    const redSeven = createCard('hearts', '7', true);
    const tableau: Card[][] = [
      [createCard('clubs', '8', true)], // Valid
      [createCard('diamonds', '8', true)], // Same color
      [createCard('spades', '8', true)], // Valid
      [],
      [],
      [],
      [],
    ];
    
    const destinations = getValidTableauDestinations(redSeven, tableau);
    expect(destinations).toEqual([0, 2]);
  });

  it('excludes source column', () => {
    const redSeven = createCard('hearts', '7', true);
    const tableau: Card[][] = [
      [createCard('clubs', '8', true)], // Valid
      [createCard('spades', '8', true), redSeven], // Source column
      [],
      [],
      [],
      [],
      [],
    ];
    
    const destinations = getValidTableauDestinations(redSeven, tableau, 1);
    expect(destinations).toEqual([0]);
  });

  it('finds empty column for King', () => {
    const king = createCard('hearts', 'K', true);
    const tableau: Card[][] = [
      [createCard('clubs', '8', true)],
      [],
      [createCard('spades', '5', true)],
      [],
      [],
      [],
      [],
    ];
    
    const destinations = getValidTableauDestinations(king, tableau);
    expect(destinations).toEqual([1, 3, 4, 5, 6]);
  });
});
