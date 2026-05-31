/**
 * ProgressChart — Game Insights tab #1.
 *
 * Move number (x) versus progress % (y): two gradient-filled series — the
 * blended progress score (the hero) and the foundations-home percentage (the
 * win number) — that climb left-to-right as the game (or the AI auto-player)
 * makes moves.
 *
 * Canvas-rendered via ECharts (tree-shaken core). A live chart re-renders every
 * move; an SVG chart lib reconciles a large DOM tree each time (~235ms at a long
 * game's scale, which froze the UI during auto-play). Canvas redraws in one pass
 * (~single-digit ms), so the full-resolution series stays smooth.
 */

import { memo, useMemo } from 'react';
// Import the ESM core build, NOT `echarts-for-react/lib/core` (CJS): the CJS
// default-import interop resolves to the module namespace object in the prod
// bundle, which React renders as an invalid element type (error #130) and
// crashes the panel. Keep this on `esm/core`.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import type { ProgressSnapshot } from '../../hooks/useProgressHistory';
import { ChartEmptyHint } from './ChartEmptyHint';

echarts.use([LineChart, GridComponent, CanvasRenderer]);

/** A vertical fade from `color` (top) to transparent (baseline). */
function areaFade(r: number, g: number, b: number, topAlpha: number) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: `rgba(${r},${g},${b},${topAlpha})` },
      { offset: 1, color: `rgba(${r},${g},${b},0)` },
    ],
  };
}

interface ProgressChartProps {
  history: ProgressSnapshot[];
  /** Kept for API parity; live updates are instant (animation off). */
  animate: boolean;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ history }) => {
  const option = useMemo<EChartsOption>(() => {
    const maxMove = history.length > 0 ? history[history.length - 1].move : 0;
    return {
      animation: false,
      grid: { top: 10, right: 10, bottom: 26, left: 34 },
      xAxis: {
        type: 'value',
        min: 0,
        max: maxMove || 'dataMax',
        name: 'move',
        nameLocation: 'middle',
        nameGap: 18,
        nameTextStyle: { color: '#9ca3af', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 10, formatter: '{value}%' },
        splitLine: {
          lineStyle: { color: '#e5e7eb', type: 'dashed' },
        },
      },
      series: [
        {
          name: 'Progress',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2.5, color: '#22c55e' },
          areaStyle: { color: areaFade(34, 197, 94, 0.55), origin: 'start' },
          data: history.map((p) => [p.move, p.progress]),
        },
        {
          name: 'Foundations',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2.5, color: '#f59e0b' },
          areaStyle: { color: areaFade(245, 158, 11, 0.45), origin: 'start' },
          data: history.map((p) => [
            p.move,
            Math.round((p.foundations / 52) * 100),
          ]),
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

export default memo(ProgressChart);
