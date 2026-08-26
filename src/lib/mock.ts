// Mock data and scripted layer events for offline/screenshot mode.
// Used when VITE_MOCK=1 (default: true — see vite.config.ts define).

import type { LayerEvent, DoneEvent, Plan, RiskAlertPayload, Subscription, SpendingAnalysis } from './types.js';
import { DEMO_MARKET_SNAPSHOTS } from './market-snapshots.js';

export const MOCK_USER = 'demo-user';
export const MOCK_INTENT = 'Put $1,000 to work: $200 SPCX at 2x, $800 in sUSDai';

export const MOCK_PLAN: Plan = {
  planId: '3f8a2c14-b91e-4d07-9b3d-5e2f1a0cdf44',
  user: MOCK_USER,
  intent: MOCK_INTENT,
  legs: [
    { type: 'perp',  venue: 'ostium',    asset: 'SPCX', direction: 'long', collateral: 200, leverage: 2, slippagePct: 0.5, sl: 176, tp: 250 },
    { type: 'yield', venue: 'demoVault', asset: 'USDC', amount: 800 },
  ],
  condition: null,
  reasoning: '200 USDC is reserved for a 2x SPCX price-discovery setup, while 800 USDC is parked in sUSDai-style stable yield. Variational is market info only here, so SPCX trading is staged for review and no transaction is sent.',
  marketContext: {
    SPCX: { spot: 212.04 },
  },
  checks: [
    { name: 'tradingEnabled', passed: true },
    { name: 'maxCollateral',  passed: true, limit: 250, value: 200 },
    { name: 'maxLeverage',    passed: true, limit: 20,  value: 2 },
  ],
  status: 'awaiting_approval',
  network: 'arbitrum-sepolia',
  createdAt: Date.now(),
  expiresAt:  Date.now() + 900_000,
};

function wantsIdleYield(intent: string): boolean {
  return /\b(susdai|yield|idle|park|stable|cash|work|deposit)\b/i.test(intent) || /\$?\s*800\b/i.test(intent);
}

function buildSpcxPlan(intent: string, spot = DEMO_MARKET_SNAPSHOTS.SPCX.price): Plan {
  const includeYield = wantsIdleYield(intent);
  const spcxLeg = MOCK_PLAN.legs[0];
  return {
    ...MOCK_PLAN,
    planId: includeYield ? MOCK_PLAN.planId : 'mock-spcx-market-pulse',
    intent,
    legs: includeYield ? MOCK_PLAN.legs : [spcxLeg],
    reasoning: includeYield
      ? MOCK_PLAN.reasoning
      : 'SPCX is the current market pulse. Prism marks the entry, stop, target, and volatility risk for preview; no transaction is sent.',
    marketContext: {
      SPCX: { spot },
    },
  };
}

type MockStreamOptions = {
  delayMs?: number;
  intent?: string;
};

type BuildMockPlanOptions = {
  marketSpots?: Record<string, number>;
};

const TRADE_MARKETS: Record<string, { spot: number; defaultLeverage: number }> = {
  BTC: { spot: DEMO_MARKET_SNAPSHOTS.BTC.price, defaultLeverage: 2 },
  ETH: { spot: DEMO_MARKET_SNAPSHOTS.ETH.price, defaultLeverage: 2 },
  AAPL: { spot: DEMO_MARKET_SNAPSHOTS.AAPL.price, defaultLeverage: 2 },
  NVDA: { spot: DEMO_MARKET_SNAPSHOTS.NVDA.price, defaultLeverage: 2 },
  XAU: { spot: DEMO_MARKET_SNAPSHOTS.XAU.price, defaultLeverage: 2 },
  HYPE: { spot: DEMO_MARKET_SNAPSHOTS.HYPE.price, defaultLeverage: 2 },
};
const WATCH_ONLY_MARKETS = new Set(['NEAR', 'ZEC']);

const TRADE_MARKET_ALIASES: Record<string, string> = {
  'NEAR PROTOCOL': 'NEAR',
  ZCASH: 'ZEC',
};
const KNOWN_UNSUPPORTED_ASSETS = ['SOL', 'DOGE', 'XRP', 'SUI', 'TAO', 'WLD', 'ADA', 'AVAX', 'LINK', 'DOT', 'UNI', 'PEPE', 'BONK'];
const SUPPORTED_ASSET_COPY = 'BTC, SPCX, HYPE, NEAR, ZEC, ETH, AAPL, NVDA, or XAU';

