import { useState } from 'react';

export interface LineChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface LineChartProps<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  series: LineChartSeries[];
  height?: number;
  className?: string;
}

export function LineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
  className = '',
}: LineChartProps<T>) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-[var(--content-tertiary)] ${className}`}
        style={{ height }}
      >
        No chart data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = 600;
  const chartHeight = height;

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate Y max
  let maxY = 0;
  data.forEach((row) => {
    series.forEach((s) => {
      const val = Number(row[s.key] || 0);
      if (val > maxY) maxY = val;
    });
  });
  maxY = maxY === 0 ? 10 : Math.ceil(maxY * 1.2);

  // Points generator
  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (idx / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return padding.top + innerHeight - (val / maxY) * innerHeight;
  };

  // Generate SVG path for a series
  const createPath = (seriesKey: string) => {
    if (data.length === 0) return '';
    const points = data.map((d, i) => `${getX(i)},${getY(Number(d[seriesKey] || 0))}`);
    return `M ${points.join(' L ')}`;
  };

  const createAreaPath = (seriesKey: string) => {
    if (data.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(data.length - 1);
    const bottomY = padding.top + innerHeight;
    const linePath = data
      .map((d, i) => `${getX(i)},${getY(Number(d[seriesKey] || 0))}`)
      .join(' L ');
    return `M ${firstX},${bottomY} L ${linePath} L ${lastX},${bottomY} Z`;
  };

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Legend Header */}
      <div className="flex items-center justify-end gap-4 mb-2 text-xs font-medium text-[var(--content-secondary)]">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span>{s.name}</span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        {/* Y Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const yVal = Math.round(maxY * ratio);
          const yPos = getY(yVal);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={chartWidth - padding.right}
                y2={yPos}
                stroke="var(--border-subtle, rgba(255,255,255,0.08))"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={yPos + 4}
                textAnchor="end"
                className="fill-[var(--content-tertiary)] text-[10px]"
              >
                {yVal}
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={getX(i)}
            y={chartHeight - 12}
            textAnchor="middle"
            className="fill-[var(--content-tertiary)] text-[10px]"
          >
            {String(d[xKey] ?? '')}
          </text>
        ))}

        {/* Area Gradient Fills */}
        {series.map((s) => (
          <defs key={`grad-${s.key}`}>
            <linearGradient id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
        ))}

        {series.map((s) => (
          <path key={`area-${s.key}`} d={createAreaPath(s.key)} fill={`url(#gradient-${s.key})`} />
        ))}

        {/* Line Paths */}
        {series.map((s) => (
          <path
            key={`line-${s.key}`}
            d={createPath(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Data Points & Hover Targets */}
        {data.map((d, i) => {
          const cx = getX(i);
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Vertical Guide Line on Hover */}
              {isHovered && (
                <line
                  x1={cx}
                  y1={padding.top}
                  x2={cx}
                  y2={padding.top + innerHeight}
                  stroke="var(--brand-500, #3B82F6)"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {series.map((s) => {
                const cy = getY(Number(d[s.key] || 0));
                return (
                  <circle
                    key={s.key}
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5 : 3.5}
                    fill={s.color}
                    stroke="var(--surface-card, #1E293B)"
                    strokeWidth="2"
                    className="transition-all duration-150 cursor-pointer"
                  />
                );
              })}

              {/* Transparent hit target column */}
              <rect
                x={cx - innerWidth / (data.length * 2 || 1)}
                y={padding.top}
                width={innerWidth / (data.length || 1)}
                height={innerHeight}
                fill="transparent"
                className="cursor-pointer"
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-20 pointer-events-none bg-[var(--surface-elevated,#1E293B)] border border-[var(--border-default,rgba(255,255,255,0.1))] rounded-lg p-2.5 shadow-xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{
            left: `${(getX(hoveredIdx) / chartWidth) * 100}%`,
            top: `${(padding.top / chartHeight) * 100}%`,
          }}
        >
          <div className="font-semibold text-[var(--content-primary)] border-b border-[var(--border-subtle)] pb-1">
            {String(data[hoveredIdx][xKey] ?? '')}
          </div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[var(--content-secondary)]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}:
              </span>
              <span className="font-medium text-[var(--content-primary)]">
                {Number(data[hoveredIdx][s.key] || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
