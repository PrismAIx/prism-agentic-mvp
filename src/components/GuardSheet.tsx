import React, { useState, useEffect, useRef } from 'react';
import { Sheet, sheetPress } from './Sheet';
import { AssetLogo } from './AssetLogo';

const EASING = 'cubic-bezier(0.2,0,0,1)';

const HOLDINGS = [
  { type: 'spcx', name: 'SPCX exposure', amt: '$200 margin', review: true },
  { type: 'usdc', name: 'sUSDai route', amt: '$800 idle' },
  { type: 'usdc', name: 'USDC cash', amt: '$312.40' },
  { type: 'btc', name: 'BTC', amt: '$2,569.00' },
];

interface GuardSheetProps {
  open: boolean;
  onClose: () => void;
  onBackToActions?: () => void;
  onReviewPlan?: () => void;
}

// Position Guard — scan → alert → protect (the VC demo moment). Port of GuardSheet.
export const GuardSheet: React.FC<GuardSheetProps> = ({ open, onClose, onBackToActions, onReviewPlan }) => {
  const [checked, setChecked] = useState(0);
  const [stage, setStage] = useState<'scan' | 'alert' | 'done'>('scan');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!open) return;
    setStage('scan'); setChecked(0);
    HOLDINGS.forEach((_, i) => timers.current.push(setTimeout(() => setChecked(i + 1), 420 * (i + 1))));
    timers.current.push(setTimeout(() => setStage('alert'), 420 * HOLDINGS.length + 600));
    return () => timers.current.forEach(clearTimeout);
  }, [open]);

  const reviewPlan = () => {
    setStage('done');
    timers.current.push(setTimeout(() => {
      if (onReviewPlan) onReviewPlan();
      else onClose();
    }, 900));
  };

  return (
    <Sheet open={open} onClose={onClose}>
      {stage === 'scan' && (
        <>
          {onBackToActions && (
            <button onClick={onBackToActions} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none',
              background: 'transparent', color: 'var(--text-3)', fontSize: 11.5,
              fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: '0 0 12px',
            }}>
              ‹ Actions
            </button>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="mlbl" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>Position Scan</span>
              <span className="think-dots"><i /><i /><i /></span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 5 }}>Know what affects you</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45 }}>
              Prism checks your holdings against fresh news, market moves and onchain flows.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {HOLDINGS.map((h, i) => (
              <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 2px', borderBottom: i < HOLDINGS.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                <AssetLogo type={h.type} size={26} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{h.name}</span>
                <span className="mono num" style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 10 }}>{h.amt}</span>
                {i < checked ? (
                  h.review ? (
                    <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,.12)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.08em' }}>NEWS RISK</span>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 9 9" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 4.5 L3.8 7 L7.5 2.5" /></svg>
                  )
                ) : i === checked ? (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="8" cy="8" r="6" stroke="var(--accent-35)" strokeWidth="2" fill="none" />
                    <path d="M8 2 A6 6 0 0 1 14 8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                ) : (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-4)', display: 'block', margin: 4 }} />
                )}
              </div>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 14 }}>
            Holdings · news · volatility
          </div>
        </>
      )}

      {stage === 'alert' && (
        <div style={{ animation: `card-in 280ms ${EASING} both` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 600, color: '#fbbf24', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,.7)' }} />
              Volatility alert · 1 holding
            </span>
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.08em' }}>IMPACT HIGH</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 7 }}>
            SPCX could see higher volatility.
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, letterSpacing: '-0.005em', marginBottom: 14 }}>
            Fresh space and IPO-flow headlines may move SPCX around the <b style={{ color: 'var(--text)' }}>$212 psychological level</b>. Found because you hold SPCX.
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '12px 13px', marginBottom: 14 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Suggested review</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AssetLogo type="spcx" size={26} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>Review volatility impact</div>
                <div className="mono num" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.03em' }}>$200 margin · stress check available</div>
              </div>
              <span className="mono num" style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>review</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} {...sheetPress(0.97)} style={{ flex: 1, background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: `transform 160ms ${EASING}` }}>Later</button>
            <button onClick={reviewPlan} {...sheetPress(0.98)} style={{ flex: 1.6, background: 'var(--accent)', color: '#0a0a0a', border: 'none', borderRadius: 12, padding: 12, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.15)', transition: `transform 160ms ${EASING}` }}>Review impact</button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 6px', animation: `card-in 250ms ${EASING} both` }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(74,222,128,0.15)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 4.5 L3.8 7 L7.5 2.5" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Impact review prepared</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.04em' }}>No transaction sent · opening plan</div>
          </div>
        </div>
      )}
    </Sheet>
  );
};
