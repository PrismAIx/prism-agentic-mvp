import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, sheetPress } from './Sheet';
import {
  DEMO_FLOWLINKS,
  MCP_TOOLS,
  buildAgentFlowLinkJson,
  buildPreviewFromFlowLink,
  buildWaysToExpressResponse,
  createMockFlowLink,
  runDemoX402DeepCheck,
  type FlowLink,
  type RiskLevel,
} from '../lib/flowlinks';

const EASING = 'cubic-bezier(0.2,0,0,1)';
type View = 'list' | 'create' | 'detail' | 'preview' | 'dashboard';
type AgentCall = 'json' | 'deep' | 'preview';
type FlowPreset = 'ipo';

interface FlowLinksSheetProps {
  open: boolean;
  onClose: () => void;
  onBackToActions?: () => void;
  initialSlug?: string | null;
  initialView?: View;
  initialPreset?: FlowPreset | null;
}

const BASE_FORM = {
  thesis: 'AI compute and data center power demand are heating up',
  narrative: 'AI compute',
  venues: ['Ostium'],
  riskLevel: 'high' as RiskLevel,
  creatorHandle: '@creator',
};

const PRESET_FORMS: Record<FlowPreset, typeof BASE_FORM> = {
  ipo: {
    thesis: 'IPO window is reopening around AI-linked listings and retail flow',
    narrative: 'IPO season',
    venues: ['Ostium', 'Variational'],
    riskLevel: 'high',
    creatorHandle: '@prism',
  },
};

const chipStyle = (tone: 'accent' | 'muted' | 'danger' = 'muted'): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '4px 7px',
  fontSize: 9,
  fontFamily: 'var(--mono)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: tone === 'danger' ? 'var(--red)' : tone === 'accent' ? 'var(--accent)' : 'var(--text-3)',
  background: tone === 'accent' ? 'var(--accent-08)' : tone === 'danger' ? 'rgba(255,107,107,.08)' : 'rgba(255,255,255,.035)',
  border: tone === 'accent' ? '1px solid var(--accent-15)' : tone === 'danger' ? '1px solid rgba(255,107,107,.2)' : '1px solid rgba(255,255,255,.06)',
  whiteSpace: 'nowrap',
});

const smallButton = (active = false): React.CSSProperties => ({
  border: active ? '1px solid var(--accent-35)' : '1px solid var(--border-2)',
  background: active ? 'var(--accent-08)' : 'rgba(255,255,255,.035)',
  color: active ? 'var(--accent)' : 'var(--text-2)',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 11.5,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  transition: `transform 160ms ${EASING}, border-color 160ms ${EASING}`,
});

const primaryButton: React.CSSProperties = {
  width: '100%',
  background: 'var(--accent)',
  color: '#0a0a0a',
  border: 'none',
  borderRadius: 14,
  padding: 14,
  fontSize: 14.5,
  fontWeight: 650,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.15)',
  transition: `transform 160ms ${EASING}`,
};

const riskLabel = (risk: RiskLevel) => risk.replace('_', ' ');

const sourceLabel = (flow: FlowLink) => (
  flow.creatorHandle === '@prism' ? 'Built from Market Pulse signal' : 'Submitted thesis, checked by Prism'
);

const cardSummary = (flow: FlowLink) => {
  if (flow.slug === 'ai-compute-bottleneck') return 'Data centers, chips, power';
  if (flow.slug === 'spcx-price-discovery') return 'SpaceX hype, supply, unlocks';
  if (flow.slug === 'event-market-edge') return 'Odds, news, crowd pricing';
  if (flow.slug === 'war-shock-gold-oil') return 'Hedge macro stress';
  return `${flow.narrative} idea`;
};

function FlowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 7.5 H9.5 C12.8 7.5 12.8 16.5 16.2 16.5 H19" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 16.5 H8.2 C10 16.5 10.8 13.8 12 12" stroke="#5cc6e8" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="7.5" r="2.3" stroke="var(--accent-35)" strokeWidth="1.3" />
      <circle cx="19" cy="16.5" r="2.3" fill="#5cc6e8" opacity="0.9" />
    </svg>
  );
}

