import React from 'react';

type TabId = 'home' | 'plus' | 'me';

interface TabBarProps {
  active?: TabId;
  onHomeClick?: () => void;
  onCenterClick?: () => void;
  onMeClick?: () => void;
}

const EASING = 'cubic-bezier(0.2,0,0,1)';

const press = (s = 0.9) => ({
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.transform = `scale(${s})`; },
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; },
  onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; },
});

// Prism v3 redesign — minimal tab bar, Ask = thin lavender circle.
export const TabBar: React.FC<TabBarProps> = ({ active = 'home', onHomeClick, onCenterClick, onMeClick }) => {
  const onKeyActivate = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    fn();
  };

  const sideItem = (key: TabId, label: string, icon: React.ReactNode, onClick?: () => void) => {
    const interactive = typeof onClick === 'function';
    return (
    <div
      role="button"
      aria-disabled={!interactive}
      tabIndex={interactive ? 0 : -1}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? onKeyActivate(onClick) : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        color: active === key ? 'var(--accent)' : 'var(--text-4)',
        fontSize: 9.5, fontWeight: 500, padding: '4px 6px',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none', transition: `color 200ms ${EASING}`, width: 56,
        position: 'relative',
      }}
    >
      {active === key && (
        <span style={{
          position: 'absolute', top: -3, width: 46, height: 32, borderRadius: 14,
          background: 'radial-gradient(circle, var(--accent-15), transparent 72%)',
          filter: 'blur(3px)', pointerEvents: 'none', zIndex: -1,
        }} />
      )}
      {icon}
      <span>{label}</span>
    </div>
    );
  };

  const centerInteractive = typeof onCenterClick === 'function';

  return (
    <nav style={{
      height: 76, flexShrink: 0, position: 'relative', zIndex: 3,
      background: 'rgba(10,10,10,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 12px 16px',
    }}>
      {sideItem('home', 'Home',
        <svg width="20" height="20" viewBox="0 0 24 24" fill={active === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 2l10 9h-3v10h-5v-6h-4v6H5V11H2l10-9z" /></svg>,
        onHomeClick)}

      {/* Center — Actions (Ask) */}
      <div
        role="button"
        aria-disabled={!centerInteractive}
        tabIndex={centerInteractive ? 0 : -1}
        onClick={centerInteractive ? onCenterClick : undefined}
        onKeyDown={centerInteractive ? onKeyActivate(onCenterClick) : undefined}
        style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        color: 'var(--accent)', fontSize: 9.5, fontWeight: 500, padding: '4px 6px',
        cursor: centerInteractive ? 'pointer' : 'default', userSelect: 'none', width: 56,
      }}>
        <div {...(centerInteractive ? press(0.9) : {})} style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '1.5px solid var(--accent)',
          background: active === 'plus' ? 'var(--accent)' : 'transparent',
          color: active === 'plus' ? '#0a0a0a' : 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: `all 200ms ${EASING}`,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        <span>Actions</span>
      </div>

      {sideItem('me', 'Me',
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></svg>,
        onMeClick)}
    </nav>
  );
};
