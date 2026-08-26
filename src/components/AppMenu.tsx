import React from 'react';
import { Sheet, sheetPress } from './Sheet';

interface AppMenuProps {
  open: boolean;
  onClose: () => void;
  onAskAnything: () => void;
  onMarketPulse: () => void;
  onFlowLinks: () => void;
  onEarn: () => void;
  onPerps: () => void;
  onTrade: () => void;
  onFindMoney: () => void;
  onHistory: () => void;
  onAlerts: () => void;
  alertBadge?: boolean;
}

const I = (p: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{p}</svg>
);

function WatchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" stroke="var(--accent-35)" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="4.2" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M16 16 L25 10.5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 22.5 A11 11 0 0 1 23.8 6.8" stroke="#5cc6e8" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24.5" cy="10" r="2.2" fill="#5cc6e8" />
    </svg>
  );
}

function FlowLinksIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 7.5 H9.5 C12.8 7.5 12.8 16.5 16.2 16.5 H19" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 16.5 H8.2 C10 16.5 10.8 13.8 12 12" stroke="#5cc6e8" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="7.5" r="2.3" stroke="var(--accent-35)" strokeWidth="1.3" />
      <circle cx="19" cy="16.5" r="2.3" fill="#5cc6e8" opacity="0.9" />
    </svg>
  );
}

// Actions launcher sheet.
export const AppMenu: React.FC<AppMenuProps> = ({
  open, onClose, onAskAnything, onMarketPulse, onFlowLinks, onEarn, onPerps, onTrade, onFindMoney, onHistory, onAlerts, alertBadge = false,
}) => {
  const act = (fn: () => void) => () => { onClose(); fn(); };
  const keyAct = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    act(fn)();
  };

  const items = [
    { name: 'Buy & sell', sub: 'Quick orders', onClick: onTrade,
      icon: I(<><path d="M5 13 V3.5 M5 3.5 L2.5 6 M5 3.5 L7.5 6" /><path d="M11 3 V12.5 M11 12.5 L8.5 10 M11 12.5 L13.5 10" /></>) },
    { name: 'Earn', sub: 'Stable yield routes', onClick: onEarn,
      icon: I(<><path d="M3.5 12.5 L12.5 3.5" /><circle cx="4.8" cy="4.8" r="1.8" /><circle cx="11.2" cy="11.2" r="1.8" /></>) },
    { name: 'Perps', sub: 'Leverage setup', onClick: onPerps,
      icon: I(<><path d="M2 12 L6.5 7.5 L9 10 L14 4.5" /><path d="M10.5 4.5 H14 V8" /></>) },
    { name: 'Market Pulse', sub: 'Fresh market signals', onClick: onMarketPulse,
      icon: I(<><path d="M2.5 9 H5.2 L6.8 4.8 L9.3 12 L11.4 7.2 L12.8 9 H14" /><path d="M3.5 4.8 C5.4 3.3 7.6 2.8 10.1 3.3 C11.6 3.6 12.8 4.2 13.8 5" /></>) },
    { name: 'Playbooks', sub: 'Investable ideas', onClick: onFlowLinks,
      icon: <FlowLinksIcon /> },
    { name: 'Scan Positions', sub: 'Know what affects you', onClick: onAlerts, badgeOn: alertBadge,
      icon: <WatchIcon /> },
    { name: 'Find Money', sub: 'Bank and wallet review', onClick: onFindMoney,
      icon: I(<><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 L14 14" /></>) },
    { name: 'Activity', sub: 'All agent actions', onClick: onHistory,
      icon: I(<><circle cx="8" cy="8" r="6" /><path d="M8 4.5 V8 L10.5 9.5" /></>) },
  ];

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 14 }}>Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Ask anything — hero action */}
        <div role="button" tabIndex={0} onClick={act(onAskAnything)} onKeyDown={keyAct(onAskAnything)} {...sheetPress(0.98)} style={{
          gridColumn: '1 / -1', background: 'var(--accent-08)', border: '1px solid var(--accent-35)',
          borderRadius: 14, padding: '13px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, transition: 'transform 160ms var(--ease)',
        }}>
          <img src="/brand/prism-logo.jpg" alt="Prism" style={{ width: 28, height: 28, borderRadius: 8, display: 'block' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.01em' }}>Ask anything</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Agentic planning</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"><path d="M5 2.5 L10 7.5 L5 12.5" /></svg>
        </div>

        {items.map(it => (
          <div key={it.name} role="button" aria-label={`${it.name}: ${it.sub}`} tabIndex={0} onClick={act(it.onClick)} onKeyDown={keyAct(it.onClick)} {...sheetPress(0.97)} style={{
            background: 'var(--card)', border: '1px solid var(--border-2)',
            borderRadius: 14, padding: '13px 13px 12px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: 9, transition: 'transform 160ms var(--ease)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, position: 'relative',
              background: 'var(--accent-08)', border: '1px solid var(--accent-15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {it.icon}
              {it.badgeOn && <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, background: 'var(--red)', borderRadius: '50%', border: '1.5px solid var(--card)' }} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{it.name}</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
};
