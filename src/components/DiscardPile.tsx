import { useGameStore } from '../store/gameStore';
import Card from './Card';

const DiscardPile: React.FC = () => {
  const discardPile = useGameStore((state) => state.discardPile);
  const selectedCard = useGameStore((state) => state.selectedCard);
  const selectCard = useGameStore((state) => state.selectCard);
  const deselectCard = useGameStore((state) => state.deselectCard);
  const showValidMoves = useGameStore((state) => state.showValidMoves);
  const hasAnyValidDestination = useGameStore((state) => state.hasAnyValidDestination);

  const handleCardClick = () => {
    if (discardPile.length === 0) return;

    // If the top card is already selected, deselect it
    if (selectedCard?.source === 'discard') {
      deselectCard();
    } else {
      // Select the top card
      selectCard('discard');
    }
  };

  const isSelected = selectedCard?.source === 'discard';
  const isInteractable = discardPile.length > 0 && !selectedCard;
  
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const hasValidMoves = showValidMoves && !selectedCard && topCard !== null && 
    hasAnyValidDestination(topCard, 'discard');

  return (
    <div className="relative w-20 h-28">
      {discardPile.length > 0 ? (
        <div className="absolute inset-0">
          <Card
            card={{ ...discardPile[discardPile.length - 1], faceUp: true }}
            onClick={handleCardClick}
            isInteractable={isInteractable}
            isSelected={isSelected}
            hasValidMoves={hasValidMoves}
          />
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg bg-gray-100"></div>
      )}
    </div>
  );
};

export default DiscardPile;
