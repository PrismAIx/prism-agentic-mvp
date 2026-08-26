import React, { useMemo } from 'react';
import { buildPlanLevelCandles } from '../lib/plan-chart-candles';

interface PlanChartProps {
  asset: string;
  entry: number;
  sl?: number;
  tp?: number;
  height?: number;
}

const WIDTH = 640;
const PADDING = { top: 20, right: 14, bottom: 14, left: 8 };

// A static SVG keeps the preview self-contained, deterministic, and noninteractive.
export const PlanChart: React.FC<PlanChartProps> = ({ asset, entry, sl, tp, height = 200 }) => {
  const candles = useMemo(() => buildPlanLevelCandles(asset, entry, sl, tp), [asset, entry, sl, tp]);
  const levels = [entry, sl, tp].filter((value): value is number => typeof value === 'number' && value > 0);
  if (candles.length === 0) return null;

  const low = Math.min(...candles.map((candle) => candle.low), ...levels);
  const high = Math.max(...candles.map((candle) => candle.high), ...levels);
  const range = Math.max(high - low, entry * 0.01);
  const min = low - range * 0.1;
  const max = high + range * 0.1;
  const chartHeight = height - PADDING.top - PADDING.bottom;
  const chartWidth = WIDTH - PADDING.left - PADDING.right;
  const xFor = (index: number) => PADDING.left + (index / Math.max(candles.length - 1, 1)) * chartWidth;
  const yFor = (price: number) => PADDING.top + ((max - price) / (max - min)) * chartHeight;
  const bodyWidth = Math.max(3, chartWidth / candles.length * 0.58);
  const format = (value: number) => entry >= 100 ? value.toFixed(2) : value.toFixed(4);
  const lines = [
    { value: entry, label: 'Entry', color: '#b8a4ff', width: 2 },
    ...(tp && tp > 0 ? [{ value: tp, label: 'Target', color: '#4ade80', width: 1 }] : []),
    ...(sl && sl > 0 ? [{ value: sl, label: 'Stop', color: '#f87171', width: 1 }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" aria-label={`${asset} plan preview chart`} style={{ width: '100%', height, display: 'block' }}>
      {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={PADDING.left} x2={WIDTH - PADDING.right} y1={PADDING.top + chartHeight * ratio} y2={PADDING.top + chartHeight * ratio} stroke="rgba(255,255,255,0.04)" />)}
      {lines.map((line) => {
        const y = yFor(line.value);
        return <g key={line.label}><line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} stroke={line.color} strokeWidth={line.width} strokeDasharray={line.label === 'Entry' ? undefined : '4 4'} opacity="0.92" /><text x={WIDTH - PADDING.right - 2} y={y - 4} fill={line.color} fontSize="10" textAnchor="end">{line.label} {format(line.value)}</text></g>;
      })}
      {candles.map((candle, index) => {
        const x = xFor(index);
        const up = candle.close >= candle.open;
        const color = up ? '#4ade80' : '#f87171';
        const bodyTop = yFor(Math.max(candle.open, candle.close));
        const bodyBottom = yFor(Math.min(candle.open, candle.close));
        return <g key={candle.time}><line x1={x} x2={x} y1={yFor(candle.high)} y2={yFor(candle.low)} stroke={color} strokeWidth="1" /><rect x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={Math.max(1, bodyBottom - bodyTop)} fill={color} rx="0.5" /></g>;
      })}
    </svg>
  );
};
