interface MarketSourceBadgeProps {
  sourceName?: string;
  tooltip?: string;
}

export function MarketSourceBadge({
  sourceName = 'Variational',
  tooltip = 'Market info only · trading soon',
}: MarketSourceBadgeProps) {
  return (
    <span
      className="market-source-badge"
      title={tooltip}
      aria-label={`${sourceName}: ${tooltip}`}
      tabIndex={0}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px',
        borderRadius: 999,
        border: '1px solid rgba(76,154,248,.28)',
        background: 'rgba(76,154,248,.1)',
        color: 'var(--text-2)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: 0,
        outline: 'none',
      }}
    >
      <img src="/brand/variational-mark.svg" alt="" style={{ width: 14, height: 14, display: 'block' }} />
      <span>{sourceName}</span>
      <span
        className="market-source-tip"
        role="tooltip"
        style={{
          position: 'absolute',
          left: 0,
          bottom: 'calc(100% + 8px)',
          width: 174,
          padding: '8px 9px',
          borderRadius: 10,
          background: '#0f1117',
          border: '1px solid var(--border-2)',
          color: 'var(--text)',
          fontSize: 11,
          lineHeight: 1.25,
          boxShadow: '0 12px 30px rgba(0,0,0,.35)',
          opacity: 0,
          transform: 'translateY(4px)',
          pointerEvents: 'none',
          transition: 'opacity 160ms var(--ease), transform 160ms var(--ease)',
          zIndex: 10,
        }}
      >
        {tooltip}
      </span>
      <style>{`
        .market-source-badge:hover .market-source-tip,
        .market-source-badge:focus-visible .market-source-tip {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </span>
  );
}
