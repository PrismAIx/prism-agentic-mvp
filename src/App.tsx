import './styles/tokens.css';
import { useState, useRef, useEffect } from 'react';
import { PhoneFrame } from './components/PhoneFrame';
import { Home } from './screens/Home';
import { Ask } from './screens/Ask';
import { Live } from './screens/Live';
import { AssetDetail } from './screens/AssetDetail';
import { RiskAlert } from './components/RiskAlert';
import { DemoReview } from './screens/DemoReview';
import { DepositModal } from './components/DepositModal';
import { AppMenu } from './components/AppMenu';
import { GuardSheet } from './components/GuardSheet';
import { FindMoneySheet } from './components/FindMoneySheet';
import { MarketPulseSheet } from './components/MarketPulseSheet';
import { FlowLinksSheet } from './components/FlowLinksSheet';
import { ActionSetupSheet } from './components/ActionSetupSheet';
import { MOCK_RISK_ALERT, buildMockPlan } from './lib/mock';
import { type Plan, type RiskAlertPayload } from './lib/types';
import { ASSETS } from './lib/assets';

// Screen state is either a string literal or an object with extra data.
type Screen =
  | 'home'
  | 'ask'
  | 'live'
  | { name: 'asset'; symbol: string };
type SheetSource = 'home' | 'actions' | null;
type AskBackTarget = Screen | 'actions';
type FlowLinksInitialView = 'list' | 'create' | 'detail';
type FlowLinksInitialPreset = 'ipo' | null;
type ActionSetupMode = 'trade' | 'perps' | 'earn';

/** A stable string key for ScreenTransition (detects screen changes). */
function toScreenKey(s: Screen): string {
  if (typeof s === 'string') return s;
  return `asset:${s.symbol}`;
}

function screenFromSearch(search: string): Screen {
  const params = new URLSearchParams(search);
  const s = params.get('screen');
  if (s === 'ask') return 'ask';
  if (s === 'live') return 'live';
  if (s === 'optimize') return 'home';
  if (s && s.startsWith('asset:')) {
    const sym = s.slice(6);
    if (ASSETS.find(a => a.symbol === sym)) return { name: 'asset', symbol: sym };
  }
  return 'home';
}

// Read initial screen + alert flag from query params (for deep-link / screenshot)
function getInitialScreen(): Screen {
  if (typeof window !== 'undefined') return screenFromSearch(window.location.search);
  return 'home';
}

function screenToSearchParam(s: Screen): string | null {
  if (s === 'home') return null;
  if (typeof s === 'string') return s;
  return `asset:${s.symbol}`;
}

function urlForScreen(s: Screen): string {
  const url = new URL(window.location.href);
  const param = screenToSearchParam(s);
  if (param) url.searchParams.set('screen', param);
  else url.searchParams.delete('screen');
  return `${url.pathname}${url.search}${url.hash}`;
}

function getInitialAlert(): boolean {
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('alert') === '1';
  }
  return false;
}

function getInitialAlertLoading(): boolean {
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('alertloading') === '1';
  }
  return false;
}

// ── Screen transition wrapper ─────────────────────────────────────────────────
// Cross-fade + 8px rise, 200ms, cubic-bezier(0.2,0,0,1).
// prefers-reduced-motion: collapses transform/opacity to instant swap.

interface TransitionProps {
  screenKey: string;
  children: React.ReactNode;
}

