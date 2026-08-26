export type VariationalListing = {
  ticker: string;
  name: string;
  markPrice: number;
  volume24h: number;
  longOpenInterest: number;
  shortOpenInterest: number;
  fundingRate: number;
  fundingIntervalS: number;
  baseSpreadBps: number;
  bid?: number;
  ask?: number;
};

export const FALLBACK_SPCX_LISTING: VariationalListing = {
  ticker: 'SPCX', name: 'SPAC and New Issue ETF', markPrice: 212.04,
  volume24h: 34_789_918, longOpenInterest: 4_136_380, shortOpenInterest: 2_833_073,
  fundingRate: -0.025974, fundingIntervalS: 28_800, baseSpreadBps: 3.63, bid: 211.56, ask: 211.637,
};

export function formatVariationalUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 1 : 2)}K`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatVariationalPrice(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatVariationalFunding(rate: number, intervalS: number): string {
  const hours = Math.max(1, Math.round(intervalS / 3600));
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(3)}% / ${hours}h`;
}
