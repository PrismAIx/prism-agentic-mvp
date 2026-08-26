export interface LivePrice { price: number; isMarketOpen: boolean; }

/** Returns no live prices so callers always use bundled demo snapshots. */
export function useLivePrices(_symbols: string[]): Record<string, LivePrice> {
  void _symbols;
  return {};
}

/** Format a numeric price to the app's display style ($63,503 / $292.26). */
export function formatPrice(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
