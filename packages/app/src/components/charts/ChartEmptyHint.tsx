/** Placeholder shown until a game has enough moves to plot a trend. */
export const ChartEmptyHint: React.FC = () => (
  <div
    data-testid="insights-chart-empty"
    className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-400"
  >
    Make a few moves — or start AI auto-play — to watch the game unfold here.
  </div>
);