function ScreenTransition({ screenKey, children }: TransitionProps) {
  const [displayed, setDisplayed] = useState<{ key: string; node: React.ReactNode }>({
    key: screenKey,
    node: children,
  });
  const [incoming, setIncoming] = useState<{ key: string; node: React.ReactNode } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'enter'>('idle');
  const raf = useRef<number>(0);
  const fallbackTimer = useRef<number>(0);
  const incomingRef = useRef<{ key: string; node: React.ReactNode } | null>(null);

  const commitIncoming = () => {
    const next = incomingRef.current;
    if (!next) return;
    setDisplayed(next);
    setIncoming(null);
    incomingRef.current = null;
    setPhase('idle');
    window.clearTimeout(fallbackTimer.current);
  };

  useEffect(() => {
    if (screenKey === displayed.key) return;
    // New screen coming in
    const next = { key: screenKey, node: children };
    incomingRef.current = next;
    setIncoming(next);
    // Force a paint tick before triggering the enter animation
    raf.current = requestAnimationFrame(() => {
      raf.current = requestAnimationFrame(() => {
        setPhase('enter');
        fallbackTimer.current = window.setTimeout(commitIncoming, 280);
      });
    });
    return () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(fallbackTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    // Only react to THIS wrapper's own transition — not transitionEnd events
    // bubbling up from child animations (engine nodes, buttons, sparkline…),
    // which would otherwise remount the screen mid-flow and wipe its state.
    if (e.target !== e.currentTarget) return;
    if (phase === 'enter' && incoming) commitIncoming();
  };

  const EASING = 'cubic-bezier(0.2,0,0,1)';
  const DUR = '200ms';
  const currentNode = incoming || screenKey !== displayed.key ? displayed.node : children;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Current screen — fades/rises out when incoming arrives */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          opacity: incoming ? (phase === 'enter' ? 0 : 1) : 1,
          transform: incoming
            ? phase === 'enter'
              ? 'translateY(-6px)'
              : 'translateY(0)'
            : 'translateY(0)',
          transition: incoming ? `opacity ${DUR} ${EASING}, transform ${DUR} ${EASING}` : 'none',
        }}
      >
        {currentNode}
      </div>

      {/* Incoming screen — rises up from 8px below, fades in */}
      {incoming && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            opacity: phase === 'enter' ? 1 : 0,
            transform: phase === 'enter' ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity ${DUR} ${EASING}, transform ${DUR} ${EASING}`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {incoming.node}
        </div>
      )}

      {/* Reduced-motion override */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { transition-duration: 0ms !important; animation-duration: 0ms !important; }
        }
      `}</style>
    </div>
  );
}

