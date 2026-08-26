import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import type { LayerEvent, DoneEvent, Plan, Leg, PerpLeg } from '../lib/types';
import { PlanChart } from '../components/PlanChart';
import { MarketSourceBadge } from '../components/MarketSourceBadge';
import { MOCK_INTENT, MOCK_PLAN, mockStreamIntent } from '../lib/mock';
import { ASSETS } from '../lib/assets';
import { planPrimaryActionLabel, planSuccessCopy } from '../lib/plan-display';

const EASING = 'cubic-bezier(0.2,0,0,1)';

const press = (s = 0.9) => ({
  onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = `scale(${s})`; },
  onPointerUp: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; },
  onPointerLeave: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; },
});

// 4 engine nodes ← real pipeline layers 0..3
const NODE_LABELS = ['Reading request', 'Finding signal', 'Building preview', 'Safety check'];
type NodeState = 'idle' | 'active' | 'done' | 'error';
const ENGINE_RECOVERY_MS = 5200;
const ENGINE_RECOVERY_REASON = 'engine_recovery';

type SuggestedChip = { label: string; submit: string; hero?: boolean };

const DEFAULT_CHIPS: SuggestedChip[] = [
  { label: 'SPCX price discovery', hero: true,
    submit: 'Put $1,000 to work: $200 SPCX at 2x, $800 in sUSDai' },
  { label: 'Review SPCX setup', submit: 'Reserve 200 USDC for a 2x SPCX long setup' },
  { label: 'Park idle in sUSDai', submit: 'Put 800 USDC of idle capital into sUSDai-style yield' },
  { label: 'Supply and unlocks', submit: 'Analyze SPCX supply, float, and unlock risk before staging a trade' },
];

const WATCH_ONLY_SUGGESTIONS = new Set(['NEAR', 'ZEC']);
const ASSET_ALIASES: Record<string, string[]> = {
  HYPE: ['HYPE'],
  NEAR: ['NEAR', 'NEAR PROTOCOL'],
  ZEC: ['ZEC', 'ZCASH'],
  XAU: ['XAU', 'GOLD'],
};

function detectSuggestedAsset(text: string): string | null {
  const upper = text.toUpperCase();
  for (const asset of ASSETS) {
    const aliases = ASSET_ALIASES[asset.symbol] ?? [asset.symbol, asset.name.toUpperCase()];
    if (aliases.some(alias => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(upper))) {
      return asset.symbol;
    }
  }
  return null;
}

function suggestionsForText(text: string): SuggestedChip[] {
  const asset = detectSuggestedAsset(text);
  if (!asset || asset === 'SPCX') return DEFAULT_CHIPS;

  if (WATCH_ONLY_SUGGESTIONS.has(asset)) {
    return [
      { label: `${asset} watchlist`, hero: true, submit: `Build a ${asset} watchlist with catalysts, levels, and risk alerts` },
      { label: `${asset} dip alerts`, submit: `Watch ${asset} dips and alert me before staging a trade` },
      { label: `${asset} catalysts`, submit: `Track ${asset} catalysts, unlocks, and market signals` },
      { label: `Compare ${asset}`, submit: `Compare ${asset} momentum with BTC, ETH, and HYPE` },
    ];
  }

  return [
    { label: `${asset} dip setup`, hero: true, submit: `Build a 2x long setup on ${asset} with 50 USDC` },
    { label: `${asset} key levels`, submit: `Show ${asset} entry, stop, target, and risk levels` },
    { label: `Protect ${asset}`, submit: `Build a downside protection plan for ${asset}` },
    { label: `${asset} catalysts`, submit: `Track ${asset} market catalysts and momentum` },
  ];
}

