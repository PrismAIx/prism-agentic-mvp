import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';

const EASING = 'cubic-bezier(0.2,0,0,1)';
const BOLD: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 };

function fmtUsd(v: number) {
  const int = Math.floor(v);
  const cents = Math.round((v - int) * 100);
  return '$' + int.toLocaleString('en-US') + '.' + String(cents).padStart(2, '0');
}

function useCountUp(target: number, enabled: boolean, duration = 750) {
  const [v, setV] = useState(enabled ? 0 : target);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!enabled) { setV(target); return; }
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / duration);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setV(target * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, enabled, duration]);
  return v;
}

function MiniLogo({ type, size = 22 }: { type: 'tbills' | 'aapl' | 'btc' | 'usdc' | 'spcx'; size?: number }) {
  const base: React.CSSProperties = { width: size, height: size, borderRadius: Math.round(size * 0.27), flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' };
  if (type === 'tbills') return <div style={base}><img src="/brand/us-flag.svg" alt="" style={{ width: size * 0.8, height: size * 0.8, objectFit: 'cover', borderRadius: 4 }} /></div>;
  if (type === 'btc') return <div style={base}><img src="/brand/btc-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} /></div>;
  if (type === 'spcx') return <div style={{ ...base, background: '#07111f' }}><img src="/brand/spcx-logo.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (type === 'usdc') return <div style={{ ...base, background: '#2775ca', color: '#fff', fontFamily: 'var(--mono)', fontSize: size * 0.32, fontWeight: 700 }}>$</div>;
  return <div style={{ ...base, background: '#1d1d1f' }}><img src="/brand/apple-logo.svg" alt="" style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }} /></div>;
}

const LIVE_LINE = 'M0,40 L20,38 L40,42 L60,39 L80,41 L100,37 L120,38 L140,36 L160,34 L180,32 L200,26 L220,18 L240,16 L260,14 L280,12 L300,10 L320,8';
const LIVE_AREA = LIVE_LINE + ' L320,56 L0,56 Z';

