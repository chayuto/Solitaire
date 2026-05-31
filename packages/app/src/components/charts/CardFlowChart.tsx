/**
 * CardFlowChart — Game Insights tab #2.
 *
 * A streamgraph of where all 52 cards live, move by move: they flow from the
 * stock, through the waste and tableau, and pool into the foundations. The
 * foundations band swells to fill the whole height at a win.
 *
 * Canvas-rendered via ECharts ThemeRiver (a silhouette streamgraph). A live
 * chart re-renders every move; an SVG chart lib reconciles a large DOM tree each
 * time (~320ms at a long game's scale, which froze the UI during auto-play).
 * Canvas redraws in one pass, so the full-resolution stream stays smooth.
 */

import { memo, useMemo } from 'react';
// ESM core build, NOT `lib/core` (CJS) — see the note in ProgressChart: the CJS
// interop crashes the prod bundle with React error #130.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { ThemeRiverChart } from 'echarts/charts';
import { SingleAxisComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import type { ProgressSnapshot } from '../../hooks/useProgressHistory';
import { ChartEmptyHint } from './ChartEmptyHint';

echarts.use([ThemeRiverChart, SingleAxisComponent, LegendComponent, CanvasRenderer]);

/** Stream bands, bottom-to-top, with their colours. */
const ZONES = [
  { key: 'Stock', color: '#94a3b8', value: (p: ProgressSnapshot) => p.stock },
  { key: 'Waste', color: '#fbbf24', value: (p: ProgressSnapshot) => p.waste },
  { key: 'Face-down', color: '#6366f1', value: (p: ProgressSnapshot) => p.faceDown },
  { key: 'Face-up', color: '#38bdf8', value: (p: ProgressSnapshot) => p.faceUp },
  { key: 'Foundations', color: '#34d399', value: (p: ProgressSnapshot) => p.foundations },
] as const;

interface CardFlowChartProps {
  history: ProgressSnapshot[];
  /** Kept for API parity; live updates are instant (animation off). */
  animate: boolean;
}

const CardFlowChart: React.FC<CardFlowChartProps> = ({ history }) => {
  const option = useMemo<EChartsOption>(() => {
    // ThemeRiver wants flat [x, value, band] triples, grouped by band so the
    // layer (and colour) order is deterministic.
    const data: [number, number, string][] = [];
    for (const z of ZONES) {
      for (const p of history) data.push([p.move, z.value(p), z.key]);
    }
    const maxMove = history.length > 0 ? history[history.length - 1].move : 0;

    return {
      animation: false,
      color: ZONES.map((z) => z.color),
      legend: {
        data: ZONES.map((z) => z.key),
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#6b7280', fontSize: 10 },
      },
      singleAxis: {
        type: 'value',
        min: 0,
        max: maxMove || 'dataMax',
        top: 8,
        bottom: 30,
        left: 8,
        right: 8,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'themeRiver',
          emphasis: { focus: 'series' },
          label: { show: false },
          itemStyle: { opacity: 0.9 },
          data,
        },
      ],
    };
  }, [history]);

  if (history.length < 2) return <ChartEmptyHint />;

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default memo(CardFlowChart);
