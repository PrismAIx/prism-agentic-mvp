import React from 'react';

// Shared rounded-square brand logo tile (real marks), from the redesign.
export function AssetLogo({ type, size = 26 }: { type: string; size?: number }) {
  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: Math.round(size * 0.27), flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff',
  };
  const t = type.toLowerCase();
  if (t === 'spcx') return <div style={{ ...base, background: '#07111f' }}><img src="/brand/spcx-logo.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (t === 'btc') return <div style={base}><img src="/brand/btc-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} /></div>;
  if (t === 'hype') return <div style={{ ...base, background: '#0f3430' }}><img src="/brand/hype-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (t === 'near') return <div style={{ ...base, background: '#00ec99' }}><img src="/brand/near-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (t === 'zec') return <div style={{ ...base, background: '#efb33b' }}><img src="/brand/zec-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (t === 'aapl') return <div style={{ ...base, background: '#1d1d1f' }}><img src="/brand/apple-logo.svg" alt="" style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }} /></div>;
  if (t === 'eth') return <div style={base}><img src="/brand/eth-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} /></div>;
  if (t === 'nvda') return <div style={base}><img src="/brand/nvda-logo-v2.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} /></div>;
  if (t === 'tbills') return <div style={base}><img src="/brand/us-flag.svg" alt="" style={{ width: size * 0.8, height: size * 0.8, objectFit: 'cover', borderRadius: 4 }} /></div>;
  if (t === 'xau') return <div style={{ ...base, background: 'linear-gradient(135deg,#f5d273,#b8893a)', color: '#3a2a0a', fontFamily: 'var(--mono)', fontSize: size * 0.37, fontWeight: 700 }}>Au</div>;
  if (t === 'usdc') return <div style={{ ...base, background: '#2775ca', color: '#fff', fontFamily: 'var(--mono)', fontSize: size * 0.32, fontWeight: 700 }}>$</div>;
  return <div style={{ ...base, background: 'var(--card-2)', color: 'var(--text-2)', fontWeight: 700, fontSize: size * 0.4 }}>{(type[0] || '?').toUpperCase()}</div>;
}
