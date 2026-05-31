/**
 * Sparkline — a tiny inline-SVG trend line for the AI stats tab.
 *
 * Deliberately *not* an ECharts chart: these are thumbnail-sized trends
 * (latency, confidence) where pulling in the charting dep would be absurd. The
 * two hero charts (Progress, Card Flow) use ECharts; this stays a few lines of
 * SVG.
 */

interface SparklineProps {
  /** The series to draw, oldest → newest. */
  values: number[];
  /** Stroke colour. */
  color?: string;
  width?: number;
  height?: number;
  /** Fixed lower bound for the y-scale (otherwise auto from the data). */
  min?: number;
  /** Fixed upper bound for the y-scale (otherwise auto from the data). */
  max?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  color = '#16a34a',
  width = 84,
  height = 24,
  min,
  max,
}) => {
  if (values.length < 2) {
    return <span className="text-gray-300 text-[11px]">—</span>;
  }

  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  // Inset by 2px so the stroke and the end dot never clip the viewBox edge.
  const pad = 2;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (values.length === 1 ? 0 : (i / (values.length - 1)) * plotW);
    const y = pad + plotH - ((v - lo) / span) * plotH;
    return [x, y] as const;
  });

  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      <polyline
        points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
    </svg>
  );
};
