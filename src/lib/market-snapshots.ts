export type DemoMarketSnapshot = {
  symbol: string;
  price: number;
  changePct24h: number;
  momentum: string;
  keyLevel: string;
  source: string;
};

export const DEMO_MARKET_SNAPSHOTS: Record<string, DemoMarketSnapshot> = {
  BTC: {
    symbol: 'BTC',
    price: 74604,
    changePct24h: 5.2,
    momentum: 'Bullish · 24h',
    keyLevel: '$75K resistance',
    source: 'Demo market snapshot',
  },
  ETH: {
    symbol: 'ETH',
    price: 2027,
    changePct24h: -2.1,
    momentum: 'Weak · 24h',
    keyLevel: '$2K support',
    source: 'Demo market snapshot',
  },
  SPCX: {
    symbol: 'SPCX',
    price: 212.04,
    changePct24h: 0,
    momentum: 'Price discovery',
    keyLevel: '$200 / $250 zones',
    source: 'Variational fallback',
  },
  HYPE: {
    symbol: 'HYPE',
    price: 72.39,
    changePct24h: -3.4,
    momentum: 'Pullback · 24h',
    keyLevel: '$72 / $77 zones',
    source: 'CoinMarketCap snapshot',
  },
  NEAR: {
    symbol: 'NEAR',
    price: 2.28,
    changePct24h: -9.8,
    momentum: 'Pullback · 24h',
    keyLevel: '$2.25 / $2.55 zones',
    source: 'CoinMarketCap snapshot',
  },
  ZEC: {
    symbol: 'ZEC',
    price: 508.64,
    changePct24h: -2.4,
    momentum: 'Volatile · 24h',
    keyLevel: '$500 psychological',
    source: 'CoinMarketCap snapshot',
  },
  AAPL: {
    symbol: 'AAPL',
    price: 224.18,
    changePct24h: 3.8,
    momentum: 'Bullish · 24h',
    keyLevel: '$225 breakout',
    source: 'Demo market snapshot',
  },
  NVDA: {
    symbol: 'NVDA',
    price: 182.42,
    changePct24h: 4.5,
    momentum: 'Bullish · 24h',
    keyLevel: '$180 reclaimed',
    source: 'Demo market snapshot',
  },
  XAU: {
    symbol: 'XAU',
    price: 2365,
    changePct24h: 0.3,
    momentum: 'Stable · 24h',
    keyLevel: '$2.35K support',
    source: 'Demo market snapshot',
  },
};

export function getDemoMarketSnapshot(symbol: string): DemoMarketSnapshot | undefined {
  return DEMO_MARKET_SNAPSHOTS[symbol.toUpperCase()];
}

export function formatSnapshotPrice(value: number): string {
  if (value >= 1000) return '$' + value.toLocaleString('en-US', { maximumFractionDigits: value >= 10_000 ? 0 : 2 });
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatChangePct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}
