import { useGameStore } from '../store/gameStore';
import Card from './Card';

const DrawPile: React.FC = () => {
  const drawPile = useGameStore((state) => state.drawPile);
  const drawCard = useGameStore((state) => state.drawCard);
  const godMode = useGameStore((state) => state.godMode);

  return (
    <div 
      className="relative w-20 h-28 cursor-pointer"
      onClick={drawCard}
    >
      {drawPile.length > 0 ? (
        <div className="absolute inset-0">
          <Card card={{ ...drawPile[0], faceUp: false }} godMode={godMode} />
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-2xl">↻</span>
        </div>
      )}
    </div>
  );
};

export default DrawPile;
