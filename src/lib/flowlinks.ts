export type RiskLevel = 'medium' | 'high' | 'very_high';
export type RouteType = 'prism_integrated' | 'external' | 'watch_only';
export type MonetizationModel = 'integration_revenue_share' | 'x402_calls' | 'mixed';

export interface FlowLinkCheck {
  ctVelocity: string;
  marketConfirmation: string;
  onchainConfirmation: string;
  venueConfirmation: string;
  riskFlags: string[];
}

export interface FlowLinkRoute {
  label: string;
  venue: string;
  market: string;
  role: string;
  routeType: RouteType;
  previewEnabled: boolean;
  risk: RiskLevel;
}

export interface FlowLinkMonetization {
  x402Enabled: boolean;
  creatorMayEarn: boolean;
  model: MonetizationModel;
  creatorSharePct: number;
}

export interface FlowLinkLinks {
  humanUrl: string;
  agentJsonUrl: string;
  previewUrl: string;
}

export interface FlowLinkStats {
  views: number;
  agentCalls: number;
  x402RevenueUsd: number;
  previews: number;
  routedVolumeUsd: number;
  prismFeesUsd: number;
  creatorEarningsUsd: number;
}

export interface FlowLink {
  id: string;
  slug: string;
  title: string;
  creatorName: string;
  creatorHandle: string;
  thesis: string;
  narrative: string;
  venues: string[];
  markets: string[];
  riskLevel: RiskLevel;
  prismCheck: FlowLinkCheck;
  waysToExpress: FlowLinkRoute[];
  monetization: FlowLinkMonetization;
  links: FlowLinkLinks;
  stats: FlowLinkStats;
}

export interface FlowLinkInput {
  thesis: string;
  narrative: string;
  venues: string[];
  riskLevel: RiskLevel;
  creatorHandle: string;
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  x402_required: boolean;
  price?: string;
}

const SAFETY_FLAGS = [
  'Perps/leverage can cause total loss.',
  'Preview only. No transaction sent.',
  'Not financial advice.',
  'Creator and Prism may earn integration revenue.',
];

const linksFor = (slug: string): FlowLinkLinks => ({
  humanUrl: `/flowlinks/${slug}`,
  agentJsonUrl: `/flowlinks/${slug}/preview-data`,
  previewUrl: `/flowlinks/${slug}/preview`,
});

const money = (n: number) => Number(n.toFixed(2));

