import { PaperTrade, PaperWallet } from '@/types/market';

export class PaperTradingService {
  private static instance: PaperTradingService;

  private wallet: PaperWallet = {
    balance: 10000,
    initialBalance: 10000,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalProfit: 0,
  };

  private trades: PaperTrade[] = [];

  private constructor() {
    this.seedInitialTrades();
  }

  public static getInstance(): PaperTradingService {
    if (!PaperTradingService.instance) {
      PaperTradingService.instance = new PaperTradingService();
    }
    return PaperTradingService.instance;
  }

  private seedInitialTrades() {
    const now = Date.now();
    const mockPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/USD (OTC)'];

    for (let i = 10; i >= 1; i--) {
      const timeMs = now - i * 5 * 60 * 1000;
      const isWin = i % 3 !== 0;
      const amount = 100;
      const payoutPct = 88;
      const profitLoss = isWin ? amount * (payoutPct / 100) : -amount;

      const trade: PaperTrade = {
        id: `trade_${timeMs}`,
        signalId: `sig_${timeMs}`,
        pair: mockPairs[i % mockPairs.length],
        direction: i % 2 === 0 ? 'UP' : 'DOWN',
        amount,
        entryPrice: 1.0850,
        exitPrice: isWin ? 1.0855 : 1.0845,
        timestamp: new Date(timeMs).toISOString(),
        expiryTime: new Date(timeMs + 60 * 1000).toISOString(),
        status: isWin ? 'WIN' : 'LOSS',
        payoutPercentage: payoutPct,
        profitLoss,
      };

      this.trades.push(trade);
      this.wallet.totalTrades++;
      if (isWin) this.wallet.wins++;
      else this.wallet.losses++;
      this.wallet.totalProfit += profitLoss;
    }

    this.wallet.balance = this.wallet.initialBalance + this.wallet.totalProfit;
    this.wallet.winRate = Number(
      ((this.wallet.wins / (this.wallet.totalTrades || 1)) * 100).toFixed(1)
    );
  }

  public getWallet(): PaperWallet {
    return { ...this.wallet };
  }

  public getTrades(): PaperTrade[] {
    return [...this.trades].reverse();
  }

  public placePaperTrade(
    pair: string,
    direction: 'UP' | 'DOWN',
    amount: number,
    entryPrice: number,
    signalId: string,
    payoutPercentage: number = 85
  ): PaperTrade {
    if (amount <= 0 || amount > this.wallet.balance) {
      throw new Error('Insufficient virtual balance or invalid amount.');
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 1000); // 60s option

    const trade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      signalId,
      pair,
      direction,
      amount,
      entryPrice,
      timestamp: now.toISOString(),
      expiryTime: expiry.toISOString(),
      status: 'PENDING',
      payoutPercentage,
      profitLoss: 0,
    };

    this.trades.push(trade);
    return trade;
  }

  public resolveTrade(tradeId: string, currentPrice: number): PaperTrade {
    const trade = this.trades.find((t) => t.id === tradeId);
    if (!trade || trade.status !== 'PENDING') {
      return trade!;
    }

    trade.exitPrice = currentPrice;
    let isWin = false;

    if (trade.direction === 'UP' && currentPrice > trade.entryPrice) {
      isWin = true;
    } else if (trade.direction === 'DOWN' && currentPrice < trade.entryPrice) {
      isWin = true;
    }

    if (currentPrice === trade.entryPrice) {
      trade.status = 'DRAW';
      trade.profitLoss = 0;
    } else if (isWin) {
      trade.status = 'WIN';
      trade.profitLoss = trade.amount * (trade.payoutPercentage / 100);
      this.wallet.wins++;
    } else {
      trade.status = 'LOSS';
      trade.profitLoss = -trade.amount;
      this.wallet.losses++;
    }

    this.wallet.totalTrades++;
    this.wallet.totalProfit += trade.profitLoss;
    this.wallet.balance += trade.profitLoss;
    this.wallet.winRate = Number(
      ((this.wallet.wins / (this.wallet.totalTrades || 1)) * 100).toFixed(1)
    );

    return trade;
  }

  public resetWallet(initialBalance: number = 10000) {
    this.wallet = {
      balance: initialBalance,
      initialBalance,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalProfit: 0,
    };
    this.trades = [];
  }
}
