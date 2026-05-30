/**
 * ProgressChart — Game Insights tab #1.
 *
 * Move number (x) versus progress % (y). Two gradient-filled series: the
 * blended progress score (the hero) and the foundations-home percentage (the
 * win number). Both climb left-to-right as the game — or the AI auto-player —
 * makes moves.
 */

import { ResponsiveLine } from '@nivo/line';
import { linearGradientDef } from '@nivo/core';
import type { ProgressSnapshot } from '../../hooks/useProgressHistory';
import { ChartEmptyHint } from './ChartEmptyHint';

interface ProgressChartProps {
  history: ProgressSnapshot[];
  animate: boolean;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ history, animate }) => {
  if (history.length < 2) return <ChartEmptyHint />;

  const data = [
    {
      id: 'Progress',
      color: '#22c55e',
      data: history.map((p) => ({ x: p.move, y: p.progress })),
    },
    {
      id: 'Foundations',
      color: '#f59e0b',
      data: history.map((p) => ({
        x: p.move,
        y: Math.round((p.foundations / 52) * 100),
      })),
    },
  ];

  return (
    <ResponsiveLine
      data={data}
      colors={{ datum: 'color' }}
      margin={{ top: 12, right: 16, bottom: 32, left: 36 }}
      xScale={{ type: 'linear', min: 0, max: 'auto' }}
      yScale={{ type: 'linear', min: 0, max: 100 }}
      curve="monotoneX"
      enableArea
      areaOpacity={1}
      defs={[
        linearGradientDef('progressFill', [
          { offset: 0, color: '#22c55e', opacity: 0.55 },
          { offset: 100, color: '#22c55e', opacity: 0 },
        ]),
        linearGradientDef('foundationsFill', [
          { offset: 0, color: '#f59e0b', opacity: 0.45 },
          { offset: 100, color: '#f59e0b', opacity: 0 },
        ]),
      ]}
      fill={[
        { match: { id: 'Progress' }, id: 'progressFill' },
        { match: { id: 'Foundations' }, id: 'foundationsFill' },
      ]}
      lineWidth={2.5}
      enablePoints={false}
      enableGridX={false}
      gridYValues={[0, 25, 50, 75, 100]}
      axisLeft={{
        tickValues: [0, 25, 50, 75, 100],
        format: (v) => `${v}%`,
        tickSize: 0,
        tickPadding: 6,
      }}
      axisBottom={{
        legend: 'move',
        legendOffset: 26,
        legendPosition: 'middle',
        tickSize: 0,
        tickPadding: 6,
      }}
      enableSlices="x"
      useMesh
      animate={animate}
      motionConfig="gentle"
      theme={{
        text: { fill: '#6b7280', fontSize: 10 },
        grid: { line: { stroke: '#e5e7eb', strokeDasharray: '2 4' } },
        crosshair: { line: { stroke: '#16a34a', strokeWidth: 1 } },
      }}
    />
  );
};

export default ProgressChart;
