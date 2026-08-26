import React from 'react';

interface StatusBarProps {
  time?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ time = '9:41' }) => (
  <div style={{
    height: 54,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px 0 32px',
    fontSize: 15,
    fontWeight: 600,
    position: 'relative',
    zIndex: 2,
    flexShrink: 0,
  }}>
    <span>{time}</span>
    <span style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {/* Signal bars */}
      <span style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 11 }}>
        {[4, 6, 8, 11].map((h, i) => (
          <span key={i} style={{ width: 3, height: h, background: 'var(--text)', borderRadius: 1, display: 'block' }} />
        ))}
      </span>
      {/* Battery */}
      <span style={{
        width: 24, height: 12, border: '1.5px solid var(--text)',
        borderRadius: 4, position: 'relative', display: 'inline-block',
      }}>
        <span style={{
          position: 'absolute', right: -3, top: 3.5,
          width: 2, height: 4, background: 'var(--text)',
          borderRadius: '0 1px 1px 0', display: 'block',
        }} />
        <span style={{
          position: 'absolute', inset: 1.5, width: '75%',
          background: 'var(--text)', borderRadius: 2, display: 'block',
        }} />
      </span>
    </span>
  </div>
);