export const DEMO_FLOWLINKS: FlowLink[] = [
  {
    id: 'fl-ai-compute-001',
    slug: 'ai-compute-bottleneck',
    title: 'AI compute bottleneck',
    creatorName: 'Prism Market Pulse',
    creatorHandle: '@prism',
    thesis: 'AI demand is pulling data centers, chips and power infrastructure into one market narrative.',
    narrative: 'AI compute',
    venues: ['Ostium'],
    markets: ['NVDA', 'SPX', 'POWER'],
    riskLevel: 'high',
    prismCheck: {
      ctVelocity: 'AI infrastructure chatter accelerating',
      marketConfirmation: 'Hyperscaler capex, chip demand and power constraints remain in focus',
      onchainConfirmation: 'Equity and index routes monitored for AI infrastructure exposure',
      venueConfirmation: 'Ostium preview routes, power-demand watchlist',
      riskFlags: ['AI capex expectations can reprice quickly', 'Equity beta can dominate thesis-specific signals', ...SAFETY_FLAGS],
    },
    waysToExpress: [
      { label: 'NVDA AI infrastructure route', venue: 'Ostium', market: 'NVDA', role: 'Chip exposure', routeType: 'prism_integrated', previewEnabled: true, risk: 'high' },
      { label: 'SPX capex beneficiaries', venue: 'Ostium', market: 'SPX', role: 'Broad equity proxy', routeType: 'prism_integrated', previewEnabled: true, risk: 'high' },
      { label: 'Power demand watch', venue: 'Prism Watch', market: 'POWER', role: 'Theme monitor', routeType: 'watch_only', previewEnabled: false, risk: 'high' },
    ],
    monetization: { x402Enabled: true, creatorMayEarn: true, model: 'mixed', creatorSharePct: 30 },
    links: linksFor('ai-compute-bottleneck'),
    stats: { views: 3280, agentCalls: 642, x402RevenueUsd: 101.84, previews: 172, routedVolumeUsd: 248600, prismFeesUsd: 621.5, creatorEarningsUsd: 186.45 },
  },
  {
    id: 'fl-spcx-discovery-001',
    slug: 'spcx-price-discovery',
    title: 'SPCX price discovery',
    creatorName: 'Prism Market Pulse',
    creatorHandle: '@prism',
    thesis: 'SpaceX-linked exposure is being priced through hype, supply, unlocks and private-market scarcity.',
    narrative: 'SPCX discovery',
    venues: ['Ostium', 'Variational'],
    markets: ['SPCX', 'SPX', 'SPACE'],
    riskLevel: 'very_high',
    prismCheck: {
      ctVelocity: 'SPCX and private-market access mentions accelerating',
      marketConfirmation: 'SpaceX hype, scarcity and unlock chatter remain active',
      onchainConfirmation: 'SPCX info route monitored; liquid proxies checked separately',
      venueConfirmation: 'Variational market info, Ostium proxy preview route',
      riskFlags: ['SPCX is info-only in this public preview', 'Private-market proxies can diverge from the underlying company', ...SAFETY_FLAGS],
    },
    waysToExpress: [
      { label: 'SPCX discovery watch', venue: 'Variational', market: 'SPCX', role: 'Info-only market read', routeType: 'watch_only', previewEnabled: false, risk: 'very_high' },
      { label: 'Space proxy route', venue: 'Ostium', market: 'SPX', role: 'Liquid proxy', routeType: 'prism_integrated', previewEnabled: true, risk: 'very_high' },
      { label: 'Space narrative monitor', venue: 'Prism Watch', market: 'SPACE', role: 'Supply and unlocks', routeType: 'watch_only', previewEnabled: false, risk: 'very_high' },
    ],
    monetization: { x402Enabled: true, creatorMayEarn: true, model: 'mixed', creatorSharePct: 30 },
    links: linksFor('spcx-price-discovery'),
    stats: { views: 2840, agentCalls: 516, x402RevenueUsd: 82.72, previews: 118, routedVolumeUsd: 166200, prismFeesUsd: 415.5, creatorEarningsUsd: 124.65 },
  },
  {
    id: 'fl-event-market-edge-001',
    slug: 'event-market-edge',
    title: 'Event market edge',
    creatorName: 'Prism Market Pulse',
    creatorHandle: '@prism',
    thesis: 'Odds markets can reveal crowd pricing across sports, elections, policy and macro events before headlines settle.',
    narrative: 'Event markets',
    venues: ['Kalshi', 'Polymarket'],
    markets: ['ODDS', 'WC26', 'EVENTS'],
    riskLevel: 'medium',
    prismCheck: {
      ctVelocity: 'Sports, election and macro-event markets repricing quickly',
      marketConfirmation: 'Crowd odds, news flow and sentiment divergence monitored',
      onchainConfirmation: 'Prediction-market signals are read-only in this preview',
      venueConfirmation: 'Kalshi and Polymarket-style event markets modeled as watch routes',
      riskFlags: ['Event markets can be illiquid or jurisdiction-limited', 'Crowd pricing can overreact to headlines', ...SAFETY_FLAGS],
    },
    waysToExpress: [
      { label: 'World Cup odds watch', venue: 'Kalshi', market: 'WC26', role: 'Sports probability', routeType: 'watch_only', previewEnabled: false, risk: 'medium' },
      { label: 'Crowd pricing monitor', venue: 'Polymarket', market: 'EVENTS', role: 'Event probability', routeType: 'watch_only', previewEnabled: false, risk: 'medium' },
      { label: 'Odds brief', venue: 'Prism Watch', market: 'ODDS', role: 'News and sentiment', routeType: 'watch_only', previewEnabled: false, risk: 'medium' },
    ],
    monetization: { x402Enabled: true, creatorMayEarn: true, model: 'mixed', creatorSharePct: 30 },
    links: linksFor('event-market-edge'),
    stats: { views: 2140, agentCalls: 426, x402RevenueUsd: 67.12, previews: 92, routedVolumeUsd: 0, prismFeesUsd: 0, creatorEarningsUsd: 0 },
  },
  {
    id: 'fl-war-shock-001',
    slug: 'war-shock-gold-oil',
    title: 'War shock: oil and gold',
    creatorName: 'Prism Market Pulse',
    creatorHandle: '@prism',
    thesis: 'Geopolitical shocks usually push traders toward commodities, energy and defensive cash.',
    narrative: 'War shock',
    venues: ['Ostium'],
    markets: ['GOLD', 'OIL'],
    riskLevel: 'high',
    prismCheck: {
      ctVelocity: 'Macro chatter rising',
      marketConfirmation: 'Gold bid and oil volatility elevated',
      onchainConfirmation: 'Commodity perp interest monitored',
      venueConfirmation: 'Ostium route preview available',
      riskFlags: ['Headline reversals can be sharp', 'Commodity gaps can slip stops', ...SAFETY_FLAGS],
    },
    waysToExpress: [
      { label: 'Gold protection setup', venue: 'Ostium', market: 'GOLD', role: 'Defensive long', routeType: 'prism_integrated', previewEnabled: true, risk: 'high' },
      { label: 'Oil shock setup', venue: 'Ostium', market: 'OIL', role: 'Event volatility', routeType: 'prism_integrated', previewEnabled: true, risk: 'high' },
    ],
    monetization: { x402Enabled: true, creatorMayEarn: true, model: 'mixed', creatorSharePct: 30 },
    links: linksFor('war-shock-gold-oil'),
    stats: { views: 1820, agentCalls: 312, x402RevenueUsd: 48.24, previews: 86, routedVolumeUsd: 126400, prismFeesUsd: 316, creatorEarningsUsd: 94.8 },
  },
];

