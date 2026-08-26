import React, { useState, useCallback, useEffect } from 'react';
import type { RiskAlertPayload } from '../lib/types';
import { useModalFocus } from '../lib/useModalFocus';

interface RiskAlertProps {
  alert: RiskAlertPayload | null;
  loading?: boolean;
  onDismiss: () => void;
}

type AlertPhase = 'pending' | 'approving' | 'preview_ready';

export const RiskAlert: React.FC<RiskAlertProps> = ({ alert, loading = false, onDismiss }) => {
  const [phase, setPhase] = useState<AlertPhase>('pending');
  const dialogRef = useModalFocus(true, onDismiss, { initialFocus: 'dialog' });
  // Animate the sheet sliding up and the impact meter filling
  const [mounted, setMounted] = useState(false);
  const [meterPct, setMeterPct] = useState(0);

  const plan = alert?.plan ?? null;
  const impactScore = alert?.impactScore ?? 0;
  const headline = alert?.headline ?? '';
  const reasoning = alert?.reasoning ?? '';
  const impactPct = Math.min(100, impactScore);

  // ── Sheet slide-up + meter fill on mount ─────────────────────────────────
  useEffect(() => {
    // Two RAF ticks to let the DOM paint before animating
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        setMounted(true);
      });
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  // Fill the impact meter ~200ms after sheet finishes sliding up (300ms)
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setMeterPct(impactPct), 350);
    return () => clearTimeout(t);
  }, [mounted, impactPct]);

  const handleProtect = useCallback(async () => {
    if (!plan || phase !== 'pending') return;
    setPhase('approving');
    await new Promise(r => setTimeout(r, 1100));
    setPhase('preview_ready');
  }, [plan, phase]);


  const dangerColor = '#f6776b';
  const EASING = 'cubic-bezier(0.2,0,0,1)';

  return (
    /* Full-screen dimmed overlay — click the backdrop to dismiss */
    <div
      onClick={onDismiss}
      style={{
      position: 'absolute', inset: 0, zIndex: 50,
      // Backdrop fades in
      background: mounted ? 'rgba(5,5,7,0.72)' : 'rgba(5,5,7,0)',
      backdropFilter: 'blur(3px)',
      transition: `background 300ms ${EASING}`,
      display: 'flex',
      alignItems: 'flex-end',
      padding: '0 0 0',
    }}>
      {/* Bottom sheet card — slides up from below */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={loading ? 'Risk scan' : phase === 'preview_ready' ? 'Protection preview ready' : 'Critical risk alert'}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
        width: '100%',
        background: 'var(--surface)',
        borderRadius: '28px 28px 0 0',
        border: '1px solid var(--line)',
        borderBottom: 'none',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.045), 0 -12px 48px -8px rgba(0,0,0,0.7)`,
        padding: '24px 22px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        // Slide-up transform
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: `transform 300ms ${EASING}`,
      }}>
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.1)',
          alignSelf: 'center', marginBottom: 20,
        }} />

        {loading ? (
          /* ── Scanning / loading state ─────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0 12px' }}>
            {/* Spinner */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(167,139,250,0.1)',
              display: 'grid', placeItems: 'center',
              boxShadow: 'var(--depth-icon)',
            }}>
              <svg width={22} height={22} viewBox="0 0 22 22" fill="none"
                style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="11" cy="11" r="9" stroke="rgba(167,139,250,0.2)" strokeWidth="2"/>
                <path d="M11 2 A9 9 0 0 1 20 11"
                  stroke="var(--violet)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2, color: 'var(--text)', marginBottom: 6 }}>
                Scanning your positions…
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)', fontWeight: 500, lineHeight: 1.5 }}>
                Prism is scoring the risk impact<br />against your open trades.
              </div>
            </div>
            {/* Subtle pulsing status bar */}
            <div style={{ width: '100%', height: 3, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden', marginTop: 4 }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg, var(--violet-deep), var(--violet))',
                animation: 'scan-sweep 1.8s ease-in-out infinite',
              }} />
            </div>
          </div>
        ) : phase === 'preview_ready' ? (
          /* ── Preview confirmation ─────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(86,220,160,0.12)',
                display: 'grid', placeItems: 'center',
                flexShrink: 0,
                boxShadow: 'var(--depth-icon)',
              }}>
                <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="10" stroke="#56dca0" strokeWidth="1.4"/>
                  <path d="M6.5 11 L9.5 14 L15.5 8" stroke="#56dca0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.2, color: '#8ee9bd' }}>
                  Protection preview ready
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>
                  Static preview · no action or transaction can be sent
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 16, padding: '14px 16px', color: 'var(--text-2)', fontSize: 13 }}>
              Static preview · no action or transaction can be sent
            </div>

            <button
              onClick={onDismiss}
              style={{
                width: '100%', height: 52, marginTop: 4,
                border: '1px solid var(--line)', borderRadius: 999,
                background: 'var(--surface-2)',
                color: 'var(--text)', fontSize: 16, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: `transform 150ms ${EASING}`,
              }}
              onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
              onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              onPointerLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Alert / approval state ───────────────── */
          <>
            {/* Time + danger indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--mono)', fontSize: 11.5,
                letterSpacing: '0.1em', color: dangerColor,
                fontWeight: 600,
              }}>
                {/* Gently pulsing danger dot */}
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: dangerColor,
                  display: 'block',
                  animation: 'pulse-danger 1.8s ease-in-out infinite',
                }} />
                23:17
              </span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11.5,
                letterSpacing: '0.08em', color: 'var(--text-3)',
                fontWeight: 500,
              }}>
                CRITICAL RISK
              </span>
            </div>

            {/* Title */}
            <div style={{
              fontSize: 19, fontWeight: 700, letterSpacing: -0.4,
              lineHeight: 1.25, marginBottom: 10,
            }}>
              {headline}
            </div>

            {/* Body */}
            <div style={{
              fontSize: 14, color: 'var(--text-2)', fontWeight: 500,
              lineHeight: 1.55, marginBottom: 18,
            }}>
              Your gold exposure: <span style={{ color: 'var(--text)', fontWeight: 600 }}>78.40 USDC across 2 positions.</span>
            </div>

            {/* Impact meter — fills 0→impactPct over 600ms */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 7,
              }}>
                <span className="lbl">Impact score</span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 12.5,
                  fontWeight: 700, color: dangerColor,
                  letterSpacing: '0.05em',
                }}>
                  {impactScore}/100
                </span>
              </div>
              {/* Track */}
              <div style={{
                height: 5, borderRadius: 999,
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Fill — animates from 0 to impactPct */}
                <div style={{
                  position: 'absolute', inset: '0 auto 0 0',
                  width: `${meterPct}%`,
                  background: `linear-gradient(90deg, #f6a36b, ${dangerColor})`,
                  borderRadius: 999,
                  boxShadow: `0 0 8px rgba(246,119,107,0.45)`,
                  transition: `width 600ms ${EASING}`,
                }} />
              </div>
            </div>

            {/* Preview plan */}
            {plan && (
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 16,
                padding: '15px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                boxShadow: 'var(--depth-card)',
                marginBottom: 14,
              }}>
                {/* Shield icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(167,139,250,0.12)',
                  display: 'grid', placeItems: 'center',
                  flexShrink: 0,
                  boxShadow: 'var(--depth-icon)',
                  marginTop: 1,
                }}>
                  <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                    <path d="M9 1.5 L14.5 4 V8.5 C14.5 12 12 14.5 9 15.5 C6 14.5 3.5 12 3.5 8.5 V4 Z"
                      stroke="#a78bfa" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M6.5 9 L8 10.5 L11.5 7"
                      stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: -0.15, marginBottom: 4 }}>
                    Close 85% of both gold positions
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500, lineHeight: 1.5 }}>
                    {reasoning}
                  </div>
                </div>
              </div>
            )}

            {/* Preview protection button — with active press scale */}
            <button
              onClick={handleProtect}
              disabled={phase === 'approving' || !plan}
              style={{
                width: '100%', height: 56,
                border: 'none', borderRadius: 999,
                background: phase === 'approving'
                  ? 'rgba(167,139,250,0.4)'
                  : 'linear-gradient(180deg,#bcabf8,#9d83f2)',
                color: phase === 'approving' ? 'rgba(28,20,48,0.5)' : '#1c1430',
                fontSize: 16.5, fontWeight: 700, letterSpacing: -0.2,
                cursor: phase === 'approving' ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                boxShadow: phase === 'approving' ? 'none' : 'var(--depth-button-violet)',
                transition: `all 0.25s ${EASING}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
              onPointerDown={e => {
                if (phase === 'pending') (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
              }}
              onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              onPointerLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              {phase === 'approving' ? (
                <>
                  <svg width={18} height={18} viewBox="0 0 18 18" fill="none"
                    style={{ animation: 'spin 0.9s linear infinite', opacity: 0.6 }}>
                    <circle cx="9" cy="9" r="7.5" stroke="rgba(28,20,48,0.5)" strokeWidth="1.5"/>
                    <path d="M9 1.5 A7.5 7.5 0 0 1 16.5 9"
                      stroke="rgba(28,20,48,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Preparing preview…
                </>
              ) : (
                <>
                  <svg width={17} height={17} viewBox="0 0 18 18" fill="none">
                    <path d="M9 1.5 L14.5 4 V8.5 C14.5 12 12 14.5 9 15.5 C6 14.5 3.5 12 3.5 8.5 V4 Z"
                      stroke="#1c1430" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(28,20,48,0.1)"/>
                    <path d="M6.5 9 L8 10.5 L11.5 7"
                      stroke="#1c1430" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Preview protection
                </>
              )}
            </button>

            {/* Footnote */}
            <div style={{
              textAlign: 'center', fontSize: 12.5,
              color: 'var(--text-3)', fontWeight: 500, paddingTop: 10,
            }}>
              Static preview · no action or transaction can be sent
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scan-sweep {
          0%   { width: 0%; margin-left: 0%; }
          50%  { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes pulse-danger {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0px rgba(246,119,107,0.5);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 0 4px rgba(246,119,107,0.0);
          }
        }
      `}</style>
    </div>
  );
};
