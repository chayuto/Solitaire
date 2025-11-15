/**
 * Tests for foundation rules
 */

import { describe, it, expect } from 'vitest';
import { canMoveToFoundation, getNextFoundationRank, hasValidFoundationDestination } from './foundation';
import { createCard } from '../utils/card';
import type { Card, Foundations } from '../types';

describe('canMoveToFoundation', () => {
  it('allows Ace to empty foundation', () => {
    const ace = createCard('hearts', 'A', true);
    const emptyFoundation: Card[] = [];
    
    expect(canMoveToFoundation(ace, emptyFoundation)).toBe(true);
  });

  it('disallows non-Ace to empty foundation', () => {
    const two = createCard('hearts', '2', true);
    const emptyFoundation: Card[] = [];
    
    expect(canMoveToFoundation(two, emptyFoundation)).toBe(false);
  });

  it('allows same suit sequential rank', () => {
    const ace = createCard('hearts', 'A', true);
    const two = createCard('hearts', '2', true);
    
    expect(canMoveToFoundation(two, [ace])).toBe(true);
  });

  it('disallows wrong suit', () => {
    const ace = createCard('hearts', 'A', true);
    const two = createCard('diamonds', '2', true);
    
    expect(canMoveToFoundation(two, [ace])).toBe(false);
  });

  it('disallows non-sequential rank', () => {
    const ace = createCard('hearts', 'A', true);
    const three = createCard('hearts', '3', true);
    
    expect(canMoveToFoundation(three, [ace])).toBe(false);
  });

  it('allows complete sequence up to King', () => {
    const foundation = [
      createCard('spades', 'A', true),
      createCard('spades', '2', true),
      createCard('spades', '3', true),
      createCard('spades', '4', true),
      createCard('spades', '5', true),
      createCard('spades', '6', true),
      createCard('spades', '7', true),
      createCard('spades', '8', true),
      createCard('spades', '9', true),
      createCard('spades', '10', true),
      createCard('spades', 'J', true),
      createCard('spades', 'Q', true),
    ];
    const king = createCard('spades', 'K', true);
    
    expect(canMoveToFoundation(king, foundation)).toBe(true);
  });
});

describe('getNextFoundationRank', () => {
  it('returns Ace for empty foundation', () => {
    const emptyFoundation: Card[] = [];
    
    expect(getNextFoundationRank(emptyFoundation)).toBe('A');
  });

  it('returns 2 after Ace', () => {
    const foundation = [createCard('hearts', 'A', true)];
    
    expect(getNextFoundationRank(foundation)).toBe('2');
  });

  it('returns 10 after 9', () => {
    const foundation = [
      createCard('hearts', 'A', true),
      createCard('hearts', '2', true),
      createCard('hearts', '3', true),
      createCard('hearts', '4', true),
      createCard('hearts', '5', true),
      createCard('hearts', '6', true),
      createCard('hearts', '7', true),
      createCard('hearts', '8', true),
      createCard('hearts', '9', true),
    ];
    
    expect(getNextFoundationRank(foundation)).toBe('10');
  });

  it('returns J after 10', () => {
    const foundation = [
      createCard('hearts', 'A', true),
      createCard('hearts', '2', true),
      createCard('hearts', '3', true),
      createCard('hearts', '4', true),
      createCard('hearts', '5', true),
      createCard('hearts', '6', true),
      createCard('hearts', '7', true),
      createCard('hearts', '8', true),
      createCard('hearts', '9', true),
      createCard('hearts', '10', true),
    ];
    
    expect(getNextFoundationRank(foundation)).toBe('J');
  });

  it('returns null for complete foundation (has King)', () => {
    const foundation = [
      createCard('hearts', 'A', true),
      createCard('hearts', '2', true),
      createCard('hearts', '3', true),
      createCard('hearts', '4', true),
      createCard('hearts', '5', true),
      createCard('hearts', '6', true),
      createCard('hearts', '7', true),
      createCard('hearts', '8', true),
      createCard('hearts', '9', true),
      createCard('hearts', '10', true),
      createCard('hearts', 'J', true),
      createCard('hearts', 'Q', true),
      createCard('hearts', 'K', true),
    ];
    
    expect(getNextFoundationRank(foundation)).toBeNull();
  });
});

describe('hasValidFoundationDestination', () => {
  it('returns true for Ace when foundation is empty', () => {
    const ace = createCard('hearts', 'A', true);
    const foundations: Foundations = {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    };
    
    expect(hasValidFoundationDestination(ace, foundations)).toBe(true);
  });

  it('returns true for sequential card', () => {
    const two = createCard('hearts', '2', true);
    const foundations: Foundations = {
      hearts: [createCard('hearts', 'A', true)],
      diamonds: [],
      clubs: [],
      spades: [],
    };
    
    expect(hasValidFoundationDestination(two, foundations)).toBe(true);
  });

  it('returns false when card cannot be placed', () => {
    const three = createCard('hearts', '3', true);
    const foundations: Foundations = {
      hearts: [createCard('hearts', 'A', true)],
      diamonds: [],
      clubs: [],
      spades: [],
    };
    
    expect(hasValidFoundationDestination(three, foundations)).toBe(false);
  });

  it('returns false for non-Ace on empty foundation', () => {
    const two = createCard('hearts', '2', true);
    const foundations: Foundations = {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    };
    
    expect(hasValidFoundationDestination(two, foundations)).toBe(false);
  });
});