export const MCP_TOOLS: McpToolDescriptor[] = [
  {
    name: 'prism_get_flowlink',
    description: 'Return the agent-readable Prism FlowLink JSON for a thesis route.',
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    output_schema: { type: 'object', properties: { status: { const: 'preview_only' } } },
    x402_required: false,
  },
  {
    name: 'prism_deep_check_flowlink',
    description: 'Run a premium Prism deep check on a FlowLink thesis.',
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    output_schema: { type: 'object', properties: { prism_confidence: { type: 'string' } } },
    x402_required: true,
    price: '$0.02',
  },
  {
    name: 'prism_get_ways_to_express',
    description: 'Return ranked routes and risks for expressing a FlowLink.',
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    output_schema: { type: 'object', properties: { ranked_routes: { type: 'array' } } },
    x402_required: false,
  },
  {
    name: 'prism_build_preview_from_flowlink',
    description: 'Build a preview-only Prism plan from a FlowLink.',
    input_schema: { type: 'object', properties: { slug: { type: 'string' }, amountUsd: { type: 'number' } }, required: ['slug'] },
    output_schema: { type: 'object', properties: { noTransactionSent: { const: true } } },
    x402_required: false,
  },
  {
    name: 'prism_get_flowlink_stats',
    description: 'Return attribution and revenue metrics for a FlowLink.',
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    output_schema: { type: 'object', properties: { creatorEarningsUsd: { type: 'number' } } },
    x402_required: false,
  },
];

export function getFlowLink(slug: string): FlowLink | undefined {
  return DEMO_FLOWLINKS.find(flow => flow.slug === slug);
}

