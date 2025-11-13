import type { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
}

const suitSymbols: Record<CardType['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<CardType['suit'], string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

export default function Card({ card }: CardProps) {
  const { suit, rank, faceUp } = card;
  
  if (!faceUp) {
    return (
      <div className="w-20 h-28 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-900 shadow-md flex items-center justify-center">
        <div className="text-white text-2xl font-bold opacity-30">🂠</div>
      </div>
    );
  }

  const suitColor = suitColors[suit];
  const suitSymbol = suitSymbols[suit];

  return (
    <div className="w-20 h-28 bg-white rounded-lg border-2 border-gray-300 shadow-md p-2 flex flex-col">
      <div className={`flex items-center justify-between ${suitColor}`}>
        <div className="font-bold text-lg">{rank}</div>
        <div className="text-xl">{suitSymbol}</div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className={`text-4xl ${suitColor}`}>{suitSymbol}</div>
      </div>
      <div className={`flex items-center justify-between ${suitColor} transform rotate-180`}>
        <div className="font-bold text-lg">{rank}</div>
        <div className="text-xl">{suitSymbol}</div>
      </div>
    </div>
  );
}
