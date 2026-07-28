import { useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  label?: string;
}

export default function LineChart({ data, color = '#3B82F6', height = 140, label }: LineChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; val: number; lbl: string } | null>(null);
  const width = 400;
  const pad = { top: 16, right: 16, bottom: 28, left: 34 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  if (data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-600 gap-1" style={{ height }}>
        <span className="text-sm">Collecting data…</span>
        <span className="text-xs">Waiting for IoT readings</span>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const range = max || 1;
  const gradId = `lgrad-${color.replace('#', '')}`;
  const glowId = `lglow-${color.replace('#', '')}`;

  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top + chartH - (d.value / range) * chartH,
    d,
  }));

  // Smooth bezier path
  const smoothPath = pts.reduce((path, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${path} C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${smoothPath} L ${pts[pts.length - 1].x} ${pad.top + chartH} L ${pts[0].x} ${pad.top + chartH} Z`;

  const yTicks = [0, Math.round(max / 2), max];
  const xStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ height }}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {yTicks.map((t, i) => {
            const y = pad.top + chartH - (t / range) * chartH;
            return (
              <g key={i}>
                <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth={1} strokeDasharray="4 4" />
                <text x={pad.left - 5} y={y + 4} textAnchor="end" fontSize={8} fill="#9CA3AF">{t}</text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* Glow line (behind) */}
          <path d={smoothPath} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.2} filter={`url(#${glowId})`} />

          {/* Main line */}
          <path d={smoothPath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots & hover targets */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x} cy={p.y} r={12}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setTooltip({ x: p.x, y: p.y, val: p.d.value, lbl: p.d.label })}
              />
              {(tooltip?.lbl === p.d.label || pts.length <= 8) && (
                <circle cx={p.x} cy={p.y} r={3.5} fill={color} stroke="white" strokeWidth={2} />
              )}
            </g>
          ))}

          {/* X labels */}
          {pts.filter((_, i) => i % xStep === 0 || i === pts.length - 1).map((p, i) => (
            <text key={i} x={p.x} y={pad.top + chartH + 18} textAnchor="middle" fontSize={8} fill="#9CA3AF">
              {p.d.label}
            </text>
          ))}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <line x1={tooltip.x} y1={pad.top} x2={tooltip.x} y2={pad.top + chartH} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
              <rect
                x={tooltip.x - 26} y={tooltip.y - 30}
                width={52} height={22} rx={5}
                fill="white"
                stroke={color}
                strokeWidth={0.8}
                strokeOpacity={0.5}
              />
              <text x={tooltip.x} y={tooltip.y - 15} textAnchor="middle" fontSize={9} fontWeight="800" fill={color}>
                {tooltip.val}
              </text>
              <text x={tooltip.x} y={tooltip.y - 6} textAnchor="middle" fontSize={7} fill="#6B7280">
                #{tooltip.lbl}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
