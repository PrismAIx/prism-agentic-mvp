import React from 'react';
import { Sheet, sheetPress } from './Sheet';

const EASING = 'cubic-bezier(0.2,0,0,1)';

interface MarketPulseSheetProps {
  open: boolean;
  onClose: () => void;
  onGenerateBrief: (prompt: string) => void;
  onCreatePlaybook: () => void;
  onReadSPCX: () => void;
  onTrackMarkets: () => void;
  onScanPositions: () => void;
  onBackToActions?: () => void;
}

const TOPIC_GROUPS = [
  { label: 'Markets', topics: ['Crypto', 'Stocks', 'Macro', 'Commodities', 'Yield', 'Prediction markets'] },
  { label: 'Themes', topics: ['AI', 'Robotics', 'Space', 'IPO season', 'Geopolitics', 'Sports'] },
  { label: 'Personal', topics: ['My holdings', 'High volatility', 'Long-term ideas', 'Safer yield'] },
];

const SIGNALS = [
  {
    type: 'ipo',
    title: 'IPO window reopens',
    sub: 'New listings, AI names, retail flow',
    meta: 'Build setup',
    action: 'create',
    topics: ['Stocks', 'AI', 'IPO season'],
  },
  {
    type: 'world',
    title: 'World Cup odds are moving',
    sub: 'Prediction markets, sharp money, fan sentiment',
    meta: 'Track it',
    action: 'track',
    topics: ['Prediction markets', 'Sports'],
  },
  {
    type: 'spcx',
    title: 'SPCX price discovery',
    sub: 'Key levels · supply and unlocks',
    meta: 'View setup',
    action: 'spcx',
    topics: ['Stocks', 'Space', 'High volatility'],
  },
  {
    type: 'robotics',
    title: 'Robotics names wake up',
    sub: 'AI hardware, automation, public stocks',
    meta: 'Build setup',
    action: 'create',
    topics: ['Stocks', 'AI', 'Robotics'],
  },
  {
    type: 'macro',
    title: 'Gold and oil shock',
    sub: 'Macro stress, commodities, hedge demand',
    meta: 'View setup',
    action: 'create',
    topics: ['Macro', 'Commodities', 'Geopolitics'],
  },
  {
    type: 'funding',
    title: 'Funding flips on majors',
    sub: 'BTC, HYPE, ETH exposure check',
    meta: 'Scan positions',
    action: 'scan',
    topics: ['Crypto', 'My holdings', 'High volatility'],
  },
];

