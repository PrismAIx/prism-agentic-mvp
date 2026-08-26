import React, { useMemo } from 'react';
import { buildMarketSnapshotCandles } from '../lib/plan-chart-candles';
import { formatSnapshotPrice } from '../lib/market-snapshots';

interface MarketSnapshotChartProps {
  asset: string;
  price: number;
  changePct?: number;
  height?: number;
}

export const MarketSnapshotChart: React.FC<MarketSnapshotChartProps> = ({ asset, price, changePct = 0, height = 260 }) => {
  const candles = useMemo(() => buildMarketSnapshotCandles(asset, price, changePct), [asset, price, changePct]);
  const up = changePct >= 0;
  const width = 640;
  const padding = { top: 24, right: 14, bottom: 14, left: 8 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const low = Math.min(...candles.map((candle) => candle.low), price);
  const high = Math.max(...candles.map((candle) => candle.high), price);
  const range = Math.max(high - low, price * 0.01);
  const min = low - range * 0.1;
  const max = high + range * 0.1;
  const xFor = (index: number) => padding.left + (index / Math.max(candles.length - 1, 1)) * chartWidth;
  const yFor = (value: number) => padding.top + ((max - value) / (max - min)) * chartHeight;
  const bodyWidth = Math.max(3, chartWidth / candles.length * 0.58);
  const accent = up ? '#2dd4bf' : '#f87171';

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: '#0a0a0f', border: '1px solid var(--line)', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label={`${asset} market snapshot`} style={{ width: '100%', height, display: 'block' }}>
        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + chartHeight * ratio} y2={padding.top + chartHeight * ratio} stroke="rgba(255,255,255,0.04)" />)}
        <line x1={padding.left} x2={width - padding.right} y1={yFor(price)} y2={yFor(price)} stroke={accent} strokeDasharray="4 4" opacity="0.85" />
        {candles.map((candle, index) => {
          const x = xFor(index);
          const color = candle.close >= candle.open ? '#2dd4bf' : '#f87171';
          const top = yFor(Math.max(candle.open, candle.close));
          const bottom = yFor(Math.min(candle.open, candle.close));
          return <g key={candle.time}><line x1={x} x2={x} y1={yFor(candle.high)} y2={yFor(candle.low)} stroke={color} strokeWidth="1" /><rect x={x - bodyWidth / 2} y={top} width={bodyWidth} height={Math.max(1, bottom - top)} fill={color} rx="0.5" /></g>;
        })}
      </svg>
      <div className="mono num" style={{ position: 'absolute', left: 14, top: 12, fontSize: 11, fontWeight: 600, color: accent }}>{asset} {formatSnapshotPrice(price)}</div>
    </div>
  );
};
