import { NextResponse } from 'next/server';
import { DemoMarketDataProvider } from '@/services/marketData/MarketDataProvider';

export async function GET() {
  try {
    const provider = new DemoMarketDataProvider();
    const pairs = await provider.getPairs();

    return NextResponse.json({
      success: true,
      provider: provider.getName(),
      pairs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch market data';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
