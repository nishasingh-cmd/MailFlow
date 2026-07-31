import React, { useState } from 'react';
import { DistributionItem } from '@mailflow/shared';

export interface DonutChartProps {
  data: DistributionItem[];
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 180,
  centerLabel = 'Total',
  centerValue,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const displayCenterValue = centerValue !== undefined ? centerValue : totalCount.toLocaleString();

  if (!data || data.length === 0 || totalCount === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-[var(--content-tertiary)] ${className}`}
        style={{ height: size }}
      >
        No status data available
      </div>
    );
  }

  const defaultColors = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#6B7280', '#8B5CF6'];
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-6 ${className}`}>
      {/* SVG Donut */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 select-none">
          {data.map((item, idx) => {
            const pct = item.count / totalCount;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += pct * circumference;
            const color = item.color || defaultColors[idx % defaultColors.length];
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer origin-center"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-bold text-[var(--content-primary)] tracking-tight">
            {displayCenterValue}
          </span>
          <span className="text-[11px] text-[var(--content-tertiary)] font-medium uppercase tracking-wider">
            {centerLabel}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex-1 space-y-2 w-full">
        {data.map((item, idx) => {
          const color = item.color || defaultColors[idx % defaultColors.length];
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                isHovered ? 'bg-[var(--surface-elevated,rgba(255,255,255,0.06))]' : ''
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-[var(--content-primary)] truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-[var(--content-primary)]">{item.count.toLocaleString()}</span>
                <span className="text-[var(--content-tertiary)] w-10 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
