import { NextResponse } from 'next/server';
import { SignalStore } from '@/services/signals/SignalStore';
import { DemoMarketDataProvider } from '@/services/marketData/MarketDataProvider';

export async function GET() {
  try {
    const provider = new DemoMarketDataProvider();
    const pairs = await provider.getPairs();
    const pairPrices: Record<string, number> = {};
    pairs.forEach((p) => {
      pairPrices[p.name] = p.currentPrice;
    });

    const store = SignalStore.getInstance();
    store.evaluateExpiredSignals(pairPrices);
    const signals = store.getSignals(50, pairPrices);
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
    const { signalId, newStatus, action } = body;

    const store = SignalStore.getInstance();

    if (action === 'reset') {
      store.clearAndReseed();
      return NextResponse.json({ success: true, message: 'Signal feed reset and re-synced' });
    }

    if (signalId && (newStatus === 'WIN' || newStatus === 'LOSS')) {
      store.updateSignalStatus(signalId, newStatus);
      return NextResponse.json({ success: true, signalId, status: newStatus });
    }
    return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update signal status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
