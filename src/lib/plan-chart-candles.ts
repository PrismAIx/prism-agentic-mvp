export type CandleTime = number;
export type Candle = { time: CandleTime; open: number; high: number; low: number; close: number };

const DEMO_CANDLE_START: CandleTime = 1_765_843_200;
const DEMO_CANDLE_STEP = 43_200;

function seedFor(asset: string) {
  return Array.from(asset.toUpperCase()).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function roundPrice(value: number, entry: number) {
  const decimals = entry >= 100 ? 2 : 4;
  const factor = 10 ** decimals;
  return Math.max(Math.round(value * factor) / factor, 0.0001);
}

export function buildPlanLevelCandles(asset: string, entry: number, sl?: number, tp?: number): Candle[] {
  if (!Number.isFinite(entry) || entry <= 0) return [];

  const longBias = !tp || !sl || tp >= entry || sl <= entry;
  const direction = longBias ? 1 : -1;
  const stopDistance = sl && sl > 0 ? Math.abs(entry - sl) : entry * 0.06;
  const targetDistance = tp && tp > 0 ? Math.abs(tp - entry) : entry * 0.08;
  const levelRange = Math.max(stopDistance, targetDistance, entry * 0.025);
  const seed = seedFor(asset);
  const count = 20;
  const start = entry - direction * levelRange * 0.58;
  let previousClose = start - direction * levelRange * 0.05;

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const wave = Math.sin(progress * Math.PI * 3 + seed * 0.17) * levelRange * 0.055;
    const drift = start + (entry - start) * progress;
    const close = index === count - 1
      ? entry - direction * levelRange * 0.035
      : drift + wave;
    const open = previousClose;
    const wickBase = levelRange * (0.045 + ((seed + index) % 5) * 0.008);
    const high = Math.max(open, close) + wickBase;
    const low = Math.min(open, close) - wickBase;
    previousClose = close;

    return {
      time: DEMO_CANDLE_START + index * DEMO_CANDLE_STEP,
      open: roundPrice(open, entry),
      high: roundPrice(high, entry),
      low: roundPrice(low, entry),
      close: roundPrice(close, entry),
    };
  });
}

export function buildMarketSnapshotCandles(asset: string, price: number, changePct24h = 0): Candle[] {
  if (!Number.isFinite(price) || price <= 0) return [];

  const change = Number.isFinite(changePct24h) ? changePct24h : 0;
  const count = 34;
  const seed = seedFor(asset);
  const start = change === 0 ? price * 0.985 : price / (1 + change / 100);
  const direction = price >= start ? 1 : -1;
  const range = Math.max(Math.abs(price - start), price * 0.025);
  let previousClose = start - direction * range * 0.04;

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const drift = start + (price - start) * progress;
    const wave = Math.sin(progress * Math.PI * 4 + seed * 0.11) * range * 0.08;
    // The last close matches the displayed price so the hero, chart, and plan agree.
    const close = index === count - 1 ? price : drift + wave;
    const open = previousClose;
    const wickBase = range * (0.05 + ((seed + index) % 4) * 0.01);
    const high = Math.max(open, close) + wickBase;
    const low = Math.min(open, close) - wickBase;
    previousClose = close;

    return {
      time: DEMO_CANDLE_START + index * DEMO_CANDLE_STEP,
      open: roundPrice(open, price),
      high: roundPrice(high, price),
      low: roundPrice(low, price),
      close: roundPrice(close, price),
    };
  });
}
