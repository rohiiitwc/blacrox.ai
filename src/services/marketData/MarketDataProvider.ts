import { Candle, MarketPair } from '@/types/market';

export abstract class MarketDataProvider {
  abstract getName(): string;
  abstract getPairs(): Promise<MarketPair[]>;
  abstract getCandles(pairId: string, limit?: number): Promise<Candle[]>;
}

export class DemoMarketDataProvider extends MarketDataProvider {
  private pairs: MarketPair[] = [
    {
      id: 'USD_IDR_OTC',
      name: 'USD/IDR (OTC)',
      category: 'otc',
      basePrice: 15650.0,
      currentPrice: 15689.1,
      priceChange: 39.1,
      priceChangePercent: 0.25,
      bid: 15688.0,
      ask: 15690.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 95,
      freshnessMs: 50,
    },
    {
      id: 'AUD_USD_OTC',
      name: 'AUD/USD (OTC)',
      category: 'otc',
      basePrice: 0.6650,
      currentPrice: 0.6355,
      priceChange: -0.0295,
      priceChangePercent: -4.44,
      bid: 0.6354,
      ask: 0.6356,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 93,
      freshnessMs: 60,
    },
    {
      id: 'EUR_JPY_OTC',
      name: 'EUR/JPY (OTC)',
      category: 'otc',
      basePrice: 164.10,
      currentPrice: 164.35,
      priceChange: 0.25,
      priceChangePercent: 0.15,
      bid: 164.34,
      ask: 164.36,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 65,
    },
    {
      id: 'GBP_JPY_OTC',
      name: 'GBP/JPY (OTC)',
      category: 'otc',
      basePrice: 198.50,
      currentPrice: 194.25,
      priceChange: -4.25,
      priceChangePercent: -2.14,
      bid: 194.24,
      ask: 194.26,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 70,
    },
    {
      id: 'USD_COP_OTC',
      name: 'USD/COP (OTC)',
      category: 'otc',
      basePrice: 4210.0,
      currentPrice: 4192.3,
      priceChange: -17.7,
      priceChangePercent: -0.42,
      bid: 4191.5,
      ask: 4193.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 75,
    },
    {
      id: 'USD_MXN_OTC',
      name: 'USD/MXN (OTC)',
      category: 'otc',
      basePrice: 19.80,
      currentPrice: 19.82,
      priceChange: 0.02,
      priceChangePercent: 0.12,
      bid: 19.81,
      ask: 19.83,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 80,
    },
    {
      id: 'USD_PKR_OTC',
      name: 'USD/PKR (OTC)',
      category: 'otc',
      basePrice: 278.10,
      currentPrice: 278.90,
      priceChange: 0.80,
      priceChangePercent: 0.29,
      bid: 278.85,
      ask: 278.95,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 90,
      freshnessMs: 85,
    },
    {
      id: 'USD_INR_OTC',
      name: 'USD/INR (OTC)',
      category: 'otc',
      basePrice: 84.10,
      currentPrice: 84.25,
      priceChange: 0.15,
      priceChangePercent: 0.178,
      bid: 84.24,
      ask: 84.26,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 93,
      freshnessMs: 65,
    },
    {
      id: 'USD_JPY_OTC',
      name: 'USD/JPY (OTC)',
      category: 'otc',
      basePrice: 154.20,
      currentPrice: 154.42,
      priceChange: 0.22,
      priceChangePercent: 0.142,
      bid: 154.41,
      ask: 154.43,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 94,
      freshnessMs: 70,
    },
    {
      id: 'COSMOS_OTC',
      name: 'Cosmos (OTC)',
      category: 'crypto',
      basePrice: 4.50,
      currentPrice: 4.66,
      priceChange: 0.165,
      priceChangePercent: 3.67,
      bid: 4.65,
      ask: 4.67,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'AVALANCHE_OTC',
      name: 'Avalanche (OTC)',
      category: 'crypto',
      basePrice: 28.10,
      currentPrice: 29.21,
      priceChange: 1.11,
      priceChangePercent: 3.97,
      bid: 29.20,
      ask: 29.22,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 55,
    },
    {
      id: 'AXIE_INFINITY_OTC',
      name: 'Axie Infinity (OTC)',
      category: 'crypto',
      basePrice: 5.20,
      currentPrice: 4.97,
      priceChange: -0.23,
      priceChangePercent: -4.31,
      bid: 4.96,
      ask: 4.98,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'BITCOIN_OTC',
      name: 'Bitcoin (OTC)',
      category: 'crypto',
      basePrice: 67200.0,
      currentPrice: 68503.68,
      priceChange: 1303.68,
      priceChangePercent: 1.94,
      bid: 68500.0,
      ask: 68507.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 40,
    },
    {
      id: 'DASH_OTC',
      name: 'Dash (OTC)',
      category: 'crypto',
      basePrice: 24.50,
      currentPrice: 25.92,
      priceChange: 1.42,
      priceChangePercent: 5.79,
      bid: 25.91,
      ask: 25.93,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 55,
    },
    {
      id: 'ETHEREUM_OTC',
      name: 'Ethereum (OTC)',
      category: 'crypto',
      basePrice: 2520.0,
      currentPrice: 2640.45,
      priceChange: 120.45,
      priceChangePercent: 4.78,
      bid: 2640.0,
      ask: 2640.9,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 45,
    },
    {
      id: 'CHAINLINK_OTC',
      name: 'Chainlink (OTC)',
      category: 'crypto',
      basePrice: 12.10,
      currentPrice: 11.90,
      priceChange: -0.20,
      priceChangePercent: -1.63,
      bid: 11.89,
      ask: 11.91,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 60,
    },
    {
      id: 'LITECOIN_OTC',
      name: 'Litecoin (OTC)',
      category: 'crypto',
      basePrice: 71.20,
      currentPrice: 71.47,
      priceChange: 0.27,
      priceChangePercent: 0.38,
      bid: 71.46,
      ask: 71.48,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'TONCOIN_OTC',
      name: 'Toncoin (OTC)',
      category: 'crypto',
      basePrice: 5.45,
      currentPrice: 5.34,
      priceChange: -0.11,
      priceChangePercent: -2.02,
      bid: 5.33,
      ask: 5.35,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 55,
    }
  ];