function App() {
  const isDemoReview = typeof window !== 'undefined' && window.location.pathname === '/demo-review';
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const screenRef = useRef(screen);
  const historyReadyRef = useRef(false);
  const applyingPopStateRef = useRef(false);
  const [askPrefill, setAskPrefill] = useState('');
  const [askInitialPlan, setAskInitialPlan] = useState<Plan | null>(null);
  const [alertPayload, setAlertPayload] = useState<RiskAlertPayload | null>(
    getInitialAlert() ? MOCK_RISK_ALERT : null,
  );
  const [alertLoading, setAlertLoading] = useState(getInitialAlertLoading);
  const [depositOpen, setDepositOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guardOpen, setGuardOpen] = useState(false);
  const [findMoneyOpen, setFindMoneyOpen] = useState(false);
  const [marketPulseOpen, setMarketPulseOpen] = useState(false);
  const [flowLinksOpen, setFlowLinksOpen] = useState(false);
  const [actionSetupOpen, setActionSetupOpen] = useState<ActionSetupMode | null>(null);
  const [flowLinksInitialSlug, setFlowLinksInitialSlug] = useState<string | null>(null);
  const [flowLinksInitialView, setFlowLinksInitialView] = useState<FlowLinksInitialView>('list');
  const [flowLinksInitialPreset, setFlowLinksInitialPreset] = useState<FlowLinksInitialPreset>(null);
  const [sheetSource, setSheetSource] = useState<SheetSource>(null);
  const [askBackTarget, setAskBackTarget] = useState<AskBackTarget>('home');
  const [askAutoSubmit, setAskAutoSubmit] = useState(false);
  const startAskSettled = useRef(typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('screen') === 'ask').current;
  // Scale the fixed 384×800 design frame down to fit smaller viewports (keeps exact silhouette).
  const [phoneScale, setPhoneScale] = useState(1);
  useEffect(() => {
    const fit = () => setPhoneScale(Math.min(1, (window.innerHeight - 24) / 816, (window.innerWidth - 24) / 400));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Subtle 3D tilt for the preview frame.
  const tiltRef = useRef<HTMLDivElement>(null);
  const handleTilt = (e: React.MouseEvent) => {
    if (!tiltRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tiltRef.current.style.transform = `perspective(1100px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
  };
  const resetTilt = () => {
    if (tiltRef.current) tiltRef.current.style.transform = 'perspective(1100px)';
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const next = screenFromSearch(window.location.search);
      if (toScreenKey(next) === toScreenKey(screenRef.current)) return;
      applyingPopStateRef.current = true;
      setDepositOpen(false);
      setMenuOpen(false);
      setGuardOpen(false);
      setFindMoneyOpen(false);
      setMarketPulseOpen(false);
      setFlowLinksOpen(false);
      setActionSetupOpen(null);
      setFlowLinksInitialSlug(null);
      setFlowLinksInitialView('list');
      setFlowLinksInitialPreset(null);
      setSheetSource(null);
      setAskInitialPlan(null);
      setScreen(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    screenRef.current = screen;
    const nextUrl = urlForScreen(screen);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (!historyReadyRef.current) {
      window.history.replaceState({ prismScreen: toScreenKey(screen) }, '', nextUrl);
      historyReadyRef.current = true;
      return;
    }

    if (applyingPopStateRef.current) {
      applyingPopStateRef.current = false;
      return;
    }

    if (currentUrl !== nextUrl) {
      window.history.pushState({ prismScreen: toScreenKey(screen) }, '', nextUrl);
    }
  }, [screen]);

  const handleBell = (source: SheetSource = 'home') => {
    setSheetSource(source);
    setGuardOpen(true);
  };
  const handleDismissAlert = () => { setAlertPayload(null); setAlertLoading(false); };

  const openActionsSheet = (openSheet: () => void) => {
    setSheetSource('actions');
    openSheet();
  };

  const openHomeSheet = (openSheet: () => void) => {
    setSheetSource('home');
    openSheet();
  };

  const backToActions = () => {
    setDepositOpen(false);
    setGuardOpen(false);
    setFindMoneyOpen(false);
    setMarketPulseOpen(false);
    setFlowLinksOpen(false);
    setActionSetupOpen(null);
    setFlowLinksInitialSlug(null);
    setFlowLinksInitialView('list');
    setFlowLinksInitialPreset(null);
    setMenuOpen(true);
    setSheetSource(null);
  };

  const returnFromAsk = () => {
    setAskAutoSubmit(false);
    setAskInitialPlan(null);
    if (askBackTarget === 'actions') {
      setScreen('home');
      setMenuOpen(true);
      setAskBackTarget('home');
      return;
    }
    setScreen(askBackTarget);
    setAskBackTarget('home');
  };

  const navigateToAsk = (prefill = '', autoSubmit = false, backTarget: AskBackTarget = screenRef.current) => {
    setAskPrefill(prefill);
    setAskInitialPlan(null);
    setAskAutoSubmit(autoSubmit);
    setAskBackTarget(backTarget);
    setScreen('ask');
  };

  const navigateToAskWithPlan = (prefill: string, plan: Plan, backTarget: AskBackTarget = screenRef.current) => {
    setAskPrefill(prefill);
    setAskInitialPlan(plan);
    setAskAutoSubmit(false);
    setAskBackTarget(backTarget);
    setScreen('ask');
  };

  function renderScreen() {
    if (screen === 'ask') {
      return (
        <Ask
          key={`${askPrefill}:${askInitialPlan?.planId ?? 'engine'}`}
          onBack={returnFromAsk}
          onBell={() => handleBell('home')}
          onMe={() => setScreen('live')}
          settled={startAskSettled}
          initialText={askPrefill}
          initialPlan={askInitialPlan}
          autoSubmitInitial={askAutoSubmit}
        />
      );
    }
    if (screen === 'live') {
      return (
        <Live
          onHome={() => setScreen('home')}
          onActions={() => setMenuOpen(true)}
        />
      );
    }
    if (typeof screen === 'object' && screen.name === 'asset') {
      const asset = ASSETS.find(a => a.symbol === screen.symbol);
      if (asset) {
        return (
          <AssetDetail
            asset={asset}
            onBack={() => setScreen('home')}
            onAsk={(prefill) => navigateToAsk(prefill)}
            onMe={() => setScreen('live')}
          />
        );
      }
    }
    return (
      <Home
        onAsk={() => navigateToAsk()}
        onMarketPulse={() => openHomeSheet(() => setMarketPulseOpen(true))}
        onFlowLinks={() => openHomeSheet(() => { setFlowLinksInitialSlug(null); setFlowLinksInitialView('list'); setFlowLinksInitialPreset(null); setFlowLinksOpen(true); })}
        onBell={() => handleBell('home')}
        onLive={() => setScreen('live')}
        onAsset={(symbol) => setScreen({ name: 'asset', symbol })}
        onDeposit={() => setDepositOpen(true)}
        onOptimize={() => setFindMoneyOpen(true)}
        onMenu={() => setMenuOpen(true)}
      />
    );
  }

  if (isDemoReview) {
    return <DemoReview />;
  }

  return (
    <div style={{
      fontFamily: 'var(--font-sans)',
      background: '#050507',
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      padding: 14,
    }}
      onMouseMove={handleTilt}
      onMouseLeave={resetTilt}
    >
      <div ref={tiltRef} style={{ transform: 'perspective(1100px)', transition: 'transform 450ms var(--ease)', willChange: 'transform' }}>
      <div style={{ transform: `scale(${phoneScale})`, transformOrigin: 'center center' }}>
      <PhoneFrame>
        <ScreenTransition screenKey={toScreenKey(screen)}>
          {renderScreen()}
        </ScreenTransition>
        {(alertPayload || alertLoading) && (
          <RiskAlert alert={alertPayload} loading={alertLoading} onDismiss={handleDismissAlert} />
        )}
        <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
        <AppMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onAskAnything={() => navigateToAsk('', false, 'actions')}
          onMarketPulse={() => openActionsSheet(() => setMarketPulseOpen(true))}
          onFlowLinks={() => openActionsSheet(() => { setFlowLinksInitialSlug(null); setFlowLinksInitialView('list'); setFlowLinksInitialPreset(null); setFlowLinksOpen(true); })}
          onEarn={() => openActionsSheet(() => setActionSetupOpen('earn'))}
          onPerps={() => openActionsSheet(() => setActionSetupOpen('perps'))}
          onTrade={() => openActionsSheet(() => setActionSetupOpen('trade'))}
          onFindMoney={() => openActionsSheet(() => setFindMoneyOpen(true))}
          onHistory={() => setScreen('live')}
          onAlerts={() => handleBell('actions')}
        />
        <GuardSheet
          open={guardOpen}
          onClose={() => setGuardOpen(false)}
          onBackToActions={sheetSource === 'actions' ? backToActions : undefined}
          onReviewPlan={() => {
            setGuardOpen(false);
            const prompt = 'Scan my positions for fresh news that could move my holdings, especially SPCX volatility risk';
            navigateToAskWithPlan(prompt, buildMockPlan(prompt));
          }}
        />
        <FindMoneySheet
          open={findMoneyOpen}
          onClose={() => setFindMoneyOpen(false)}
          onBackToActions={sheetSource === 'actions' ? backToActions : undefined}
          onInvest={(prompt) => { setFindMoneyOpen(false); navigateToAsk(prompt || 'Invest recovered subscription savings into a simple Arbitrum plan', true); }}
        />
        <ActionSetupSheet
          open={actionSetupOpen !== null}
          mode={actionSetupOpen || 'trade'}
          onClose={() => setActionSetupOpen(null)}
          onBackToActions={sheetSource === 'actions' ? backToActions : undefined}
          onAskWithPrefill={(prompt) => navigateToAsk(prompt, true, 'actions')}
        />
        <MarketPulseSheet
          open={marketPulseOpen}
          onClose={() => setMarketPulseOpen(false)}
          onBackToActions={sheetSource === 'actions' ? backToActions : undefined}
          onGenerateBrief={(briefPrompt) => {
            setMarketPulseOpen(false);
            navigateToAsk(briefPrompt, true);
          }}
          onCreatePlaybook={() => {
            setMarketPulseOpen(false);
            setFlowLinksInitialSlug(null);
            setFlowLinksInitialPreset('ipo');
            setFlowLinksInitialView('create');
            setFlowLinksOpen(true);
          }}
          onReadSPCX={() => {
            setMarketPulseOpen(false);
            setFlowLinksInitialSlug('spcx-price-discovery');
            setFlowLinksInitialView('detail');
            setFlowLinksInitialPreset(null);
            setFlowLinksOpen(true);
          }}
          onTrackMarkets={() => {
            setMarketPulseOpen(false);
            setFlowLinksInitialSlug('event-market-edge');
            setFlowLinksInitialView('detail');
            setFlowLinksInitialPreset(null);
            setFlowLinksOpen(true);
          }}
          onScanPositions={() => {
            setMarketPulseOpen(false);
            handleBell(sheetSource === 'actions' ? 'actions' : 'home');
          }}
        />
        <FlowLinksSheet
          open={flowLinksOpen}
          onClose={() => setFlowLinksOpen(false)}
          onBackToActions={sheetSource === 'actions' ? backToActions : undefined}
          initialSlug={flowLinksInitialSlug}
          initialView={flowLinksInitialView}
          initialPreset={flowLinksInitialPreset}
        />
      </PhoneFrame>
      </div>
      </div>
    </div>
  );
}

export default App;
