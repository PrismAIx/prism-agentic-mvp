import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

const GRAPHITE_GLASS_FRAME: React.CSSProperties = {
  width: 384,
  height: 800,
  background: 'linear-gradient(145deg, #2c2c33 0%, #17171c 34%, #08080c 68%, #030304 100%)',
  borderRadius: 58,
  boxShadow: `0 0 0 1px var(--accent-55),
              inset 0 1px 0 rgba(255,255,255,.16),
              inset 0 -18px 32px rgba(0,0,0,.55),
              inset 1px 0 0 rgba(167,139,250,.32),
              inset -1px 0 0 rgba(167,139,250,.20),
              inset 13px 0 24px rgba(255,255,255,.025),
              inset -16px 0 28px rgba(0,0,0,.5),
              0 72px 145px rgba(0,0,0,.72),
              0 28px 58px rgba(0,0,0,.50),
              0 0 calc(var(--glow-o) * 140px) color-mix(in srgb, var(--accent) calc(var(--glow-o) * 11%), transparent)`,
  position: 'relative',
  overflow: 'visible',
  flexShrink: 0,
};

const EDGE_HIGHLIGHT: React.CSSProperties = {
  position: 'absolute',
  inset: 1,
  borderRadius: 56,
  border: '1px solid rgba(167,139,250,.24)',
  background: 'linear-gradient(135deg, rgba(255,255,255,.16) 0%, rgba(167,139,250,.10) 18%, transparent 44%, rgba(0,0,0,.40) 78%, rgba(0,0,0,.72) 100%)',
  boxShadow: 'inset 1px 0 0 rgba(167,139,250,.30), inset -1px 0 0 rgba(167,139,250,.16)',
  pointerEvents: 'none',
};

const SCREEN_GLASS: React.CSSProperties = {
  position: 'absolute',
  inset: 8,
  background: 'var(--bg)',
  borderRadius: 46,
  border: '1px solid rgba(255,255,255,.055)',
  boxShadow: `inset 0 1px 0 rgba(255,255,255,.065),
              inset 0 0 0 1px rgba(0,0,0,.72),
              inset 0 -22px 42px rgba(0,0,0,.28)`,
  overflow: 'hidden',
};

const GLASS_SHEEN: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  background: 'linear-gradient(116deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.025) 17%, transparent 39%)',
  opacity: 0.22,
  mixBlendMode: 'screen',
  pointerEvents: 'none',
};

// Fixed phone shell for the preview layout.
// FIXED 384×800 (not responsive) to preserve the intended silhouette.
// The outer container (App) scales it down to fit small viewports.
export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => (
  <div data-phone-frame="graphite-glass" style={GRAPHITE_GLASS_FRAME}>
    <div aria-hidden="true" style={EDGE_HIGHLIGHT} />
    <div data-phone-screen="glass-inset" style={SCREEN_GLASS}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 110, height: 30, background: '#000', borderRadius: 18, zIndex: 1000,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 8px 18px rgba(0,0,0,.45)',
      }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div aria-hidden="true" style={GLASS_SHEEN} />
    </div>
  </div>
);
