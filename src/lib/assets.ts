// Shared asset metadata used by Home, AssetRow, and AssetDetail.
// Single source of truth — no duplication across screens.

export interface AssetMeta {
  symbol: string;           // e.g. "BTC"
  name: string;             // e.g. "Bitcoin"
  sub: string;              // subtitle shown in rows
  monogram: string;         // icon character(s)
  logo?: string;
  iconBg: string;
  iconColor: string;
  isMono: boolean;          // use Geist Mono for monogram
  price: string;            // static demo price
  change?: string;          // e.g. "+5.2%"
  changePositive?: boolean;
  cta?: string;             // override change with a CTA pill
  askPrefill: string;       // pre-filled Ask text
  sourceName?: string;      // read-only market data source
  sourceLogo?: string;
  sourceTooltip?: string;
  tradingEnabled?: boolean;
  tradingStatus?: string;
}

export const ASSETS: AssetMeta[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    sub: 'BTC',
    monogram: '₿',
    iconBg: '#f7931a',
    iconColor: '#0c0c11',
    isMono: true,
    price: '$74,604',
    change: '+5.2%',
    changePositive: true,
    askPrefill: 'Long BTC with 50 USDC at 5x',
  },
  {
    symbol: 'SPCX',
    name: 'SPCX',
    sub: 'Variational · info-only',
    monogram: 'S',
    iconBg: '#0f172a',
    iconColor: '#4c9af8',
    isMono: false,
    price: '$212.04',
    change: '+price discovery',
    changePositive: true,
    askPrefill: 'Put $1,000 to work: reserve $200 for SPCX price discovery and park $800 in sUSDai',
    logo: '/brand/spcx-logo.svg',
    sourceName: 'Variational',
    sourceTooltip: 'Market info only · trading soon',
    tradingEnabled: false,
    tradingStatus: 'Trading soon',
  },
  {
    symbol: 'HYPE',
    name: 'HYPE',
    sub: 'HYPE',
    monogram: 'H',
    iconBg: '#17c9ff',
    iconColor: '#041014',
    isMono: false,
    price: '$72.39',
    change: '−3.4%',
    changePositive: false,
    askPrefill: 'Buy HYPE on dips with 50 USDC at 2x',
    logo: '/brand/hype-logo.png',
  },
  {
    symbol: 'NEAR',
    name: 'NEAR Protocol',
    sub: 'NEAR',
    monogram: 'N',
    iconBg: '#f2f2f2',
    iconColor: '#0c0c11',
    isMono: false,
    price: '$2.28',
    change: '−9.8%',
    changePositive: false,
    askPrefill: 'Buy NEAR on dips with 50 USDC at 2x',
    logo: '/brand/near-logo.png',
  },
  {
    symbol: 'ZEC',
    name: 'Zcash',
    sub: 'ZEC',
    monogram: 'Z',
    iconBg: '#f4b728',
    iconColor: '#0c0c11',
    isMono: false,
    price: '$508.64',
    change: '−2.4%',
    changePositive: false,
    askPrefill: 'Buy ZEC on dips with 50 USDC at 2x',
    logo: '/brand/zec-logo.png',
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    sub: 'AAPL · stock',
    monogram: 'A',
    iconBg: '#e8e8ed',
    iconColor: '#0c0c11',
    isMono: false,
    price: '$224.18',
    change: '+3.8%',
    changePositive: true,
    askPrefill: 'Long AAPL with 50 USDC at 5x',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    sub: 'ETH',
    monogram: 'Ξ',
    iconBg: '#6b7bf0',
    iconColor: '#fff',
    isMono: true,
    price: '$2,027',
    change: '−2.1%',
    changePositive: false,
    askPrefill: 'Long ETH with 50 USDC at 5x',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    sub: 'NVDA · stock',
    monogram: 'N',
    iconBg: '#76b900',
    iconColor: '#fff',
    isMono: false,
    price: '$182.42',
    change: '+4.5%',
    changePositive: true,
    askPrefill: 'Long NVDA with 50 USDC at 5x',
  },
  {
    symbol: 'XAU',
    name: 'Tokenized gold',
    sub: 'XAU',
    monogram: 'Au',
    iconBg: '#d9b24a',
    iconColor: '#0c0c11',
    isMono: false,
    price: '$2,365',
    change: '+0.3%',
    changePositive: true,
    askPrefill: 'Long XAU with 50 USDC at 5x',
  },
];
