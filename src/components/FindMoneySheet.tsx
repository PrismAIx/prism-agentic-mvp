import React, { useState, useEffect, useRef } from 'react';
import { Sheet, sheetPress } from './Sheet';

const EASING = 'cubic-bezier(0.2,0,0,1)';

const BANKS = [
  { name: 'Chase', color: '#117aca' },
  { name: 'HSBC', color: '#db0011' },
  { name: 'BNP Paribas', color: '#00915a' },
  { name: 'Santander', color: '#ec0000' },
  { name: 'Crédit Agricole', color: '#006a4e' },
  { name: 'Deutsche Bank', color: '#0018a8' },
];
const SUBS = [
  { name: 'Netflix', amt: '$13.49', color: '#e50914', dup: false },
  { name: 'Spotify', amt: '$10.99', color: '#1db954', dup: true },
  { name: 'Deezer', amt: '$11.99', color: '#a238ff', dup: true },
  { name: 'Google One', amt: '$9.99', color: '#4285f4', dup: false },
];
const SCAN_LINES = ['Connected · read-only', 'Reading 90 days of transactions', 'Detecting recurring charges'];
const WALLET_LINES = ['Demo wallet · read-only', 'Checking idle balances', 'Finding stale DeFi positions'];
const WALLET_FINDINGS = [
  { name: 'Idle USDC on Arbitrum', amt: '$620', tag: 'IDLE' },
  { name: 'ETH/USDC LP out of range', amt: '$480', tag: 'AMM' },
  { name: 'Old vault dust', amt: '$320', tag: 'STALE' },
];

interface FindMoneySheetProps {
  open: boolean;
  onClose: () => void;
  onInvest: (prompt?: string) => void;
  onBackToActions?: () => void;
}

