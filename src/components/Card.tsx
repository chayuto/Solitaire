import type { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isInteractable?: boolean;
  isSelected?: boolean;
}

const Card: React.FC<CardProps> = ({ card, onClick, isInteractable = false, isSelected = false }) => {
  const { suit, rank, faceUp } = card;

  // Determine if the card is red or black
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const color = isRed ? 'text-red-600' : 'text-black';

  // Suit symbols
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  // Build className for highlighting
  const getHighlightClass = () => {
    if (isSelected) {
      return 'ring-4 ring-yellow-400 scale-105';
    }
    if (isInteractable) {
      return 'ring-2 ring-green-400 hover:ring-4 hover:ring-green-500';
    }
    return '';
  };

  if (!faceUp) {
    return (
      <div
        onClick={onClick}
        className={`w-20 h-28 bg-blue-900 border-2 border-blue-700 rounded-lg flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition-all ${getHighlightClass()}`}
      >
        <div className="text-blue-700 text-4xl font-bold">🂠</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`w-20 h-28 bg-white border-2 border-gray-300 rounded-lg flex flex-col p-2 cursor-pointer shadow-md hover:shadow-lg transition-all ${color} ${getHighlightClass()}`}
    >
      <div className="flex justify-between items-start">
        <div className="text-xl font-bold leading-none">{rank}</div>
        <div className="text-2xl leading-none">{suitSymbols[suit]}</div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl">{suitSymbols[suit]}</div>
      </div>
      <div className="flex justify-between items-end rotate-180">
        <div className="text-xl font-bold leading-none">{rank}</div>
        <div className="text-2xl leading-none">{suitSymbols[suit]}</div>
      </div>
    </div>
  );
};

export default Card;
