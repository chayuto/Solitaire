import { useGameStore } from '../store/gameStore';
import DrawPile from './DrawPile';
import DiscardPile from './DiscardPile';
import FoundationPile from './FoundationPile';
import TableauColumn from './TableauColumn';

export default function GameBoard() {
  const { stock, waste, foundation, tableau } = useGameStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Section: Stock, Waste, and Foundation Piles */}
        <div className="flex justify-between mb-12">
          {/* Left side: Stock and Waste */}
          <div className="flex gap-4">
            <DrawPile cards={stock} />
            <DiscardPile cards={waste} />
          </div>

          {/* Right side: Foundation Piles */}
          <div className="flex gap-4">
            <FoundationPile cards={foundation[0]} suit="hearts" />
            <FoundationPile cards={foundation[1]} suit="diamonds" />
            <FoundationPile cards={foundation[2]} suit="clubs" />
            <FoundationPile cards={foundation[3]} suit="spades" />
          </div>
        </div>

        {/* Bottom Section: Tableau (7 columns) */}
        <div className="flex gap-4 justify-center">
          {tableau.map((column, index) => (
            <TableauColumn key={index} cards={column} columnIndex={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
