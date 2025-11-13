import type { Card as CardType, Suit } from '../types';
import Card from './Card';

interface FoundationPileProps {
  cards: CardType[];
  suit?: Suit;
}

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export default function FoundationPile({ cards, suit }: FoundationPileProps) {
  return (
    <div className="w-20 h-28">
      {cards.length > 0 ? (
        <div className="relative">
          <Card card={cards[cards.length - 1]} />
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center bg-gray-50">
          {suit && (
            <span className="text-gray-300 text-4xl">{suitSymbols[suit]}</span>
          )}
        </div>
      )}
    </div>
  );
}
