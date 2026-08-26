import React, { useState, useEffect } from 'react';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { AssetLogo } from '../components/AssetLogo';
import { MarketSnapshotChart } from '../components/MarketSnapshotChart';
import { MarketSourceBadge } from '../components/MarketSourceBadge';
import type { AssetMeta } from '../lib/assets';
import { useLivePrices, formatPrice } from '../lib/useLivePrices';
import { formatChangePct, formatSnapshotPrice, getDemoMarketSnapshot } from '../lib/market-snapshots';
import {
  FALLBACK_SPCX_LISTING,
  formatVariationalFunding,
  formatVariationalPrice,
  formatVariationalUsd,
} from '../lib/variational';

const EASING = 'cubic-bezier(0.2,0,0,1)';

interface AssetDetailProps {
  asset: AssetMeta;
  onBack: () => void;
  onAsk: (prefill: string) => void;
  onMe?: () => void;
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%',
  background: 'transparent', border: '1px solid var(--border-2)',
  display: 'grid', placeItems: 'center', cursor: 'pointer',
};

const press = (e: React.PointerEvent, s = 0.97) => { (e.currentTarget as HTMLElement).style.transform = `scale(${s})`; };
const unpress = (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; };

export const AssetDetail: React.FC<AssetDetailProps> = ({ asset, onBack, onAsk, onMe }) => {
  const [watched, setWatched] = useState(false);
  const [read, setRead] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const live = useLivePrices([asset.symbol]);
  const lp = live[asset.symbol];
  const sym = asset.symbol;
  const tradingSoon = asset.tradingEnabled === false;
  const sourceListing = sym === 'SPCX' ? FALLBACK_SPCX_LISTING : null;
  const demoSnapshot = getDemoMarketSnapshot(sym);
  const snapshotPrice = sourceListing?.markPrice ?? lp?.price ?? demoSnapshot?.price ?? 0;
  const snapshotChange = demoSnapshot?.changePct24h ?? 0;
  const priceDisplay = sourceListing
    ? formatVariationalPrice(sourceListing.markPrice)
    : lp && !asset.cta
      ? formatPrice(lp.price)
      : snapshotPrice > 0
        ? formatSnapshotPrice(snapshotPrice)
        : asset.price;
  const changeDisplay = sourceListing ? 'Price discovery' : demoSnapshot ? formatChangePct(demoSnapshot.changePct24h) : asset.change;

  // Agent "reads the chart" → insights reveal (the wow beat).
  useEffect(() => {
    const t = setTimeout(() => setRead(true), 1300);
    return () => clearTimeout(t);
  }, []);

  const up = demoSnapshot ? demoSnapshot.changePct24h >= 0 : asset.changePositive !== false;
  const insights = sourceListing ? [
    { label: 'Mark', val: priceDisplay },
    { label: '24h vol', val: formatVariationalUsd(sourceListing.volume24h) },
    { label: 'OI L/S', val: `${formatVariationalUsd(sourceListing.longOpenInterest)}/${formatVariationalUsd(sourceListing.shortOpenInterest)}` },
    { label: 'Funding', val: formatVariationalFunding(sourceListing.fundingRate, sourceListing.fundingIntervalS), pos: sourceListing.fundingRate >= 0 },
  ] : [
    { label: 'Momentum', val: demoSnapshot?.momentum ?? `${up ? 'Bullish' : 'Bearish'} · 24h`, pos: up },
    { label: '24h', val: changeDisplay ?? 'Snapshot', pos: up },
    { label: 'Key level', val: demoSnapshot?.keyLevel ?? priceDisplay.replace(/\.\d+$/, '') },
  ];
  const buySellLabel = 'Buy & sell';
  const tradeButtons = [
    { label: 'Buy', side: 'Long', bg: '#4ade80' },
    { label: 'Sell', side: 'Short', bg: '#f87171' },
  ] as const;
  const actions = tradingSoon ? [
    { label: 'SPCX price discovery', sub: 'levels and flow', prefill: 'Analyze SPCX price discovery with Variational market data' },
    { label: 'Plan $1k allocation', sub: '200 margin · 800 sUSDai', prefill: 'Put $1,000 to work: $200 SPCX at 2x, $800 in sUSDai' },
    { label: 'Supply and unlocks', sub: 'float risk', prefill: 'Analyze SPCX supply, float, and unlock risk before staging a trade' },
  ] : [
    { label: 'Create a plan', sub: 'Prism drafts it', prefill: `Build me a 2x long setup on ${sym} with 50 USDC` },
    { label: 'Higher risk idea', sub: 'more leverage', prefill: `Long ${sym} with 50 USDC at 5x` },
    { label: 'Protect downside', sub: 'hedge preview', prefill: `Short ${sym} with 50 USDC at 2x` },
    { label: 'What’s driving it', sub: 'news & catalysts', prefill: `What is driving ${sym} today — long it if the case is strong` },
  ];

  return (
    <>
      <StatusBar time="9:41" />

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', flexShrink: 0 }}>
        <button aria-label="Back to home" onClick={onBack} style={{ ...iconBtn, color: 'var(--text-2)' }}>
          <svg width={16} height={16} viewBox="0 0 18 18" fill="none"><path d="M11 4 L6 9 L11 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{asset.name}</span>
        <button aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'} onClick={() => setWatched(w => !w)} style={iconBtn}>
          <svg width={16} height={16} viewBox="0 0 18 18" fill="none">
            <path d="M9 2 L10.7 6.8 H15.9 L11.6 9.7 L13.3 14.5 L9 11.6 L4.7 14.5 L6.4 9.7 L2.1 6.8 H7.3 Z"
              stroke={watched ? 'var(--accent)' : 'var(--text-4)'} strokeWidth="1.4" strokeLinejoin="round" fill={watched ? 'var(--accent)' : 'none'} />
          </svg>
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 24px', scrollbarWidth: 'none' }}>

        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 22px 14px' }}>
          <AssetLogo type={sym} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{asset.sub}</div>
            <div className="num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{priceDisplay}</div>
            {asset.cta ? (
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--accent)' }}>{asset.cta}</div>
            ) : changeDisplay && (
              <div className="mono num" style={{ fontSize: 12.5, fontWeight: 500, marginTop: 4, color: up ? 'var(--green)' : 'var(--red)' }}>
                {changeDisplay}{!sourceListing && <span style={{ color: 'var(--text-4)', fontWeight: 400 }}> 24h</span>}
              </div>
            )}
            {asset.sourceName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
                <MarketSourceBadge sourceName={asset.sourceName} tooltip={asset.sourceTooltip} />
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{asset.tradingStatus ?? 'Trading soon'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <section style={{ padding: '0 0 16px' }}>
          <div style={{ padding: '0 16px' }}>
            <MarketSnapshotChart asset={sym} price={snapshotPrice} changePct={snapshotChange} height={260} />
          </div>
        </section>

        {/* Buy / Sell */}
        <section style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="mlbl" style={{ letterSpacing: '0.12em' }}>{buySellLabel}</div>
            {tradingSoon && (
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {asset.tradingStatus ?? 'Trading soon'}
              </span>
            )}
          </div>
          {tradingSoon ? (
            <button disabled style={{
              width: '100%', height: 50, borderRadius: 14, background: 'var(--card-2)', color: 'var(--text-3)',
              fontWeight: 600, fontSize: 15, fontFamily: 'var(--font-sans)', letterSpacing: 0,
              border: '1px solid var(--border-2)', cursor: 'default',
            }}>Trading soon</button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              {tradeButtons.map(b => (
                <button key={b.label}
                  onClick={() => onAsk(`${b.side} ${sym} with 50 USDC at 2x`)}
                  onPointerDown={e => press(e, 0.97)} onPointerUp={unpress} onPointerLeave={unpress}
                  style={{
                    flex: 1, height: 50, borderRadius: 14, background: b.bg, color: '#0a0a0a',
                    fontWeight: 600, fontSize: 15, fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
                    border: 'none', cursor: 'pointer',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.12)',
                    transition: `transform 0.15s ${EASING}`,
                  }}>{b.label}</button>
              ))}
            </div>
          )}
        </section>

        {/* ── AI copilot block — the differentiator ─────────────── */}
        <section style={{ padding: '0 16px 16px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 15, position: 'relative', overflow: 'hidden' }}>
            {/* spectrum bar while reading */}
            {!read && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#f3aee0,#c4b5fd,#b8a4ff,#7c8cf2,#5cc6e8,#f3aee0)', backgroundSize: '200% 100%', animation: 'spectrum-slide 2.2s linear infinite', opacity: 0.9 }} />
            )}

            {/* Agent header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <img src="/brand/prism-logo.jpg" alt="" style={{ width: 18, height: 18, borderRadius: 5 }} />
              <span className="mlbl" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
                {read ? `Agent read ${asset.name}` : `Reading ${asset.name}`}
              </span>
              {!read && <span className="think-dots"><i /><i /><i /></span>}
            </div>

            {/* Insight chips — revealed after "reading" */}
            {read && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 13 }}>
                {insights.map((ins, i) => (
                  <div key={ins.label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--card-2)', border: '1px solid var(--border-2)', borderRadius: 999,
                    padding: '5px 10px', animation: `leg-in 300ms ${EASING} ${i * 90}ms both`,
                  }}>
                    <span className="mono" style={{ fontSize: 8.5, color: 'var(--text-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ins.label}</span>
                    <span className="mono num" style={{ fontSize: 11, fontWeight: 600, color: ins.pos === undefined ? 'var(--text-2)' : ins.pos ? 'var(--green)' : 'var(--red)' }}>{ins.val}</span>
                  </div>
                ))}
              </div>
            )}

            {read && sourceListing && (
              <div style={{ background: 'var(--card-2)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 11px', marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4 }}>Variational market</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.35 }}>
                  {sourceListing.name}. Bid/ask {formatVariationalPrice(sourceListing.bid ?? sourceListing.markPrice)} / {formatVariationalPrice(sourceListing.ask ?? sourceListing.markPrice)}.
                </div>
              </div>
            )}

            {/* Ask input */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--input)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '9px 11px', marginBottom: 11 }}>
              <input
                value={agentInput}
                onChange={e => setAgentInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && agentInput.trim()) onAsk(`${agentInput.trim()} (${sym})`); }}
                placeholder={`Ask Prism about ${asset.name}…`}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-sans)' }}
              />
              <button
                aria-label="Send asset question"
                disabled={!agentInput.trim()}
                onClick={() => agentInput.trim() && onAsk(`${agentInput.trim()} (${sym})`)}
                {...{ onPointerDown: (e: React.PointerEvent) => { if (agentInput.trim()) press(e, 0.9); }, onPointerUp: unpress, onPointerLeave: unpress }}
                style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: agentInput.trim() ? 'var(--accent)' : 'var(--card-2)', border: 'none', cursor: agentInput.trim() ? 'pointer' : 'default', display: 'grid', placeItems: 'center', transition: `all 180ms ${EASING}` }}>
                <svg width="12" height="12" viewBox="0 0 17 17" fill="none"><path d="M8.5 14 V3 M3.5 7.5 L8.5 3 L13.5 7.5" stroke={agentInput.trim() ? '#0a0a0a' : 'var(--text-4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            {/* Action chips → Ask flow (conviction → execution) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {actions.map((a, i) => (
                <button type="button" key={a.label} onClick={() => onAsk(a.prefill)}
                  onPointerDown={e => press(e, 0.985)} onPointerUp={unpress} onPointerLeave={unpress}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    background: 'var(--card-2)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 12px',
                    color: 'inherit', fontFamily: 'var(--font-sans)', textAlign: 'left',
                    transition: `transform 160ms ${EASING}`,
                    animation: read ? `leg-in 300ms ${EASING} ${250 + i * 70}ms both` : 'none',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12" /></svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{a.label}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{a.sub}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none" stroke="var(--text-4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2.5 L10 7.5 L5 12.5" /></svg>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <TabBar active="home" onHomeClick={onBack} onCenterClick={() => onAsk(asset.askPrefill)} onMeClick={onMe} />
    </>
  );
};
