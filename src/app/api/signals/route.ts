import { NextResponse } from 'next/server';
import { SignalStore } from '@/services/signals/SignalStore';
import { DemoMarketDataProvider } from '@/services/marketData/MarketDataProvider';
import { SignalDirection } from '@/types/market';

export async function GET() {
  try {
    const provider = new DemoMarketDataProvider();
    const pairs = await provider.getPairs();
    const pairPrices: Record<string, number> = {};
    pairs.forEach((p) => {
      pairPrices[p.name] = p.currentPrice;
      pairPrices[p.id] = p.currentPrice;
    });

    const store = SignalStore.getInstance();
    store.evaluateExpiredSignals(pairPrices);
    const signals = store.getSignals(500, pairPrices);
    const active = store.getActiveSignals(pairPrices);

    return NextResponse.json({
      success: true,
      signals,
      activeSignals: active,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch signal history';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signalId, newStatus, action, pair, signalTime, entryTime, expiryTime, source, confidence, reason, entryPrice, expiryPrice, rawIndicators } = body;

    const store = SignalStore.getInstance();

    if (action === 'reset') {
      store.clearAllSignals();
      return NextResponse.json({ success: true, message: 'All signal history deleted' });
    }

    // 1. Direct Signal Ingestion from Daemon Dispatcher
    if ((action === 'CALL' || action === 'PUT') && pair) {
      const confNum = typeof confidence === 'string' ? parseInt(confidence.replace('%', ''), 10) || 88 : (confidence || 88);
      const direction: SignalDirection = action === 'CALL' ? 'UP' : 'DOWN';
      const sigTimeMs = signalTime ? new Date(signalTime.includes('T') ? signalTime : `${new Date().toISOString().split('T')[0]}T${signalTime}Z`).getTime() : Date.now();
      const expTimeMs = expiryTime ? new Date(expiryTime.includes('T') ? expiryTime : `${new Date().toISOString().split('T')[0]}T${expiryTime}Z`).getTime() : sigTimeMs + 75000;
      const numEntry = Number(entryPrice) || 1.0850;

      const newSignal = {
        id: `quotex_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        pair,
        direction,
        confidence: confNum,
        preparedTimestamp: new Date(sigTimeMs - 15000).toISOString(),
        signalTime: new Date(sigTimeMs).toISOString(),
        expiryTime: new Date(expTimeMs).toISOString(),
        expirySeconds: 60,
        status: 'ACTIVE' as const,
        entryPrice: numEntry,
        analysis: {
          pair,
          direction,
          confidence: confNum,
          analysisTimestamp: new Date().toISOString(),
          expirySeconds: 60,
          reasons: [reason || 'Quotex CDP Live WebSocket Technical Confluence', source || 'Quotex Live Terminal'],
          riskFlags: ['Live Market Expiration Window'],
          dataQuality: 'EXCELLENT' as const,
          provider: 'demo' as const,
          model: 'Quotex-CDP-Engine'
        },
        indicatorSnapshot: {
          rsi: rawIndicators?.rsi || 50,
          macd: rawIndicators?.macd || { macdLine: 0, signalLine: 0, histogram: 0 },
          ema20: rawIndicators?.ema9 || numEntry,
          ema50: rawIndicators?.ema21 || numEntry,
          sma20: numEntry,
          bollingerBands: rawIndicators?.bollingerBands || { upper: numEntry + 0.0005, middle: numEntry, lower: numEntry - 0.0005 },
          atr: 0.0002,
          momentum: 0.02,
          trend: direction === 'UP' ? ('BULLISH' as const) : ('BEARISH' as const),
          volatilityStatus: 'NORMAL' as const,
          supportLevel: rawIndicators?.bollingerBands?.lower || numEntry - 0.0005,
          resistanceLevel: rawIndicators?.bollingerBands?.upper || numEntry + 0.0005
        },
        isDemo: false
      };

      store.addSignal(newSignal);
      return NextResponse.json({ success: true, signal: newSignal });
    }

    // 2. Settlement Verification Update from Daemon Dispatcher
    if (signalId && (newStatus === 'WIN' || newStatus === 'LOSS' || newStatus === 'DRAW')) {
      store.updateSignalStatus(signalId, newStatus, expiryPrice);
      return NextResponse.json({ success: true, signalId, status: newStatus });
    }

    return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process signal dispatch';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

