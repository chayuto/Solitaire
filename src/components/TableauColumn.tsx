import type { Card as CardType } from '../types';
import Card from './Card';

interface TableauColumnProps {
  cards: CardType[];
  columnIndex: number;
}

export default function TableauColumn({ cards }: TableauColumnProps) {
  return (
    <div className="flex flex-col min-h-32">
      {cards.length > 0 ? (
        <div className="relative">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="absolute"
              style={{ top: `${index * 24}px` }}
            >
              <Card card={card} />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg" />
      )}
    </div>
  );
}