function parseNumber(value: string) {
  return Number(value.replace(/,/g, ''));
}

function extractTradeAsset(intent: string): string | null {
  const upper = intent.toUpperCase();
  if (upper.includes('SPCX')) return 'SPCX';
  for (const [alias, symbol] of Object.entries(TRADE_MARKET_ALIASES)) {
    if (upper.includes(alias)) return symbol;
  }
  for (const asset of WATCH_ONLY_MARKETS) {
    if (upper.includes(asset)) return asset;
  }
  return Object.keys(TRADE_MARKETS).find(asset => upper.includes(asset)) ?? null;
}

function detectUnsupportedAsset(intent: string): string | null {
  if (!/\b(accumulate|buy|long|short|trade|setup|watch|build|dip|dips|deep|pullback)\b/i.test(intent)) return null;
  for (const symbol of KNOWN_UNSUPPORTED_ASSETS) {
    if (new RegExp(`\\b${symbol}\\b`, 'i').test(intent)) return symbol;
  }
  return null;
}

function looksLikeMarketPulseIntent(intent: string): boolean {
  return /\b(hot|alpha|trend|trending|momentum|market pulse|what'?s moving|breakout|price discovery)\b/i.test(intent);
}

function looksLikeFindMoneyIntent(intent: string): boolean {
  return /\b(find money|bank|banking|spending|budget|salary|expenses|subscriptions|money to invest)\b/i.test(intent);
}

function looksLikeScanPositionsIntent(intent: string): boolean {
  return /\b(scan positions|my positions|my holds|holdings|portfolio scan|wallet scan|hurt my holds|affect my holds|risk alerts?)\b/i.test(intent);
}

function extractCollateral(intent: string, fallback = 50) {
  const usdc = intent.match(/(\d[\d,]*(?:\.\d+)?)\s*USDC/i);
  if (usdc) return parseNumber(usdc[1]);
  const dollars = Array.from(intent.matchAll(/\$(\d[\d,]*(?:\.\d+)?)/g)).map(m => parseNumber(m[1]));
  if (dollars.length === 0) return fallback;
  const tradeSized = dollars.find(amount => amount > 0 && amount <= 250);
  return tradeSized ?? fallback;
}

function extractTotalAmount(intent: string): number | null {
  const dollars = Array.from(intent.matchAll(/\$(\d[\d,]*(?:\.\d+)?)/g)).map(m => parseNumber(m[1]));
  const usdc = Array.from(intent.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*USDC/gi)).map(m => parseNumber(m[1]));
  return [...dollars, ...usdc].find(value => value >= 500) ?? null;
}

function extractYieldAmount(intent: string, fallback = 800) {
  const dollars = Array.from(intent.matchAll(/\$(\d[\d,]*(?:\.\d+)?)/g)).map(m => parseNumber(m[1]));
  const usdc = Array.from(intent.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*USDC/gi)).map(m => parseNumber(m[1]));
  const candidates = [...dollars, ...usdc].filter(v => v >= 100);
  return candidates[0] ?? fallback;
}

function extractLeverage(intent: string, fallback = 2) {
  const match = intent.match(/(\d+(?:\.\d+)?)\s*x/i);
  return match ? Number(match[1]) : fallback;
}

function extractDirection(intent: string): 'long' | 'short' {
  return /\b(short|sell|hedge)\b/i.test(intent) ? 'short' : 'long';
}

function checks(collateral: number, leverage: number) {
  return [
    { name: 'tradingEnabled', passed: true },
    { name: 'maxCollateral', passed: true, limit: 250, value: collateral },
    { name: 'maxLeverage', passed: true, limit: 20, value: leverage },
  ];
}