function AssetTile({ symbol, size = 26 }: { symbol: string; size?: number }) {
  const base: React.CSSProperties = { width: size, height: size, borderRadius: Math.round(size * 0.27), flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' };
  const s = symbol.toUpperCase();
  if (s === 'SPCX') return <div style={{ ...base, background: '#07111f' }}><img src="/brand/spcx-logo.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (s === 'BTC') return <div style={base}><img src="/brand/btc-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} /></div>;
  if (s === 'HYPE') return <div style={{ ...base, background: '#0f3430' }}><img src="/brand/hype-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (s === 'NEAR') return <div style={{ ...base, background: '#00ec99' }}><img src="/brand/near-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (s === 'ZEC') return <div style={{ ...base, background: '#efb33b' }}><img src="/brand/zec-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (s === 'AAPL') return <div style={{ ...base, background: '#1d1d1f' }}><img src="/brand/apple-logo.svg" alt="" style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }} /></div>;
  if (s === 'ETH') return <div style={base}><img src="/brand/eth-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} /></div>;
  if (s === 'NVDA') return <div style={base}><img src="/brand/nvda-logo-v2.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} /></div>;
  if (s === 'XAU') return <div style={{ ...base, background: 'linear-gradient(135deg,#f5d273,#b8893a)', color: '#3a2a0a', fontFamily: 'var(--mono)', fontSize: size * 0.37, fontWeight: 700 }}>Au</div>;
  if (s === 'USDC') return <div style={{ ...base, background: '#2775ca', color: '#fff', fontFamily: 'var(--mono)', fontSize: size * 0.32, fontWeight: 700 }}>$</div>;
  return <div style={{ ...base, background: 'var(--card-2)', color: 'var(--text-2)', fontWeight: 700, fontSize: size * 0.4 }}>{s[0]}</div>;
}

function legView(leg: Leg): { sym: string; ticker: string; l1: string; l2: string } {
  if (leg.type === 'perp') return { sym: leg.asset, ticker: leg.asset, l1: `${leg.direction === 'long' ? 'Long' : 'Short'} ${leg.leverage}×`, l2: `$${leg.collateral}` };
  if (leg.type === 'yield') return { sym: 'USDC', ticker: 'sUSDai', l1: 'Idle yield', l2: `$${leg.amount}` };
  return { sym: (leg as { asset?: string }).asset || 'XAU', ticker: (leg as { asset?: string }).asset || 'Close', l1: 'Close', l2: '' };
}

function previewChipsFromText(text: string): string[] {
  const upper = text.toUpperCase();
  const chips: string[] = [];
  const push = (value: string) => { if (!chips.includes(value) && chips.length < 4) chips.push(value); };

  for (const asset of ['SPCX', 'HYPE', 'NEAR', 'ZEC', 'BTC', 'ETH', 'AAPL', 'NVDA', 'XAU']) {
    if (upper.includes(asset) || (asset === 'HYPE' && /\bhype\b/i.test(text)) || (asset === 'ZEC' && /\bzcash\b/i.test(text))) push(asset);
  }

  const dollars = text.match(/\$(\d[\d,]*(?:\.\d+)?)/);
  const usdc = text.match(/(\d[\d,]*(?:\.\d+)?)\s*USDC/i);
  if (dollars) push(`$${dollars[1]}`);
  else if (usdc) push(`${usdc[1]} USDC`);

  const lev = text.match(/(\d+(?:\.\d+)?)\s*x/i);
  if (lev) push(`${lev[1]}x`);

  if (/\b(dip|dips|deep|pullback)\b/i.test(text)) push('Dip watch');
  else if (/\b(find money|bank|spending|budget|salary|expenses)\b/i.test(text)) push('Bank scan');
  else if (/\b(scan|positions?|holdings|holds|alerts?)\b/i.test(text)) push('Holdings');
  else if (/\b(yield|idle|park|susdai)\b/i.test(text)) push('sUSDai');

  return chips.length > 0 ? chips : ['Reading', 'Safety check'];
}

function displayForPlan(plan: Plan, needsDetail: boolean) {
  const display = plan.planner?.display;
  if (display) return display;

  const firstPerp = plan.legs.find((leg): leg is PerpLeg => leg.type === 'perp');
  if (needsDetail) {
    return {
      title: 'Need one more detail',
      summary: plan.planner?.clarificationQuestion || 'Pick a supported market so Prism can build the preview.',
      chips: ['Pick a market'],
      safetyNote: 'Preview only · no transaction sent',
      detailNote: 'No action can be sent from this public preview.',
    };
  }

  if (firstPerp) {
    return {
      title: firstPerp.direction === 'short' ? `Hedge ${firstPerp.asset}` : `Review ${firstPerp.asset} setup`,
      summary: `Prism will prepare a small ${firstPerp.asset} ${firstPerp.direction} preview.`,
      chips: [firstPerp.asset, `$${firstPerp.collateral}`, `${firstPerp.leverage}x`, firstPerp.direction === 'short' ? 'Hedge' : 'Setup'],
      safetyNote: 'Preview only · no transaction sent',
      detailNote: 'Levels and risk are shown before approval.',
    };
  }

  return {
    title: 'Preview ready',
    summary: plan.reasoning || 'Prism translated the request into a read-only preview.',
    chips: previewChipsFromText(plan.intent),
    safetyNote: 'Preview only · no transaction sent',
    detailNote: 'No action can be sent from this public preview.',
  };
}