function BackRow({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button onClick={onBack} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none',
      background: 'transparent', color: 'var(--text-3)', fontSize: 11.5,
      fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: '0 0 12px',
    }}>
      <svg width="11" height="11" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5 L4.5 7.5 L9.5 12.5" /></svg>
      {label}
    </button>
  );
}

export const FlowLinksSheet: React.FC<FlowLinksSheetProps> = ({ open, onClose, onBackToActions, initialSlug = null, initialView = 'list', initialPreset = null }) => {
  const [view, setView] = useState<View>('list');
  const [flows, setFlows] = useState<FlowLink[]>(DEMO_FLOWLINKS);
  const [selected, setSelected] = useState<FlowLink>(DEMO_FLOWLINKS[1]);
  const [callMode, setCallMode] = useState<AgentCall>('json');
  const [paid, setPaid] = useState(false);
  const [agentResponse, setAgentResponse] = useState('');
  const [railConfirmed, setRailConfirmed] = useState(false);
  const [form, setForm] = useState(BASE_FORM);

  useEffect(() => {
    if (!open) return;
    setFlows(DEMO_FLOWLINKS);
    const initialFlow = initialSlug ? DEMO_FLOWLINKS.find(flow => flow.slug === initialSlug) : undefined;
    if (initialFlow) {
      setSelected(initialFlow);
      setView('detail');
    } else {
      setView(initialView);
    }
    setForm(initialPreset ? PRESET_FORMS[initialPreset] : BASE_FORM);
    setPaid(false);
    setAgentResponse('');
    setRailConfirmed(false);
  }, [open, initialSlug, initialView, initialPreset]);

  const dashboard = useMemo(() => flows.reduce((acc, flow) => ({
    views: acc.views + flow.stats.views,
    agentCalls: acc.agentCalls + flow.stats.agentCalls,
    x402RevenueUsd: acc.x402RevenueUsd + flow.stats.x402RevenueUsd,
    previews: acc.previews + flow.stats.previews,
    routedVolumeUsd: acc.routedVolumeUsd + flow.stats.routedVolumeUsd,
    prismFeesUsd: acc.prismFeesUsd + flow.stats.prismFeesUsd,
    creatorEarningsUsd: acc.creatorEarningsUsd + flow.stats.creatorEarningsUsd,
  }), {
    views: 0, agentCalls: 0, x402RevenueUsd: 0, previews: 0,
    routedVolumeUsd: 0, prismFeesUsd: 0, creatorEarningsUsd: 0,
  }), [flows]);

  const openFlow = (flow: FlowLink) => {
    setSelected(flow);
    setPaid(false);
    setAgentResponse('');
    setRailConfirmed(false);
    setView('detail');
  };

  const toggleVenue = (venue: string) => {
    setForm(prev => ({
      ...prev,
      venues: prev.venues.includes(venue)
        ? prev.venues.filter(v => v !== venue)
        : [...prev.venues, venue],
    }));
  };

  const generateFlow = () => {
    const flow = createMockFlowLink(form);
    setFlows(prev => [flow, ...prev.filter(item => item.slug !== flow.slug)]);
    openFlow(flow);
  };

  const runAgentCall = (forcePaid = paid) => {
    if (callMode === 'json') {
      setAgentResponse(JSON.stringify(buildAgentFlowLinkJson(selected), null, 2));
      return;
    }
    if (callMode === 'deep') {
      setAgentResponse(JSON.stringify(runDemoX402DeepCheck(selected, forcePaid), null, 2));
      return;
    }
    setAgentResponse(JSON.stringify({
      ways_to_express: buildWaysToExpressResponse(selected),
      preview: buildPreviewFromFlowLink(selected),
    }, null, 2));
  };

  const preview = buildPreviewFromFlowLink(selected);

  return (
    <Sheet open={open} onClose={onClose}>
      {view === 'list' && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--accent-08)', border: '1px solid var(--accent-15)', display: 'grid', placeItems: 'center' }}>
              <FlowIcon />
            </div>
            <div className="mlbl" style={{ letterSpacing: '0.12em' }}>Playbooks</div>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
             <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em' }}>
               Investable ideas
             </div>
             <span style={{
               border: '1px solid var(--accent-15)', background: 'rgba(167,139,250,.055)',
               color: 'var(--accent)', borderRadius: 999, padding: '4px 7px',
               fontSize: 9.5, fontWeight: 650, letterSpacing: '0.04em',
             }}>
               Agent-ready
             </span>
           </div>
           <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 14 }}>
             Market ideas made easy to review, customize and approve.
           </div>

          <button onClick={() => setView('create')} {...sheetPress(0.98)} style={{ ...primaryButton, marginBottom: 13 }}>
            Build from a thesis
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {flows.map(flow => {
              const markets = flow.waysToExpress.slice(0, 2).map(route => route.market);
              return (
                <button key={flow.slug} onClick={() => openFlow(flow)} {...sheetPress(0.985)} style={{
                  border: '1px solid var(--border-2)', background: 'rgba(255,255,255,.028)',
                  borderRadius: 14, padding: '12px 12px 11px', color: 'inherit', fontFamily: 'var(--font-sans)',
                  textAlign: 'left', cursor: 'pointer', transition: `transform 160ms ${EASING}`,
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 31, height: 31, borderRadius: 10, background: 'var(--accent-08)', border: '1px solid var(--accent-15)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <FlowIcon />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.2, fontWeight: 650, letterSpacing: '-0.01em', marginBottom: 2 }}>{flow.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{cardSummary(flow)}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                        {markets.map((market, index) => (
                          <span key={`${flow.slug}-${market}`} style={chipStyle(index === 0 ? 'accent' : 'muted')}>{market}</span>
                        ))}
                        <span style={chipStyle(flow.riskLevel === 'very_high' ? 'danger' : 'muted')}>{riskLabel(flow.riskLevel)}</span>
                      </div>
                    </div>
                    <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, color: 'rgba(246,246,248,.42)', flexShrink: 0, marginTop: 1 }}>›</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button onClick={() => setView('dashboard')} style={{
            marginTop: 12, width: '100%', border: '1px solid var(--border-2)', background: 'transparent',
            color: 'var(--text-2)', borderRadius: 12, padding: 11, fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}>
            View playbook activity
          </button>
        </div>
      )}

      {view === 'create' && (
        <div style={{ animation: `card-in 260ms ${EASING} both` }}>
          <BackRow label="Playbooks" onBack={() => setView('list')} />
          <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>Turn idea into setup</div>
          <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-0.02em', marginBottom: 5 }}>Turn a thesis into a playbook</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 13 }}>
            Prism maps the thesis into markets, sizing, routes and risk before anything can be approved.
          </div>

          <textarea
            value={form.thesis}
            onChange={e => setForm(prev => ({ ...prev, thesis: e.target.value }))}
            style={{
              width: '100%', minHeight: 74, resize: 'none', boxSizing: 'border-box',
              border: '1px solid var(--border-2)', background: 'var(--card)',
              color: 'var(--text)', borderRadius: 13, padding: 12, outline: 'none',
              fontSize: 13, lineHeight: 1.35, fontFamily: 'var(--font-sans)', marginBottom: 10,
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
            {['AI compute', 'SPCX', 'Event markets', 'War shock', 'Custom'].map(narrative => (
              <button key={narrative} onClick={() => setForm(prev => ({ ...prev, narrative }))} style={smallButton(form.narrative === narrative)}>{narrative}</button>
            ))}
          </div>

          <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 7 }}>Venues</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
            {['Ostium', 'Variational', 'Kalshi', 'Polymarket'].map(venue => (
              <button key={venue} onClick={() => toggleVenue(venue)} style={smallButton(form.venues.includes(venue))}>{venue}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <select value={form.riskLevel} onChange={e => setForm(prev => ({ ...prev, riskLevel: e.target.value as RiskLevel }))} style={{
              border: '1px solid var(--border-2)', background: 'var(--card)', color: 'var(--text)',
              borderRadius: 12, padding: '10px 9px', fontSize: 12, fontFamily: 'var(--font-sans)',
            }}>
              <option value="medium">medium risk</option>
              <option value="high">high risk</option>
              <option value="very_high">very high risk</option>
            </select>
            <input value={form.creatorHandle} onChange={e => setForm(prev => ({ ...prev, creatorHandle: e.target.value }))} style={{
              border: '1px solid var(--border-2)', background: 'var(--card)', color: 'var(--text)',
              borderRadius: 12, padding: '10px 9px', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
            }} />
          </div>

          <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.05em', lineHeight: 1.45, marginBottom: 13 }}>
            Read-only demo. No transaction sent.
          </div>
          <button onClick={generateFlow} {...sheetPress(0.98)} style={primaryButton}>Build playbook</button>
        </div>
      )}

      {view === 'detail' && (
        <div style={{ animation: `card-in 260ms ${EASING} both` }}>
          <BackRow label="Playbooks" onBack={() => setView('list')} />
          <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>Playbook</div>
          <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em', marginBottom: 5 }}>{selected.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 12 }}>
            {selected.thesis}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13,
            color: 'var(--text-2)', fontSize: 11.8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#5cc6e8', boxShadow: '0 0 12px rgba(92,198,232,.42)', flexShrink: 0 }} />
            Built for humans. Callable by agents.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 13 }}>
            {[
              ['Setup', '$1,000'],
              ['Route', preview.markets.slice(0, 2).join(' / ') || selected.markets.join(' / ')],
              ['Risk', riskLabel(selected.riskLevel)],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.026)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 10 }}>
                <div className="mlbl" style={{ fontSize: 8.8, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12.2, fontWeight: 650, color: label === 'Risk' && selected.riskLevel === 'very_high' ? 'var(--red)' : 'var(--text)' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 13 }}>
            <span style={chipStyle()}>Preview only</span>
            <span style={chipStyle('danger')}>Not financial advice</span>
          </div>

          <div style={{ display: 'grid', gap: 8, marginBottom: 13 }}>
            {[
              ['Source', sourceLabel(selected)],
              ['Creator thesis', selected.creatorHandle],
              ['Prism Check', selected.prismCheck.marketConfirmation],
              ['Venue confirmation', selected.prismCheck.venueConfirmation],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.026)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 11px' }}>
                <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.35 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mlbl" style={{ marginBottom: 7 }}>Ways to Express</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 13 }}>
            {selected.waysToExpress.map((route, i) => (
              <div key={`${route.venue}-${route.market}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 1px', borderBottom: i < selected.waysToExpress.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                <div style={{ width: 27, height: 27, borderRadius: 8, background: 'var(--accent-08)', border: '1px solid var(--accent-15)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>{route.market[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{route.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{route.venue} · {route.role}</div>
                </div>
                <span style={chipStyle(route.routeType === 'watch_only' ? 'muted' : 'accent')}>{route.previewEnabled ? 'Preview' : 'Watch'}</span>
              </div>
            ))}
          </div>

           <div style={{ background: 'rgba(255,255,255,.022)', border: '1px solid var(--border-2)', borderRadius: 13, padding: 11, marginBottom: 13 }}>
             <div className="mlbl" style={{ marginBottom: 4 }}>Agent access</div>
             <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.4, marginBottom: 8 }}>
               MCP endpoint · x402 premium checks · preview-only routing
             </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 9 }}>
              {MCP_TOOLS.slice(0, 3).map(tool => (
                <span key={tool.name} style={chipStyle(tool.x402_required ? 'accent' : 'muted')}>
                  {tool.name.replace('prism_', '')}
                </span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 9 }}>
              {([
                ['json', 'Agent JSON'],
                ['deep', 'Deep check'],
               ['preview', 'Routes'],
              ] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => { setCallMode(mode); setAgentResponse(''); setPaid(false); }} style={smallButton(callMode === mode)}>{label}</button>
              ))}
            </div>
            <button onClick={() => runAgentCall()} {...sheetPress(0.98)} style={{ ...primaryButton, padding: 12, fontSize: 13, marginBottom: agentResponse ? 9 : 0 }}>
              Run agent check
            </button>
            {callMode === 'deep' && agentResponse.includes('"status": 402') && (
              <button onClick={() => { setPaid(true); runAgentCall(true); }} style={{ ...smallButton(true), width: '100%', marginBottom: 9 }}>Unlock deep check</button>
            )}
            {agentResponse && (
              <pre className="mono" style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 154, overflow: 'auto',
                background: '#0c0c0e', border: '1px solid var(--border-2)', borderRadius: 12,
                padding: 10, margin: 0, fontSize: 9.5, lineHeight: 1.45, color: 'var(--text-2)',
              }}>{agentResponse}</pre>
            )}
          </div>

          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5, letterSpacing: '0.03em', marginBottom: 13 }}>
            Read-only playbook. Agents can query it, users can preview it, and no transaction is sent.
          </div>
          <button onClick={() => { setRailConfirmed(false); setView('preview'); }} {...sheetPress(0.98)} style={primaryButton}>
            Preview setup
          </button>
        </div>
      )}

      {view === 'preview' && (
        <div style={{ animation: `card-in 260ms ${EASING} both` }}>
          <BackRow label="Playbook detail" onBack={() => setView('detail')} />
          <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>Preview only</div>
          <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em', marginBottom: 5 }}>Route through Prism rails</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 13 }}>
            {selected.title}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 13 }}>
            <div style={{ background: 'rgba(255,255,255,.026)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 11 }}>
              <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 4 }}>Venue</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{preview.venue}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.026)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 11 }}>
              <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 4 }}>Markets</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{preview.markets.join(', ')}</div>
            </div>
          </div>

          <div className="mono" style={{ fontSize: 10.2, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 11, marginBottom: 13 }}>
            Read-only setup preview. Example size is split across the selected routes. No transaction sent. User approval would be required before any future execution.
          </div>

          <button onClick={() => setRailConfirmed(true)} {...sheetPress(0.98)} style={primaryButton}>
            Approve preview
          </button>
          <button onClick={() => setAgentResponse(JSON.stringify(buildAgentFlowLinkJson(selected), null, 2))} style={{ ...smallButton(false), width: '100%', marginTop: 8 }}>
             View agent format
          </button>
          {railConfirmed && (
            <div style={{ marginTop: 12, border: '1px solid rgba(80,220,170,.22)', background: 'rgba(80,220,170,.07)', borderRadius: 12, padding: 11 }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--green)', marginBottom: 4 }}>No transaction sent</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>
                This is a demo. No transaction was sent. In production, the user would approve execution and Prism would route through the selected venue integration.
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'dashboard' && (
        <div style={{ animation: `card-in 260ms ${EASING} both` }}>
          <BackRow label="Playbooks" onBack={() => setView('list')} />
          <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>Activity</div>
          <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em', marginBottom: 5 }}>Playbook activity</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 13 }}>
            Views, previews and agent checks for Prism playbooks.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              ['Views', dashboard.views.toLocaleString()],
              ['Agent checks', dashboard.agentCalls.toLocaleString()],
              ['x402 checks', Math.round(dashboard.x402RevenueUsd / 0.16).toLocaleString()],
              ['Previews', dashboard.previews.toLocaleString()],
              ['Mock routed', `$${Math.round(dashboard.routedVolumeUsd / 1000)}k`],
              ['Activity score', Math.round((dashboard.agentCalls + dashboard.previews) / 10).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.026)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 11 }}>
                <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 4 }}>{label}</div>
                <div className="num" style={{ fontSize: 18, fontWeight: 650 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {flows.map((flow, i) => (
              <div key={flow.slug} style={{ display: 'flex', gap: 9, padding: '8px 1px', borderBottom: i < flows.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{flow.title}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{flow.stats.agentCalls} agent calls · {flow.stats.previews} previews</div>
                </div>
                <div className="num" style={{ fontSize: 12.5, fontWeight: 650 }}>{flow.stats.previews}</div>
              </div>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.06em', lineHeight: 1.5, marginTop: 12, textTransform: 'uppercase' }}>
            Preview only · No transaction sent · Not financial advice
          </div>
        </div>
      )}
    </Sheet>
  );
};
