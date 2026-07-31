import React, { useState } from 'react';

export interface BarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  className?: string;
  horizontal?: boolean;
  valueFormatter?: (val: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 240,
  className = '',
  horizontal = false,
  valueFormatter = (v) => v.toLocaleString(),
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-[var(--content-tertiary)] ${className}`}
        style={{ height }}
      >
        No distribution data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const defaultColors = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  if (horizontal) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((item, idx) => {
          const pct = Math.round((item.value / maxVal) * 100);
          const color = item.color || defaultColors[idx % defaultColors.length];
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="space-y-1 group"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-[var(--content-primary)] truncate max-w-[180px]">
                  {item.name}
                </span>
                <span className="text-[var(--content-secondary)]">
                  {valueFormatter(item.value)}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[var(--surface-primary,rgba(255,255,255,0.06))] overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isHovered ? 'brightness-125 scale-y-110' : ''
                  }`}
                  style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical Bar Chart
  const chartWidth = 500;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const barGap = 12;
  const barWidth = Math.max(12, (innerWidth - barGap * (data.length - 1)) / data.length);

  return (
    <div className={`relative w-full ${className}`}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-auto select-none">
        {/* Y Gridlines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const yVal = Math.round(maxVal * ratio);
          const yPos = padding.top + innerHeight - ratio * innerHeight;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={chartWidth - padding.right}
                y2={yPos}
                stroke="var(--border-subtle, rgba(255,255,255,0.06))"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 6}
                y={yPos + 4}
                textAnchor="end"
                className="fill-[var(--content-tertiary)] text-[10px]"
              >
                {yVal}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const x = padding.left + idx * (barWidth + barGap);
          const barHeight = Math.max(4, (item.value / maxVal) * innerHeight);
          const y = padding.top + innerHeight - barHeight;
          const color = item.color || defaultColors[idx % defaultColors.length];
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={color}
                opacity={isHovered ? 1 : 0.85}
                className="transition-all duration-200"
              />
              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={height - 12}
                textAnchor="middle"
                className="fill-[var(--content-tertiary)] text-[10px]"
              >
                {item.name.length > 8 ? `${item.name.slice(0, 7)}…` : item.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute top-2 right-2 bg-[var(--surface-elevated,#1E293B)] border border-[var(--border-default,rgba(255,255,255,0.1))] rounded-lg px-3 py-1.5 shadow-lg text-xs">
          <span className="font-semibold text-[var(--content-primary)]">
            {data[hoveredIdx].name}:
          </span>{' '}
          <span className="text-[var(--content-secondary)]">
            {valueFormatter(data[hoveredIdx].value)}
          </span>
        </div>
      )}
    </div>
  );
};
