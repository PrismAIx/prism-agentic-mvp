import React from 'react';
import {
  DEMO_FLOWLINKS,
  MCP_TOOLS,
  buildAgentFlowLinkJson,
  buildPreviewFromFlowLink,
  buildWaysToExpressResponse,
  runDemoX402DeepCheck,
} from '../lib/flowlinks';

const EASING = 'cubic-bezier(0.2,0,0,1)';
const selected = DEMO_FLOWLINKS[1];
const unpaidX402 = runDemoX402DeepCheck(selected, false);
const paidX402 = runDemoX402DeepCheck(selected, true);
const agentJson = buildAgentFlowLinkJson(selected);
const waysToExpress = buildWaysToExpressResponse(selected);
const preview = buildPreviewFromFlowLink(selected);
const dashboard = DEMO_FLOWLINKS.reduce((acc, flow) => ({
  views: acc.views + flow.stats.views,
  agentCalls: acc.agentCalls + flow.stats.agentCalls,
  x402RevenueUsd: acc.x402RevenueUsd + flow.stats.x402RevenueUsd,
  previews: acc.previews + flow.stats.previews,
  routedVolumeUsd: acc.routedVolumeUsd + flow.stats.routedVolumeUsd,
  prismFeesUsd: acc.prismFeesUsd + flow.stats.prismFeesUsd,
  creatorEarningsUsd: acc.creatorEarningsUsd + flow.stats.creatorEarningsUsd,
}), {
  views: 0,
  agentCalls: 0,
  x402RevenueUsd: 0,
  previews: 0,
  routedVolumeUsd: 0,
  prismFeesUsd: 0,
  creatorEarningsUsd: 0,
});

const page: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#050507',
  color: 'var(--text)',
  fontFamily: 'var(--font-sans)',
  padding: '28px clamp(16px, 4vw, 48px) 48px',
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
  gap: 16,
  alignItems: 'start',
};

const panel: React.CSSProperties = {
  background: 'rgba(255,255,255,.028)',
  border: '1px solid rgba(255,255,255,.075)',
  borderRadius: 18,
  padding: 16,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.035), 0 20px 60px rgba(0,0,0,.2)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 650,
  letterSpacing: '-0.02em',
  margin: '4px 0 6px',
};

const muted: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: 12.5,
  lineHeight: 1.45,
};

const chip = (tone: 'accent' | 'muted' | 'danger' = 'muted'): React.CSSProperties => ({
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
});

function Pre({ value }: { value: unknown }) {
  return (
    <pre className="mono" style={{
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      background: '#0c0c0e',
      border: '1px solid var(--border-2)',
      borderRadius: 12,
      padding: 11,
      margin: 0,
      fontSize: 10,
      lineHeight: 1.5,
      color: 'var(--text-2)',
      maxHeight: 280,
      overflow: 'auto',
    }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.026)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 11 }}>
      <div className="mlbl" style={{ fontSize: 9.5, marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 18, fontWeight: 650 }}>{value}</div>
    </div>
  );
}