function featurePlan(intent: string, route: 'find_money' | 'portfolio_scan'): Plan {
  const isFindMoney = route === 'find_money';
  return {
    ...MOCK_PLAN,
    planId: isFindMoney ? 'mock-find-money' : 'mock-scan-positions',
    intent,
    legs: [],
    reasoning: isFindMoney
      ? 'Prism would scan bank spending, surface avoidable expenses, and turn found cash into an investable plan. This public preview is read-only; no bank connection or transaction is sent.'
      : 'Prism would scan your holdings and rank alerts that could affect your positions. This public preview is read-only; no wallet scan or transaction is sent.',
    marketContext: {},
    checks: [{ name: 'readOnlyPreview', passed: true }],
    planner: {
      route,
      interpretedIntent: isFindMoney ? 'Find money to invest from spending' : 'Scan positions for personalized alerts',
      confidence: 'high',
      assumptions: [],
      needsClarification: false,
      clarificationQuestion: null,
      userFacingSummary: isFindMoney
        ? 'Scan spending for avoidable expenses and investable cash.'
        : 'Scan holdings for catalysts and risks that matter.',
      display: {
        title: isFindMoney ? 'Find money to invest' : 'Scan your positions',
        summary: isFindMoney
          ? 'Prism will look for spending you can turn into investable cash.'
          : 'Prism will watch what can affect your holdings.',
        chips: isFindMoney ? ['Bank scan', 'Spending', 'Investable cash'] : ['Holdings', 'Alerts', 'What matters'],
        safetyNote: 'Preview only · no transaction sent',
        detailNote: isFindMoney
          ? 'This preview shows the flow without connecting a real bank account.'
          : 'Signals are ranked for review before any action.',
      },
      action: isFindMoney ? 'find_cash' : 'scan_positions',
      levelsFocus: [],
    },
    network: 'preview-read-only',
  };
}

function watchOnlyMarketPlan(intent: string, asset: string): Plan {
  const market = DEMO_MARKET_SNAPSHOTS[asset];
  return {
    ...MOCK_PLAN,
    planId: `mock-${asset.toLowerCase()}-watch-only`,
    intent,
    legs: [],
    reasoning: `${asset} is watch-only here. Prism can track levels and market context, but it is not staged for Ostium trading until support is confirmed. No transaction is sent.`,
    marketContext: market ? { [asset]: { spot: market.price } } : {},
    checks: [
      { name: 'readOnlyPreview', passed: true },
      { name: 'infoOnlyMarket', passed: true },
    ],
    planner: {
      route: 'market_pulse',
      interpretedIntent: `${asset} watch-only market`,
      confidence: 'high',
      assumptions: [`${asset} is watch-only until Ostium support is confirmed`],
      needsClarification: false,
      clarificationQuestion: null,
      userFacingSummary: `${asset} is watch-only here, so Prism can track levels but will not stage an Ostium trade.`,
      display: {
        title: `${asset} watchlist`,
        summary: `${asset} is watch-only here. Prism can track levels, but it will not stage an Ostium trade.`,
        chips: [asset, 'Watch only', 'No trade'],
        safetyNote: 'Preview only · no transaction sent',
        detailNote: `${asset} is not staged for Ostium trading until support is confirmed.`,
      },
      action: 'explain',
      levelsFocus: market ? [market.keyLevel, market.momentum] : [],
    },
    network: 'preview-read-only',
  };
}

