import { useGameStore } from '../store/gameStore';
import type { Suit } from '../types';
import Card from './Card';

interface FoundationPileProps {
  suit: Suit;
}

const FoundationPile: React.FC<FoundationPileProps> = ({ suit }) => {
  const foundation = useGameStore((state) => state.foundations[suit]);
  const selectedCard = useGameStore((state) => state.selectedCard);
  const moveCardToFoundation = useGameStore((state) => state.moveCardToFoundation);
  const canMoveToFoundation = useGameStore((state) => state.canMoveToFoundation);
  const showValidMoves = useGameStore((state) => state.showValidMoves);

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const isRed = suit === 'hearts' || suit === 'diamonds';
  const color = isRed ? 'text-red-300' : 'text-gray-400';

  // Check if this foundation is a valid destination for the selected card
  const isValidDestination = showValidMoves && selectedCard && canMoveToFoundation(selectedCard.card, suit);

  const handleClick = () => {
    if (selectedCard && isValidDestination) {
      moveCardToFoundation(suit);
    }
  };

  return (
    <div className="relative w-20 h-28" onClick={handleClick}>
      {foundation.length > 0 ? (
        <div className="absolute inset-0">
          <Card card={{ ...foundation[foundation.length - 1], faceUp: true }} />
        </div>
      ) : (
        <div className={`w-20 h-28 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-100 transition-all cursor-pointer ${color} ${
          isValidDestination
            ? 'border-cyan-500 bg-cyan-100 ring-4 ring-cyan-400 shadow-lg shadow-cyan-500/50'
            : 'border-gray-400 hover:border-gray-500'
        }`}>
          <span className="text-5xl">{suitSymbols[suit]}</span>
        </div>
      )}
      {/* Overlay for valid destination on non-empty foundation */}
      {foundation.length > 0 && isValidDestination && (
        <div className="absolute inset-0 ring-4 ring-cyan-400 rounded-lg bg-cyan-200 bg-opacity-40 cursor-pointer z-10 shadow-lg shadow-cyan-500/50" />
      )}
    </div>
  );
};

export default FoundationPile;
