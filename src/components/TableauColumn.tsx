import { useGameStore } from '../store/gameStore';
import Card from './Card';

interface TableauColumnProps {
  columnIndex: number;
}

const TableauColumn: React.FC<TableauColumnProps> = ({ columnIndex }) => {
  const column = useGameStore((state) => state.tableau[columnIndex]);

  return (
    <div className="relative min-h-32">
      {column.length > 0 ? (
        <div className="relative">
          {column.map((card, index) => (
            <div
              key={card.id}
              className="absolute"
              style={{ top: `${index * 24}px` }}
            >
              <Card card={card} />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg bg-gray-100"></div>
      )}
    </div>
  );
};

export default TableauColumn;
