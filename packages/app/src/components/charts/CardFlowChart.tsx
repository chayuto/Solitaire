/**
 * CardFlowChart — Game Insights tab #2.
 *
 * A streamgraph of where all 52 cards live, move by move: they flow from the
 * stock, through the waste and tableau, and pool into the foundations. The
 * foundations band swells to fill the whole height at a win. Mesmerising to
 * watch while the AI auto-plays.
 */

import { ResponsiveStream } from '@nivo/stream';
import type { ProgressSnapshot } from '../../hooks/useProgressHistory';
import { ChartEmptyHint } from './ChartEmptyHint';

interface CardFlowChartProps {
  history: ProgressSnapshot[];
  animate: boolean;
}

/** Stream keys, stacked bottom-to-top, with their band colours. */
const ZONES = [
  { key: 'Stock', color: '#94a3b8' },
  { key: 'Waste', color: '#fbbf24' },
  { key: 'Face-down', color: '#6366f1' },
  { key: 'Face-up', color: '#38bdf8' },
  { key: 'Foundations', color: '#34d399' },
] as const;

const KEYS = ZONES.map((z) => z.key);
const COLORS = ZONES.map((z) => z.color);

const CardFlowChart: React.FC<CardFlowChartProps> = ({ history, animate }) => {
  if (history.length < 2) return <ChartEmptyHint />;

  const data = history.map((p) => ({
    Stock: p.stock,
    Waste: p.waste,
    'Face-down': p.faceDown,
    'Face-up': p.faceUp,
    Foundations: p.foundations,
  }));

  return (
    <ResponsiveStream
      data={data}
      keys={KEYS}
      colors={COLORS}
      margin={{ top: 12, right: 16, bottom: 16, left: 16 }}
      offsetType="silhouette"
      order="none"
      curve="basis"
      fillOpacity={0.88}
      borderWidth={1}
      borderColor={{ theme: 'background' }}
      enableGridX={false}
      enableGridY={false}
      axisBottom={null}
      axisLeft={null}
      animate={animate}
      motionConfig="gentle"
      legends={[
        {
          anchor: 'bottom',
          direction: 'row',
          translateY: 14,
          itemWidth: 78,
          itemHeight: 14,
          itemTextColor: '#6b7280',
          symbolSize: 10,
          symbolShape: 'circle',
        },
      ]}
      theme={{ text: { fill: '#6b7280', fontSize: 10 } }}
    />
  );
};

export default CardFlowChart;
