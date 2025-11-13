import type { Card as CardType } from '../types';
import Card from './Card';

interface DrawPileProps {
  cards: CardType[];
}

export default function DrawPile({ cards }: DrawPileProps) {
  return (
    <div className="w-20 h-28">
      {cards.length > 0 ? (
        <div className="relative">
          <Card card={cards[cards.length - 1]} />
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 text-sm">Stock</span>
        </div>
      )}
    </div>
  );
}
