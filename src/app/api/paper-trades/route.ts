import { NextRequest, NextResponse } from 'next/server';
import { PaperTradingService } from '@/services/paperTrading/PaperTradingService';

export async function GET() {
  try {
    const service = PaperTradingService.getInstance();
    return NextResponse.json({
      success: true,
      wallet: service.getWallet(),
      trades: service.getTrades(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch paper trade data';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'place', pair, direction, amount, entryPrice, signalId, payoutPercentage } = body;

    const service = PaperTradingService.getInstance();

    if (action === 'reset') {
      service.resetWallet(10000);
      return NextResponse.json({
        success: true,
        wallet: service.getWallet(),
        trades: [],
      });
    }

    if (!pair || !direction || !amount || !entryPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required trade parameters' },
        { status: 400 }
      );
    }

    const trade = service.placePaperTrade(
      pair,
      direction,
      Number(amount),
      Number(entryPrice),
      signalId || `manual_${Date.now()}`,
      payoutPercentage || 85
    );

    return NextResponse.json({
      success: true,
      trade,
      wallet: service.getWallet(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Paper trade execution failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