function ComprehensionMoment({ plan, states, running, submittedText }: { plan: Plan | null; states: NodeState[]; running: boolean; submittedText: string }) {
  const needsDetail = Boolean(plan?.planner?.needsClarification) || Boolean(plan?.checks.some(check => check.name === 'needsMoreDetail' && check.passed)) || Boolean(plan && plan.legs.length === 0 && !plan.planner);
  const display = plan ? displayForPlan(plan, needsDetail) : null;
  const chips = display?.chips ?? previewChipsFromText(submittedText);
  const currentIndex = Math.max(0, states.findIndex(state => state === 'active'));
  const completedCount = states.filter(state => state === 'done').length;

  return (
    <div style={{
      background: running
        ? 'linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.024))'
        : 'linear-gradient(180deg, rgba(167,139,250,.105), rgba(255,255,255,.025))',
      border: running ? '1px solid rgba(255,255,255,.075)' : '1px solid var(--accent-35)',
      borderRadius: 20,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
      animation: `card-in 300ms ${EASING} both`,
      boxShadow: running ? 'inset 0 1px 0 rgba(255,255,255,.05)' : '0 0 0 1px var(--accent-08), inset 0 1px 0 rgba(255,255,255,.06)',
    }}>
      <div className="prism-scan-line" style={{ opacity: running ? 1 : 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div className="mlbl" style={{ color: running ? 'var(--accent)' : 'var(--text-2)', letterSpacing: '0.13em' }}>
          {running ? 'Prism is reading' : needsDetail ? 'Need detail' : 'Got it'}
        </div>
        {running ? (
          <span className="think-dots"><i /><i /><i /></span>
        ) : (
          <span style={{
            width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: 'var(--accent)', color: '#0a0a0a', animation: 'pop-in 220ms var(--ease) both',
          }}>
            <svg width="10" height="10" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 4.5 L3.8 7 L7.5 2.5" /></svg>
          </span>
        )}
      </div>

      <div style={{ fontSize: running ? 17 : 18, fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1.18, marginBottom: 6 }}>
        {display?.title ?? 'Finding the intent'}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.42, letterSpacing: '-0.005em', marginBottom: 12 }}>
        {display?.summary ?? 'Pulling out the market, size, and action.'}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {chips.slice(0, 4).map((chip, i) => (
          <span key={`${chip}-${i}`} className="mono" style={{
            fontSize: 10.5,
            color: running ? 'var(--text-2)' : '#0d0c12',
            background: running ? 'rgba(255,255,255,.055)' : 'var(--accent)',
            border: running ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(255,255,255,.18)',
            borderRadius: 999,
            padding: '5px 8px',
            letterSpacing: '0.02em',
            animation: `intent-chip-in 260ms ${EASING} ${90 + i * 90}ms both`,
            boxShadow: running ? 'none' : 'inset 0 1px 0 rgba(255,255,255,.35)',
          }}>{chip}</span>
        ))}
      </div>

      {running ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${NODE_LABELS.length}, 1fr)`, gap: 5 }}>
          {NODE_LABELS.map((label, i) => {
            const active = i === currentIndex;
            const done = i < completedCount;
            return (
              <div key={label} title={label} style={{
                height: 3,
                borderRadius: 999,
                background: done || active ? 'var(--accent)' : 'rgba(255,255,255,.075)',
                opacity: done ? 0.85 : active ? 1 : 0.55,
                boxShadow: active ? '0 0 10px var(--accent-55)' : 'none',
                transition: `all 260ms ${EASING}`,
              }} />
            );
          })}
        </div>
      ) : (
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.03em' }}>
          {display?.safetyNote ?? 'Preview only · no transaction sent'}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onApprove, onRefine, approving, previewOnly }: { plan: Plan; onApprove: () => void; onRefine: () => void; approving: boolean; previewOnly: boolean }) {
  const legs = plan.legs || [];
  const cols = Math.min(Math.max(legs.length, 1), 3);
  const planner = plan.planner;
  const infoOnly = plan.checks.some(check => check.name === 'infoOnlyMarket' && check.passed);
  const needsDetail = Boolean(planner?.needsClarification) || plan.checks.some(check => check.name === 'needsMoreDetail' && check.passed) || (!planner && legs.length === 0);
  const briefSignals = !needsDetail && planner?.route === 'market_pulse' && legs.length === 0
    ? (planner.levelsFocus.length > 0 ? planner.levelsFocus : ['Fresh signals routed into product actions'])
    : [];
  const buttonLabel = planPrimaryActionLabel(plan, {
    approving,
    briefSignalsCount: briefSignals.length,
    infoOnly,
    needsDetail,
    previewOnly,
  });
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, animation: `card-in 320ms ${EASING} both` }}>
      <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 14 }}>{needsDetail ? 'Next step' : 'Preview plan'}</div>
      {needsDetail ? (
        <div style={{ background: 'var(--card-2)', border: '1px solid var(--border-2)', borderRadius: 14, padding: '13px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 5 }}>Pick a market</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{planner?.clarificationQuestion || 'Try "accumulate SPCX during dips" or "buy BTC dips with 50 USDC".'}</div>
        </div>
      ) : briefSignals.length > 0 ? (
        <div style={{ background: 'var(--card-2)', border: '1px solid var(--border-2)', borderRadius: 14, padding: '8px 12px', marginBottom: 14 }}>
          {briefSignals.slice(0, 4).map((signal, i) => {
            const parts = signal.split(':');
            return (
              <div key={signal} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: i < Math.min(briefSignals.length, 4) - 1 ? '1px solid var(--border-2)' : 'none' }}>
                <span className="mono" style={{ width: 18, height: 18, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--accent-08)', color: 'var(--accent)', fontSize: 9, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.005em' }}>{parts[0]}</div>
                  {parts[1] && <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{parts.slice(1).join(':').trim()}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 16 }}>
          {legs.map((leg, i) => {
            const v = legView(leg);
            return (
              <div key={i} style={{ background: 'var(--card-2)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, animation: `leg-in 320ms ${EASING} ${100 + i * 80}ms both` }}>
                <div style={{ marginBottom: 2 }}><AssetTile symbol={v.sym} size={26} /></div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em' }}>{v.ticker}</div>
                <div className="mono num" style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{v.l1}</div>
                <div className="mono num" style={{ fontSize: 11, color: 'var(--text-3)' }}>{v.l2}</div>
              </div>
            );
          })}
        </div>
      )}
      {(() => {
        const setup = legs.find(l => l.type === 'perp' && (l.sl || l.tp)) as PerpLeg | undefined;
        const entry = setup ? plan.marketContext?.[setup.asset]?.spot ?? 0 : 0;
        if (!setup || !entry) return null;
        const fmt = (v: number) => Math.round(v).toLocaleString('en-US');
        const pct = (p: number) => `${p >= entry ? '+' : ''}${((p - entry) / entry * 100).toFixed(1)}%`;
        return (
          <div style={{ marginBottom: 16 }}>
            <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 8, color: 'var(--accent)' }}>Agent's setup · {setup.asset}</div>
            {setup.asset === 'SPCX' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <MarketSourceBadge tooltip="Market data from Variational" />
              </div>
            )}
            <div style={{ background: 'var(--card-2)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 8, overflow: 'hidden' }}>
              <PlanChart asset={setup.asset} entry={entry} sl={setup.sl} tp={setup.tp} height={188} />
            </div>
            <div className="mono" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, marginTop: 9 }}>
              <span style={{ color: 'var(--accent)' }}>● Entry ${fmt(entry)}</span>
              {setup.sl ? <span style={{ color: '#f87171' }}>● Stop ${fmt(setup.sl)} ({pct(setup.sl)})</span> : null}
              {setup.tp ? <span style={{ color: '#4ade80' }}>● Target ${fmt(setup.tp)} ({pct(setup.tp)})</span> : null}
            </div>
          </div>
        );
      })()}
      {plan.reasoning && (
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, letterSpacing: '-0.005em', marginBottom: 14 }}>{plan.reasoning}</div>
      )}
      <div className="mono" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 10.5, color: 'var(--text-3)', marginBottom: 16 }}>
        <span>{plan.planner?.display.safetyNote ?? (previewOnly ? 'Preview only · no transaction sent' : 'Checked against your onchain rules')}</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-4)' }} />
        <span>{plan.planner?.display.detailNote ?? (previewOnly ? 'Review before any action' : 'Self-custodial')}</span>
      </div>
      <button onClick={needsDetail ? onRefine : onApprove} disabled={approving} {...press(0.98)} style={{
        width: '100%', background: approving ? 'var(--accent-35)' : 'var(--accent)', color: '#0a0a0a',
        border: 'none', borderRadius: 14, padding: 14, fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em',
        cursor: approving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
        boxShadow: approving ? 'none' : 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.15)',
        transition: `transform 160ms ${EASING}, background 250ms ${EASING}`,
      }}>{buttonLabel}</button>
      {!needsDetail && (
        <button type="button" onClick={onRefine} disabled={approving} {...press(0.98)} style={{
          width: '100%', marginTop: 10, background: 'transparent', color: 'var(--text-2)',
          border: '1px solid var(--border-2)', borderRadius: 14, padding: 12, fontSize: 13,
          fontWeight: 600, letterSpacing: '-0.005em', cursor: approving ? 'default' : 'pointer',
          fontFamily: 'var(--font-sans)', transition: `transform 160ms ${EASING}, border-color 180ms ${EASING}, color 180ms ${EASING}`,
        }}>Edit request</button>
      )}
    </div>
  );
}

function BrandLockup() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>
      <img src="/brand/prism-logo.jpg" alt="Prism" style={{ width: 22, height: 22, borderRadius: 5, display: 'block' }} />
      Prism
    </div>
  );
}

type Phase = 'input' | 'engine' | 'plan' | 'executed';

interface AskProps {
  onBack?: () => void;
  onBell?: () => void;
  onMe?: () => void;
  settled?: boolean;
  initialText?: string;
  initialPlan?: Plan | null;
  autoSubmitInitial?: boolean;
}

export const Ask: React.FC<AskProps> = ({ onBack, onMe, settled = false, initialText = '', initialPlan = null, autoSubmitInitial = false }) => {
  const [inputText, setInputText] = useState(initialText);
  const [submittedText, setSubmittedText] = useState(() => (initialPlan ? initialText : settled ? MOCK_INTENT : ''));
  const [phase, setPhase] = useState<Phase>(() => (initialPlan ? 'plan' : settled ? 'plan' : 'input'));
  const [nodeStates, setNodeStates] = useState<NodeState[]>(() => (initialPlan || settled ? ['done', 'done', 'done', 'done'] : ['idle', 'idle', 'idle', 'idle']));
  const [plan, setPlan] = useState<Plan | null>(() => (initialPlan || (settled ? MOCK_PLAN : null)));
  const [approving, setApproving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSubmitRef = useRef(false);
  const engineRecoveryRef = useRef(0);
  const suggestedChips = suggestionsForText(inputText);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [phase, nodeStates, plan]);

  useEffect(() => {
    let alive = true;
    const refreshSettledMockPlan = async () => {
      if (!settled) return;
      await mockStreamIntent(
        () => {},
        evt => {
          if (alive && evt.status === 'awaiting_approval') setPlan(evt as Plan);
        },
        { delayMs: 0, intent: MOCK_INTENT },
      );
    };
    refreshSettledMockPlan();
    return () => { alive = false; };
  }, [settled]);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setSubmittedText(text.trim());
    setPhase('engine');
    setNodeStates(['idle', 'idle', 'idle', 'idle']);
    setPlan(null);

    const onLayer = (evt: LayerEvent) => {
      setNodeStates(prev => prev.map((s, i) => {
        if (i !== evt.layer) return s;
        if (evt.status === 'passed') return 'done';
        if (evt.status === 'started') return 'active';
        if (evt.status === 'rejected') return 'error';
        return s;
      }));
    };
    const onDone = (evt: DoneEvent) => {
      if (evt.status === 'awaiting_approval') { setPlan(evt as Plan); setPhase('plan'); }
      else { setPhase('plan'); }
    };

    await mockStreamIntent(onLayer, onDone, { intent: text.trim() });
  }, []);

  useEffect(() => {
    if (phase !== 'engine' || !submittedText.trim()) return;
    const recoveryId = ++engineRecoveryRef.current;
    const onLayer = (evt: LayerEvent) => {
      setNodeStates(prev => prev.map((s, i) => {
        if (i !== evt.layer) return s;
        if (evt.status === 'passed') return 'done';
        if (evt.status === 'started') return 'active';
        if (evt.status === 'rejected') return 'error';
        return s;
      }));
    };
    const onDone = (evt: DoneEvent) => {
      if (engineRecoveryRef.current !== recoveryId) return;
      if (evt.status === 'awaiting_approval') setPlan(evt as Plan);
      setPhase('plan');
    };

    const timer = window.setTimeout(() => {
      if (engineRecoveryRef.current !== recoveryId) return;
      setNodeStates(['idle', 'idle', 'idle', 'idle']);
      window.dispatchEvent(new CustomEvent(ENGINE_RECOVERY_REASON));
      void mockStreamIntent(onLayer, onDone, { delayMs: 0, intent: submittedText.trim() });
    }, ENGINE_RECOVERY_MS);

    return () => window.clearTimeout(timer);
  }, [phase, submittedText]);

  useEffect(() => {
    if (!autoSubmitInitial || autoSubmitRef.current || !initialText.trim()) return;
    autoSubmitRef.current = true;
    handleSubmit(initialText);
  }, [autoSubmitInitial, handleSubmit, initialText]);

  const handleApprove = useCallback(async () => {
    if (!plan) return;
    setApproving(true);
    await new Promise(r => setTimeout(r, 800));
    setPhase('executed');
    setApproving(false);
  }, [plan]);

  const handleRefine = useCallback(() => {
    setInputText(submittedText);
    setPlan(null);
    setNodeStates(['idle', 'idle', 'idle', 'idle']);
    setPhase('input');
  }, [submittedText]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(inputText); }
  };

  return (
    <>
      <StatusBar time="9:41" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', flexShrink: 0 }}>
        <button type="button" aria-label="Back to home" onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}><BrandLockup /></button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '0 22px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {submittedText !== '' && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: '18px 18px 6px 18px', padding: '12px 14px', fontSize: 14, lineHeight: 1.4, letterSpacing: '-0.005em' }}>{submittedText}</div>
        )}

        {(phase === 'engine' || phase === 'plan' || phase === 'executed') && (
          <ComprehensionMoment plan={plan} states={nodeStates} running={phase === 'engine'} submittedText={submittedText} />
        )}

        {phase === 'plan' && plan && <PlanCard plan={plan} onApprove={handleApprove} onRefine={handleRefine} approving={approving} previewOnly={true} />}

        {phase === 'executed' && (
          <div style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, animation: `card-in 300ms ${EASING} both` }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'rgba(74,222,128,0.15)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 4.5 L3.8 7 L7.5 2.5" /></svg>
            </div>
            <div>
              {(() => {
                const copy = plan
                  ? planSuccessCopy(plan)
                  : { title: 'Preview approved', detail: 'No transaction was sent' };
                return (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{copy.title}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.04em' }}>{copy.detail}</div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {phase === 'input' && (
          <>
            <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', lineHeight: 1.25 }}>
                What do you want<br /><span style={{ color: 'var(--text-3)' }}>to do today?</span>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '13px 14px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKey} placeholder="e.g. Put $1,000 to work: SPCX and sUSDai…" rows={2}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, resize: 'none', lineHeight: 1.45, fontFamily: 'var(--font-sans)' } as React.CSSProperties} />
                <button aria-label="Send intent" onClick={() => handleSubmit(inputText)} disabled={!inputText.trim()} {...press(0.9)}
                  style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: inputText.trim() ? 'var(--accent)' : 'var(--card-2)', border: 'none', cursor: inputText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `all 200ms ${EASING}` }}>
                  <svg width="14" height="14" viewBox="0 0 17 17" fill="none"><path d="M8.5 14 V3 M3.5 7.5 L8.5 3 L13.5 7.5" stroke={inputText.trim() ? '#0a0a0a' : 'var(--text-4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>

            <div>
              <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 8, marginTop: 4 }}>Suggested</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {suggestedChips.map(c => (
                  <button type="button" key={c.label} onClick={() => { setInputText(c.submit); handleSubmit(c.submit); }} style={{
                    padding: '7px 12px', background: 'var(--card)',
                    border: `1px solid ${c.hero ? 'var(--accent-35)' : 'var(--border-2)'}`,
                    borderRadius: 999, fontSize: 12, color: c.hero ? 'var(--accent)' : 'var(--text-2)', fontWeight: 500,
                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                  }}>{c.label}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ flex: phase === 'input' ? 1 : 'none', minHeight: 8 }} />
      </div>

      <TabBar active="plus" onHomeClick={onBack} onMeClick={onMe} />
    </>
  );
};