function LiveChart() {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <svg viewBox="0 0 320 56" preserveAspectRatio="none" style={{ height: 56, width: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="liveFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={LIVE_AREA} fill="url(#liveFill)" style={{ opacity: drawn ? 1 : 0, transition: `opacity 400ms ${EASING} 400ms` }} />
      <path d={LIVE_LINE} stroke="var(--green)" strokeWidth="1.4" fill="none" style={{ strokeDasharray: 380, strokeDashoffset: drawn ? 0 : 380, transition: drawn ? `stroke-dashoffset 800ms ${EASING}` : 'none' }} />
      <g style={{ opacity: drawn ? 1 : 0, transition: `opacity 250ms ${EASING} 650ms` }}>
        <line x1="200" y1="0" x2="200" y2="56" stroke="var(--accent)" strokeWidth="0.7" strokeDasharray="2,3" opacity="0.5" />
        <circle cx="200" cy="26" r="4" fill="var(--accent)" />
        <circle cx="200" cy="26" r="7" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.5" />
      </g>
      <g transform="translate(206, 8)" style={{ opacity: drawn ? 1 : 0, transition: `opacity 250ms ${EASING} 800ms` }}>
        <rect x="0" y="0" width="38" height="14" rx="3" fill="var(--accent)" />
        <text x="19" y="10" fontFamily="Geist Mono, monospace" fontSize="9" fontWeight="700" fill="#0a0a0a" textAnchor="middle">+$30</text>
      </g>
    </svg>
  );
}

interface ActionItem { node: React.ReactNode; time: string; isNew?: boolean; }
const PREVIEW_ACTIONS: ActionItem[] = [
  { node: <><b style={BOLD}>SPCX setup</b> preview · $200 margin</>, time: '9:41' },
  { node: <><b style={BOLD}>sUSDai route</b> preview · $800 idle</>, time: '07:00' },
  { node: <><b style={BOLD}>Variational market</b> read</>, time: '06:12' },
  { node: <>Portfolio preview updated · <b style={BOLD}>no tx sent</b></>, time: '00:00' },
];

interface LiveProps {
  onHome?: () => void;
  onActions?: () => void;
}

export const Live: React.FC<LiveProps> = ({ onHome, onActions }) => {
  const [actions] = useState<ActionItem[]>(PREVIEW_ACTIONS);
  const activityRef = useRef<HTMLDivElement>(null);
  const bal = useCountUp(12847.30, true, 750);
  const hero = {
        badge: 'Portfolio preview',
        time: 'Ready',
        title: 'Plan ready to review',
        description: <>A $1,000 plan is reserved for preview: $200 SPCX at 2x, $800 parked in sUSDai. No transaction was sent.</>,
        fromLogo: 'usdc' as const,
        fromName: 'USDC',
        fromSub: 'PREVIEW CASH',
        fromAmount: '$1,000 reserved',
        toLogo: 'spcx' as const,
        toName: 'SPCX / sUSDai',
        toSub: 'PENDING PLAN',
        toAmount: '$200 margin · $800 idle',
        metricLabel: 'Needs review',
        metricValue: '1 item',
        triggerLabel: 'Setup',
        triggerValue: 'Levels and unlocks',
        statusText: 'Preview only · no transaction sent',
      };

  const scrollToActivity = () => {
    activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <StatusBar time="9:41" />

      {/* Header */}
      <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button type="button" aria-label="Back to home" onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', cursor: 'pointer', background: 'transparent', border: 'none', color: 'inherit', padding: 0, fontFamily: 'var(--font-sans)' }}>
            <img src="/brand/prism-logo.jpg" alt="Prism" style={{ width: 22, height: 22, borderRadius: 5 }} />
            Prism
          </button>
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginLeft: 30 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-55)', animation: 'livePulse 1.8s ease-in-out infinite' }} />
            <span>Portfolio · <b style={{ color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.14em' }}>PREVIEW</b></span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        <div className="mono" style={{ padding: '8px 22px 2px', fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.08em' }}>Synthetic demo data · read-only</div>

        {/* Auto-action hero — "Switched to AAPL" */}
        <div style={{
          margin: '4px 18px 18px', background: 'linear-gradient(180deg, #1a1310 0%, #161616 70%)',
          border: '1px solid var(--accent-35)', borderRadius: 22, padding: 18,
          boxShadow: '0 0 0 1px var(--accent-08), 0 24px 60px color-mix(in srgb, var(--accent) 10%, transparent), inset 0 1px 0 rgba(255,255,255,.04)',
          position: 'relative', overflow: 'hidden', animation: `card-in 300ms ${EASING} both`,
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-55)' }} />
              {hero.badge}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{hero.time}</div>
          </div>
          <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 6 }}>{hero.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 14, letterSpacing: '-0.005em' }}>
            {hero.description}
          </div>
          {/* Swap */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,.025)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MiniLogo type={hero.fromLogo} size={22} />
                <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>{hero.fromName}</div><div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{hero.fromSub}</div></div>
              </div>
              <div className="mono num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{hero.fromAmount}</div>
            </div>
            <div style={{ alignSelf: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6 L10 6" /><path d="M7 3 L10 6 L7 9" /></svg>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,.025)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MiniLogo type={hero.toLogo} size={22} />
                <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>{hero.toName}</div><div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{hero.toSub}</div></div>
              </div>
              <div className="mono num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{hero.toAmount}</div>
            </div>
          </div>
          {/* Captured / Trigger */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', borderTop: '1px solid var(--border-2)', borderBottom: '1px solid var(--border-2)', padding: '12px 0', marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
              <span className="mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{hero.metricLabel}</span>
              <span className="num" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--accent)' }}>{hero.metricValue}</span>
            </div>
            <div style={{ background: 'var(--border-2)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
              <span className="mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{hero.triggerLabel}</span>
              <span className="mono num" style={{ fontSize: 11.5, fontWeight: 500, paddingTop: 2 }}>{hero.triggerValue}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.04em' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5 L4.2 7 L8 3" /></svg>
              {hero.statusText}
            </div>
            <button
              onClick={scrollToActivity}
              style={{
                border: 'none', background: 'transparent', padding: 0,
                fontSize: 11.5, fontWeight: 600, color: 'var(--accent)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              View activity
            </button>
          </div>
        </div>

        {/* Portfolio strip */}
        <div style={{ padding: '0 22px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Portfolio · today</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmtUsd(bal)}</div>
            </div>
            <div className="mono num" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>+$282 · +2.2%</div>
          </div>
          <LiveChart />
        </div>

        {/* Actions */}
        <div ref={activityRef} className="mono" style={{ padding: '4px 24px 8px', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Recent activity</span>
          <span style={{ color: 'var(--accent)', background: 'var(--accent-08)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.08em' }}>Preview only</span>
        </div>
        <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column' }}>
          {actions.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px',
              borderBottom: i < actions.length - 1 ? '1px solid var(--border-2)' : 'none',
              background: a.isNew ? 'rgba(74,222,128,.06)' : 'transparent', borderRadius: a.isNew ? 8 : 0,
              animation: `leg-in 300ms ${EASING} ${Math.min(200 + i * 70, 600)}ms both`,
            }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(74,222,128,.15)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 4.5 L3.8 7 L7.5 2.5" /></svg>
              </div>
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', letterSpacing: '-0.005em' }}>{a.node}</div>
              <div className="mono num" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em' }}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="me" onHomeClick={onHome} onCenterClick={onActions} />
    </>
  );
};