// Find Money — connect bank → scan → recurring spend results. Port of FindMoneySheet.
export const FindMoneySheet: React.FC<FindMoneySheetProps> = ({ open, onClose, onInvest, onBackToActions }) => {
  const [stage, setStage] = useState<'connect' | 'scan' | 'results'>('connect');
  const [source, setSource] = useState<'bank' | 'wallet'>('bank');
  const [bank, setBank] = useState<string>('');
  const [lines, setLines] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!open) return;
    setStage('connect'); setSource('bank'); setBank(''); setLines(0);
    return () => timers.current.forEach(clearTimeout);
  }, [open]);

  const pickBank = (name: string) => {
    setSource('bank'); setBank(name); setStage('scan');
    SCAN_LINES.forEach((_, i) => timers.current.push(setTimeout(() => setLines(i + 1), 550 * (i + 1))));
    timers.current.push(setTimeout(() => setStage('results'), 550 * SCAN_LINES.length + 500));
  };

  const scanWallet = () => {
    setSource('wallet'); setBank('Demo wallet'); setStage('scan'); setLines(0);
    WALLET_LINES.forEach((_, i) => timers.current.push(setTimeout(() => setLines(i + 1), 550 * (i + 1))));
    timers.current.push(setTimeout(() => setStage('results'), 550 * WALLET_LINES.length + 500));
  };

  const flatCta = (label: string, onClick: () => void) => (
    <button onClick={onClick} {...sheetPress(0.98)} style={{ width: '100%', background: 'var(--accent)', color: '#0a0a0a', border: 'none', borderRadius: 14, padding: 14, fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.15)', transition: `transform 160ms ${EASING}` }}>{label}</button>
  );

  return (
    <Sheet open={open} onClose={onClose}>
      {stage === 'connect' && (
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
          <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>Find Money</div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 5 }}>Find unused capital</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 14 }}>
            Bank and wallet review for money Prism can put to work.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 12 }}>
            {(['bank', 'wallet'] as const).map(item => (
              <button key={item} onClick={() => setSource(item)} style={{
                border: source === item ? '1px solid rgba(167,139,250,.36)' : '1px solid var(--border-2)',
                background: source === item ? 'var(--accent-08)' : 'rgba(255,255,255,.035)',
                color: source === item ? 'var(--accent)' : 'var(--text-2)',
                borderRadius: 11,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 650,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}>
                {item === 'bank' ? 'Bank' : 'Wallet'}
              </button>
            ))}
          </div>

          {source === 'bank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BANKS.map(b => (
                <button type="button" key={b.name} onClick={() => pickBank(b.name)} {...sheetPress(0.98)} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--card)', color: 'inherit', border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', transition: `transform 160ms ${EASING}`, fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{b.name[0]}</div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }}>{b.name}</span>
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none" stroke="var(--text-4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2.5 L10 7.5 L5 12.5" /></svg>
                </button>
              ))}
            </div>
          )}

          {source === 'wallet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" onClick={scanWallet} {...sheetPress(0.98)} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--card)', color: 'inherit', border: '1px solid var(--border-2)', borderRadius: 12, padding: '11px 12px', cursor: 'pointer', transition: `transform 160ms ${EASING}`, fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--accent-08)', border: '1px solid var(--accent-15)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontWeight: 750, flexShrink: 0 }}>W</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Scan demo wallet</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>Idle balances, stale LPs, old vaults</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 15 15" fill="none" stroke="var(--text-4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2.5 L10 7.5 L5 12.5" /></svg>
              </button>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.07em', lineHeight: 1.5, textTransform: 'uppercase' }}>
                No live wallet connection in public preview · demo data only
              </div>
            </div>
          )}
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 14 }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 1.3 L11.7 3.4 V7 c0 3 -2 5 -4.7 5.7 C4.3 12 2.3 10 2.3 7 V3.4 Z" strokeLinejoin="round" /></svg>
            Read-only · on-device analysis
          </div>
        </>
      )}

      {stage === 'scan' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span className="mlbl" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>Prism is reading {bank}</span>
            <span className="think-dots"><i /><i /><i /></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 6 }}>
            {(source === 'wallet' ? WALLET_LINES : SCAN_LINES).map((l, i) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: i <= lines ? 1 : 0.3, transition: `opacity 300ms ${EASING}` }}>
                {i < lines ? (
                  <svg width="12" height="12" viewBox="0 0 9 9" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 4.5 L3.8 7 L7.5 2.5" /></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="8" cy="8" r="6" stroke="var(--accent-35)" strokeWidth="2" fill="none" />
                    <path d="M8 2 A6 6 0 0 1 14 8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                )}
                <span className="mono" style={{ fontSize: 11, color: i < lines ? 'var(--text-2)' : 'var(--text-3)', letterSpacing: '0.03em' }}>{l}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stage === 'results' && (
        <div style={{ animation: `card-in 280ms ${EASING} both` }}>
          <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>Find Money</div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 10 }}>
            {source === 'wallet' ? 'Idle wallet funds found' : 'Cash found to invest'}
          </div>
          {source === 'wallet' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                <span className="num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>$1,420</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>idle</span>
              </div>
              <div className="mono num" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.04em', marginBottom: 14 }}>3 wallet opportunities · demo scan</div>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                {WALLET_FINDINGS.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderBottom: '1px solid var(--border-2)' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent-08)', border: '1px solid var(--accent-15)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{item.tag[0]}</div>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, letterSpacing: '-0.005em' }}>{item.name}</span>
                    <span className="mono" style={{ fontSize: 8.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-08)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.08em' }}>{item.tag}</span>
                    <span className="mono num" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-2)' }}>{item.amt}</span>
                  </div>
                ))}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-2)', lineHeight: 1.6, letterSpacing: '0.02em', background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 10, padding: '9px 11px', marginBottom: 14 }}>
                Out-of-range LP and idle stablecoins show <b style={{ color: 'var(--green)', fontWeight: 600 }}>capital ready to redeploy</b>
              </div>
              {flatCta('Turn idle wallet funds into a plan', () => onInvest('Reallocate idle wallet funds into a safer Arbitrum plan'))}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                <span className="num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>$103.36</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>/mo</span>
              </div>
              <div className="mono num" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.04em', marginBottom: 14 }}>9 subscriptions · $1,240 / yr</div>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                {SUBS.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderBottom: '1px solid var(--border-2)' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: '#101012', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.name[0]}</div>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, letterSpacing: '-0.005em' }}>{s.name}</span>
                    {s.dup && <span className="mono" style={{ fontSize: 8.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-08)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.08em' }}>OVERLAP</span>}
                    <span className="mono num" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-2)' }}>{s.amt}</span>
                  </div>
                ))}
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.06em', padding: '8px 2px 0', textTransform: 'uppercase' }}>5 more</div>
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-2)', lineHeight: 1.6, letterSpacing: '0.02em', background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 10, padding: '9px 11px', marginBottom: 14 }}>
                2 music and 2 storage services overlap, about <b style={{ color: 'var(--green)', fontWeight: 600 }}>~$26/mo recoverable</b>
              </div>
              {flatCta('Invest $26/mo of savings', () => onInvest('Invest recovered subscription savings into a simple Arbitrum plan'))}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
};
