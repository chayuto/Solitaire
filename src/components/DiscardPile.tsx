import type { Card as CardType } from '../types';
import Card from './Card';

interface DiscardPileProps {
  cards: CardType[];
}

export default function DiscardPile({ cards }: DiscardPileProps) {
  return (
    <div className="w-20 h-28">
      {cards.length > 0 ? (
        <div className="relative">
          <Card card={cards[cards.length - 1]} />
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 text-sm">Waste</span>
        </div>
      )}
    </div>
  );
}