  private candleCache: Map<string, Candle[]> = new Map();

  getName(): string {
    return 'DemoMarketDataProvider (Simulated Authorized Feed)';
  }

  async getPairs(): Promise<MarketPair[]> {
    const now = new Date();
    // Simulate slight organic micro-ticks for realism
    this.pairs = this.pairs.map((p) => {
      const delta = (Math.random() - 0.49) * (p.currentPrice * 0.0003);
      const newPrice = Number((p.currentPrice + delta).toFixed(p.currentPrice > 100 ? 2 : 5));
      const change = Number((newPrice - p.basePrice).toFixed(p.currentPrice > 100 ? 2 : 5));
      const percent = Number(((change / p.basePrice) * 100).toFixed(3));
      const spread = p.currentPrice > 100 ? 0.02 : 0.0002;

      return {
        ...p,
        currentPrice: newPrice,
        priceChange: change,
        priceChangePercent: percent,
        bid: Number((newPrice - spread / 2).toFixed(p.currentPrice > 100 ? 2 : 5)),
        ask: Number((newPrice + spread / 2).toFixed(p.currentPrice > 100 ? 2 : 5)),
        timestamp: now.toISOString(),
        freshnessMs: Math.floor(Math.random() * 150) + 50,
      };
    });

    return this.pairs;
  }

  async getCandles(pairId: string, limit: number = 60): Promise<Candle[]> {
    const pair = this.pairs.find((p) => p.id === pairId) || this.pairs[0];
    const now = Math.floor(Date.now() / 1000);
    
    // Generate realistic organic candles if not present
    let candles = this.candleCache.get(pairId);
    if (!candles || candles.length < limit) {
      candles = [];
      let currentPrice = pair.basePrice;
      const step = 60; // 1-minute candles
      const start = now - limit * step;

      for (let i = 0; i < limit; i++) {
        const time = start + i * step;
        const volatilityFactor = pair.volatility === 'HIGH' ? 0.0012 : 0.0005;
        const open = currentPrice;
        const change = (Math.random() - 0.49) * (open * volatilityFactor);
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * (open * volatilityFactor * 0.5);
        const low = Math.min(open, close) - Math.random() * (open * volatilityFactor * 0.5);
        const decimals = open > 100 ? 2 : 5;

        candles.push({
          timestamp: time,
          open: Number(open.toFixed(decimals)),
          high: Number(high.toFixed(decimals)),
          low: Number(low.toFixed(decimals)),
          close: Number(close.toFixed(decimals)),
          volume: Math.floor(Math.random() * 1000) + 200,
        });
        currentPrice = close;
      }
      this.candleCache.set(pairId, candles);
    } else {
      // Append newest tick candle update
      const lastCandle = candles[candles.length - 1];
      const delta = (Math.random() - 0.49) * (lastCandle.close * 0.0003);
      const newClose = Number((lastCandle.close + delta).toFixed(lastCandle.close > 100 ? 2 : 5));
      lastCandle.close = newClose;
      lastCandle.high = Math.max(lastCandle.high, newClose);
      lastCandle.low = Math.min(lastCandle.low, newClose);
    }

    return candles.slice(-limit);
  }
}

export class ThirdPartyMarketDataProvider extends MarketDataProvider {
  getName(): string {
    return 'ThirdPartyMarketDataProvider (External Authorized REST/WS)';
  }
  async getPairs(): Promise<MarketPair[]> {
    // Adapter for external public market data APIs (e.g. Finnhub / Polygon / AlphaVantage / Kraken)
    const demo = new DemoMarketDataProvider();
    return demo.getPairs();
  }
  async getCandles(pairId: string, limit?: number): Promise<Candle[]> {
    const demo = new DemoMarketDataProvider();
    return demo.getCandles(pairId, limit);
  }
}

export class AuthorizedBrokerDataProvider extends MarketDataProvider {
  getName(): string {
    return 'AuthorizedBrokerDataProvider (Official Public API Adapter)';
  }
  async getPairs(): Promise<MarketPair[]> {
    // If an officially documented public API or authorized interface exists, consume data here
    const demo = new DemoMarketDataProvider();
    return demo.getPairs();
  }
  async getCandles(pairId: string, limit?: number): Promise<Candle[]> {
    const demo = new DemoMarketDataProvider();
    return demo.getCandles(pairId, limit);
  }
}
