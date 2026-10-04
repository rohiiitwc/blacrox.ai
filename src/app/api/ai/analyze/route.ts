import { NextRequest, NextResponse } from 'next/server';
import { DemoMarketDataProvider } from '@/services/marketData/MarketDataProvider';
import { IndicatorCalculator } from '@/services/indicators/IndicatorCalculator';
import { AIAnalysisService } from '@/services/ai/AIAnalysisService';
import { SignalStore } from '@/services/signals/SignalStore';
import { MarketSignal } from '@/types/market';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pairId = 'EUR_USD', preferredProvider = 'demo' } = body;

    const provider = new DemoMarketDataProvider();
    const pairs = await provider.getPairs();
    const store = SignalStore.getInstance();
    const pair = store.getRecommendedPair(pairId, pairs);

    const candles = await provider.getCandles(pair.id, 60);
    const indicators = IndicatorCalculator.computeAll(candles);

    const analysisService = new AIAnalysisService();

    const analysis = await analysisService.evaluate(
      {
        pair: pair.name,
        timestamp: new Date().toISOString(),
        timeframe: '1m',
        candles: candles.slice(-10),
        indicators,
        marketSession: pair.session ?? '24/7',
        payout: pair.payout ?? 90,
      },
      preferredProvider
    );

    const nowMs = Date.now();
    // Align ENTRY TIME to exact top of the next minute (:00s) - no seconds in between!
    const currentMinuteMs = Math.floor(nowMs / 60000) * 60000;
    const signalTimeMs = currentMinuteMs + 60000; // Exact next minute at :00 seconds (e.g. 11:55:00)
    const expiryTimeMs = signalTimeMs + 60000;    // Exact 1-minute expiry at :00 seconds (e.g. 11:56:00)
    const preparedTimeMs = currentMinuteMs;

    if (analysis.direction !== 'NO_SIGNAL' && analysis.confidence < 60) {
      analysis.direction = 'NO_SIGNAL';
      analysis.riskFlags.push('Confidence score below 60% system precision threshold.');
    }

    const signal: MarketSignal = {
      id: `sig_${nowMs}_${Math.random().toString(36).substr(2, 4)}`,
      pair: pair.name,
      direction: analysis.direction,
      confidence: analysis.confidence,
      preparedTimestamp: new Date(preparedTimeMs).toISOString(),
      signalTime: new Date(signalTimeMs).toISOString(),
      expiryTime: new Date(expiryTimeMs).toISOString(),
      expirySeconds: 60,
      status: analysis.direction === 'NO_SIGNAL' ? 'NO_SIGNAL' : 'ACTIVE',
      entryPrice: pair.currentPrice,
      analysis,
      indicatorSnapshot: indicators,
      isDemo: true,
    };

    SignalStore.getInstance().addSignal(signal);

    return NextResponse.json({
      success: true,
      signal,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI analysis request failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