export const MarketPulseSheet: React.FC<MarketPulseSheetProps> = ({
  open,
  onClose,
  onGenerateBrief,
  onCreatePlaybook,
  onReadSPCX,
  onTrackMarkets,
  onScanPositions,
  onBackToActions,
}) => {
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>(['Crypto', 'Stocks', 'Space', 'Prediction markets']);
  const [keyword, setKeyword] = React.useState('');
  const [radarOpen, setRadarOpen] = React.useState(false);

  const runAction = (action: string) => {
    if (action === 'create') onCreatePlaybook();
    if (action === 'track') onTrackMarkets();
    if (action === 'spcx') onReadSPCX();
    if (action === 'scan') onScanPositions();
  };

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredSignals = SIGNALS.filter(signal => {
    const topicMatch = signal.topics.some(topic => selectedTopics.includes(topic));
    if (!normalizedKeyword) return topicMatch;
    const haystack = `${signal.title} ${signal.sub} ${signal.topics.join(' ')}`.toLowerCase();
    return topicMatch || haystack.includes(normalizedKeyword);
  });
  const visibleSignals = filteredSignals.length > 0 ? filteredSignals : SIGNALS.slice(0, 3);
  const topicSummary = selectedTopics.length <= 3
    ? selectedTopics.join(' · ')
    : `${selectedTopics.slice(0, 3).join(' · ')} +${selectedTopics.length - 3}`;
  const briefPrompt = [
    `Generate a Market Pulse brief for ${selectedTopics.join(', ')}`,
    keyword.trim() ? `with extra focus on ${keyword.trim()}` : null,
    'Do not ask for one market; summarize the fresh signals and route them into Playbooks, Scan Positions, or Ask',
  ].filter(Boolean).join(' ');

  const toggleTopic = (topic: string) => {
    setSelectedTopics(current => {
      if (current.includes(topic)) return current.length > 1 ? current.filter(t => t !== topic) : current;
      return [...current, topic];
    });
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
        <div className="mlbl" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>Market Pulse</div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 5 }}>Fresh market signals</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 12 }}>
          What’s moving, why it matters, and what you can do next.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {visibleSignals.slice(0, 4).map((signal, i) => (
            <button key={signal.title} onClick={() => runAction(signal.action)} {...sheetPress(0.985)} style={{
              width: '100%',
              border: i === 0 ? '1px solid rgba(167,139,250,.25)' : '1px solid var(--border-2)',
              background: i === 0 ? 'linear-gradient(135deg, rgba(167,139,250,.10), rgba(92,198,232,.045))' : 'rgba(255,255,255,.028)',
              color: 'inherit',
              borderRadius: 14,
              padding: '11px 12px',
              fontFamily: 'var(--font-sans)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: `transform 160ms ${EASING}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 29,
                  height: 29,
                  borderRadius: 9,
                  background: 'var(--accent-08)',
                  border: '1px solid var(--accent-15)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--accent)',
                  fontSize: 10,
                  fontWeight: 750,
                  flexShrink: 0,
                }}>
                  {signal.title.slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.2, fontWeight: 650, letterSpacing: '-0.01em' }}>{signal.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{signal.sub}</div>
                </div>
                <span style={{
                  color: signal.action === 'spcx' || signal.action === 'create' ? 'var(--accent)' : 'var(--text-3)',
                  fontSize: 11,
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {signal.meta}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(167,139,250,.14)',
          background: 'linear-gradient(135deg, rgba(167,139,250,.08), rgba(92,198,232,.035) 48%, rgba(255,255,255,.022))',
          borderRadius: 16,
          padding: 12,
          marginBottom: 10,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.045)',
        }}>
          <button onClick={() => setRadarOpen(open => !open)} style={{
            position: 'relative',
            width: '100%',
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            padding: 0,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: '-0.01em' }}>Personal brief</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.03em' }}>
                {topicSummary || 'Choose topics'}
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span className="mono" style={{
                border: '1px solid rgba(92,198,232,.2)',
                background: 'rgba(92,198,232,.08)',
                color: '#9fe5f4',
                borderRadius: 999,
                padding: '5px 8px',
                fontSize: 9.5,
                letterSpacing: '0.04em',
              }}>
                {visibleSignals.length} signals
              </span>
              <span style={{ color: 'var(--text-3)', transform: radarOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: `transform 160ms ${EASING}` }}>›</span>
            </div>
          </button>

          {radarOpen && (
            <div style={{ position: 'relative', marginTop: 10 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.35, marginBottom: 10 }}>
                Tune what Prism watches for you.
              </div>
              {TOPIC_GROUPS.map(group => (
                <div key={group.label} style={{ marginTop: 8 }}>
                  <div className="mono" style={{ fontSize: 8.5, color: 'var(--text-3)', letterSpacing: '0.11em', marginBottom: 6 }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {group.topics.map(topic => {
                      const active = selectedTopics.includes(topic);
                      return (
                        <button key={topic} onClick={() => toggleTopic(topic)} {...sheetPress(0.97)} style={{
                          border: active ? '1px solid rgba(167,139,250,.34)' : '1px solid rgba(255,255,255,.07)',
                          background: active ? 'rgba(167,139,250,.14)' : 'rgba(255,255,255,.035)',
                          color: active ? 'var(--accent)' : 'var(--text-2)',
                          borderRadius: 999,
                          padding: '6px 9px',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          cursor: 'pointer',
                          transition: `transform 160ms ${EASING}, border-color 160ms ${EASING}, background 160ms ${EASING}`,
                        }}>
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <label style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                border: '1px solid rgba(255,255,255,.075)',
                background: 'rgba(5,5,7,.35)',
                borderRadius: 12,
                padding: '9px 10px',
              }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-3)" strokeWidth="1.45" strokeLinecap="round">
                  <circle cx="6" cy="6" r="3.8" />
                  <path d="M9.2 9.2 L12 12" />
                </svg>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Add keyword: SpaceX, robotics, World Cup"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: 11.5,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </label>
              <button onClick={() => onGenerateBrief(briefPrompt)} {...sheetPress(0.98)} style={{
                width: '100%', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 13, padding: 12, fontSize: 13,
                fontWeight: 650, letterSpacing: '-0.01em', cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.15)',
                transition: `transform 160ms ${EASING}`,
                marginTop: 10,
              }}>
                Generate my brief
              </button>
            </div>
          )}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 9, letterSpacing: '0.04em', textAlign: 'center' }}>
          No transaction sent
        </div>
      </div>
    </Sheet>
  );
};
