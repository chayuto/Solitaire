import { useGameStore } from '../store/gameStore';
import type { Suit } from '../types';
import Card from './Card';

interface FoundationPileProps {
  suit: Suit;
}

const FoundationPile: React.FC<FoundationPileProps> = ({ suit }) => {
  const foundation = useGameStore((state) => state.foundations[suit]);

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const isRed = suit === 'hearts' || suit === 'diamonds';
  const color = isRed ? 'text-red-300' : 'text-gray-400';

  return (
    <div className="relative w-20 h-28">
      {foundation.length > 0 ? (
        <div className="absolute inset-0">
          <Card card={{ ...foundation[foundation.length - 1], faceUp: true }} />
        </div>
      ) : (
        <div className={`w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center bg-gray-100 ${color}`}>
          <span className="text-5xl">{suitSymbols[suit]}</span>
        </div>
      )}
    </div>
  );
};

export default FoundationPile;
