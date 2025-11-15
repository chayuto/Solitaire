import { describe, it, expect } from 'vitest';
import {
  SUITS,
  RANKS,
  RANK_VALUES,
  isRed,
  isRedCard,
  isBlack,
  isBlackCard,
  getColor,
  getCardColor,
  getRankValue,
  compareRanks,
  createCard,
  flipCard,
  areOppositeColors,
  areSameColor,
} from './card';
import type { Suit, Rank } from '../types';

describe('Card Utilities', () => {
  describe('Constants', () => {
    it('should have all four suits', () => {
      expect(SUITS).toHaveLength(4);
      expect(SUITS).toContain('hearts');
      expect(SUITS).toContain('diamonds');
      expect(SUITS).toContain('clubs');
      expect(SUITS).toContain('spades');
    });

    it('should have all thirteen ranks', () => {
      expect(RANKS).toHaveLength(13);
      expect(RANKS).toContain('A');
      expect(RANKS).toContain('K');
      expect(RANKS).toContain('Q');
      expect(RANKS).toContain('J');
      expect(RANKS).toContain('10');
    });

    it('should have rank values for all ranks', () => {
      expect(RANK_VALUES['A']).toBe(1);
      expect(RANK_VALUES['2']).toBe(2);
      expect(RANK_VALUES['10']).toBe(10);
      expect(RANK_VALUES['J']).toBe(11);
      expect(RANK_VALUES['Q']).toBe(12);
      expect(RANK_VALUES['K']).toBe(13);
    });
  });

  describe('isRed', () => {
    it('should return true for hearts', () => {
      expect(isRed('hearts')).toBe(true);
    });

    it('should return true for diamonds', () => {
      expect(isRed('diamonds')).toBe(true);
    });

    it('should return false for clubs', () => {
      expect(isRed('clubs')).toBe(false);
    });

    it('should return false for spades', () => {
      expect(isRed('spades')).toBe(false);
    });
  });

  describe('isRedCard', () => {
    it('should return true for hearts card', () => {
      const card = createCard('hearts', 'A');
      expect(isRedCard(card)).toBe(true);
    });

    it('should return true for diamonds card', () => {
      const card = createCard('diamonds', 'K');
      expect(isRedCard(card)).toBe(true);
    });

    it('should return false for clubs card', () => {
      const card = createCard('clubs', 'Q');
      expect(isRedCard(card)).toBe(false);
    });

    it('should return false for spades card', () => {
      const card = createCard('spades', 'J');
      expect(isRedCard(card)).toBe(false);
    });
  });

  describe('isBlack', () => {
    it('should return true for clubs', () => {
      expect(isBlack('clubs')).toBe(true);
    });

    it('should return true for spades', () => {
      expect(isBlack('spades')).toBe(true);
    });

    it('should return false for hearts', () => {
      expect(isBlack('hearts')).toBe(false);
    });

    it('should return false for diamonds', () => {
      expect(isBlack('diamonds')).toBe(false);
    });
  });

  describe('isBlackCard', () => {
    it('should return true for clubs card', () => {
      const card = createCard('clubs', 'A');
      expect(isBlackCard(card)).toBe(true);
    });

    it('should return true for spades card', () => {
      const card = createCard('spades', 'K');
      expect(isBlackCard(card)).toBe(true);
    });

    it('should return false for hearts card', () => {
      const card = createCard('hearts', 'Q');
      expect(isBlackCard(card)).toBe(false);
    });

    it('should return false for diamonds card', () => {
      const card = createCard('diamonds', 'J');
      expect(isBlackCard(card)).toBe(false);
    });
  });

  describe('getColor', () => {
    it('should return red for hearts', () => {
      expect(getColor('hearts')).toBe('red');
    });

    it('should return red for diamonds', () => {
      expect(getColor('diamonds')).toBe('red');
    });

    it('should return black for clubs', () => {
      expect(getColor('clubs')).toBe('black');
    });

    it('should return black for spades', () => {
      expect(getColor('spades')).toBe('black');
    });
  });

  describe('getCardColor', () => {
    it('should return the correct color for each suit', () => {
      expect(getCardColor(createCard('hearts', 'A'))).toBe('red');
      expect(getCardColor(createCard('diamonds', 'K'))).toBe('red');
      expect(getCardColor(createCard('clubs', 'Q'))).toBe('black');
      expect(getCardColor(createCard('spades', 'J'))).toBe('black');
    });
  });

  describe('getRankValue', () => {
    it('should return 1 for Ace', () => {
      expect(getRankValue('A')).toBe(1);
    });

    it('should return face value for number cards', () => {
      expect(getRankValue('2')).toBe(2);
      expect(getRankValue('3')).toBe(3);
      expect(getRankValue('5')).toBe(5);
      expect(getRankValue('10')).toBe(10);
    });

    it('should return 11 for Jack', () => {
      expect(getRankValue('J')).toBe(11);
    });

    it('should return 12 for Queen', () => {
      expect(getRankValue('Q')).toBe(12);
    });

    it('should return 13 for King', () => {
      expect(getRankValue('K')).toBe(13);
    });
  });

  describe('compareRanks', () => {
    it('should return 0 for equal ranks', () => {
      expect(compareRanks('A', 'A')).toBe(0);
      expect(compareRanks('K', 'K')).toBe(0);
      expect(compareRanks('5', '5')).toBe(0);
    });

    it('should return negative when first rank is lower', () => {
      expect(compareRanks('A', 'K')).toBeLessThan(0);
      expect(compareRanks('2', '10')).toBeLessThan(0);
      expect(compareRanks('J', 'Q')).toBeLessThan(0);
    });

    it('should return positive when first rank is higher', () => {
      expect(compareRanks('K', 'A')).toBeGreaterThan(0);
      expect(compareRanks('10', '2')).toBeGreaterThan(0);
      expect(compareRanks('Q', 'J')).toBeGreaterThan(0);
    });

    it('should correctly order all ranks', () => {
      const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      
      for (let i = 0; i < ranks.length - 1; i++) {
        expect(compareRanks(ranks[i], ranks[i + 1])).toBeLessThan(0);
      }
    });
  });

  describe('createCard', () => {
    it('should create a card with the given suit and rank', () => {
      const card = createCard('hearts', 'A');
      expect(card.suit).toBe('hearts');
      expect(card.rank).toBe('A');
    });

    it('should create a face-down card by default', () => {
      const card = createCard('hearts', 'A');
      expect(card.faceUp).toBe(false);
    });

    it('should create a face-up card when specified', () => {
      const card = createCard('hearts', 'A', true);
      expect(card.faceUp).toBe(true);
    });

    it('should generate correct ID', () => {
      const card = createCard('hearts', 'A');
      expect(card.id).toBe('hearts-A');
    });

    it('should create unique IDs for different cards', () => {
      const card1 = createCard('hearts', 'A');
      const card2 = createCard('hearts', 'K');
      const card3 = createCard('spades', 'A');
      
      expect(card1.id).not.toBe(card2.id);
      expect(card1.id).not.toBe(card3.id);
      expect(card2.id).not.toBe(card3.id);
    });

    it('should create all 52 unique cards', () => {
      const cards = [];
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          cards.push(createCard(suit, rank));
        }
      }
      
      expect(cards).toHaveLength(52);
      
      // Check all IDs are unique
      const ids = new Set(cards.map(c => c.id));
      expect(ids.size).toBe(52);
    });
  });

  describe('flipCard', () => {
    it('should flip a face-down card to face-up', () => {
      const card = createCard('hearts', 'A', false);
      const flipped = flipCard(card);
      
      expect(flipped.faceUp).toBe(true);
      expect(flipped.suit).toBe(card.suit);
      expect(flipped.rank).toBe(card.rank);
      expect(flipped.id).toBe(card.id);
    });

    it('should flip a face-up card to face-down', () => {
      const card = createCard('hearts', 'A', true);
      const flipped = flipCard(card);
      
      expect(flipped.faceUp).toBe(false);
      expect(flipped.suit).toBe(card.suit);
      expect(flipped.rank).toBe(card.rank);
      expect(flipped.id).toBe(card.id);
    });

    it('should not modify the original card (immutability)', () => {
      const card = createCard('hearts', 'A', false);
      const flipped = flipCard(card);
      
      expect(card.faceUp).toBe(false);
      expect(flipped.faceUp).toBe(true);
    });

    it('should be reversible', () => {
      const card = createCard('hearts', 'A', false);
      const flipped = flipCard(card);
      const flippedBack = flipCard(flipped);
      
      expect(flippedBack.faceUp).toBe(card.faceUp);
    });
  });

  describe('areOppositeColors', () => {
    it('should return true for red and black cards', () => {
      const redCard = createCard('hearts', 'A');
      const blackCard = createCard('clubs', 'K');
      
      expect(areOppositeColors(redCard, blackCard)).toBe(true);
      expect(areOppositeColors(blackCard, redCard)).toBe(true);
    });

    it('should return false for two red cards', () => {
      const card1 = createCard('hearts', 'A');
      const card2 = createCard('diamonds', 'K');
      
      expect(areOppositeColors(card1, card2)).toBe(false);
    });

    it('should return false for two black cards', () => {
      const card1 = createCard('clubs', 'A');
      const card2 = createCard('spades', 'K');
      
      expect(areOppositeColors(card1, card2)).toBe(false);
    });
  });

  describe('areSameColor', () => {
    it('should return true for two red cards', () => {
      const card1 = createCard('hearts', 'A');
      const card2 = createCard('diamonds', 'K');
      
      expect(areSameColor(card1, card2)).toBe(true);
    });

    it('should return true for two black cards', () => {
      const card1 = createCard('clubs', 'A');
      const card2 = createCard('spades', 'K');
      
      expect(areSameColor(card1, card2)).toBe(true);
    });

    it('should return false for red and black cards', () => {
      const redCard = createCard('hearts', 'A');
      const blackCard = createCard('clubs', 'K');
      
      expect(areSameColor(redCard, blackCard)).toBe(false);
      expect(areSameColor(blackCard, redCard)).toBe(false);
    });
  });
});
