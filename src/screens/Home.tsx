import React from 'react';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { ASSETS } from '../lib/assets';
import { useLivePrices, formatPrice } from '../lib/useLivePrices';

const EASING = 'cubic-bezier(0.2,0,0,1)';

const press = (s = 0.97) => ({
  onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = `scale(${s})`; },
  onPointerUp: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; },
  onPointerLeave: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; },
});

// Rounded-square brand logo tiles (real marks), from the redesign.
function AssetLogo({ symbol, monogram }: { symbol: string; monogram: string }) {
  const size = 30;
  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff',
  };
  if (symbol === 'BTC') return <div style={base}><img src="/brand/btc-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} /></div>;
  if (symbol === 'SPCX') return <div style={{ ...base, background: '#07111f' }}><img src="/brand/spcx-logo.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (symbol === 'HYPE') return <div style={{ ...base, background: '#0f3430' }}><img src="/brand/hype-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (symbol === 'NEAR') return <div style={{ ...base, background: '#00ec99' }}><img src="/brand/near-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (symbol === 'ZEC') return <div style={{ ...base, background: '#efb33b' }}><img src="/brand/zec-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (symbol === 'AAPL') return <div style={{ ...base, background: '#1d1d1f' }}><img src="/brand/apple-logo.svg" alt="" style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }} /></div>;
  if (symbol === 'ETH') return <div style={base}><img src="/brand/eth-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} /></div>;
  if (symbol === 'NVDA') return <div style={base}><img src="/brand/nvda-logo-v2.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} /></div>;
  if (symbol === 'XAU') return <div style={{ ...base, background: 'linear-gradient(135deg,#f5d273,#b8893a)', color: '#3a2a0a', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>Au</div>;
  return <div style={{ ...base, background: 'var(--card-2)', color: 'var(--text-2)', fontWeight: 700 }}>{monogram}</div>;
}

function WatchIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" stroke="var(--accent-35)" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="4.2" stroke="var(--accent)" strokeWidth="1.4" />
      <path d="M16 16 L25 10.5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 22.5 A11 11 0 0 1 23.8 6.8" stroke="#5cc6e8" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24.5" cy="10" r="2.2" fill="#5cc6e8" />
      <path d="M11 25 L16 28 L21 25" stroke="var(--text-3)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
    </svg>
  );
}

function PulseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3.6 13.1 H7.1 L9.2 7.8 L12.3 17.1 L15.1 10.4 L16.8 13.1 H20.4" stroke="var(--accent)" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.6 6.8 C8.1 4.8 11 4.1 14.3 4.8 C16.2 5.2 17.8 6 19.2 7.1" stroke="#5cc6e8" strokeWidth="1.25" strokeLinecap="round" opacity="0.9" />
      <circle cx="19.1" cy="7.1" r="1.7" fill="#5cc6e8" />
    </svg>
  );
}

function MoneyIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5.5 7.5 H17.5 C19 7.5 20 8.45 20 9.85 V16.15 C20 17.55 19 18.5 17.5 18.5 H5.5 C4 18.5 3 17.55 3 16.15 V9.85 C3 8.45 4 7.5 5.5 7.5 Z" stroke="var(--accent)" strokeWidth="1.35" />
      <path d="M6.5 7.5 C7.25 5.95 8.75 5.2 10.9 5.2 H15.6" stroke="#5cc6e8" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="16.2" cy="13" r="1.4" fill="#5cc6e8" />
      <path d="M7 12 H11.2" stroke="var(--text-3)" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M7 14.8 H12.8" stroke="var(--text-3)" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}

function FlowLinksIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 7.5 H9.5 C12.8 7.5 12.8 16.5 16.2 16.5 H19" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 16.5 H8.2 C10 16.5 10.8 13.8 12 12" stroke="#5cc6e8" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="7.5" r="2.3" stroke="var(--accent-35)" strokeWidth="1.3" />
      <circle cx="19" cy="16.5" r="2.3" fill="#5cc6e8" opacity="0.9" />
    </svg>
  );
}

