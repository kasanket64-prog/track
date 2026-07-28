import { useId, useState } from 'react';

interface Bar {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316'];

export default function BarChart({
  data,
  height = 160,
  maxValue,
}: {
  data: Bar[];
  height?: number;
  maxValue?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartId = useId();

  const width = 400;
  const pad = { top: 16, right: 16, bottom: 36, left: 36 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-gray-600 text-sm" style={{ height }}>
        No data
      </div>
    );
  }

  // Sanitize values to avoid NaN / invalid SVG rendering
  const safeData = data.map((d) => ({
    ...d,
    value: Number.isFinite(d.value) ? d.value : 0,
  }));

  const max = Math.max(maxValue ?? Math.max(...safeData.map((d) => d.value), 1), 1);
  const barW = Math.min(40, (chartW / safeData.length) * 0.55);
  const gap = chartW / safeData.length;
  const yTicks = [0, Math.round(max / 2), max];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        {safeData.map((d, i) => {
          const c = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <linearGradient key={i} id={`${chartId}-bgrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity="1" />
              <stop offset="100%" stopColor={c} stopOpacity="0.5" />
            </linearGradient>
          );
        })}
      </defs>

      {/* Grid lines */}
      {yTicks.map((t, i) => {
        const y = pad.top + chartH - (t / max) * chartH;
        return (
          <g key={i}>
            <line
              x1={pad.left}
              y1={y}
              x2={pad.left + chartW}
              y2={y}
              stroke="rgba(0,0,0,0.05)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text x={pad.left - 5} y={y + 4} textAnchor="end" fontSize={8} fill="#9CA3AF">
              {t}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {safeData.map((d, i) => {
        const bh = Math.max(2, (d.value / max) * chartH);
        const x = pad.left + gap * i + (gap - barW) / 2;
        const y = pad.top + chartH - bh;
        const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const isHovered = hovered === i;

        return (
          <g
            key={i}
            onMouseEnter={() => setHovered(i)}
            style={{ cursor: 'pointer' }}
          >
            {isHovered && (
              <rect
                x={x - 2}
                y={y - 2}
                width={barW + 4}
                height={bh + 4}
                rx={5}
                fill={color}
                opacity={0.12}
                style={{ filter: 'blur(4px)' }}
              />
            )}

            <rect
              x={x}
              y={y}
              width={barW}
              height={bh}
              fill={`url(#${chartId}-bgrad-${i})`}
              rx={4}
              opacity={hovered === null || isHovered ? 1 : 0.4}
              style={{ transition: 'opacity 0.2s ease' }}
            />

            <rect x={x} y={y} width={barW} height={3} rx={3} fill={color} opacity={0.9} />

            <text
              x={x + barW / 2}
              y={pad.top + chartH + 18}
              textAnchor="middle"
              fontSize={8}
              fill={isHovered ? '#111827' : '#6B7280'}
            >
              {d.label.length > 7 ? `${d.label.slice(0, 6)}…` : d.label}
            </text>

            {isHovered ? (
              <>
                <rect
                  x={x - 4}
                  y={y - 22}
                  width={barW + 8}
                  height={16}
                  rx={3}
                  fill="white"
                  stroke={color}
                  strokeWidth={0.8}
                  strokeOpacity={0.5}
                />
                <text
                  x={x + barW / 2}
                  y={y - 11}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="800"
                  fill={color}
                >
                  {d.value}
                </text>
              </>
            ) : (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={8}
                fontWeight="700"
                fill={color}
                opacity={0.7}
              >
                {d.value}
              </text>
            )}
          </g>
        );
      })}

      <line
        x1={pad.left}
        y1={pad.top + chartH}
        x2={pad.left + chartW}
        y2={pad.top + chartH}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={1}
      />
    </svg>
  );
}