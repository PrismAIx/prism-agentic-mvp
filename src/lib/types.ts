export interface PerpLeg { type: 'perp'; venue: 'ostium'; asset: string; direction: 'long' | 'short'; collateral: number; leverage: number; slippagePct: number; sl?: number; tp?: number; }
export interface YieldLeg { type: 'yield'; venue: 'demoVault'; asset: 'USDC'; amount: number; }
export interface CloseLeg { type: 'close'; venue: 'ostium'; asset: string; tradeIndex: number; fraction: number; }
export type Leg = PerpLeg | YieldLeg | CloseLeg;
export interface Condition { type: 'price'; asset: string; op: 'lt' | 'gt'; value: number; }
export interface Check { name: string; passed: boolean; limit?: number; value?: number; }
export interface PlannerPreview { route: 'trade_setup' | 'market_pulse' | 'portfolio_scan' | 'find_money' | 'yield' | 'education' | 'clarify'; interpretedIntent: string; confidence: 'high' | 'medium' | 'low'; assumptions: string[]; needsClarification: boolean; clarificationQuestion: string | null; userFacingSummary: string; display: { title: string; summary: string; chips: string[]; safetyNote: string; detailNote: string }; action: 'stage_trade' | 'watch_dips' | 'scan_positions' | 'find_cash' | 'park_yield' | 'explain' | 'none'; levelsFocus: string[]; }
export type PlanStatus = 'awaiting_approval' | 'approved_pending_trigger' | 'executed' | 'rejected' | 'failed' | 'expired';
export interface Plan { planId: string; user: string; intent: string; legs: Leg[]; condition: Condition | null; reasoning: string; marketContext: Record<string, { spot: number; isMarketOpen?: boolean }>; checks: Check[]; planner?: PlannerPreview; status: PlanStatus; network: string; createdAt: number; expiresAt: number; }
export interface LayerEvent { layer: number; name: 'guard' | 'sanitize' | 'plan' | 'guardrails'; status: 'started' | 'passed' | 'rejected'; reason?: string; plan?: Pick<Plan, 'legs' | 'condition' | 'reasoning' | 'marketContext'>; checks?: Check[]; }
export type DoneEvent = (Plan & { status: 'awaiting_approval' }) | { status: 'rejected'; layer: number; reason: string; checks?: Check[] } | { status: 'error'; reason: string };
export interface Subscription { merchant: string; amount: number; cadence: 'weekly' | 'monthly' | 'quarterly' | 'yearly'; monthlyEquivalent: number; category: string; }
export interface SpendingAnalysis { count: number; totalMonthly: number; totalAnnual: number; currency: string; subscriptions: Subscription[]; observations: string[]; }
export interface RiskAlertPayload { plan: Plan | null; impactScore: number; headline: string; reasoning: string; }