function ActionChevron() {
  return (
    <span aria-hidden="true" style={{
      width: 24,
      height: 24,
      borderRadius: 8,
      display: 'grid',
      placeItems: 'center',
      color: 'rgba(246,246,248,.42)',
      flexShrink: 0,
    }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3 L8.5 6.5 L5 10" />
      </svg>
    </span>
  );
}

interface HomeProps {
  onAsk?: () => void;
  onMarketPulse?: () => void;
  onFlowLinks?: () => void;
  onBell?: () => void;
  onLive?: () => void;
  onAsset?: (symbol: string) => void;
  onDeposit?: () => void;
  onOptimize?: () => void;
  onMenu?: () => void;
}

export const Home: React.FC<HomeProps> = ({ onAsk, onMarketPulse, onFlowLinks, onLive, onAsset, onDeposit, onOptimize, onMenu, onBell }) => {
  const live = useLivePrices(ASSETS.map(a => a.symbol));

  return (
    <>
      <StatusBar time="9:41" />

      <div className="screen-in" style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--text-2)' }}>Prism preview</span>
          </div>
          <button onClick={onDeposit} {...press(0.95)} style={{
            padding: '7px 13px', background: 'rgba(167,139,250,.12)', color: 'var(--text)',
            border: '1px solid rgba(167,139,250,.22)', borderRadius: 999, fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', transition: `transform 160ms ${EASING}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 1.5 V8" /><path d="M2 5 L5 8 L8 5" /></svg>
            Deposit
          </button>
        </div>

        <div className="mono" style={{ padding: '0 22px 10px', fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.08em' }}>Synthetic demo data · read-only</div>

        {/* Balance */}
        <div style={{ padding: '10px 22px 16px' }}>
          <div className="mlbl" style={{ marginBottom: 8, opacity: 0.72 }}>Total balance</div>
          <div className="num" style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 7 }}>
            $12,847.30
          </div>
          <div className="mono num" style={{ fontSize: 10.5, color: 'var(--green)', fontWeight: 500, letterSpacing: '0.02em', opacity: 0.85 }}>
            +$282 · +2.2% today
          </div>
        </div>

        <div style={{ margin: '0 16px 16px' }}>
          <div className="mlbl" style={{ margin: '0 6px 8px', opacity: 0.72 }}>Your Edge</div>
          <div style={{
            background: 'rgba(255,255,255,.02)',
            border: '1px solid rgba(255,255,255,.055)', borderRadius: 15,
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.025)',
          }}>
            <button aria-label="Open Market Pulse" onClick={onMarketPulse ?? onAsk} {...press(0.99)} style={{
              width: '100%', padding: '11px 12px', border: 'none', background: 'transparent',
              color: 'inherit', fontFamily: 'var(--font-sans)', display: 'flex',
              alignItems: 'center', gap: 10, cursor: 'pointer', transition: `transform 160ms ${EASING}`,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: 'rgba(92,198,232,.035)', display: 'grid', placeItems: 'center', opacity: 0.88 }}>
                <PulseIcon size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 650, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  <span>Market Pulse</span>
                  <span data-market-pulse-signal aria-hidden="true" style={{
                    width: 4, height: 4, borderRadius: '50%', display: 'inline-block',
                    background: 'rgba(92,198,232,.88)', boxShadow: '0 0 7px rgba(92,198,232,.32)',
                  }} />
                 </div>
                 <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, letterSpacing: 0 }}>
                  Fresh market signals
                 </div>
               </div>
               <ActionChevron />
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,.038)', margin: '0 12px 0 54px' }} />

            <button aria-label="Open Playbooks" onClick={onFlowLinks ?? onAsk} {...press(0.99)} style={{
              width: '100%', padding: '11px 12px', border: 'none', background: 'transparent',
              color: 'inherit', fontFamily: 'var(--font-sans)', display: 'flex',
              alignItems: 'center', gap: 10, cursor: 'pointer', transition: `transform 160ms ${EASING}`,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: 'rgba(167,139,250,.035)', display: 'grid', placeItems: 'center', opacity: 0.88 }}>
                <FlowLinksIcon size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                 <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text)', letterSpacing: '-0.01em' }}>Playbooks</div>
                 <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, letterSpacing: 0 }}>
                  Investable ideas
                 </div>
               </div>
              <ActionChevron />
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,.038)', margin: '0 12px 0 54px' }} />

            <button aria-label="Scan Positions" onClick={onBell} {...press(0.99)} style={{
              width: '100%', padding: '11px 12px', border: 'none', background: 'transparent',
              color: 'inherit', fontFamily: 'var(--font-sans)', display: 'flex',
              alignItems: 'center', gap: 10, cursor: 'pointer', transition: `transform 160ms ${EASING}`,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: 'rgba(167,139,250,.04)', display: 'grid', placeItems: 'center', opacity: 0.88 }}>
                <WatchIcon size={23} />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text)', letterSpacing: '-0.01em' }}>Scan Positions</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, letterSpacing: 0 }}>
                  Know what affects you
                </div>
              </div>
              <ActionChevron />
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,.038)', margin: '0 12px 0 54px' }} />

            <button aria-label="Find Money" onClick={onOptimize} {...press(0.99)} style={{
              width: '100%', padding: '11px 12px', border: 'none', background: 'transparent',
              color: 'inherit', fontFamily: 'var(--font-sans)', display: 'flex',
              alignItems: 'center', gap: 10, cursor: 'pointer', transition: `transform 160ms ${EASING}`,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: 'rgba(92,198,232,.033)', display: 'grid', placeItems: 'center', opacity: 0.88 }}>
                <MoneyIcon size={21} />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                 <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text)', letterSpacing: '-0.01em' }}>Find Money</div>
                 <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, letterSpacing: 0 }}>
                  Bank and wallet review
                 </div>
               </div>
              <ActionChevron />
            </button>
          </div>
        </div>

        {/* Markets */}
        <div className="mlbl" style={{ padding: '2px 22px 10px', opacity: 0.72 }}>Markets</div>
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column' }}>
          {ASSETS.map((a, i) => {
            const lp = live[a.symbol];
            const priceTxt = lp && !a.cta ? formatPrice(lp.price) : a.price;
            return (
              <button type="button" key={a.symbol} onClick={() => onAsset?.(a.symbol)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 6px',
                borderBottom: i < ASSETS.length - 1 ? '1px solid var(--border-2)' : 'none',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                width: '100%', background: 'transparent', color: 'inherit', textAlign: 'left',
                fontFamily: 'var(--font-sans)', cursor: 'pointer', borderRadius: 8,
              }}>
                <AssetLogo symbol={a.symbol} monogram={a.monogram} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}>{a.symbol}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div className="mono num" style={{ fontSize: 13, fontWeight: 600 }}>{priceTxt}</div>
                  {a.cta
                    ? <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{a.cta}</div>
                    : <div className="mono num" style={{ fontSize: 11, fontWeight: 500, color: a.changePositive ? 'var(--green)' : 'var(--red)' }}>{a.change}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <TabBar active="home" onCenterClick={onMenu} onMeClick={onLive} />
    </>
  );
};