export function buildMockPlan(intent = MOCK_INTENT, options: BuildMockPlanOptions = {}): Plan {
  if (looksLikeFindMoneyIntent(intent)) return featurePlan(intent, 'find_money');
  if (looksLikeScanPositionsIntent(intent)) return featurePlan(intent, 'portfolio_scan');

  const asset = extractTradeAsset(intent);
  if (asset && WATCH_ONLY_MARKETS.has(asset)) return watchOnlyMarketPlan(intent, asset);
  if (asset === 'SPCX') return buildSpcxPlan(intent, options.marketSpots?.SPCX);

  if (!asset) {
    const unsupportedAsset = detectUnsupportedAsset(intent);
    if (unsupportedAsset) {
      return {
        ...MOCK_PLAN,
        planId: `mock-unsupported-${unsupportedAsset.toLowerCase()}`,
        intent,
        legs: [],
        reasoning: `${unsupportedAsset} is not available in this demo yet. Try ${SUPPORTED_ASSET_COPY}. This is a mock preview, so no transaction is sent.`,
        marketContext: {},
        checks: [
          { name: 'readOnlyPreview', passed: true },
          { name: 'needsMoreDetail', passed: true },
          { name: 'unsupportedAsset', passed: true },
        ],
        network: 'preview-read-only',
      };
    }

    if (looksLikeMarketPulseIntent(intent)) return buildSpcxPlan(intent, options.marketSpots?.SPCX);

    const amount = extractYieldAmount(intent);
    return {
      ...MOCK_PLAN,
      planId: 'mock-yield-plan',
      intent,
      legs: [{ type: 'yield', venue: 'demoVault', asset: 'USDC', amount }],
      reasoning: `${amount} USDC is routed into sUSDai-style stable yield. This is a mock preview, so no transaction is sent.`,
      marketContext: {},
      checks: checks(0, 1),
    };
  }

  const market = TRADE_MARKETS[asset];
  const collateral = extractCollateral(intent);
  const leverage = extractLeverage(intent, market.defaultLeverage);
  const direction = extractDirection(intent);
  const sl = direction === 'long' ? market.spot * 0.94 : market.spot * 1.06;
  const tp = direction === 'long' ? market.spot * 1.08 : market.spot * 0.92;
  const yieldAmount = wantsIdleYield(intent) ? Math.max(0, (extractTotalAmount(intent) ?? collateral + 800) - collateral) : 0;
  const legs: Plan['legs'] = [
    {
      type: 'perp',
      venue: 'ostium',
      asset,
      direction,
      collateral,
      leverage,
      slippagePct: 0.5,
      sl: Math.round(sl * 100) / 100,
      tp: Math.round(tp * 100) / 100,
    },
  ];
  if (yieldAmount > 0) legs.push({ type: 'yield', venue: 'demoVault', asset: 'USDC', amount: yieldAmount });

  return {
    ...MOCK_PLAN,
    planId: `mock-${asset.toLowerCase()}-setup`,
    intent,
    legs,
    reasoning: yieldAmount > 0
      ? `${collateral} USDC is reserved for a ${leverage}x ${asset} ${direction} setup and ${yieldAmount} USDC is parked in sUSDai-style stable yield. Prism marks this for preview; no transaction is sent.`
      : `${collateral} USDC is reserved for a ${leverage}x ${asset} ${direction} setup. Prism marks the entry, stop, and target for preview; no transaction is sent.`,
    marketContext: {
      [asset]: { spot: market.spot },
    },
    checks: checks(collateral, leverage),
  };
}

// Scripted layer sequence — timing calibrated to read as "AI is working":
// Layers 0-1 snap fast (~350ms each), layer 2 "plan" lingers longer (~900ms),
// layer 3 wraps up (~400ms). Total ~2.5-3s before plan card rises in.
function scriptedLayers(plan: Plan): LayerEvent[] {
  return [
  { layer: 0, name: 'guard',      status: 'started' },
  { layer: 0, name: 'guard',      status: 'passed' },
  { layer: 1, name: 'sanitize',   status: 'started' },
  { layer: 1, name: 'sanitize',   status: 'passed' },
  { layer: 2, name: 'plan',       status: 'started' },
  {
    layer: 2, name: 'plan', status: 'passed',
    plan: { legs: plan.legs, condition: null, reasoning: plan.reasoning, marketContext: plan.marketContext },
  },
  { layer: 3, name: 'guardrails', status: 'started' },
  { layer: 3, name: 'guardrails', status: 'passed', checks: plan.checks },
  ];
}

// Per-event delays (ms): guard×2, sanitize×2, plan-start, plan-pass (longer AI pause), guardrails×2
const EVENT_DELAYS = [280, 280, 300, 300, 340, 860, 320, 320];

/**
 * Simulate streamIntent with timing calibrated for a ~2.7s total cadence.
 * The plan layer pauses longer (~860ms) to sell the "AI thinking" moment.
 * delayMs is a multiplier applied to each slot (1.0 = default, 0 = instant).
 */
