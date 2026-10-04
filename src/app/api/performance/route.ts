import { NextResponse } from 'next/server';
import { SignalStore } from '@/services/signals/SignalStore';

export async function GET() {
  try {
    const store = SignalStore.getInstance();
    const signals = store.getSignals(200);

    const evaluated = signals.filter((s) => s.status === 'WIN' || s.status === 'LOSS');
    const wins = evaluated.filter((s) => s.status === 'WIN').length;
    const losses = evaluated.filter((s) => s.status === 'LOSS').length;
    const noSignals = signals.filter((s) => s.status === 'NO_SIGNAL').length;

    const winRate = evaluated.length > 0 ? Number(((wins / evaluated.length) * 100).toFixed(1)) : 0;
    const avgConfidence =
      signals.length > 0
        ? Number((signals.reduce((acc, s) => acc + (s.confidence || 0), 0) / signals.length).toFixed(1))
        : 0;

    const performanceByPair: Record<string, { total: number; wins: number; winRate: number }> = {};
    for (const sig of evaluated) {
      if (!performanceByPair[sig.pair]) {
        performanceByPair[sig.pair] = { total: 0, wins: 0, winRate: 0 };
      }
      performanceByPair[sig.pair].total++;
      if (sig.status === 'WIN') performanceByPair[sig.pair].wins++;
      performanceByPair[sig.pair].winRate = Number(
        ((performanceByPair[sig.pair].wins / performanceByPair[sig.pair].total) * 100).toFixed(1)
      );
    }

    return NextResponse.json({
      success: true,
      performance: {
        signalsAnalyzed: signals.length,
        correctSignals: wins,
        incorrectSignals: losses,
        noSignalsCount: noSignals,
        winRate,
        averageConfidence: avgConfidence,
        performanceByPair,
        disclaimer: 'Past simulated performance does not guarantee future trading results.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch performance stats';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
