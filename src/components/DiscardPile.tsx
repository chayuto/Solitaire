import { useGameStore } from '../store/gameStore';
import Card from './Card';

const DiscardPile: React.FC = () => {
  const discardPile = useGameStore((state) => state.discardPile);

  return (
    <div className="relative w-20 h-28">
      {discardPile.length > 0 ? (
        <div className="absolute inset-0">
          <Card card={{ ...discardPile[discardPile.length - 1], faceUp: true }} />
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg bg-gray-100"></div>
      )}
    </div>
  );
};

export default DiscardPile;
