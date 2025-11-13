import { useGameStore } from '../store/gameStore';
import Card from './Card';

interface TableauColumnProps {
  columnIndex: number;
}

const TableauColumn: React.FC<TableauColumnProps> = ({ columnIndex }) => {
  const column = useGameStore((state) => state.tableau[columnIndex]);
  const selectedCard = useGameStore((state) => state.selectedCard);
  const selectCard = useGameStore((state) => state.selectCard);
  const deselectCard = useGameStore((state) => state.deselectCard);
  const moveCardToTableau = useGameStore((state) => state.moveCardToTableau);
  const canMoveToTableau = useGameStore((state) => state.canMoveToTableau);

  // Check if this column is a valid destination for the selected card
  const isValidDestination = selectedCard && canMoveToTableau(selectedCard.card, columnIndex);

  const handleCardClick = (cardIndex: number) => {
    const card = column[cardIndex];
    
    // If a card is already selected
    if (selectedCard) {
      // If clicking the same card, deselect it
      if (
        selectedCard.source === 'tableau' &&
        selectedCard.columnIndex === columnIndex &&
        selectedCard.cardIndex === cardIndex
      ) {
        deselectCard();
      } else {
        // Try to move to this column
        moveCardToTableau(columnIndex);
      }
    } else {
      // Select this card if it's face up
      if (card.faceUp) {
        selectCard('tableau', columnIndex, cardIndex);
      }
    }
  };

  const handleEmptyColumnClick = () => {
    if (selectedCard) {
      moveCardToTableau(columnIndex);
    }
  };

  return (
    <div className="relative min-h-32">
      {column.length > 0 ? (
        <div className="relative">
          {column.map((card, index) => {
            const isSelected =
              selectedCard?.source === 'tableau' &&
              selectedCard.columnIndex === columnIndex &&
              selectedCard.cardIndex === index;
            
            // A card is interactable if it's face up and no card is currently selected
            const isInteractable = card.faceUp && !selectedCard;
            
            return (
              <div
                key={card.id}
                className="absolute"
                style={{ top: `${index * 24}px` }}
              >
                <Card
                  card={card}
                  onClick={() => handleCardClick(index)}
                  isInteractable={isInteractable}
                  isSelected={isSelected}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div
          onClick={handleEmptyColumnClick}
          className={`w-20 h-28 border-2 border-dashed rounded-lg bg-gray-100 cursor-pointer transition-all ${
            isValidDestination
              ? 'border-green-500 bg-green-100 ring-2 ring-green-400'
              : 'border-gray-400 hover:border-gray-500'
          }`}
        ></div>
      )}
      {/* Overlay for valid destination on non-empty columns */}
      {column.length > 0 && isValidDestination && (
        <div
          onClick={() => moveCardToTableau(columnIndex)}
          className="absolute inset-0 border-4 border-green-500 rounded-lg bg-green-200 bg-opacity-30 cursor-pointer pointer-events-auto z-10"
          style={{ top: 0, height: `${column.length * 24 + 112}px` }}
        />
      )}
    </div>
  );
};

export default TableauColumn;
