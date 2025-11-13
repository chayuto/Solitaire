import DrawPile from './DrawPile';
import DiscardPile from './DiscardPile';
import FoundationPile from './FoundationPile';
import TableauColumn from './TableauColumn';
import ControlPanel from './ControlPanel';

const GameBoard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-8">
      <ControlPanel />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Solitaire</h1>
        
        {/* Top Row: Draw Pile, Discard Pile, and Foundation Piles */}
        <div className="flex justify-between mb-8">
          <div className="flex gap-4">
            <DrawPile />
            <DiscardPile />
          </div>
          <div className="flex gap-4">
            <FoundationPile suit="hearts" />
            <FoundationPile suit="diamonds" />
            <FoundationPile suit="clubs" />
            <FoundationPile suit="spades" />
          </div>
        </div>

        {/* Tableau: 7 columns */}
        <div className="flex gap-4 justify-center">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="flex-shrink-0">
              <TableauColumn columnIndex={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