export async function mockStreamIntent(
  onLayer: (evt: LayerEvent) => void,
  onDone: (evt: DoneEvent) => void,
  options: number | MockStreamOptions = 1,
): Promise<void> {
  const delayMs = typeof options === 'number' ? options : options.delayMs ?? 1;
  const intent = typeof options === 'number' ? MOCK_INTENT : options.intent ?? MOCK_INTENT;
  const plan = buildMockPlan(intent);
  const layers = scriptedLayers(plan);
  for (let i = 0; i < layers.length; i++) {
    const wait = Math.round(EVENT_DELAYS[i] * delayMs);
    await new Promise(r => setTimeout(r, wait));
    onLayer(layers[i]);
  }
  // Small pause before done to let guardrails "register" before plan card rises
  await new Promise(r => setTimeout(r, Math.round(220 * delayMs)));
  onDone({ ...plan, status: 'awaiting_approval' });
}

// ── Risk alert mock data (v2.2) ───────────────────────────────────────────────

/** Mock protection plan — closes 85% of both tokenized gold positions */
export const MOCK_ALERT_PLAN: Plan = {
  planId: 'e3b7c9a2-11d4-4f38-b5e1-9a0cd2f81234',
  user: MOCK_USER,
  intent: '[protection] Counterfeit vulnerability in tokenized gold protocol — close gold exposure',
  legs: [
    { type: 'close', venue: 'ostium', asset: 'XAU', tradeIndex: 0, fraction: 0.85 },
    { type: 'close', venue: 'ostium', asset: 'XAU', tradeIndex: 1, fraction: 0.85 },
  ],
  condition: null,
  reasoning: 'Counterfeit vulnerability disclosed in a tokenized gold protocol. Closing 85% of both XAU positions returns 66.64 USDC to your wallet and caps exposure at 11.76 USDC.',
  marketContext: {},
  checks: [
    { name: 'tradingEnabled', passed: true },
    { name: 'maxCollateral',  passed: true, limit: 250, value: 0 },
    { name: 'maxLeverage',    passed: true, limit: 20,  value: 0 },
  ],
  status: 'awaiting_approval',
  network: 'arbitrum-sepolia',
  createdAt: Date.now(),
  expiresAt: Date.now() + 900_000,
};

/** High-impact risk alert payload (impactScore 91) */
export const MOCK_RISK_ALERT: RiskAlertPayload = {
  plan: MOCK_ALERT_PLAN,
  impactScore: 91,
  headline: 'Counterfeit vulnerability disclosed in a tokenized gold protocol',
  reasoning: 'A critical smart-contract vulnerability was found in a major tokenized gold vault. Your gold exposure (78.40 USDC across 2 positions) is at direct risk. Closing 85% of both positions is recommended.',
};


// ── Spending analysis mock data (v2.3 flywheel) ──────────────────────────────

// Re-export types for backward compat
export type { Subscription, SpendingAnalysis };

// ~9 monthly subscriptions per spec
export const MOCK_SPENDING: SpendingAnalysis = {
  count: 9,
  totalMonthly: 103.36,
  totalAnnual: 1240.32,
  currency: 'EUR',
  subscriptions: [
    { merchant: 'Netflix',      amount: 13.49, cadence: 'monthly', monthlyEquivalent: 13.49, category: 'Video' },
    { merchant: 'Spotify',      amount: 10.99, cadence: 'monthly', monthlyEquivalent: 10.99, category: 'Music' },
    { merchant: 'Deezer',       amount: 11.99, cadence: 'monthly', monthlyEquivalent: 11.99, category: 'Music' },
    { merchant: 'Apple iCloud', amount:  2.99, cadence: 'monthly', monthlyEquivalent:  2.99, category: 'Cloud storage' },
    { merchant: 'Google One',   amount:  9.99, cadence: 'monthly', monthlyEquivalent:  9.99, category: 'Cloud storage' },
    { merchant: 'Dropbox Plus', amount: 11.99, cadence: 'monthly', monthlyEquivalent: 11.99, category: 'Cloud storage' },
    { merchant: 'NordVPN',      amount: 11.99, cadence: 'monthly', monthlyEquivalent: 11.99, category: 'Software' },
    { merchant: 'Audible',      amount:  9.95, cadence: 'monthly', monthlyEquivalent:  9.95, category: 'Audiobooks' },
    { merchant: 'Free Mobile',  amount: 19.99, cadence: 'monthly', monthlyEquivalent: 19.99, category: 'Telecom' },
  ],
  observations: [
    '2 music streaming services: Spotify, Deezer',
    '3 cloud storage services: iCloud, Google One, Dropbox',
  ],
};