export function createMockFlowLink(input: FlowLinkInput): FlowLink {
  const text = `${input.thesis} ${input.narrative} ${input.venues.join(' ')}`.toLowerCase();
  let template = DEMO_FLOWLINKS[0];
  if (/\b(war|oil|gold)\b/i.test(text)) template = DEMO_FLOWLINKS[3];
  else if (/\b(spcx|spacex|space)\b/i.test(text)) template = DEMO_FLOWLINKS[1];
  else if (/\b(world cup|odds?|prediction|kalshi|polymarket|sports?|election|events?)\b/i.test(text)) template = DEMO_FLOWLINKS[2];
  else if (/\b(ai|compute|data centers?|chips?|power|nvda|infrastructure)\b/i.test(text)) template = DEMO_FLOWLINKS[0];

  const slug = `${template.slug}-custom`;
  return {
    ...template,
    id: `${template.id}-custom`,
    slug,
    title: input.thesis.trim() || template.title,
    creatorName: input.creatorHandle.replace(/^@/, '') || 'Creator',
    creatorHandle: input.creatorHandle || '@creator',
    thesis: input.thesis.trim() || template.thesis,
    narrative: input.narrative,
    venues: input.venues.length ? input.venues : template.venues,
    riskLevel: input.riskLevel,
    links: linksFor(slug),
    stats: {
      views: 0,
      agentCalls: 0,
      x402RevenueUsd: 0,
      previews: 0,
      routedVolumeUsd: 0,
      prismFeesUsd: 0,
      creatorEarningsUsd: 0,
    },
  };
}

export function buildAgentFlowLinkJson(flow: FlowLink) {
  return {
    id: flow.id,
    title: flow.title,
    creator: {
      name: flow.creatorName,
      handle: flow.creatorHandle,
    },
    thesis: flow.thesis,
    prism_check: flow.prismCheck,
    ways_to_express: flow.waysToExpress,
    risks: flow.prismCheck.riskFlags,
    monetization: {
      ...flow.monetization,
      disclosure: 'Creator may earn a share of Prism integration revenue attributed to this FlowLink.',
    },
    preview_url: flow.links.previewUrl,
    status: 'preview_only',
    mcp_tools: MCP_TOOLS.map(tool => ({
      name: tool.name,
      x402_required: tool.x402_required,
      price: tool.price,
    })),
  };
}

export function runDemoX402DeepCheck(flow: FlowLink, paid: boolean) {
  if (!paid) {
    return {
      status: 402,
      body: {
        error: 'Payment Required',
        protocol: 'x402',
        price: '$0.02',
        asset: 'USDC',
        description: 'Premium Prism FlowLink deep check',
        next_step: 'Retry with x-prism-demo-payment: paid for demo.',
      },
    };
  }

  return {
    status: 200,
    body: {
      status: 'preview_only',
      deeper_thesis_summary: flow.thesis,
      why_it_could_continue: flow.prismCheck.marketConfirmation,
      what_would_invalidate_it: flow.prismCheck.riskFlags[0],
      prism_confidence: flow.riskLevel === 'medium' ? 'medium' : 'high uncertainty, worth watching',
      evidence: [
        { type: 'market', summary: flow.prismCheck.marketConfirmation },
        { type: 'venue', summary: flow.prismCheck.venueConfirmation },
      ],
      risk_warnings: flow.prismCheck.riskFlags,
    },
  };
}

export function buildWaysToExpressResponse(flow: FlowLink) {
  return {
    status: 'preview_only',
    ranked_routes: flow.waysToExpress.map((route, index) => ({
      rank: index + 1,
      ...route,
    })),
  };
}

export function buildPreviewFromFlowLink(flow: FlowLink, amountUsd = 1000) {
  const primary = flow.waysToExpress[0];
  const actions = flow.waysToExpress
    .filter(route => route.previewEnabled)
    .slice(0, 2)
    .map(route => ({
      venue: route.venue,
      market: route.market,
      action: 'preview_setup',
      routeType: route.routeType,
      amountUsd: money(amountUsd / 2),
    }));

  return {
    previewId: `preview-${flow.slug}`,
    status: 'preview_only',
    venue: primary?.venue ?? flow.venues[0],
    markets: flow.markets,
    actions,
    builderFeeBps: 10,
    creatorAttribution: flow.creatorHandle,
    creatorRevenueDisclosure: 'Creator may earn a share of Prism integration revenue attributed to this FlowLink.',
    userApprovalRequired: true,
    noTransactionSent: true,
    openInPrismUrl: flow.links.previewUrl,
  };
}
