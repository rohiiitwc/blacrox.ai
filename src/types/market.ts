export interface MarketPair {
  id: string;
  name: string;
  category: 'forex' | 'otc' | 'crypto';
  basePrice: number;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  bid?: number;
  ask?: number;
  timestamp: string;
  status: 'OPEN' | 'CLOSED' | 'HIGH_VOLATILITY' | 'UNAVAILABLE';
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  session: 'TOKYO' | 'LONDON' | 'NEW_YORK' | 'SYDNEY' | '24/7';
  payout: number | null; // null if unavailable
  freshnessMs: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalIndicators {
  rsi: number | null;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  } | null;
  ema20: number | null;
  ema50: number | null;
  sma20: number | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  atr: number | null;
  momentum: number | null;
  trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  volatilityStatus: 'LOW' | 'NORMAL' | 'HIGH';
  supportLevel: number | null;
  resistanceLevel: number | null;
}

export interface StructuredAnalysisInput {
  pair: string;
  timestamp: string;
  timeframe: string;
  candles: Candle[];
  indicators: TechnicalIndicators;
  marketSession: string;
  payout: number | null;
}

export type SignalDirection = 'UP' | 'DOWN' | 'NO_SIGNAL';
export type DataQuality = 'EXCELLENT' | 'GOOD' | 'WEAK' | 'UNRELIABLE';

export interface AIAnalysisOutput {
  pair: string;
  direction: SignalDirection;
  confidence: number; // 0 to 100 percentage
  analysisTimestamp: string;
  expirySeconds: number; // default 60
  reasons: string[];
  riskFlags: string[];
  dataQuality: DataQuality;
  provider: 'gemini' | 'openai' | 'demo';
  model: string;
}

export interface MarketSignal {
  id: string;
  pair: string;
  direction: SignalDirection;
  confidence: number;
  preparedTimestamp: string;
  signalTime: string;
  expiryTime: string;
  expirySeconds: number;
  status: 'ACTIVE' | 'WIN' | 'LOSS' | 'EXPIRED' | 'NO_SIGNAL';
  entryPrice: number;
  expiryPrice?: number;
  analysis: AIAnalysisOutput;
  indicatorSnapshot: TechnicalIndicators;
  isDemo: boolean;
}

export interface PaperTrade {
  id: string;
  signalId: string;
  pair: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  timestamp: string;
  expiryTime: string;
  status: 'PENDING' | 'WIN' | 'LOSS' | 'DRAW';
  payoutPercentage: number;
  profitLoss: number;
}

export interface PaperWallet {
  balance: number;
  initialBalance: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfit: number;
}

export interface PerformanceStats {
  signalsAnalyzed: number;
  correctSignals: number;
  incorrectSignals: number;
  noSignalsCount: number;
  winRate: number;
  averageConfidence: number;
  performanceByPair: Record<string, { total: number; wins: number; winRate: number }>;
  performanceByTimeframe: Record<string, { total: number; wins: number; winRate: number }>;
  performanceByMarketCondition: Record<string, { total: number; wins: number; winRate: number }>;
}

export interface SystemStatus {
  activeProvider: 'gemini' | 'openai' | 'demo';
  geminiAvailable: boolean;
  openaiAvailable: boolean;
  marketFeedStatus: 'CONNECTED' | 'DISCONNECTED' | 'DEMO_MODE';
  analyzedPairsCount: number;
  signalsGeneratedCount: number;
  noSignalCount: number;
  apiUsageToday: number;
  serverTime: string;
  uptimeSeconds: number;
  errorLogs: { timestamp: string; message: string; code?: string }[];
}
