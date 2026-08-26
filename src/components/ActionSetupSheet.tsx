import React from 'react';
import { Sheet, sheetPress } from './Sheet';

const EASING = 'cubic-bezier(0.2,0,0,1)';

type ActionMode = 'trade' | 'perps' | 'earn';

interface ActionSetupSheetProps {
  open: boolean;
  mode: ActionMode;
  onClose: () => void;
  onBackToActions?: () => void;
  onAskWithPrefill: (prompt: string) => void;
}

type AssetMeta = {
  symbol: string;
  name: string;
  logo?: string;
  fallback?: string;
  bg: string;
};

const TRADE_ASSETS: AssetMeta[] = [
  { symbol: 'BTC', name: 'Bitcoin', logo: '/brand/btc-logo.png', bg: 'rgba(247,147,26,.14)' },
  { symbol: 'HYPE', name: 'Hyperliquid', logo: '/brand/hype-logo.png', bg: 'rgba(151,246,227,.13)' },
  { symbol: 'ETH', name: 'Ethereum', logo: '/brand/eth-logo.png', bg: 'rgba(98,126,234,.13)' },
  { symbol: 'SPCX', name: 'SpaceX', logo: '/brand/spcx-logo.svg', bg: 'rgba(255,255,255,.06)' },
  { symbol: 'XAU', name: 'Gold', fallback: 'Au', bg: 'rgba(239,179,59,.14)' },
  { symbol: 'AAPL', name: 'Apple', logo: '/brand/apple-logo.svg', bg: 'rgba(255,255,255,.08)' },
  { symbol: 'NEAR', name: 'Near', logo: '/brand/near-logo.png', bg: 'rgba(0,236,153,.13)' },
  { symbol: 'ZEC', name: 'Zcash', logo: '/brand/zec-logo.png', bg: 'rgba(239,179,59,.14)' },
];

const QUICK_ASSETS = ['BTC', 'HYPE', 'ETH', 'SPCX', 'XAU', 'AAPL'];
const STABLE_ROUTES = ['sUSDai', 'USDC vault', 'T-bill route'];
const assetMeta = TRADE_ASSETS.reduce<Record<string, AssetMeta>>((acc, item) => {
  acc[item.symbol] = item;
  return acc;
}, {});

const SEARCHABLE_ASSETS: Record<string, string> = {
  BTC: 'BTC',
  BITCOIN: 'BTC',
  HYPE: 'HYPE',
  HYPERLIQUID: 'HYPE',
  ETH: 'ETH',
  ETHEREUM: 'ETH',
  SPCX: 'SPCX',
  SPACEX: 'SPCX',
  SPACE: 'SPCX',
  XAU: 'XAU',
  GOLD: 'XAU',
  AAPL: 'AAPL',
  APPLE: 'AAPL',
  NEAR: 'NEAR',
  'NEAR PROTOCOL': 'NEAR',
  ZEC: 'ZEC',
  ZCASH: 'ZEC',
};

const modeCopy: Record<ActionMode, { label: string; title: string; sub: string }> = {
  trade: {
    label: 'Buy & Sell',
    title: 'Buy or sell in a few taps',
    sub: 'Quick order first. Use Prism when you want a custom setup.',
  },
  perps: {
    label: 'Perps',
    title: 'Build a leveraged setup',
    sub: 'Choose direction, margin, leverage and stop. Preview only in this public demo.',
  },
  earn: {
    label: 'Earn',
    title: 'Put idle cash to work',
    sub: 'Choose a stable route and preview where idle USDC could earn yield.',
  },
};

const pill = (active: boolean): React.CSSProperties => ({
  border: active ? '1px solid rgba(167,139,250,.36)' : '1px solid rgba(255,255,255,.075)',
  background: active ? 'rgba(167,139,250,.14)' : 'rgba(255,255,255,.035)',
  color: active ? 'var(--accent)' : 'var(--text-2)',
  borderRadius: 999,
  padding: '7px 10px',
  fontSize: 11.5,
  fontWeight: 650,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  transition: `transform 160ms ${EASING}, border-color 160ms ${EASING}`,
});

const field: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border-2)',
  background: 'rgba(255,255,255,.035)',
  color: 'var(--text)',
  borderRadius: 13,
  padding: '11px 12px',
  outline: 'none',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
};

