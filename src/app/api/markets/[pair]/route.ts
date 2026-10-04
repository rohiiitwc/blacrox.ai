import { NextRequest, NextResponse } from 'next/server';
import { DemoMarketDataProvider } from '@/services/marketData/MarketDataProvider';
import { IndicatorCalculator } from '@/services/indicators/IndicatorCalculator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    const resolvedParams = await params;
    const pairId = resolvedParams.pair;
    const provider = new DemoMarketDataProvider();

    const pairs = await provider.getPairs();
    const pair = pairs.find((p) => p.id === pairId || p.name === pairId.replace('_', '/'));

    if (!pair) {
      return NextResponse.json(
        { success: false, error: 'Market pair not found or unavailable' },
        { status: 404 }
      );
    }

    const candles = await provider.getCandles(pair.id, 60);
    const indicators = IndicatorCalculator.computeAll(candles);

    return NextResponse.json({
      success: true,
      pair,
      candles,
      indicators,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pair details';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
