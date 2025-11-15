import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffle,
  shuffleDeck,
  partialShuffle,
  arrangeDeckByDifficulty,
} from './deck';
import { SUITS, RANKS } from './card';
import type { Difficulty } from '../types';

describe('Deck Utilities', () => {
  describe('createDeck', () => {
    it('should create a deck with 52 cards', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);
    });

    it('should create all cards face down by default', () => {
      const deck = createDeck();
      expect(deck.every(card => !card.faceUp)).toBe(true);
    });

    it('should create all cards face up when specified', () => {
      const deck = createDeck(true);
      expect(deck.every(card => card.faceUp)).toBe(true);
    });

    it('should contain all suits', () => {
      const deck = createDeck();
      for (const suit of SUITS) {
        const suitCards = deck.filter(card => card.suit === suit);
        expect(suitCards).toHaveLength(13);
      }
    });

    it('should contain all ranks', () => {
      const deck = createDeck();
      for (const rank of RANKS) {
        const rankCards = deck.filter(card => card.rank === rank);
        expect(rankCards).toHaveLength(4);
      }
    });

    it('should create unique card IDs', () => {
      const deck = createDeck();
      const ids = deck.map(card => card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(52);
    });

    it('should create cards in standard order', () => {
      const deck = createDeck();
      
      // First card should be hearts-A
      expect(deck[0].suit).toBe('hearts');
      expect(deck[0].rank).toBe('A');
      
      // 13th card should be hearts-K
      expect(deck[12].suit).toBe('hearts');
      expect(deck[12].rank).toBe('K');
      
      // 14th card should be diamonds-A
      expect(deck[13].suit).toBe('diamonds');
      expect(deck[13].rank).toBe('A');
      
      // Last card should be spades-K
      expect(deck[51].suit).toBe('spades');
      expect(deck[51].rank).toBe('K');
    });
  });

  describe('shuffle', () => {
    it('should return an array of the same length', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = shuffle(array);
      expect(shuffled).toHaveLength(array.length);
    });

    it('should contain all original elements', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = shuffle(array);
      
      for (const element of array) {
        expect(shuffled).toContain(element);
      }
    });

    it('should not modify the original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      shuffle(array);
      expect(array).toEqual(original);
    });

    it('should produce different results without seed', () => {
      const array = Array.from({ length: 20 }, (_, i) => i);
      const shuffle1 = shuffle(array);
      const shuffle2 = shuffle(array);
      
      // It's extremely unlikely (but possible) that two shuffles are identical
      // We check that at least some elements are in different positions
      let differences = 0;
      for (let i = 0; i < array.length; i++) {
        if (shuffle1[i] !== shuffle2[i]) {
          differences++;
        }
      }
      expect(differences).toBeGreaterThan(0);
    });

    it('should produce identical results with same seed', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const seed = 12345;
      
      const shuffle1 = shuffle(array, seed);
      const shuffle2 = shuffle(array, seed);
      
      expect(shuffle1).toEqual(shuffle2);
    });

    it('should produce different results with different seeds', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const shuffle1 = shuffle(array, 12345);
      const shuffle2 = shuffle(array, 67890);
      
      expect(shuffle1).not.toEqual(shuffle2);
    });

    it('should shuffle a deck thoroughly', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck, 42);
      
      // Check that the order changed
      let samePositions = 0;
      for (let i = 0; i < deck.length; i++) {
        if (deck[i].id === shuffled[i].id) {
          samePositions++;
        }
      }
      
      // Expect most cards to be in different positions
      expect(samePositions).toBeLessThan(10);
    });
  });

  describe('shuffleDeck', () => {
    it('should shuffle a deck of cards', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck, 42);
      
      expect(shuffled).toHaveLength(52);
      expect(shuffled).not.toEqual(deck);
    });

    it('should preserve all cards', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck, 42);
      
      const deckIds = deck.map(c => c.id).sort();
      const shuffledIds = shuffled.map(c => c.id).sort();
      
      expect(shuffledIds).toEqual(deckIds);
    });

    it('should be reproducible with seed', () => {
      const deck = createDeck();
      const seed = 99999;
      
      const shuffle1 = shuffleDeck(deck, seed);
      const shuffle2 = shuffleDeck(deck, seed);
      
      expect(shuffle1.map(c => c.id)).toEqual(shuffle2.map(c => c.id));
    });
  });

  describe('partialShuffle', () => {
    it('should return an array of the same length', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = partialShuffle(array, 50);
      expect(shuffled).toHaveLength(array.length);
    });

    it('should contain all original elements', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = partialShuffle(array, 50);
      
      for (const element of array) {
        expect(shuffled).toContain(element);
      }
    });

    it('should not modify the original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      partialShuffle(array, 50);
      expect(array).toEqual(original);
    });

    it('should not change array with 0% shuffle', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = partialShuffle(array, 0, 42);
      expect(shuffled).toEqual(array);
    });

    it('should change array more with higher shuffle percentage', () => {
      const array = Array.from({ length: 50 }, (_, i) => i);
      const seed = 12345;
      
      const shuffle10 = partialShuffle(array, 10, seed);
      const shuffle50 = partialShuffle(array, 50, seed + 1);
      
      // Count how many elements are in different positions
      const changes10 = array.filter((val, idx) => val !== shuffle10[idx]).length;
      const changes50 = array.filter((val, idx) => val !== shuffle50[idx]).length;
      
      // Higher shuffle percentage should generally result in more changes
      // (though not guaranteed for any single shuffle)
      expect(changes50).toBeGreaterThan(changes10);
    });

    it('should be reproducible with seed', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const seed = 42;
      
      const shuffle1 = partialShuffle(array, 50, seed);
      const shuffle2 = partialShuffle(array, 50, seed);
      
      expect(shuffle1).toEqual(shuffle2);
    });
  });

  describe('arrangeDeckByDifficulty', () => {
    it('should create a deck for each difficulty level', () => {
      const difficulties: Difficulty[] = [1, 2, 3, 4, 5];
      
      for (const difficulty of difficulties) {
        const deck = arrangeDeckByDifficulty(difficulty);
        expect(deck).toHaveLength(52);
      }
    });

    it('should preserve all cards regardless of difficulty', () => {
      const difficulties: Difficulty[] = [1, 2, 3, 4, 5];
      
      for (const difficulty of difficulties) {
        const deck = arrangeDeckByDifficulty(difficulty, 42);
        const ids = deck.map(c => c.id).sort();
        const expectedIds = createDeck().map(c => c.id).sort();
        expect(ids).toEqual(expectedIds);
      }
    });

    it('should be reproducible with seed', () => {
      const seed = 54321;
      
      const deck1 = arrangeDeckByDifficulty(3, seed);
      const deck2 = arrangeDeckByDifficulty(3, seed);
      
      expect(deck1.map(c => c.id)).toEqual(deck2.map(c => c.id));
    });

    it('should produce different arrangements with different seeds', () => {
      const deck1 = arrangeDeckByDifficulty(3, 123);
      const deck2 = arrangeDeckByDifficulty(3, 456);
      
      expect(deck1.map(c => c.id)).not.toEqual(deck2.map(c => c.id));
    });

    it('should produce different arrangements for different difficulties', () => {
      const seed = 999;
      
      const easy = arrangeDeckByDifficulty(1, seed);
      const normal = arrangeDeckByDifficulty(3, seed);
      const hard = arrangeDeckByDifficulty(5, seed);
      
      // Different difficulties should produce different arrangements
      expect(easy.map(c => c.id)).not.toEqual(normal.map(c => c.id));
      expect(normal.map(c => c.id)).not.toEqual(hard.map(c => c.id));
    });

    it('should keep more cards in order for very easy difficulty', () => {
      const original = createDeck();
      const veryEasy = arrangeDeckByDifficulty(1, 42);
      
      let samePositions = 0;
      for (let i = 0; i < original.length; i++) {
        if (original[i].id === veryEasy[i].id) {
          samePositions++;
        }
      }
      
      // Very easy should have many cards in original positions
      expect(samePositions).toBeGreaterThan(30);
    });

    it('should thoroughly shuffle for normal difficulty', () => {
      const original = createDeck();
      const normal = arrangeDeckByDifficulty(3, 42);
      
      let samePositions = 0;
      for (let i = 0; i < original.length; i++) {
        if (original[i].id === normal[i].id) {
          samePositions++;
        }
      }
      
      // Normal difficulty should have very few cards in original positions
      expect(samePositions).toBeLessThan(10);
    });

    it('should create valid decks for all difficulty levels', () => {
      const difficulties: Difficulty[] = [1, 2, 3, 4, 5];
      
      for (const difficulty of difficulties) {
        const deck = arrangeDeckByDifficulty(difficulty, 123);
        
        // Check all 52 cards are present
        expect(deck).toHaveLength(52);
        
        // Check all cards are unique
        const ids = new Set(deck.map(c => c.id));
        expect(ids.size).toBe(52);
        
        // Check all suits are present
        for (const suit of SUITS) {
          const suitCards = deck.filter(c => c.suit === suit);
          expect(suitCards).toHaveLength(13);
        }
        
        // Check all ranks are present
        for (const rank of RANKS) {
          const rankCards = deck.filter(c => c.rank === rank);
          expect(rankCards).toHaveLength(4);
        }
      }
    });
  });
});