const currencyInputWrap: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const currencyInput: React.CSSProperties = {
  ...field,
  paddingLeft: 28,
};

const assetSearchWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border-2)',
  background: 'rgba(255,255,255,.032)',
  borderRadius: 16,
  padding: '9px 11px',
  marginBottom: 9,
};

const assetSearchInput: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  outline: 'none',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
};

const quickAssetRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
  marginBottom: 12,
};

const primary: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 14,
  background: 'var(--accent)',
  color: '#0a0a0a',
  padding: 14,
  fontSize: 14.5,
  fontWeight: 650,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.15)',
  transition: `transform 160ms ${EASING}`,
};

const secondary: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--accent-15)',
  borderRadius: 14,
  background: 'var(--accent-08)',
  color: 'var(--accent)',
  padding: 13,
  fontSize: 13.5,
  fontWeight: 650,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  transition: `transform 160ms ${EASING}`,
};

function resolveAssetSearch(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean) return null;
  return SEARCHABLE_ASSETS[clean] ?? null;
}

function getAssetMeta(symbol: string) {
  return assetMeta[symbol] ?? { symbol, name: symbol, fallback: symbol.slice(0, 2), bg: 'rgba(255,255,255,.08)' };
}

function AssetMark({ symbol, size = 26 }: { symbol: string; size?: number }) {
  const meta = getAssetMeta(symbol);
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: size * 0.34,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: meta.bg,
      border: '1px solid rgba(255,255,255,.06)',
      overflow: 'hidden',
      flex: '0 0 auto',
    }}>
      {meta.logo ? (
        <img src={meta.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: 'var(--accent)', fontSize: 10.5, fontWeight: 800 }}>{meta.fallback}</span>
      )}
    </span>
  );
}