function FlowRow({ title, sub, meta }: { title: string; sub: string; meta: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid var(--border-2)' }}>
      <div style={{ width: 29, height: 29, borderRadius: 9, background: 'var(--accent-08)', border: '1px solid var(--accent-15)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 10 }}>
        {title.slice(0, 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 650 }}>{title}</div>
        <div style={{ ...muted, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={chip(meta === 'Playbook' ? 'accent' : 'muted')}>{meta}</span>
    </div>
  );
}

export function DemoReview() {
  return (
    <main style={page}>
      <section style={{ maxWidth: 1120, margin: '0 auto 22px' }}>
        <div className="mlbl" style={{ letterSpacing: '0.14em', marginBottom: 8 }}>Demo Review</div>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 56px)', lineHeight: 0.96, letterSpacing: '-0.04em', margin: 0, maxWidth: 720 }}>
          Prism pitch flow, unfolded.
        </h1>
        <p style={{ ...muted, maxWidth: 680, marginTop: 14 }}>
          One read-only page for reviewing the public demo without navigation. Preview only. No transaction sent.
        </p>
      </section>

      <div style={{ ...grid, maxWidth: 1120, margin: '0 auto' }}>
        <section style={panel}>
          <div className="mlbl">Home</div>
          <div style={sectionTitle}>Your Edge</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Market Pulse', 'Fresh market signals', 'Open'],
              ['Playbooks', 'Investable ideas', 'Open'],
              ['Scan Positions', 'Know what affects you', 'Scan'],
              ['Find Money', 'Bank and wallet review', 'Start'],
            ].map(([title, sub, meta]) => <FlowRow key={title} title={title} sub={sub} meta={meta} />)}
          </div>
        </section>

        <section style={panel}>
          <div className="mlbl">Market Pulse</div>
          <div style={sectionTitle}>Fresh market signals</div>
          <p style={muted}>Signals routed into actions, scans and playbooks.</p>
          <div style={{ display: 'grid' }}>
            <FlowRow title="IPO window reopens" sub="New listings · AI names · retail flow" meta="Build" />
            <FlowRow title="World Cup odds are moving" sub="Prediction markets · sharp money" meta="Track" />
            <FlowRow title="SPCX price discovery" sub="Key levels · supply · unlocks" meta="Playbook" />
            <FlowRow title="Funding flips on majors" sub="BTC · HYPE · ETH exposure check" meta="Scan" />
          </div>
          <div className="mono" style={{ marginTop: 12, fontSize: 10, color: 'var(--text-3)' }}>No transaction sent</div>
        </section>

        <section style={panel}>
          <div className="mlbl">Turn idea into setup</div>
          <div style={sectionTitle}>Turn a thesis into a playbook</div>
          <p style={muted}>Market signals turned into clear playbooks. Agents can query them via MCP; premium checks use x402.</p>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 13, padding: 12, margin: '12px 0' }}>
            AI compute and data center power demand are heating up
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {['AI compute', 'Ostium', 'high risk', '@creator'].map(item => <span key={item} style={chip('accent')}>{item}</span>)}
          </div>
        </section>

        <section style={panel}>
          <div className="mlbl">Playbook detail</div>
          <div style={sectionTitle}>{selected.title}</div>
          <p style={muted}>{selected.thesis}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0' }}>
            <span style={chip()}>Preview only</span>
            <span style={chip('danger')}>Not financial advice</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <Stat label="Prism Check" value={selected.prismCheck.marketConfirmation} />
            <Stat label="Venue confirmation" value={selected.prismCheck.venueConfirmation} />
          </div>
        </section>

        <section style={panel}>
          <div className="mlbl">Agent access</div>
          <div style={sectionTitle}>MCP tools an agent can query</div>
          <p style={muted}>Built for humans. Callable by agents.</p>
          <p style={muted}>MCP endpoint · x402 premium checks · preview-only routing</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {MCP_TOOLS.map(tool => <span key={tool.name} style={chip(tool.x402_required ? 'accent' : 'muted')}>{tool.name.replace('prism_', '')}</span>)}
          </div>
          <Pre value={agentJson} />
        </section>

        <section style={panel}>
          <div className="mlbl">x402 402 response</div>
          <div style={sectionTitle}>Payment required branch</div>
          <p style={muted}>The premium deep check is gated and returns a demo 402 response before payment.</p>
          <Pre value={unpaidX402} />
        </section>

        <section style={panel}>
          <div className="mlbl">x402 paid response</div>
          <div style={sectionTitle}>Paid deep check branch</div>
          <p style={muted}>After the demo payment flag, Prism returns deeper thesis, evidence, and risk warnings.</p>
          <Pre value={paidX402} />
        </section>

        <section style={panel}>
          <div className="mlbl">Preview setup</div>
          <div style={sectionTitle}>Route through Prism rails</div>
          <p style={muted}>{selected.title}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Stat label="Venue" value={preview.venue} />
            <Stat label="Markets" value={preview.markets.join(', ')} />
          </div>
          <Pre value={{ preview, ways_to_express: waysToExpress }} />
          <div className="mono" style={{ marginTop: 10, fontSize: 10, color: 'var(--text-3)' }}>
            Preview only · No transaction sent · User approval required before any future action
          </div>
        </section>

        <section style={panel}>
          <div className="mlbl">Playbook activity</div>
          <div style={sectionTitle}>Views, previews, agent checks</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Stat label="Views" value={dashboard.views.toLocaleString()} />
            <Stat label="Agent checks" value={dashboard.agentCalls.toLocaleString()} />
            <Stat label="x402 checks" value={Math.round(dashboard.x402RevenueUsd / 0.16).toLocaleString()} />
            <Stat label="Previews" value={dashboard.previews.toLocaleString()} />
          </div>
          {DEMO_FLOWLINKS.map(flow => (
            <div key={flow.slug} style={{ display: 'flex', gap: 9, padding: '8px 0', borderTop: '1px solid var(--border-2)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{flow.title}</div>
                <div style={{ ...muted, fontSize: 10.5 }}>{flow.stats.agentCalls} agent calls · {flow.stats.previews} previews</div>
              </div>
              <div className="num" style={{ fontSize: 12.5, fontWeight: 650 }}>{flow.stats.previews}</div>
            </div>
          ))}
        </section>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          main section {
            animation: review-card-in 320ms ${EASING} both;
          }
        }
        @keyframes review-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
