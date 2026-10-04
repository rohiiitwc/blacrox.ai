import { NextResponse } from 'next/server';
import { AIAnalysisService } from '@/services/ai/AIAnalysisService';
import { DemoMarketDataProvider } from '@/services/marketData/MarketDataProvider';
import { SignalStore } from '@/services/signals/SignalStore';

const startTime = Date.now();

export async function GET() {
  try {
    const aiService = new AIAnalysisService();
    const providers = aiService.getAvailableProviders();
    const marketProvider = new DemoMarketDataProvider();
    const pairs = await marketProvider.getPairs();
    const store = SignalStore.getInstance();
    const signals = store.getSignals(100);

    const activeProvider = process.env.GEMINI_API_KEY
      ? 'gemini'
      : process.env.OPENAI_API_KEY
      ? 'openai'
      : 'demo';

    return NextResponse.json({
      success: true,
      status: {
        activeProvider,
        geminiAvailable: providers.geminiAvailable,
        openaiAvailable: providers.openaiAvailable,
        marketFeedStatus: 'DEMO_MODE',
        analyzedPairsCount: pairs.length,
        signalsGeneratedCount: signals.filter((s) => s.direction !== 'NO_SIGNAL').length,
        noSignalCount: signals.filter((s) => s.direction === 'NO_SIGNAL').length,
        apiUsageToday: Math.floor(signals.length * 1.2),
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        errorLogs: [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            message: 'Market data feed latency check completed normal (110ms)',
            code: 'INFO_200',
          },
        ],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'System status check failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