export const ActionSetupSheet: React.FC<ActionSetupSheetProps> = ({
  open,
  mode,
  onClose,
  onBackToActions,
  onAskWithPrefill,
}) => {
  const copy = modeCopy[mode];
  const [asset, setAsset] = React.useState(mode === 'earn' ? 'USDC' : '');
  const [side, setSide] = React.useState<'Buy' | 'Sell' | 'Long' | 'Short'>('Buy');
  const [amount, setAmount] = React.useState(mode === 'perps' ? '200' : '500');
  const [leverage, setLeverage] = React.useState('2x');
  const [route, setRoute] = React.useState('sUSDai');
  const [prompt, setPrompt] = React.useState('');
  const [assetSearchValue, setAssetSearchValue] = React.useState('');
  const [customSetupOpen, setCustomSetupOpen] = React.useState(false);
  const [previewed, setPreviewed] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setAsset(mode === 'earn' ? 'USDC' : '');
    setSide(mode === 'perps' ? 'Long' : 'Buy');
    setAmount(mode === 'perps' ? '200' : '500');
    setLeverage('2x');
    setRoute('sUSDai');
    setPrompt('');
    setAssetSearchValue('');
    setCustomSetupOpen(false);
    setPreviewed(false);
  }, [open, mode]);

  const pickAsset = (value: string) => {
    setAsset(value);
    setAssetSearchValue('');
  };

  const handleAssetSearch = (value: string) => {
    setAssetSearchValue(value);
    if (!value.trim()) {
      setAsset('');
      return;
    }
    const resolved = resolveAssetSearch(value);
    if (resolved) setAsset(resolved);
  };

  const selectedAssetMeta = asset ? getAssetMeta(asset) : null;
  const selectedAsset = asset || 'selected asset';
  const canPreview = mode === 'earn' || Boolean(asset);
  const generatedPrompt = mode === 'trade'
    ? `${side} ${selectedAsset} with ${amount} USDC`
    : mode === 'perps'
      ? `${side} ${selectedAsset} with ${amount} USDC margin at ${leverage}, include a stop`
      : `Put ${amount} USDC into ${route} stable yield`;
  const previewLabel = mode === 'earn' ? 'Preview route' : mode === 'perps' ? 'Preview setup' : 'Preview order';

  const submitPrompt = () => {
    const text = prompt.trim() || generatedPrompt;
    onClose();
    onAskWithPrefill(text);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ animation: `card-in 260ms ${EASING} both` }}>
        {onBackToActions && (
          <button onClick={onBackToActions} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none',
            background: 'transparent', color: 'var(--text-3)', fontSize: 11.5,
            fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: '0 0 12px',
          }}>
            ‹ Actions
          </button>
        )}

        <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>{copy.label}</div>
        <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em', marginBottom: 5 }}>{copy.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 14 }}>{copy.sub}</div>

        {mode !== 'earn' && (
          <>
            <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 7 }}>Asset</div>
            <div style={assetSearchWrap}>
              {asset ? (
                <AssetMark symbol={asset} size={30} />
              ) : null}
              <input
                value={assetSearchValue}
                onChange={e => handleAssetSearch(e.target.value)}
                placeholder="Search asset or ticker"
                aria-label="Search asset or ticker"
                style={assetSearchInput}
              />
              {selectedAssetMeta ? (
                <span className="mono" style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em' }}>{selectedAssetMeta.symbol}</span>
              ) : null}
            </div>
            <div style={quickAssetRow}>
              {QUICK_ASSETS.map(item => (
                <button
                  key={item}
                  onClick={() => pickAsset(item)}
                  {...sheetPress(0.97)}
                  style={{
                    ...pill(asset === item),
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '8px 7px',
                    borderRadius: 14,
                  }}
                >
                  <AssetMark symbol={item} size={19} />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'earn' && (
          <>
            <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 7 }}>Route</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
              {STABLE_ROUTES.map(item => (
                <button key={item} onClick={() => setRoute(item)} {...sheetPress(0.97)} style={pill(route === item)}>
                  {item}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: mode === 'perps' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setSide(mode === 'perps' ? 'Long' : 'Buy')} style={pill(side === (mode === 'perps' ? 'Long' : 'Buy'))}>
            {mode === 'perps' ? 'Long' : 'Buy'}
          </button>
          <button onClick={() => setSide(mode === 'perps' ? 'Short' : 'Sell')} style={pill(side === (mode === 'perps' ? 'Short' : 'Sell'))}>
            {mode === 'perps' ? 'Short' : 'Sell'}
          </button>
          {mode === 'perps' && (
            <select value={leverage} onChange={e => setLeverage(e.target.value)} style={{ ...field, padding: '8px 9px', fontSize: 11.5 }}>
              <option>1.5x</option>
              <option>2x</option>
              <option>3x</option>
              <option>5x</option>
            </select>
          )}
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 7 }}>{mode === 'perps' ? 'Margin' : 'Amount'}</div>
          <div style={currencyInputWrap}>
            <span style={{ position: 'absolute', left: 12, color: 'var(--text-3)', fontSize: 13, pointerEvents: 'none' }}>$</span>
            <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" style={currencyInput} />
          </div>
        </label>

        <button
          onClick={() => {
            if (!canPreview) return;
            setPreviewed(true);
          }}
          disabled={!canPreview}
          {...sheetPress(canPreview ? 0.98 : 1)}
          style={{
            ...primary,
            opacity: canPreview ? 1 : 0.48,
            cursor: canPreview ? 'pointer' : 'default',
          }}
        >
          {canPreview ? previewLabel : 'Choose asset'}
        </button>

        <div style={{ marginTop: 10, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setCustomSetupOpen(open => !open)}
            {...sheetPress(0.98)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              borderRadius: 10,
              padding: '4px 2px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: `transform 160ms ${EASING}`,
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Need a custom setup?</span>
            <span style={{ color: 'var(--accent)', fontSize: 12.5, fontWeight: 650 }}>Ask Prism</span>
          </button>

          {customSetupOpen && (
            <div style={{
              border: '1px solid var(--border-2)',
              background: 'rgba(255,255,255,.018)',
              borderRadius: 13,
              padding: 11,
              marginTop: 8,
            }}>
              <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 5 }}>Custom setup</div>
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="DCA SPCX and GOLD 50/50"
                style={{ ...field, background: 'rgba(5,5,7,.35)', marginBottom: 8 }}
              />
              <button onClick={submitPrompt} style={secondary}>
                Ask Prism to structure it
              </button>
            </div>
          )}
        </div>

        {previewed && canPreview && (
          <div style={{
            marginTop: 12,
            border: '1px solid rgba(80,220,170,.22)',
            background: 'rgba(80,220,170,.07)',
            borderRadius: 12,
            padding: 11,
          }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--green)', marginBottom: 4 }}>Preview ready</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>
              {generatedPrompt}. No transaction sent in this public preview.
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
